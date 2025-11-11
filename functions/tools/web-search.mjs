import { Logger } from '@aws-lambda-powertools/logger';
import { z } from 'zod';
import { getJson } from 'serpapi';
import got from 'got';
import { extractFromHtml } from '@extractus/article-extractor';
import TurndownService from 'turndown';

const logger = new Logger({ serviceName: 'tools' });

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});

turndown.remove(['script', 'style', 'iframe', 'noscript']);

export const webSearchTool = {
  isMultiTenant: false,
  name: 'webSearch',
  description: 'Search Google and return top results with extracted readable text and metadata (Markdown). Use this to verify technical details, find relevant examples, research current best practices, and gather supporting statistics.',
  schema: z.object({
    searchQuery: z.string().min(3).max(200).describe('Full query string for Google search'),
    numResults: z.number().int().min(1).max(10).default(5).describe('How many results to fetch and extract (default: 5, max: 10)'),
    freshnessDays: z.number().int().min(1).max(3650).optional().describe('Prefer fresher results (maps to Google time buckets)'),
    siteFilter: z.string().optional().describe('Optional domain constraint, e.g. "site:who.int" or "site:cdc.gov"'),
    maxChars: z.number().int().min(500).max(40000).default(8000).describe('Max characters of extracted text per result'),
    preferPrimary: z.boolean().default(true).describe('Bump .gov/.edu/standards bodies to the top when ties occur')
  }),
  handler: async ({ searchQuery, numResults = 5, freshnessDays, siteFilter, maxChars = 8000, preferPrimary = true }) => {
    try {
      if (!process.env.SERPAPI_KEY) {
        logger.warn('SERPAPI_KEY not configured');
        return { ok: false, error: 'Missing SERPAPI_KEY, do not retry' };
      }

      const q = [searchQuery, siteFilter].filter(Boolean).join(' ');
      const params = {
        engine: 'google',
        api_key: process.env.SERPAPI_KEY,
        q,
        num: Math.min(numResults, 10)
      };

      if (freshnessDays) {
        if (freshnessDays <= 1) {
          params.tbs = 'qdr:d';
        } else if (freshnessDays <= 7) {
          params.tbs = 'qdr:w';
        } else if (freshnessDays <= 31) {
          params.tbs = 'qdr:m';
        } else {
          params.tbs = 'qdr:y';
        }
      }

      const res = await getJson(params);

      const organic = (res.organic_results || []).map((r) => ({
        url: r.link,
        title: r.title,
        snippet: r.snippet,
        source: r.source || (r.link ? new URL(r.link).hostname.replace(/^www\./, '') : undefined)
      }));

      const news = (res.news_results || []).map((r) => ({
        url: r.link,
        title: r.title,
        snippet: r.snippet,
        source: r.source,
        isNews: true,
        date: r.date
      }));

      let hits = [...organic, ...news]
        .filter((r) => r.url && r.title)
        .slice(0, numResults);

      if (preferPrimary) {
        hits = sortPreferPrimary(hits);
      }

      const extracted = await mapConcurrent(
        hits,
        3,
        async (h) => {
          const data = await extractPage(h.url, { maxChars });
          if (!data?.ok) {
            return {
              ok: false,
              url: h.url,
              title: h.title,
              error: data?.error || 'extract failed'
            };
          }
          return {
            url: data.url,
            title: data.title || h.title,
            source: h.source,
            publishedAt: data.publishedAt || null,
            content: data.text
          };
        }
      );

      logger.info('Web search completed', {
        query: searchQuery,
        resultCount: extracted.length
      });

      return { results: extracted };
    } catch (err) {
      logger.error('Error performing web search', {
        error: err.message,
        stack: err.stack,
        query: searchQuery
      });
      return { ok: false, error: err?.message || String(err) };
    }
  }
};

const mapConcurrent = async (items, limit, fn) => {
  const ret = [];
  const executing = new Set();
  for (const [idx, item] of items.entries()) {
    const p = (async () => fn(item, idx))().then((v) => (ret[idx] = v));
    executing.add(p);
    p.finally(() => executing.delete(p));
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.allSettled(executing);
  return ret;
};

const sortPreferPrimary = (results) => {
  const isPrimary = (u) => {
    try {
      const h = new URL(u).hostname.toLowerCase();
      return (
        h.endsWith('.gov') ||
        h.endsWith('.edu') ||
        h.endsWith('who.int') ||
        h.endsWith('iso.org') ||
        h.endsWith('nist.gov') ||
        h.endsWith('ietf.org') ||
        h.endsWith('w3.org') ||
        h.endsWith('un.org')
      );
    } catch {
      return false;
    }
  };
  return [...results].sort((a, b) => Number(isPrimary(b.url)) - Number(isPrimary(a.url)));
};

const extractPage = async (url, { maxChars = 8000 } = {}) => {
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

    const res = await got(url, {
      timeout: { request: 15000 },
      retry: { limit: 2 },
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'referer': 'https://www.google.com/',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'cache-control': 'max-age=0'
      },
      followRedirect: true,
      http2: true
    });

    const html = res.body;
    const article = await extractFromHtml(html, url);

    if (!article || !article.content) {
      return { ok: false, error: 'No content extracted' };
    }

    const markdown = turndown.turndown(article.content);
    const text = markdown.slice(0, maxChars);

    return {
      ok: true,
      url: article.url || url,
      title: article.title || null,
      byline: article.author || null,
      publishedAt: article.published || null,
      text,
      chars: text.length
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
};
