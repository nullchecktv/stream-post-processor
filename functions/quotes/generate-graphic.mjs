import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { marshall } from '@aws-sdk/util-dynamodb';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { FONTS } from './fonts/index.mjs';
import { readFileSync } from 'node:fs';
import { resolveBranding } from '../utils/branding.mjs';
import { createQuoteKey, QUOTE_STATUS, generateQuoteS3Key } from '../utils/quotes.mjs';
import { publishNotificationEvent } from '../utils/notifications.mjs';
import { getPatternIndex } from './utils/hash.mjs';
import { getPattern } from './patterns/index.mjs';
import { calculateFontSize, wrapText, calculateTextHeight } from './utils/text.mjs';
import { applyTextShadowIfNeeded } from './utils/contrast.mjs';

const logger = new Logger({ serviceName: 'quotes' });
const ddb = new DynamoDBClient();
const s3 = new S3Client();

const BORDER_WIDTH = 20;

let fontsRegistered = false;
const registeredFamilies = new Set();

function registerFontsOnce() {
  if (fontsRegistered) return;
  for (const { family, path } of FONTS) {
    let ok = false;
    try {
      ok = GlobalFonts.registerFromPath(path, family);
    } catch (e) {
      // ignore path-based failure and attempt buffer-based registration
    }

    if (!ok) {
      try {
        const data = readFileSync(path);
        ok = GlobalFonts.register(data, family);
      } catch (e) {
        logger.warn('Failed to register font from buffer', { family, path, error: e?.message });
      }
    }

    if (ok) {
      registeredFamilies.add(family);
    } else {
      logger.warn('Font registration unsuccessful', { family, path });
    }
  }
  fontsRegistered = true;
}

registerFontsOnce();

export const handler = async (event) => {
  try {
    const { detail } = event;
    if (!detail || !detail.tenantId || !detail.episodeId || !detail.quoteId) {
      logger.error('Missing required parameters in event detail', { detail });
      throw new Error('Missing required parameters in event detail');
    }

    const { tenantId, episodeId, quoteId, quote, episode } = detail;

    if (!quote || !episode) {
      logger.error('Missing quote or episode data in event detail', { detail });
      throw new Error('Missing quote or episode data in event detail');
    }

    try {
      const quoteKey = createQuoteKey(tenantId, episodeId, quoteId);

      const isPortrait = quote.orientation === 'portrait';
      const width = isPortrait ? 1080 : 1920;
      const height = isPortrait ? 1920 : 1080;

      const branding = await resolveBranding(tenantId);
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = branding.colors.primary;
      ctx.fillRect(0, 0, width, height);

      const innerWidth = width - (BORDER_WIDTH * 2);
      const innerHeight = height - (BORDER_WIDTH * 2);
      ctx.fillStyle = branding.colors.background;
      ctx.fillRect(BORDER_WIDTH, BORDER_WIDTH, innerWidth, innerHeight);

      ctx.save();
      ctx.translate(BORDER_WIDTH, BORDER_WIDTH);
      const patternIndex = getPatternIndex(quote.text);
      const pattern = getPattern(patternIndex);
      pattern(ctx, innerWidth, innerHeight, branding);
      ctx.restore();

      const fontSize = calculateFontSize(quote.text, innerWidth, innerHeight);
      const chosenFamily = registeredFamilies.has(branding.fontFamily) ? branding.fontFamily : 'Inter';

      ctx.fillStyle = branding.colors.text;
      ctx.font = `bold ${fontSize}px ${chosenFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const shadowApplied = applyTextShadowIfNeeded(ctx, branding.colors.text, branding.colors.background);

      const maxWidth = innerWidth - 200;
      const lines = wrapText(ctx, quote.text, maxWidth);
      const textHeight = calculateTextHeight(fontSize, lines.length);
      const lineHeight = fontSize * 1.3;

      let yPosition = (height - textHeight) / 2;

      lines.forEach(line => {
        ctx.fillText(line, width / 2, yPosition);
        yPosition += lineHeight;
      });

      if (shadowApplied) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      yPosition += 60;
      if (quote.showSpeaker && quote.speaker) {
        ctx.fillStyle = branding.colors.secondary;
        ctx.font = `${Math.floor(fontSize * 0.67)}px ${chosenFamily}`;
        ctx.fillText(`— ${quote.speaker}`, width / 2, yPosition);
        yPosition += fontSize * 0.9;
      }

      if (quote.showEpisodeTitle && episode.title) {
        ctx.fillStyle = branding.colors.text;
        ctx.globalAlpha = 0.7;
        ctx.font = `${Math.floor(fontSize * 0.5)}px ${chosenFamily}`;
        ctx.fillText(episode.title, width / 2, yPosition);
        ctx.globalAlpha = 1.0;
      }

      const buffer = await canvas.encode('png');
      const s3Key = generateQuoteS3Key(tenantId, episodeId, quoteId);

      await s3.send(new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/png'
      }));

      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall(quoteKey),
        UpdateExpression: 'SET s3Key = :s3Key, fileSize = :fileSize, #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':s3Key': s3Key,
          ':fileSize': buffer.length,
          ':status': QUOTE_STATUS.CREATED,
          ':updatedAt': new Date().toISOString()
        })
      }));

      const episodeTitle = episode.title || `Episode ${episode.episodeNumber || ''}`;

      await publishNotificationEvent({
        type: 'quote_graphic_ready',
        tenantId,
        userId: null,
        title: 'Quote Graphic Ready',
        message: `Your quote graphic from ${episodeTitle} has been generated`,
        url: `/episodes/${episodeId}/quotes/${quoteId}`,
        persist: false,
        topic: 'tasks',
        metadata: {
          episodeId,
          quoteId,
          quoteText: quote.text
        }
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          quoteId,
          s3Key,
          fileSize: buffer.length,
          status: QUOTE_STATUS.CREATED
        })
      };

    } catch (err) {
      logger.error('Error generating quote graphic', {
        error: err.message,
        stack: err.stack,
        tenantId,
        episodeId,
        quoteId
      });

      try {
        const quoteKey = createQuoteKey(tenantId, episodeId, quoteId);
        await ddb.send(new UpdateItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall(quoteKey),
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: marshall({
            ':status': QUOTE_STATUS.FAILED,
            ':updatedAt': new Date().toISOString()
          })
        }));
      } catch (updateErr) {
        logger.error('Error updating quote status to failed', {
          error: updateErr.message
        });
      }

      throw err;
    }
  } catch (err) {
    logger.error('Error generating graphic', {
      error: err.message
    });
  }
};
