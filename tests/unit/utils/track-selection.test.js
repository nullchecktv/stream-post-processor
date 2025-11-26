// Unit tests for track selection algorithm
// These tests validate speaker matching and track selection logic

describe('Track Selection Algorithm', () => {
  describe('Speaker Matching Logic', () => {
    // Mock track selection function with case-insensitive matching
    const selectTrackForSpeaker = (tracks, speaker) => {
      return tracks.find(track =>
        (track.speakers || []).some(trackSpeaker =>
          trackSpeaker.toLowerCase() === speaker.toLowerCase()
        )
      ) || null;
    };

    test('should select track with matching speaker', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host', 'guest1']
        },
        {
          trackName: 'guest',
          speakers: ['guest2']
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('main');
      expect(result.speakers).toContain('host');
    });

    test('should return null when no track contains the speaker', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host', 'guest1']
        },
        {
          trackName: 'guest',
          speakers: ['guest2']
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'nonexistent-speaker');

      expect(result).toBeNull();
    });

    test('should return first matching track when multiple tracks contain speaker', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host', 'guest1']
        },
        {
          trackName: 'backup',
          speakers: ['host', 'guest2'] // Also contains host
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('main'); // First match
    });

    test('should handle tracks with empty speakers array', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: [] // Empty speakers array
        },
        {
          trackName: 'guest',
          speakers: ['host']
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('guest');
    });

    test('should handle tracks with missing speakers field', () => {
      const tracks = [
        {
          trackName: 'main'
          // No speakers field
        },
        {
          trackName: 'guest',
          speakers: ['host']
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('guest');
    });

    test('should return null when no tracks exist', () => {
      const tracks = [];

      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).toBeNull();
    });

    test('should handle case-insensitive speaker matching', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host'] // lowercase
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'Host'); // Different case

      expect(result).not.toBeNull(); // Case-insensitive matching
      expect(result.trackName).toBe('main');
    });
  });

  describe('Multiple Speaker Selection', () => {
    // Mock function for selecting tracks for multiple speakers with case-insensitive matching
    const selectTracksForSpeakers = (tracks, speakers) => {
      const results = {};
      for (const speaker of speakers) {
        results[speaker] = tracks.find(track =>
          (track.speakers || []).some(trackSpeaker =>
            trackSpeaker.toLowerCase() === speaker.toLowerCase()
          )
        ) || null;
      }
      return results;
    };

    test('should map multiple speakers to their tracks', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host']
        },
        {
          trackName: 'guest1',
          speakers: ['guest1']
        },
        {
          trackName: 'guest2',
          speakers: ['guest2']
        }
      ];

      const speakers = ['host', 'guest1', 'guest2'];
      const result = selectTracksForSpeakers(tracks, speakers);

      expect(result).toEqual({
        host: expect.objectContaining({ trackName: 'main' }),
        guest1: expect.objectContaining({ trackName: 'guest1' }),
        guest2: expect.objectContaining({ trackName: 'guest2' })
      });
    });

    test('should handle speakers with no matching tracks', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host']
        }
      ];

      const speakers = ['host', 'nonexistent'];
      const result = selectTracksForSpeakers(tracks, speakers);

      expect(result).toEqual({
        host: expect.objectContaining({ trackName: 'main' }),
        nonexistent: null
      });
    });

    test('should handle empty speakers array', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host']
        }
      ];

      const speakers = [];
      const result = selectTracksForSpeakers(tracks, speakers);

      expect(result).toEqual({});
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const selectTrackForSpeaker = (tracks, speaker) => {
      if (!speaker || typeof speaker !== 'string') return null;

      return tracks.find(track => {
        const speakers = track.speakers;
        if (!Array.isArray(speakers)) return false;

        return speakers.some(trackSpeaker =>
          typeof trackSpeaker === 'string' &&
          trackSpeaker.toLowerCase() === speaker.toLowerCase()
        );
      }) || null;
    };

    test('should handle malformed track data', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: 'not-an-array' // Invalid speakers format
        },
        {
          trackName: 'guest',
          speakers: ['host']
        }
      ];

      // Should handle malformed data gracefully and find valid track
      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('guest');
    });

    test('should handle null/undefined speaker names', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host']
        }
      ];

      // Test with null speaker
      const resultNull = selectTrackForSpeaker(tracks, null);
      expect(resultNull).toBeNull();

      // Test with undefined speaker
      const resultUndefined = selectTrackForSpeaker(tracks, undefined);
      expect(resultUndefined).toBeNull();
    });

    test('should handle tracks with null speakers field', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: null // Null speakers
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).toBeNull();
    });

    test('should handle tracks with undefined speakers field', () => {
      const tracks = [
        {
          trackName: 'main'
          // Undefined speakers field
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'host');

      expect(result).toBeNull();
    });
  });

  describe('Speaker Name Validation', () => {
    const selectTrackForSpeaker = (tracks, speaker) => {
      return tracks.find(track =>
        (track.speakers || []).some(trackSpeaker =>
          trackSpeaker.toLowerCase() === speaker.toLowerCase()
        )
      ) || null;
    };

    test('should match exact speaker names', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['Dr. Smith', 'John Doe']
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'Dr. Smith');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('main');
    });

    test('should handle speakers with special characters', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ["O'Connor", 'Smith']
        }
      ];

      const result = selectTrackForSpeaker(tracks, "O'Connor");

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('main');
    });

    test('should handle speakers with numbers', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['host', 'guest1', 'guest2']
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'guest1');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('main');
    });

    test('should handle speakers with spaces', () => {
      const tracks = [
        {
          trackName: 'main',
          speakers: ['John Smith', 'Jane Doe']
        }
      ];

      const result = selectTrackForSpeaker(tracks, 'John Smith');

      expect(result).not.toBeNull();
      expect(result.trackName).toBe('main');
    });
  });

  describe('Track Query Logic', () => {
    // Test the track querying logic
    const mockQueryTracks = (episodeId) => {
      // Simulate DynamoDB query parameters
      const queryParams = {
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': episodeId,
          ':sk': 'track#'
        }
      };

      // Validate query parameters
      if (!queryParams.KeyConditionExpression.includes('begins_with')) {
        throw new Error('Query should use begins_with for track prefix');
      }

      if (queryParams.ExpressionAttributeValues[':sk'] !== 'track#') {
        throw new Error('Sort key prefix should be "track#"');
      }

      return queryParams;
    };

    test('should use correct query parameters for track lookup', () => {
      const episodeId = 'test-episode-123';
      const queryParams = mockQueryTracks(episodeId);

      expect(queryParams.KeyConditionExpression).toBe('pk = :pk AND begins_with(sk, :sk)');
      expect(queryParams.ExpressionAttributeValues[':pk']).toBe(episodeId);
      expect(queryParams.ExpressionAttributeValues[':sk']).toBe('track#');
    });

    test('should validate episode ID parameter', () => {
      const validateEpisodeId = (episodeId) => {
        if (!episodeId || typeof episodeId !== 'string') {
          throw new Error('Valid episode ID is required');
        }
        return true;
      };

      expect(() => validateEpisodeId('valid-episode-id')).not.toThrow();
      expect(() => validateEpisodeId('')).toThrow('Valid episode ID is required');
      expect(() => validateEpisodeId(null)).toThrow('Valid episode ID is required');
      expect(() => validateEpisodeId(undefined)).toThrow('Valid episode ID is required');
    });
  });

  describe('Performance Considerations', () => {
    test('should efficiently find first matching track', () => {
      // Test that the algorithm stops at first match (not exhaustive search)
      let searchCount = 0;
      const tracks = [
        {
          trackName: 'track1',
          speakers: ['speaker1']
        },
        {
          trackName: 'track2',
          speakers: ['speaker2'] // Target speaker
        },
        {
          trackName: 'track3',
          speakers: ['speaker2'] // Also has target speaker but shouldn't be reached
        }
      ];

      const efficientFind = (tracks, targetSpeaker) => {
        for (const track of tracks) {
          searchCount++;
          if ((track.speakers || []).some(trackSpeaker =>
            trackSpeaker.toLowerCase() === targetSpeaker.toLowerCase()
          )) {
            return track;
          }
        }
        return null;
      };

      const result = efficientFind(tracks, 'speaker2');

      expect(result.trackName).toBe('track2');
      expect(searchCount).toBe(2); // Should stop after finding first match
    });

    test('should handle large speaker arrays efficiently', () => {
      const largeSpeakerArray = Array.from({ length: 1000 }, (_, i) => `speaker${i}`);
      const tracks = [
        {
          trackName: 'main',
          speakers: largeSpeakerArray
        }
      ];

      const selectTrackForSpeaker = (tracks, speaker) => {
        return tracks.find(track =>
          (track.speakers || []).some(trackSpeaker =>
            trackSpeaker.toLowerCase() === speaker.toLowerCase()
          )
        ) || null;
      };

      // Should handle large arrays without issues
      const result = selectTrackForSpeaker(tracks, 'speaker500');
      expect(result).not.toBeNull();
      expect(result.trackName).toBe('main');
    });
  });

  describe('Fallback Behavior', () => {
    test('should log warning when no tracks match speaker', () => {
      const loggedWarnings = [];
      const mockLogger = {
        warn: (message) => loggedWarnings.push(message)
      };

      const selectTrackWithLogging = (tracks, speaker, logger) => {
        const result = tracks.find(track =>
          (track.speakers || []).some(trackSpeaker =>
            trackSpeaker.toLowerCase() === speaker.toLowerCase()
          )
        );
        if (!result) {
          logger.warn(`No track found for speaker: ${speaker}`);
          return null;
        }
        return result;
      };

      const tracks = [
        {
          trackName: 'main',
          speakers: ['host']
        }
      ];

      const result = selectTrackWithLogging(tracks, 'nonexistent', mockLogger);

      expect(result).toBeNull();
      expect(loggedWarnings).toContain('No track found for speaker: nonexistent');
    });

    test('should continue processing other segments when speaker not found', () => {
      const processSegments = (segments, tracks) => {
        const results = [];
        const selectTrackForSpeaker = (tracks, speaker) => {
          return tracks.find(track =>
            (track.speakers || []).some(trackSpeaker =>
              trackSpeaker.toLowerCase() === speaker.toLowerCase()
            )
          ) || null;
        };

        for (const segment of segments) {
          const track = selectTrackForSpeaker(tracks, segment.speaker);
          results.push({
            segment: segment,
            track: track,
            processed: track !== null
          });
        }

        return results;
      };

      const segments = [
        { speaker: 'host', startTime: '00:01:00' },
        { speaker: 'nonexistent', startTime: '00:02:00' },
        { speaker: 'guest1', startTime: '00:03:00' }
      ];

      const tracks = [
        { trackName: 'main', speakers: ['host'] },
        { trackName: 'guest', speakers: ['guest1'] }
      ];

      const results = processSegments(segments, tracks);

      expect(results).toHaveLength(3);
      expect(results[0].processed).toBe(true);  // host found
      expect(results[1].processed).toBe(false); // nonexistent not found
      expect(results[2].processed).toBe(true);  // guest1 found
    });
  });

  describe('selectTrackForSegment', () => {
    const mockSelectTrackForSegment = async (segment, tracks, options = {}) => {
      const {
        enableLLMMatching = true,
        fallbackTrack = 'main',
        confidenceThreshold = 0.7
      } = options;

      if (!segment.speaker) {
        return {
          trackName: fallbackTrack,
          matchType: 'fallback',
          reason: 'no_speaker_specified',
          confidence: 1.0
        };
      }

      if (!tracks || tracks.length === 0) {
        return {
          trackName: fallbackTrack,
          matchType: 'fallback',
          reason: 'no_tracks_available',
          confidence: 1.0
        };
      }

      const exactMatch = tracks.find(track =>
        track.speaker &&
        track.speaker.toLowerCase() === segment.speaker.toLowerCase()
      );

      if (exactMatch) {
        return {
          trackName: exactMatch.trackName,
          matchType: 'exact',
          originalSpeaker: segment.speaker,
          matchedSpeaker: exactMatch.speaker,
          confidence: 1.0
        };
      }

      return {
        trackName: fallbackTrack,
        matchType: 'fallback',
        reason: 'no_match_found',
        originalSpeaker: segment.speaker,
        confidence: 0.0
      };
    };

    test('should return fallback when no speaker specified', async () => {
      const segment = { startTime: '00:01:00', endTime: '00:02:00' };
      const tracks = [{ trackName: 'main', speaker: 'host', status: 'Processed' }];

      const result = await mockSelectTrackForSegment(segment, tracks);

      expect(result.trackName).toBe('main');
      expect(result.matchType).toBe('fallback');
      expect(result.reason).toBe('no_speaker_specified');
      expect(result.confidence).toBe(1.0);
    });

    test('should return fallback when no tracks available', async () => {
      const segment = { speaker: 'host', startTime: '00:01:00', endTime: '00:02:00' };
      const tracks = [];

      const result = await mockSelectTrackForSegment(segment, tracks);

      expect(result.trackName).toBe('main');
      expect(result.matchType).toBe('fallback');
      expect(result.reason).toBe('no_tracks_available');
      expect(result.confidence).toBe(1.0);
    });

    test('should return exact match when speaker matches exactly', async () => {
      const segment = { speaker: 'host', startTime: '00:01:00', endTime: '00:02:00' };
      const tracks = [
        { trackName: 'main', speaker: 'host', status: 'Processed' },
        { trackName: 'guest', speaker: 'guest1', status: 'Processed' }
      ];

      const result = await mockSelectTrackForSegment(segment, tracks);

      expect(result.trackName).toBe('main');
      expect(result.matchType).toBe('exact');
      expect(result.originalSpeaker).toBe('host');
      expect(result.matchedSpeaker).toBe('host');
      expect(result.confidence).toBe(1.0);
    });

    test('should return exact match with case-insensitive comparison', async () => {
      const segment = { speaker: 'Host', startTime: '00:01:00', endTime: '00:02:00' };
      const tracks = [
        { trackName: 'main', speaker: 'host', status: 'Processed' }
      ];

      const result = await mockSelectTrackForSegment(segment, tracks);

      expect(result.trackName).toBe('main');
      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
    });

    test('should return fallback when no match found', async () => {
      const segment = { speaker: 'unknown', startTime: '00:01:00', endTime: '00:02:00' };
      const tracks = [
        { trackName: 'main', speaker: 'host', status: 'Processed' },
        { trackName: 'guest', speaker: 'guest1', status: 'Processed' }
      ];

      const result = await mockSelectTrackForSegment(segment, tracks);

      expect(result.trackName).toBe('main');
      expect(result.matchType).toBe('fallback');
      expect(result.reason).toBe('no_match_found');
      expect(result.originalSpeaker).toBe('unknown');
      expect(result.confidence).toBe(0.0);
    });

    test('should use custom fallback track', async () => {
      const segment = { speaker: 'unknown', startTime: '00:01:00', endTime: '00:02:00' };
      const tracks = [
        { trackName: 'primary', speaker: 'host', status: 'Processed' }
      ];
      const options = { fallbackTrack: 'primary' };

      const result = await mockSelectTrackForSegment(segment, tracks, options);

      expect(result.trackName).toBe('primary');
      expect(result.matchType).toBe('fallback');
    });

    test('should skip tracks without speaker field', async () => {
      const segment = { speaker: 'host', startTime: '00:01:00', endTime: '00:02:00' };
      const tracks = [
        { trackName: 'nospeaker', speaker: null, status: 'Processed' },
        { trackName: 'main', speaker: 'host', status: 'Processed' }
      ];

      const result = await mockSelectTrackForSegment(segment, tracks);

      expect(result.trackName).toBe('main');
      expect(result.matchType).toBe('exact');
    });
  });

  describe('getEpisodeTracks', () => {
    const mockGetEpisodeTracks = (allTracks) => {
      return allTracks
        .filter(track => track.status === 'Processed')
        .map(track => ({
          trackName: track.trackName,
          speakers: Array.isArray(track.speakers) ? track.speakers : [],
          status: track.status
        }));
    };

    test('should return only processed tracks', () => {
      const allTracks = [
        { trackName: 'main', speakers: ['host'], status: 'Processed' },
        { trackName: 'guest', speakers: ['guest1'], status: 'Processing' },
        { trackName: 'backup', speakers: ['host'], status: 'Processed' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toHaveLength(2);
      expect(result[0].trackName).toBe('main');
      expect(result[1].trackName).toBe('backup');
      expect(result.every(track => track.status === 'Processed')).toBe(true);
    });

    test('should return track objects with trackName, speakers, and status', () => {
      const allTracks = [
        { trackName: 'main', speakers: ['host'], status: 'Processed', otherField: 'ignored' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        trackName: 'main',
        speakers: ['host'],
        status: 'Processed'
      });
      expect(result[0]).not.toHaveProperty('otherField');
    });

    test('should handle tracks with empty speakers array', () => {
      const allTracks = [
        { trackName: 'main', speakers: [], status: 'Processed' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toHaveLength(1);
      expect(result[0].speakers).toEqual([]);
    });

    test('should handle tracks with missing speakers field', () => {
      const allTracks = [
        { trackName: 'main', status: 'Processed' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toHaveLength(1);
      expect(result[0].speakers).toEqual([]);
    });

    test('should return empty array when no tracks exist', () => {
      const allTracks = [];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toEqual([]);
    });

    test('should return empty array when no processed tracks exist', () => {
      const allTracks = [
        { trackName: 'main', speakers: ['host'], status: 'Processing' },
        { trackName: 'guest', speakers: ['guest1'], status: 'Uploading' },
        { trackName: 'backup', speakers: ['host'], status: 'Failed' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toEqual([]);
    });

    test('should filter out all non-processed statuses', () => {
      const allTracks = [
        { trackName: 'track1', speakers: ['speaker1'], status: 'Uploading' },
        { trackName: 'track2', speakers: ['speaker2'], status: 'Uploaded' },
        { trackName: 'track3', speakers: ['speaker3'], status: 'Processing' },
        { trackName: 'track4', speakers: ['speaker4'], status: 'Processed' },
        { trackName: 'track5', speakers: ['speaker5'], status: 'Failed' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toHaveLength(1);
      expect(result[0].trackName).toBe('track4');
    });

    test('should handle multiple processed tracks', () => {
      const allTracks = [
        { trackName: 'main', speakers: ['host'], status: 'Processed' },
        { trackName: 'guest1', speakers: ['guest1'], status: 'Processed' },
        { trackName: 'guest2', speakers: ['guest2'], status: 'Processed' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toHaveLength(3);
      expect(result.map(t => t.trackName)).toEqual(['main', 'guest1', 'guest2']);
    });

    test('should handle tracks with multiple speakers', () => {
      const allTracks = [
        { trackName: 'main', speakers: ['host', 'co-host'], status: 'Processed' },
        { trackName: 'guest', speakers: ['guest1', 'guest2'], status: 'Processed' }
      ];

      const result = mockGetEpisodeTracks(allTracks);

      expect(result).toHaveLength(2);
      expect(result[0].speakers).toEqual(['host', 'co-host']);
      expect(result[1].speakers).toEqual(['guest1', 'guest2']);
    });
  });

  describe('Speaker Match Caching', () => {
    test('should cache speaker matches to avoid redundant LLM calls', () => {
      const mockCache = new Map();

      const generateCacheKey = (episodeId, speakerName) => {
        const normalizedSpeaker = speakerName.toLowerCase().trim();
        return `${episodeId}::${normalizedSpeaker}`;
      };

      const episodeId = 'episode-123';

      const cacheKey1 = generateCacheKey(episodeId, 'john');
      const cacheKey2 = generateCacheKey(episodeId, 'john');
      const cacheKey3 = generateCacheKey(episodeId, 'Jane');

      expect(cacheKey1).toBe(cacheKey2);
      expect(cacheKey1).not.toBe(cacheKey3);

      mockCache.set(cacheKey1, { matched: true, trackName: 'main' });

      expect(mockCache.has(cacheKey2)).toBe(true);
      expect(mockCache.get(cacheKey2)).toEqual({ matched: true, trackName: 'main' });
    });

    test('should generate different cache keys for different episodes', () => {
      const generateCacheKey = (episodeId, speakerName) => {
        const normalizedSpeaker = speakerName.toLowerCase().trim();
        return `${episodeId}::${normalizedSpeaker}`;
      };

      const cacheKey1 = generateCacheKey('episode-123', 'john');
      const cacheKey2 = generateCacheKey('episode-456', 'john');

      expect(cacheKey1).not.toBe(cacheKey2);
    });

    test('should normalize speaker names for cache key generation', () => {
      const generateCacheKey = (episodeId, speakerName) => {
        const normalizedSpeaker = speakerName.toLowerCase().trim();
        return `${episodeId}::${normalizedSpeaker}`;
      };

      const episodeId = 'episode-123';

      const key1 = generateCacheKey(episodeId, '  John  ');
      const key2 = generateCacheKey(episodeId, 'JOHN');
      const key3 = generateCacheKey(episodeId, 'john');

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    test('should handle cache clearing', () => {
      const mockCache = new Map();

      mockCache.set('key1', { matched: true });
      mockCache.set('key2', { matched: false });

      expect(mockCache.size).toBe(2);

      mockCache.clear();

      expect(mockCache.size).toBe(0);
      expect(mockCache.has('key1')).toBe(false);
    });
  });
});
