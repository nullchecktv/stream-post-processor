import { getPatternIndex } from '../../functions/quotes/utils/hash.mjs';
import { calculateFontSize, wrapText, calculateTextHeight } from '../../functions/quotes/utils/text.mjs';
import { getContrastRatio } from '../../functions/quotes/utils/contrast.mjs';

describe('Quote Graphic Generation Integration Tests', () => {
  describe('Landscape Graphic Generation with Patterns', () => {
    const simulateLandscapeGraphicGeneration = (quoteData, episodeData, branding) => {
      const workflow = {
        steps: [],
        errors: [],
        graphicData: {}
      };

      try {
        if (!quoteData || !quoteData.text) {
          throw new Error('Quote text is required');
        }
        workflow.steps.push('quote_validated');

        if (!episodeData || !episodeData.id) {
          throw new Error('Episode data is required');
        }
        workflow.steps.push('episode_validated');

        const orientation = quoteData.orientation || 'landscape';
        const width = orientation === 'portrait' ? 1080 : 1920;
        const height = orientation === 'portrait' ? 1920 : 1080;
        workflow.graphicData.dimensions = { width, height, orientation };
        workflow.steps.push('dimensions_calculated');

        const patternIndex = getPatternIndex(quoteData.text);
        workflow.graphicData.patternIndex = patternIndex;
        workflow.steps.push('pattern_selected');

        const innerWidth = width - 40;
        const innerHeight = height - 40;
        const fontSize = calculateFontSize(quoteData.text, innerWidth, innerHeight);
        workflow.graphicData.fontSize = fontSize;
        workflow.steps.push('font_size_calculated');

        const mockCtx = {
          measureText: (text) => ({ width: text.length * (fontSize * 0.6) })
        };
        const maxWidth = innerWidth - 200;
        const lines = wrapText(mockCtx, quoteData.text, maxWidth);
        workflow.graphicData.lines = lines;
        workflow.graphicData.lineCount = lines.length;
        workflow.steps.push('text_wrapped');

        const textHeight = calculateTextHeight(fontSize, lines.length);
        workflow.graphicData.textHeight = textHeight;
        workflow.steps.push('text_height_calculated');

        const contrast = getContrastRatio(branding.colors.text, branding.colors.background);
        workflow.graphicData.contrast = contrast;
        workflow.graphicData.shadowNeeded = contrast < 4.5;
        workflow.steps.push('contrast_checked');

        workflow.graphicData.s3Key = `${quoteData.tenantId}/${episodeData.id}/quotes/${quoteData.id}.png`;
        workflow.steps.push('s3_key_generated');

        workflow.success = true;
        return workflow;

      } catch (error) {
        workflow.errors.push(error.message);
        workflow.success = false;
        return workflow;
      }
    };

    test('should complete landscape graphic generation workflow', () => {
      const quoteData = {
        id: 'quote-123',
        tenantId: 'tenant-456',
        text: 'This is a test quote for landscape orientation',
        orientation: 'landscape',
        speaker: 'John Doe',
        showSpeaker: true,
        showEpisodeTitle: true
      };

      const episodeData = {
        id: 'episode-789',
        title: 'Test Episode'
      };

      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        },
        fontFamily: 'Inter'
      };

      const workflow = simulateLandscapeGraphicGeneration(quoteData, episodeData, branding);

      if (!workflow.success) {
        console.log('Workflow errors:', workflow.errors);
        console.log('Workflow error stack:', workflow.errorStack);
      }

      expect(workflow.success).toBe(true);
      expect(workflow.errors).toHaveLength(0);
      expect(workflow.steps).toEqual([
        'quote_validated',
        'episode_validated',
        'dimensions_calculated',
        'pattern_selected',
        'font_size_calculated',
        'text_wrapped',
        'text_height_calculated',
        'contrast_checked',
        's3_key_generated'
      ]);
      expect(workflow.graphicData.dimensions).toEqual({
        width: 1920,
        height: 1080,
        orientation: 'landscape'
      });
      expect(workflow.graphicData.patternIndex).toBeGreaterThanOrEqual(0);
      expect(workflow.graphicData.patternIndex).toBeLessThan(50);
      expect(workflow.graphicData.fontSize).toBeGreaterThanOrEqual(48);
      expect(workflow.graphicData.fontSize).toBeLessThanOrEqual(96);
    });

    test('should handle long quotes with appropriate font sizing', () => {
      const longQuote = 'This is a very long quote that contains many words and should result in a smaller font size to ensure it fits properly within the canvas boundaries without overflowing or becoming unreadable to the viewer who will see this on social media platforms.';

      const quoteData = {
        id: 'quote-123',
        tenantId: 'tenant-456',
        text: longQuote,
        orientation: 'landscape'
      };

      const episodeData = { id: 'episode-789', title: 'Test Episode' };
      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        }
      };

      const workflow = simulateLandscapeGraphicGeneration(quoteData, episodeData, branding);

      expect(workflow.success).toBe(true);
      expect(workflow.graphicData.fontSize).toBeLessThan(72);
      expect(workflow.graphicData.lineCount).toBeGreaterThan(1);
    });

    test('should handle short quotes with larger font sizing', () => {
      const shortQuote = 'Short quote';

      const quoteData = {
        id: 'quote-123',
        tenantId: 'tenant-456',
        text: shortQuote,
        orientation: 'landscape'
      };

      const episodeData = { id: 'episode-789', title: 'Test Episode' };
      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        }
      };

      const workflow = simulateLandscapeGraphicGeneration(quoteData, episodeData, branding);

      expect(workflow.success).toBe(true);
      expect(workflow.graphicData.fontSize).toBe(96);
      expect(workflow.graphicData.lineCount).toBe(1);
    });
  });

  describe('Portrait Graphic Generation with Patterns', () => {
    const simulatePortraitGraphicGeneration = (quoteData, episodeData, branding) => {
      const workflow = {
        steps: [],
        errors: [],
        graphicData: {}
      };

      try {
        if (!quoteData || !quoteData.text) {
          throw new Error('Quote text is required');
        }
        workflow.steps.push('quote_validated');

        if (!episodeData || !episodeData.id) {
          throw new Error('Episode data is required');
        }
        workflow.steps.push('episode_validated');

        const orientation = quoteData.orientation || 'landscape';
        const width = orientation === 'portrait' ? 1080 : 1920;
        const height = orientation === 'portrait' ? 1920 : 1080;
        workflow.graphicData.dimensions = { width, height, orientation };
        workflow.steps.push('dimensions_calculated');

        const patternIndex = getPatternIndex(quoteData.text);
        workflow.graphicData.patternIndex = patternIndex;
        workflow.steps.push('pattern_selected');

        const innerWidth = width - 40;
        const innerHeight = height - 40;
        const fontSize = calculateFontSize(quoteData.text, innerWidth, innerHeight);
        workflow.graphicData.fontSize = fontSize;
        workflow.steps.push('font_size_calculated');

        const mockCtx = {
          measureText: (text) => ({ width: text.length * (fontSize * 0.6) })
        };
        const maxWidth = innerWidth - 200;
        const lines = wrapText(mockCtx, quoteData.text, maxWidth);
        workflow.graphicData.lines = lines;
        workflow.graphicData.lineCount = lines.length;
        workflow.steps.push('text_wrapped');

        const textHeight = calculateTextHeight(fontSize, lines.length);
        workflow.graphicData.textHeight = textHeight;
        workflow.steps.push('text_height_calculated');

        workflow.success = true;
        return workflow;

      } catch (error) {
        workflow.errors.push(error.message);
        workflow.success = false;
        return workflow;
      }
    };

    test('should complete portrait graphic generation workflow', () => {
      const quoteData = {
        id: 'quote-123',
        tenantId: 'tenant-456',
        text: 'This is a test quote for portrait orientation',
        orientation: 'portrait',
        speaker: 'Jane Smith',
        showSpeaker: true
      };

      const episodeData = {
        id: 'episode-789',
        title: 'Test Episode'
      };

      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        }
      };

      const workflow = simulatePortraitGraphicGeneration(quoteData, episodeData, branding);

      expect(workflow.success).toBe(true);
      expect(workflow.errors).toHaveLength(0);
      expect(workflow.graphicData.dimensions).toEqual({
        width: 1080,
        height: 1920,
        orientation: 'portrait'
      });
      expect(workflow.graphicData.patternIndex).toBeGreaterThanOrEqual(0);
      expect(workflow.graphicData.patternIndex).toBeLessThan(50);
    });

    test('should adjust font size for portrait orientation', () => {
      const quoteData = {
        id: 'quote-123',
        tenantId: 'tenant-456',
        text: 'Medium length quote for testing portrait orientation',
        orientation: 'portrait'
      };

      const landscapeQuoteData = {
        ...quoteData,
        orientation: 'landscape'
      };

      const episodeData = { id: 'episode-789', title: 'Test Episode' };
      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        }
      };

      const portraitWorkflow = simulatePortraitGraphicGeneration(quoteData, episodeData, branding);
      const landscapeWorkflow = simulatePortraitGraphicGeneration(landscapeQuoteData, episodeData, branding);

      expect(portraitWorkflow.success).toBe(true);
      expect(landscapeWorkflow.success).toBe(true);
      expect(portraitWorkflow.graphicData.fontSize).toBeLessThan(landscapeWorkflow.graphicData.fontSize);
    });
  });

  describe('Pattern Consistency Across Multiple Generations', () => {
    test('should generate same pattern index for identical quote text', () => {
      const quoteText = 'This is a consistent quote for testing';

      const patternIndex1 = getPatternIndex(quoteText);
      const patternIndex2 = getPatternIndex(quoteText);
      const patternIndex3 = getPatternIndex(quoteText);

      expect(patternIndex1).toBe(patternIndex2);
      expect(patternIndex2).toBe(patternIndex3);
    });

    test('should generate same pattern index regardless of case', () => {
      const quoteText1 = 'This is a test quote';
      const quoteText2 = 'THIS IS A TEST QUOTE';
      const quoteText3 = 'this is a test quote';

      const patternIndex1 = getPatternIndex(quoteText1);
      const patternIndex2 = getPatternIndex(quoteText2);
      const patternIndex3 = getPatternIndex(quoteText3);

      expect(patternIndex1).toBe(patternIndex2);
      expect(patternIndex2).toBe(patternIndex3);
    });

    test('should generate different patterns for different quotes', () => {
      const quotes = [
        'First unique quote',
        'Second unique quote',
        'Third unique quote',
        'Fourth unique quote',
        'Fifth unique quote'
      ];

      const patternIndices = quotes.map(quote => getPatternIndex(quote));

      const uniqueIndices = new Set(patternIndices);
      expect(uniqueIndices.size).toBeGreaterThan(1);
    });

    test('should distribute patterns across 50 available options', () => {
      const sampleQuotes = [];
      for (let i = 0; i < 100; i++) {
        sampleQuotes.push(`Sample quote number ${i} with unique content`);
      }

      const patternIndices = sampleQuotes.map(quote => getPatternIndex(quote));

      patternIndices.forEach(index => {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(50);
      });

      const uniquePatterns = new Set(patternIndices);
      expect(uniquePatterns.size).toBeGreaterThan(10);
    });
  });

  describe('Font Sizing for Various Text Lengths', () => {
    test('should use maximum font size for very short quotes', () => {
      const shortQuotes = [
        'Short',
        'Brief quote',
        'Quick text'
      ];

      shortQuotes.forEach(text => {
        const fontSize = calculateFontSize(text, 1880, 1040);
        expect(fontSize).toBe(96);
      });
    });

    test('should use minimum font size for very long quotes', () => {
      const longQuote = 'This is an extremely long quote that contains a significant amount of text and will definitely exceed the two hundred character threshold that triggers the minimum font size calculation to ensure that all the text fits properly within the canvas boundaries.';

      const fontSize = calculateFontSize(longQuote, 1880, 1040);
      expect(fontSize).toBe(48);
    });

    test('should use graduated font sizes for medium length quotes', () => {
      const mediumQuote1 = 'This is a quote with about seventy five characters in total length.';
      const mediumQuote2 = 'This is a longer quote that has approximately one hundred and twenty five characters which should result in a different font size.';
      const mediumQuote3 = 'This is an even longer quote that contains approximately one hundred and seventy five characters and should use yet another font size to ensure proper display.';

      const fontSize1 = calculateFontSize(mediumQuote1, 1880, 1040);
      const fontSize2 = calculateFontSize(mediumQuote2, 1880, 1040);
      const fontSize3 = calculateFontSize(mediumQuote3, 1880, 1040);

      expect(fontSize1).toBeGreaterThan(fontSize2);
      expect(fontSize2).toBeGreaterThan(fontSize3);
      expect(fontSize1).toBeLessThanOrEqual(96);
      expect(fontSize3).toBeGreaterThanOrEqual(48);
    });

    test('should adjust font size for portrait orientation', () => {
      const quote = 'This is a test quote for orientation comparison';

      const landscapeFontSize = calculateFontSize(quote, 1880, 1040);
      const portraitFontSize = calculateFontSize(quote, 1040, 1880);

      expect(portraitFontSize).toBeLessThan(landscapeFontSize);
      expect(portraitFontSize).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Text Contrast and Shadow Application', () => {
    test('should detect sufficient contrast and not require shadow', () => {
      const textColor = '#1F2937';
      const backgroundColor = '#FFFFFF';

      const contrast = getContrastRatio(textColor, backgroundColor);

      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    test('should detect insufficient contrast and require shadow', () => {
      const textColor = '#CCCCCC';
      const backgroundColor = '#FFFFFF';

      const contrast = getContrastRatio(textColor, backgroundColor);

      expect(contrast).toBeLessThan(4.5);
    });

    test('should calculate contrast for various color combinations', () => {
      const colorPairs = [
        { text: '#000000', bg: '#FFFFFF', expectedHighContrast: true },
        { text: '#FFFFFF', bg: '#000000', expectedHighContrast: true },
        { text: '#3B82F6', bg: '#FFFFFF', expectedHighContrast: false },
        { text: '#FFFF00', bg: '#FFFFFF', expectedHighContrast: false },
        { text: '#1F2937', bg: '#F3F4F6', expectedHighContrast: true }
      ];

      colorPairs.forEach(({ text, bg, expectedHighContrast }) => {
        const contrast = getContrastRatio(text, bg);
        if (expectedHighContrast) {
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        } else {
          expect(contrast).toBeLessThan(4.5);
        }
      });
    });
  });

  describe('Complete Workflow Validation', () => {
    const simulateCompleteWorkflow = (quoteData, episodeData, branding) => {
      const workflow = {
        steps: [],
        errors: [],
        graphicData: {},
        databaseUpdates: [],
        s3Operations: []
      };

      try {
        if (!quoteData || !quoteData.text) {
          throw new Error('Quote text is required');
        }
        workflow.steps.push('quote_validated');

        if (!episodeData || !episodeData.id) {
          throw new Error('Episode data is required');
        }
        workflow.steps.push('episode_validated');

        const orientation = quoteData.orientation || 'landscape';
        const width = orientation === 'portrait' ? 1080 : 1920;
        const height = orientation === 'portrait' ? 1920 : 1080;
        workflow.graphicData.dimensions = { width, height, orientation };
        workflow.steps.push('dimensions_calculated');

        const patternIndex = getPatternIndex(quoteData.text);
        workflow.graphicData.patternIndex = patternIndex;
        workflow.steps.push('pattern_selected');

        const innerWidth = width - 40;
        const innerHeight = height - 40;
        const fontSize = calculateFontSize(quoteData.text, innerWidth, innerHeight);
        workflow.graphicData.fontSize = fontSize;
        workflow.steps.push('font_size_calculated');

        const mockCtx = {
          measureText: (text) => ({ width: text.length * (fontSize * 0.6) })
        };
        const maxWidth = innerWidth - 200;
        const lines = wrapText(mockCtx, quoteData.text, maxWidth);
        workflow.graphicData.lines = lines;
        workflow.steps.push('text_wrapped');

        const s3Key = `${quoteData.tenantId}/${episodeData.id}/quotes/${quoteData.id}.png`;
        workflow.s3Operations.push({
          operation: 'PutObject',
          bucket: 'test-bucket',
          key: s3Key,
          contentType: 'image/png'
        });
        workflow.steps.push('s3_upload_simulated');

        workflow.databaseUpdates.push({
          operation: 'UpdateItem',
          table: 'test-table',
          key: {
            pk: `${quoteData.tenantId}#${episodeData.id}`,
            sk: `data#quote#${quoteData.id}`
          },
          updates: {
            s3Key,
            status: 'Created',
            updatedAt: new Date().toISOString()
          }
        });
        workflow.steps.push('database_update_simulated');

        workflow.success = true;
        return workflow;

      } catch (error) {
        workflow.errors.push(error.message);
        workflow.success = false;
        return workflow;
      }
    };

    test('should complete full workflow with S3 upload and database update', () => {
      const quoteData = {
        id: 'quote-123',
        tenantId: 'tenant-456',
        text: 'Complete workflow test quote',
        orientation: 'landscape'
      };

      const episodeData = {
        id: 'episode-789',
        title: 'Test Episode'
      };

      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        }
      };

      const workflow = simulateCompleteWorkflow(quoteData, episodeData, branding);

      expect(workflow.success).toBe(true);
      expect(workflow.errors).toHaveLength(0);
      expect(workflow.s3Operations).toHaveLength(1);
      expect(workflow.s3Operations[0].operation).toBe('PutObject');
      expect(workflow.s3Operations[0].contentType).toBe('image/png');
      expect(workflow.databaseUpdates).toHaveLength(1);
      expect(workflow.databaseUpdates[0].updates.status).toBe('Created');
    });

    test('should handle validation errors gracefully', () => {
      const invalidQuoteData = {
        id: 'quote-123',
        tenantId: 'tenant-456'
      };

      const episodeData = {
        id: 'episode-789',
        title: 'Test Episode'
      };

      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937'
        }
      };

      const workflow = simulateCompleteWorkflow(invalidQuoteData, episodeData, branding);

      expect(workflow.success).toBe(false);
      expect(workflow.errors).toContain('Quote text is required');
      expect(workflow.s3Operations).toHaveLength(0);
      expect(workflow.databaseUpdates).toHaveLength(0);
    });
  });
});
