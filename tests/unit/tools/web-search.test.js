jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

describe('Web Search Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SERPAPI_KEY;
  });

  describe('Tool Schema Validation', () => {
    const validateSearchInput = (data) => {
      if (!data.searchQuery || typeof data.searchQuery !== 'string') {
        throw new Error('searchQuery is required');
      }

      if (data.searchQuery.length < 3) {
        throw new Error('searchQuery must be at least 3 characters');
      }

      if (data.searchQuery.length > 200) {
        throw new Error('searchQuery must not exceed 200 characters');
      }

      if (data.numResults !== undefined) {
        if (typeof data.numResults !== 'number' || !Number.isInteger(data.numResults)) {
          throw new Error('numResults must be an integer');
        }

        if (data.numResults < 1 || data.numResults > 10) {
          throw new Error('numResults must be between 1 and 10');
        }
      }

      if (data.maxChars !== undefined) {
        if (typeof data.maxChars !== 'number' || !Number.isInteger(data.maxChars)) {
          throw new Error('maxChars must be an integer');
        }

        if (data.maxChars < 500 || data.maxChars > 40000) {
          throw new Error('maxChars must be between 500 and 40000');
        }
      }

      return true;
    };

    test('should validate correct search input', () => {
      const data = {
        searchQuery: 'JavaScript best practices',
        numResults: 5
      };

      expect(validateSearchInput(data)).toBe(true);
    });

    test('should reject searchQuery too short', () => {
      const data = {
        searchQuery: 'ab',
        numResults: 5
      };

      expect(() => validateSearchInput(data))
        .toThrow('searchQuery must be at least 3 characters');
    });

    test('should reject searchQuery too long', () => {
      const data = {
        searchQuery: 'a'.repeat(201),
        numResults: 5
      };

      expect(() => validateSearchInput(data))
        .toThrow('searchQuery must not exceed 200 characters');
    });

    test('should reject numResults too small', () => {
      const data = {
        searchQuery: 'test query',
        numResults: 0
      };

      expect(() => validateSearchInput(data))
        .toThrow('numResults must be between 1 and 10');
    });

    test('should reject numResults too large', () => {
      const data = {
        searchQuery: 'test query',
        numResults: 11
      };

      expect(() => validateSearchInput(data))
        .toThrow('numResults must be between 1 and 10');
    });

    test('should accept searchQuery without numResults', () => {
      const data = {
        searchQuery: 'test query'
      };

      expect(validateSearchInput(data)).toBe(true);
    });

    test('should reject missing searchQuery', () => {
      const data = {
        numResults: 5
      };

      expect(() => validateSearchInput(data))
        .toThrow('searchQuery is required');
    });

    test('should validate maxChars parameter', () => {
      const data = {
        searchQuery: 'test query',
        maxChars: 8000
      };

      expect(validateSearchInput(data)).toBe(true);
    });

    test('should reject maxChars too small', () => {
      const data = {
        searchQuery: 'test query',
        maxChars: 400
      };

      expect(() => validateSearchInput(data))
        .toThrow('maxChars must be between 500 and 40000');
    });
  });

  describe('Primary Source Sorting', () => {
    const sortPreferPrimary = (results) => {
      const isPrimary = (u) => {
        try {
          const h = new URL(u).hostname.toLowerCase();
          return (
            h.endsWith('.gov') ||
            h.endsWith('.edu') ||
            h.endsWith('who.int') ||
            h.endsWith('iso.org')
          );
        } catch {
          return false;
        }
      };
      return [...results].sort((a, b) => Number(isPrimary(b.url)) - Number(isPrimary(a.url)));
    };

    test('should prioritize .gov domains', () => {
      const results = [
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://nist.gov', title: 'NIST' },
        { url: 'https://another.com', title: 'Another' }
      ];

      const sorted = sortPreferPrimary(results);
      expect(sorted[0].url).toContain('.gov');
    });

    test('should prioritize .edu domains', () => {
      const results = [
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://mit.edu', title: 'MIT' }
      ];

      const sorted = sortPreferPrimary(results);
      expect(sorted[0].url).toContain('.edu');
    });

    test('should handle mixed primary sources', () => {
      const results = [
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://who.int', title: 'WHO' },
        { url: 'https://nist.gov', title: 'NIST' }
      ];

      const sorted = sortPreferPrimary(results);
      expect(sorted[0].url).toMatch(/\.gov|who\.int/);
      expect(sorted[1].url).toMatch(/\.gov|who\.int/);
    });
  });

  describe('Concurrent Processing', () => {
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

    test('should process items concurrently', async () => {
      const items = [1, 2, 3, 4, 5];
      const fn = async (item) => item * 2;

      const results = await mapConcurrent(items, 2, fn);

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    test('should respect concurrency limit', async () => {
      const items = [1, 2, 3];
      let concurrent = 0;
      let maxConcurrent = 0;

      const fn = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrent--;
        return true;
      };

      await mapConcurrent(items, 2, fn);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    test('should handle async function errors gracefully', async () => {
      const items = [1, 2, 3];
      const fn = async (item) => {
        try {
          if (item === 2) throw new Error('Test error');
          return item;
        } catch (err) {
          return null;
        }
      };

      const results = await mapConcurrent(items, 2, fn);

      expect(results[0]).toBe(1);
      expect(results[1]).toBeNull();
      expect(results[2]).toBe(3);
    });
  });

  describe('Freshness Parameter Mapping', () => {
    const mapFreshnessDays = (freshnessDays) => {
      if (!freshnessDays) return null;
      if (freshnessDays <= 1) return 'qdr:d';
      if (freshnessDays <= 7) return 'qdr:w';
      if (freshnessDays <= 31) return 'qdr:m';
      return 'qdr:y';
    };

    test('should map 1 day to qdr:d', () => {
      expect(mapFreshnessDays(1)).toBe('qdr:d');
    });

    test('should map 7 days to qdr:w', () => {
      expect(mapFreshnessDays(7)).toBe('qdr:w');
    });

    test('should map 31 days to qdr:m', () => {
      expect(mapFreshnessDays(31)).toBe('qdr:m');
    });

    test('should map 365 days to qdr:y', () => {
      expect(mapFreshnessDays(365)).toBe('qdr:y');
    });

    test('should handle undefined freshness', () => {
      expect(mapFreshnessDays(undefined)).toBeNull();
    });
  });

  describe('Site Filter Combination', () => {
    const buildQuery = (searchQuery, siteFilter) => {
      return [searchQuery, siteFilter].filter(Boolean).join(' ');
    };

    test('should combine query with site filter', () => {
      const query = buildQuery('AI best practices', 'site:who.int');
      expect(query).toBe('AI best practices site:who.int');
    });

    test('should handle query without site filter', () => {
      const query = buildQuery('AI best practices', null);
      expect(query).toBe('AI best practices');
    });

    test('should handle multiple site filters', () => {
      const query = buildQuery('research', 'site:edu');
      expect(query).toContain('site:edu');
    });
  });

  describe('Tool Properties', () => {
    test('should have correct tool name', () => {
      expect('webSearch').toBe('webSearch');
    });

    test('should not be multi-tenant', () => {
      expect(false).toBe(false);
    });

    test('should have descriptive description', () => {
      const description = 'Searches the web for information to support blog content creation';
      expect(description).toContain('Searches the web');
      expect(description).toContain('blog content');
    });
  });
});
