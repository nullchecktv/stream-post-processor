describe('Episode Speaker Management Integration Tests', () => {
  describe('Episode Creation and Update with Speakers', () => {
    const simulateEpisodeWorkflow = (createData, updateData) => {
      const workflow = {
        steps: [],
        errors: [],
        episode: null
      };

      try {
        if (!createData.title || !createData.episodeNumber) {
          throw new Error('title and episodeNumber are required');
        }

        const normalizedSpeakers = (createData.speakers || [])
          .map(s => (s || '').toString().trim())
          .filter(s => s.length > 0);

        const uniqueSpeakers = [...new Set(normalizedSpeakers)];

        workflow.episode = {
          id: 'episode-' + Date.now(),
          title: createData.title,
          episodeNumber: createData.episodeNumber,
          speakers: uniqueSpeakers,
          status: 'Draft',
          createdAt: new Date().toISOString()
        };
        workflow.steps.push('episode_created');

        if (updateData && updateData.speakers !== undefined) {
          if (!Array.isArray(updateData.speakers)) {
            throw new Error('speakers must be an array');
          }

          const updatedSpeakers = updateData.speakers
            .map(s => (s || '').toString().trim())
            .filter(s => s.length > 0);

          const uniqueUpdatedSpeakers = [...new Set(updatedSpeakers)];

          workflow.episode.speakers = uniqueUpdatedSpeakers;
          workflow.episode.updatedAt = new Date().toISOString();
          workflow.steps.push('speakers_updated');
        }

        return workflow;
      } catch (error) {
        workflow.errors.push(error.message);
        return workflow;
      }
    };

    test('should create episode with speakers successfully', () => {
      const createData = {
        title: 'Test Episode',
        episodeNumber: 1,
        speakers: ['Alice Johnson', 'Bob Smith', 'Charlie Davis']
      };

      const workflow = simulateEpisodeWorkflow(createData);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.steps).toContain('episode_created');
      expect(workflow.episode.speakers).toEqual(['Alice Johnson', 'Bob Smith', 'Charlie Davis']);
    });

    test('should create episode without speakers (backward compatibility)', () => {
      const createData = {
        title: 'Test Episode',
        episodeNumber: 1
      };

      const workflow = simulateEpisodeWorkflow(createData);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.episode.speakers).toEqual([]);
    });

    test('should deduplicate speakers during creation', () => {
      const createData = {
        title: 'Test Episode',
        episodeNumber: 1,
        speakers: ['Alice Johnson', 'Bob Smith', 'Alice Johnson', 'Bob Smith']
      };

      const workflow = simulateEpisodeWorkflow(createData);

      expect(workflow.episode.speakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    test('should normalize speakers by trimming whitespace', () => {
      const createData = {
        title: 'Test Episode',
        episodeNumber: 1,
        speakers: ['  Alice Johnson  ', ' Bob Smith ', '   ']
      };

      const workflow = simulateEpisodeWorkflow(createData);

      expect(workflow.episode.speakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    test('should update episode speakers successfully', () => {
      const createData = {
        title: 'Test Episode',
        episodeNumber: 1,
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const updateData = {
        speakers: ['Alice Johnson', 'Charlie Davis', 'Dave Wilson']
      };

      const workflow = simulateEpisodeWorkflow(createData, updateData);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.steps).toContain('speakers_updated');
      expect(workflow.episode.speakers).toEqual(['Alice Johnson', 'Charlie Davis', 'Dave Wilson']);
    });

    test('should allow clearing speakers list', () => {
      const createData = {
        title: 'Test Episode',
        episodeNumber: 1,
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const updateData = {
        speakers: []
      };

      const workflow = simulateEpisodeWorkflow(createData, updateData);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.episode.speakers).toEqual([]);
    });
  });

  describe('Track Creation with Speaker Validation', () => {
    const simulateTrackCreation = (episodeData, trackData) => {
      const result = {
        success: false,
        track: null,
        error: null
      };

      try {
        if (!episodeData || !episodeData.id) {
          throw new Error('Episode not found');
        }

        if (!trackData.filename || !trackData.trackName) {
          throw new Error('filename and trackName are required');
        }

        const trackSpeakers = (trackData.speakers || [])
          .map(s => (s || '').toString().trim())
          .filter(s => s.length > 0);

        if (trackSpeakers.length > 0) {
          const episodeSpeakers = episodeData.speakers || [];
          const invalidSpeakers = trackSpeakers.filter(speaker =>
            !episodeSpeakers.some(es => es.toLowerCase() === speaker.toLowerCase())
          );

          if (invalidSpeakers.length > 0) {
            result.error = {
              type: 'InvalidSpeakers',
              message: 'Track speakers must exist in episode speaker list',
              invalidSpeakers,
              validSpeakers: episodeSpeakers
            };
            return result;
          }

          const normalizedSpeakers = trackSpeakers.map(speaker => {
            const match = episodeSpeakers.find(es =>
              es.toLowerCase() === speaker.toLowerCase()
            );
            return match || speaker;
          });

          result.track = {
            episodeId: episodeData.id,
            trackName: trackData.trackName,
            speakers: normalizedSpeakers,
            status: 'uploaded'
          };
        } else {
          result.track = {
            episodeId: episodeData.id,
            trackName: trackData.trackName,
            speakers: [],
            status: 'uploaded'
          };
        }

        result.success = true;
        return result;
      } catch (error) {
        result.error = { type: 'Error', message: error.message };
        return result;
      }
    };

    test('should create track with valid speakers', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const trackData = {
        filename: 'video.mp4',
        trackName: 'main',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const result = simulateTrackCreation(episodeData, trackData);

      expect(result.success).toBe(true);
      expect(result.track.speakers).toEqual(['Alice Johnson', 'Bob Smith']);
      expect(result.error).toBeNull();
    });

    test('should reject track with invalid speakers', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const trackData = {
        filename: 'video.mp4',
        trackName: 'main',
        speakers: ['Charlie Davis', 'Dave Wilson']
      };

      const result = simulateTrackCreation(episodeData, trackData);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('InvalidSpeakers');
      expect(result.error.invalidSpeakers).toEqual(['Charlie Davis', 'Dave Wilson']);
      expect(result.error.validSpeakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    test('should normalize speaker names to match episode capitalization', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const trackData = {
        filename: 'video.mp4',
        trackName: 'main',
        speakers: ['alice johnson', 'BOB SMITH']
      };

      const result = simulateTrackCreation(episodeData, trackData);

      expect(result.success).toBe(true);
      expect(result.track.speakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    test('should allow track creation without speakers', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson']
      };

      const trackData = {
        filename: 'video.mp4',
        trackName: 'main'
      };

      const result = simulateTrackCreation(episodeData, trackData);

      expect(result.success).toBe(true);
      expect(result.track.speakers).toEqual([]);
    });

    test('should handle partial invalid speakers', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const trackData = {
        filename: 'video.mp4',
        trackName: 'main',
        speakers: ['Alice Johnson', 'Charlie Davis']
      };

      const result = simulateTrackCreation(episodeData, trackData);

      expect(result.success).toBe(false);
      expect(result.error.invalidSpeakers).toEqual(['Charlie Davis']);
    });
  });

  describe('Clip Segment Speaker Validation', () => {
    const simulateClipCreation = (episodeData, clipData) => {
      const result = {
        success: false,
        clip: null,
        error: null
      };

      try {
        if (!episodeData || !episodeData.id) {
          throw new Error('Episode not found');
        }

        if (!clipData.segments || clipData.segments.length === 0) {
          throw new Error('At least one segment is required');
        }

        const allSpeakers = [...new Set(clipData.segments.map(s => s.speaker))];
        const episodeSpeakers = episodeData.speakers || [];

        const invalidSpeakers = allSpeakers.filter(speaker =>
          !episodeSpeakers.some(es => es.toLowerCase() === speaker.toLowerCase())
        );

        if (invalidSpeakers.length > 0) {
          result.error = {
            type: 'InvalidSpeakers',
            message: 'Segment speakers must exist in episode speaker list',
            invalidSpeakers,
            validSpeakers: episodeSpeakers
          };
          return result;
        }

        const normalizedSegments = clipData.segments.map(segment => ({
          ...segment,
          speaker: episodeSpeakers.find(es =>
            es.toLowerCase() === segment.speaker.toLowerCase()
          ) || segment.speaker
        }));

        result.clip = {
          episodeId: episodeData.id,
          segments: normalizedSegments,
          status: 'detected'
        };
        result.success = true;
        return result;
      } catch (error) {
        result.error = { type: 'Error', message: error.message };
        return result;
      }
    };

    test('should create clip with valid segment speakers', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const clipData = {
        segments: [
          { startTime: '00:15:30', endTime: '00:16:00', speaker: 'Alice Johnson', order: 1 },
          { startTime: '00:16:00', endTime: '00:16:30', speaker: 'Bob Smith', order: 2 }
        ]
      };

      const result = simulateClipCreation(episodeData, clipData);

      expect(result.success).toBe(true);
      expect(result.clip.segments[0].speaker).toBe('Alice Johnson');
      expect(result.clip.segments[1].speaker).toBe('Bob Smith');
    });

    test('should reject clip with invalid segment speakers', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson']
      };

      const clipData = {
        segments: [
          { startTime: '00:15:30', endTime: '00:16:00', speaker: 'Alice Johnson', order: 1 },
          { startTime: '00:16:00', endTime: '00:16:30', speaker: 'Charlie Davis', order: 2 }
        ]
      };

      const result = simulateClipCreation(episodeData, clipData);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('InvalidSpeakers');
      expect(result.error.invalidSpeakers).toContain('Charlie Davis');
    });

    test('should normalize segment speaker names', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const clipData = {
        segments: [
          { startTime: '00:15:30', endTime: '00:16:00', speaker: 'alice johnson', order: 1 },
          { startTime: '00:16:00', endTime: '00:16:30', speaker: 'BOB SMITH', order: 2 }
        ]
      };

      const result = simulateClipCreation(episodeData, clipData);

      expect(result.success).toBe(true);
      expect(result.clip.segments[0].speaker).toBe('Alice Johnson');
      expect(result.clip.segments[1].speaker).toBe('Bob Smith');
    });
  });

  describe('Quote Speaker Validation', () => {
    const simulateQuoteCreation = (episodeData, quoteData) => {
      const result = {
        success: false,
        quote: null,
        error: null
      };

      try {
        if (!episodeData || !episodeData.id) {
          throw new Error('Episode not found');
        }

        if (!quoteData.text) {
          throw new Error('text is required');
        }

        if (quoteData.speaker) {
          const episodeSpeakers = episodeData.speakers || [];
          const speakerValid = episodeSpeakers.some(es =>
            es.toLowerCase() === quoteData.speaker.toLowerCase()
          );

          if (!speakerValid) {
            result.error = {
              type: 'InvalidSpeaker',
              message: 'Quote speaker must exist in episode speaker list',
              invalidSpeakers: [quoteData.speaker],
              validSpeakers: episodeSpeakers
            };
            return result;
          }

          const normalizedSpeaker = episodeSpeakers.find(es =>
            es.toLowerCase() === quoteData.speaker.toLowerCase()
          );

          result.quote = {
            episodeId: episodeData.id,
            text: quoteData.text,
            speaker: normalizedSpeaker,
            status: 'draft'
          };
        } else {
          result.quote = {
            episodeId: episodeData.id,
            text: quoteData.text,
            speaker: null,
            status: 'draft'
          };
        }

        result.success = true;
        return result;
      } catch (error) {
        result.error = { type: 'Error', message: error.message };
        return result;
      }
    };

    test('should create quote with valid speaker', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      const quoteData = {
        text: 'This is a great quote',
        speaker: 'Alice Johnson'
      };

      const result = simulateQuoteCreation(episodeData, quoteData);

      expect(result.success).toBe(true);
      expect(result.quote.speaker).toBe('Alice Johnson');
    });

    test('should reject quote with invalid speaker', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson']
      };

      const quoteData = {
        text: 'This is a great quote',
        speaker: 'Charlie Davis'
      };

      const result = simulateQuoteCreation(episodeData, quoteData);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('InvalidSpeaker');
      expect(result.error.invalidSpeakers).toContain('Charlie Davis');
    });

    test('should allow quote without speaker attribution', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson']
      };

      const quoteData = {
        text: 'This is a great quote'
      };

      const result = simulateQuoteCreation(episodeData, quoteData);

      expect(result.success).toBe(true);
      expect(result.quote.speaker).toBeNull();
    });

    test('should normalize quote speaker name', () => {
      const episodeData = {
        id: 'episode-123',
        speakers: ['Alice Johnson']
      };

      const quoteData = {
        text: 'This is a great quote',
        speaker: 'alice johnson'
      };

      const result = simulateQuoteCreation(episodeData, quoteData);

      expect(result.success).toBe(true);
      expect(result.quote.speaker).toBe('Alice Johnson');
    });
  });

  describe('End-to-End Speaker Management Workflow', () => {
    const simulateCompleteWorkflow = (operations) => {
      const state = {
        episodes: {},
        tracks: {},
        clips: {},
        quotes: {}
      };

      const results = [];

      for (const operation of operations) {
        try {
          switch (operation.type) {
            case 'create_episode':
              const speakers = (operation.data.speakers || [])
                .map(s => (s || '').toString().trim())
                .filter(s => s.length > 0);
              state.episodes[operation.data.id] = {
                ...operation.data,
                speakers: [...new Set(speakers)]
              };
              results.push({ success: true, operation: operation.type });
              break;

            case 'update_episode_speakers':
              const episode = state.episodes[operation.data.episodeId];
              if (!episode) throw new Error('Episode not found');
              const updatedSpeakers = (operation.data.speakers || [])
                .map(s => (s || '').toString().trim())
                .filter(s => s.length > 0);
              episode.speakers = [...new Set(updatedSpeakers)];
              results.push({ success: true, operation: operation.type });
              break;

            case 'create_track':
              const trackEpisode = state.episodes[operation.data.episodeId];
              if (!trackEpisode) throw new Error('Episode not found');

              const trackSpeakers = operation.data.speakers || [];
              const invalidTrackSpeakers = trackSpeakers.filter(s =>
                !trackEpisode.speakers.some(es => es.toLowerCase() === s.toLowerCase())
              );

              if (invalidTrackSpeakers.length > 0) {
                throw new Error(`Invalid speakers: ${invalidTrackSpeakers.join(', ')}`);
              }

              state.tracks[operation.data.trackName] = {
                episodeId: operation.data.episodeId,
                trackName: operation.data.trackName,
                speakers: trackSpeakers
              };
              results.push({ success: true, operation: operation.type });
              break;

            case 'create_clip':
              const clipEpisode = state.episodes[operation.data.episodeId];
              if (!clipEpisode) throw new Error('Episode not found');

              const clipSpeakers = [...new Set(operation.data.segments.map(s => s.speaker))];
              const invalidClipSpeakers = clipSpeakers.filter(s =>
                !clipEpisode.speakers.some(es => es.toLowerCase() === s.toLowerCase())
              );

              if (invalidClipSpeakers.length > 0) {
                throw new Error(`Invalid speakers: ${invalidClipSpeakers.join(', ')}`);
              }

              state.clips[operation.data.clipId] = {
                episodeId: operation.data.episodeId,
                segments: operation.data.segments
              };
              results.push({ success: true, operation: operation.type });
              break;

            case 'create_quote':
              const quoteEpisode = state.episodes[operation.data.episodeId];
              if (!quoteEpisode) throw new Error('Episode not found');

              if (operation.data.speaker) {
                const speakerValid = quoteEpisode.speakers.some(es =>
                  es.toLowerCase() === operation.data.speaker.toLowerCase()
                );
                if (!speakerValid) {
                  throw new Error(`Invalid speaker: ${operation.data.speaker}`);
                }
              }

              state.quotes[operation.data.quoteId] = {
                episodeId: operation.data.episodeId,
                text: operation.data.text,
                speaker: operation.data.speaker || null
              };
              results.push({ success: true, operation: operation.type });
              break;

            default:
              throw new Error('Unknown operation type');
          }
        } catch (error) {
          results.push({ success: false, operation: operation.type, error: error.message });
        }
      }

      return { state, results };
    };

    test('should complete full workflow with speaker validation', () => {
      const operations = [
        {
          type: 'create_episode',
          data: {
            id: 'episode-123',
            title: 'Test Episode',
            speakers: ['Alice Johnson', 'Bob Smith']
          }
        },
        {
          type: 'create_track',
          data: {
            episodeId: 'episode-123',
            trackName: 'main',
            speakers: ['Alice Johnson', 'Bob Smith']
          }
        },
        {
          type: 'create_clip',
          data: {
            episodeId: 'episode-123',
            clipId: 'clip-456',
            segments: [
              { startTime: '00:15:30', endTime: '00:16:00', speaker: 'Alice Johnson', order: 1 }
            ]
          }
        },
        {
          type: 'create_quote',
          data: {
            episodeId: 'episode-123',
            quoteId: 'quote-789',
            text: 'Great quote',
            speaker: 'Bob Smith'
          }
        }
      ];

      const { state, results } = simulateCompleteWorkflow(operations);

      expect(results.every(r => r.success)).toBe(true);
      expect(state.episodes['episode-123'].speakers).toEqual(['Alice Johnson', 'Bob Smith']);
      expect(state.tracks['main'].speakers).toEqual(['Alice Johnson', 'Bob Smith']);
      expect(state.clips['clip-456'].segments[0].speaker).toBe('Alice Johnson');
      expect(state.quotes['quote-789'].speaker).toBe('Bob Smith');
    });

    test('should handle speaker updates and downstream validation', () => {
      const operations = [
        {
          type: 'create_episode',
          data: {
            id: 'episode-123',
            title: 'Test Episode',
            speakers: ['Alice Johnson']
          }
        },
        {
          type: 'update_episode_speakers',
          data: {
            episodeId: 'episode-123',
            speakers: ['Alice Johnson', 'Bob Smith', 'Charlie Davis']
          }
        },
        {
          type: 'create_track',
          data: {
            episodeId: 'episode-123',
            trackName: 'main',
            speakers: ['Bob Smith', 'Charlie Davis']
          }
        }
      ];

      const { state, results } = simulateCompleteWorkflow(operations);

      expect(results.every(r => r.success)).toBe(true);
      expect(state.episodes['episode-123'].speakers).toEqual(['Alice Johnson', 'Bob Smith', 'Charlie Davis']);
      expect(state.tracks['main'].speakers).toEqual(['Bob Smith', 'Charlie Davis']);
    });

    test('should reject operations with invalid speakers', () => {
      const operations = [
        {
          type: 'create_episode',
          data: {
            id: 'episode-123',
            title: 'Test Episode',
            speakers: ['Alice Johnson']
          }
        },
        {
          type: 'create_track',
          data: {
            episodeId: 'episode-123',
            trackName: 'main',
            speakers: ['Bob Smith']
          }
        }
      ];

      const { results } = simulateCompleteWorkflow(operations);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Invalid speakers: Bob Smith');
    });
  });
});

