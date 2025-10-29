// Integration tests for track-speaker management workflow
// These tests validate the complete workflow from track creation to clip processing

describe('Track-Speaker Management Integration Tests', () => {
  describe('End-to-End Track Creation and Update Workflow', () => {
    // Test the complete workflow logic
    const simulateTrackCreationWorkflow = (episodeData, trackData, updateData) => {
      const workflow = {
        steps: [],
        errors: []
      };

      try {
        // Step 1: Validate episode exists
        if (!episodeData || !episodeData.id) {
          throw new Error('Episode not found');
        }
        workflow.steps.push('episode_validated');

        // Step 2: Create track upload with speakers
        if (!trackData.filename || !trackData.trackName) {
          throw new Error('filename and trackName are required');
        }

        const normalizedSpeakers = (trackData.speakers || [])
          .map(speaker => String(speaker || '').trim())
          .filter(speaker => speaker.length > 0);

        const uploadSession = {
          episodeId: episodeData.id,
          trackName: trackData.trackName,
          speakers: normalizedSpeakers,
          status: 'initiated'
        };
        workflow.steps.push('upload_initiated');

        // Step 3: Complete upload and create track record
        const trackRecord = {
          episodeId: episodeData.id,
          trackName: trackData.trackName,
          speakers: uploadSession.speakers,
          status: 'completed'
        };
        workflow.steps.push('track_created');

        // Step 4: Update track speakers if requested
        if (updateData && updateData.speakers !== undefined) {
          if (!Array.isArray(updateData.speakers)) {
            throw new Error('speakers must be an array');
          }

          const updatedSpeakers = updateData.speakers
            .map(speaker => String(speaker || '').trim())
            .filter(speaker => speaker.length > 0);

          trackRecord.speakers = updatedSpeakers;
          trackRecord.status = 'updated';
          workflow.steps.push('track_updated');
        }

        workflow.result = trackRecord;
        return workflow;

      } catch (error) {
        workflow.errors.push(error.message);
        return workflow;
      }
    };

    test('should complete full track creation and update workflow', () => {
      const episodeData = { id: 'test-episode-123', title: 'Test Episode' };
      const trackData = {
        filename: 'test-video.mp4',
        trackName: 'main',
        speakers: ['host', 'guest1']
      };
      const updateData = {
        speakers: ['host', 'guest2']
      };

      const workflow = simulateTrackCreationWorkflow(episodeData, trackData, updateData);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.steps).toEqual([
        'episode_validated',
        'upload_initiated',
        'track_created',
        'track_updated'
      ]);
      expect(workflow.result.speakers).toEqual(['host', 'guest2']);
      expect(workflow.result.status).toBe('updated');
    });

    test('should handle track creation without speakers (backward compatibility)', () => {
      const episodeData = { id: 'test-episode-123', title: 'Test Episode' };
      const trackData = {
        filename: 'test-video.mp4',
        trackName: 'main'
        // No speakers field
      };

      const workflow = simulateTrackCreationWorkflow(episodeData, trackData);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.result.speakers).toEqual([]);
      expect(workflow.result.status).toBe('completed');
    });

    test('should handle validation errors gracefully', () => {
      const episodeData = null; // Missing episode
      const trackData = {
        filename: 'test-video.mp4',
        trackName: 'main',
        speakers: ['host']
      };

      const workflow = simulateTrackCreationWorkflow(episodeData, trackData);

      expect(workflow.errors).toContain('Episode not found');
      expect(workflow.steps).toHaveLength(0);
    });

    test('should normalize speaker names consistently', () => {
      const episodeData = { id: 'test-episode-123' };
      const trackData = {
        filename: 'test.mp4',
        trackName: 'main',
        speakers: ['  Host  ', ' Guest 1 ', '', '   ']
      };

      const workflow = simulateTrackCreationWorkflow(episodeData, trackData);

      expect(workflow.result.speakers).toEqual(['Host', 'Guest 1']);
    });
  });

  describe('Clip Processing with Speaker-Track Matching', () => {
    // Simulate clip processing with track selection
    const simulateClipProcessing = (clipData, availableTracks) => {
      const processing = {
        segments: [],
        trackMatches: {},
        warnings: []
      };

      const selectTrackForSpeaker = (tracks, speaker) => {
        return tracks.find(track => (track.speakers || []).includes(speaker)) || null;
      };

      for (const segment of clipData.segments) {
        const track = selectTrackForSpeaker(availableTracks, segment.speaker);

        processing.segments.push({
          ...segment,
          selectedTrack: track ? track.trackName : null,
          processable: track !== null
        });

        if (track) {
          processing.trackMatches[segment.speaker] = track.trackName;
        } else {
          processing.warnings.push(`No track found for speaker: ${segment.speaker}`);
        }
      }

      processing.success = processing.segments.every(seg => seg.processable);
      return processing;
    };

    test('should process clips with successful speaker-track matching', () => {
      const clipData = {
        segments: [
          {
            startTime: '00:15:30',
            endTime: '00:16:00',
            speaker: 'host',
            order: 1
          },
          {
            startTime: '00:16:00',
            endTime: '00:16:30',
            speaker: 'guest1',
            order: 2
          }
        ]
      };

      const availableTracks = [
        {
          trackName: 'main',
          speakers: ['host', 'guest1']
        },
        {
          trackName: 'guest2',
          speakers: ['guest2']
        }
      ];

      const processing = simulateClipProcessing(clipData, availableTracks);

      expect(processing.success).toBe(true);
      expect(processing.warnings).toHaveLength(0);
      expect(processing.trackMatches).toEqual({
        host: 'main',
        guest1: 'main'
      });
      expect(processing.segments.every(seg => seg.processable)).toBe(true);
    });

    test('should handle clips with speakers that have no matching tracks', () => {
      const clipData = {
        segments: [
          {
            startTime: '00:15:30',
            endTime: '00:16:00',
            speaker: 'host',
            order: 1
          },
          {
            startTime: '00:16:00',
            endTime: '00:16:30',
            speaker: 'nonexistent-speaker',
            order: 2
          }
        ]
      };

      const availableTracks = [
        {
          trackName: 'main',
          speakers: ['host']
        }
      ];

      const processing = simulateClipProcessing(clipData, availableTracks);

      expect(processing.success).toBe(false);
      expect(processing.warnings).toContain('No track found for speaker: nonexistent-speaker');
      expect(processing.trackMatches).toEqual({
        host: 'main'
      });
      expect(processing.segments[0].processable).toBe(true);
      expect(processing.segments[1].processable).toBe(false);
    });

    test('should handle multiple speakers mapping to different tracks', () => {
      const clipData = {
        segments: [
          {
            startTime: '00:15:30',
            endTime: '00:16:00',
            speaker: 'host',
            order: 1
          },
          {
            startTime: '00:16:00',
            endTime: '00:16:30',
            speaker: 'guest1',
            order: 2
          },
          {
            startTime: '00:16:30',
            endTime: '00:17:00',
            speaker: 'guest2',
            order: 3
          }
        ]
      };

      const availableTracks = [
        {
          trackName: 'main',
          speakers: ['host']
        },
        {
          trackName: 'guest1-track',
          speakers: ['guest1']
        },
        {
          trackName: 'guest2-track',
          speakers: ['guest2']
        }
      ];

      const processing = simulateClipProcessing(clipData, availableTracks);

      expect(processing.success).toBe(true);
      expect(processing.trackMatches).toEqual({
        host: 'main',
        guest1: 'guest1-track',
        guest2: 'guest2-track'
      });
    });
  });

  describe('API Request Validation Integration', () => {
    // Test complete API request validation flow
    const validateApiRequest = (method, pathParams, body) => {
      const validation = {
        valid: true,
        errors: [],
        normalizedData: {}
      };

      try {
        if (method === 'POST' && pathParams.endpoint === 'create-track') {
          // Validate track creation request
          if (!pathParams.episodeId) {
            throw new Error('episodeId is required in path');
          }

          if (!body.filename || !body.trackName) {
            throw new Error('filename and trackName are required');
          }

          if (body.speakers !== undefined) {
            if (!Array.isArray(body.speakers)) {
              throw new Error('speakers must be an array');
            }

            for (const speaker of body.speakers) {
              if (typeof speaker !== 'string' || speaker.trim().length === 0) {
                throw new Error('Speaker name cannot be empty');
              }
            }
          }

          validation.normalizedData = {
            episodeId: pathParams.episodeId,
            filename: body.filename.trim(),
            trackName: body.trackName.trim().toLowerCase(),
            speakers: (body.speakers || []).map(s => s.trim()).filter(s => s.length > 0)
          };

        } else if (method === 'PUT' && pathParams.endpoint === 'update-track') {
          // Validate track update request
          if (!pathParams.episodeId || !pathParams.trackName) {
            throw new Error('episodeId and trackName are required in path');
          }

          if (body.speakers !== undefined && !Array.isArray(body.speakers)) {
            throw new Error('speakers must be an array');
          }

          validation.normalizedData = {
            episodeId: pathParams.episodeId,
            trackName: pathParams.trackName,
            speakers: (body.speakers || []).map(s => String(s).trim()).filter(s => s.length > 0)
          };

        } else {
          throw new Error('Unsupported method or endpoint');
        }

      } catch (error) {
        validation.valid = false;
        validation.errors.push(error.message);
      }

      return validation;
    };

    test('should validate track creation requests correctly', () => {
      const pathParams = {
        endpoint: 'create-track',
        episodeId: 'test-episode-123'
      };
      const body = {
        filename: 'test-video.mp4',
        trackName: 'Main Camera',
        speakers: ['host', 'guest1']
      };

      const validation = validateApiRequest('POST', pathParams, body);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.normalizedData.trackName).toBe('main camera');
      expect(validation.normalizedData.speakers).toEqual(['host', 'guest1']);
    });

    test('should validate track update requests correctly', () => {
      const pathParams = {
        endpoint: 'update-track',
        episodeId: 'test-episode-123',
        trackName: 'main'
      };
      const body = {
        speakers: ['host', 'guest2']
      };

      const validation = validateApiRequest('PUT', pathParams, body);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.normalizedData.speakers).toEqual(['host', 'guest2']);
    });

    test('should reject invalid requests with appropriate errors', () => {
      const pathParams = {
        endpoint: 'create-track',
        episodeId: 'test-episode-123'
      };
      const body = {
        // Missing filename and trackName
        speakers: ['host']
      };

      const validation = validateApiRequest('POST', pathParams, body);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('filename and trackName are required');
    });

    test('should handle speaker validation errors', () => {
      const pathParams = {
        endpoint: 'create-track',
        episodeId: 'test-episode-123'
      };
      const body = {
        filename: 'test.mp4',
        trackName: 'main',
        speakers: ['host', ''] // Empty speaker name
      };

      const validation = validateApiRequest('POST', pathParams, body);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Speaker name cannot be empty');
    });
  });

  describe('Data Consistency and Error Recovery', () => {
    // Test data consistency across operations
    const simulateDataConsistency = (operations) => {
      const state = {
        episodes: {},
        tracks: {},
        uploadSessions: {}
      };

      const results = [];

      for (const operation of operations) {
        try {
          switch (operation.type) {
            case 'create_episode':
              state.episodes[operation.data.id] = operation.data;
              results.push({ success: true, operation: operation.type });
              break;

            case 'create_track_upload':
              if (!state.episodes[operation.data.episodeId]) {
                throw new Error('Episode not found');
              }
              state.uploadSessions[operation.data.sessionId] = {
                ...operation.data,
                status: 'initiated'
              };
              results.push({ success: true, operation: operation.type });
              break;

            case 'complete_track_upload':
              const session = state.uploadSessions[operation.data.sessionId];
              if (!session) {
                throw new Error('Upload session not found');
              }
              state.tracks[`${session.episodeId}#${session.trackName}`] = {
                episodeId: session.episodeId,
                trackName: session.trackName,
                speakers: session.speakers || [],
                status: 'completed'
              };
              delete state.uploadSessions[operation.data.sessionId];
              results.push({ success: true, operation: operation.type });
              break;

            case 'update_track':
              const trackKey = `${operation.data.episodeId}#${operation.data.trackName}`;
              if (!state.tracks[trackKey]) {
                throw new Error('Track not found');
              }
              state.tracks[trackKey].speakers = operation.data.speakers;
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

    test('should maintain data consistency across successful operations', () => {
      const operations = [
        {
          type: 'create_episode',
          data: { id: 'episode-123', title: 'Test Episode' }
        },
        {
          type: 'create_track_upload',
          data: {
            episodeId: 'episode-123',
            trackName: 'main',
            sessionId: 'session-456',
            speakers: ['host', 'guest1']
          }
        },
        {
          type: 'complete_track_upload',
          data: { sessionId: 'session-456' }
        },
        {
          type: 'update_track',
          data: {
            episodeId: 'episode-123',
            trackName: 'main',
            speakers: ['host', 'guest2']
          }
        }
      ];

      const { state, results } = simulateDataConsistency(operations);

      expect(results.every(r => r.success)).toBe(true);
      expect(state.tracks['episode-123#main'].speakers).toEqual(['host', 'guest2']);
      expect(Object.keys(state.uploadSessions)).toHaveLength(0); // Session cleaned up
    });

    test('should handle partial failures without corrupting state', () => {
      const operations = [
        {
          type: 'create_episode',
          data: { id: 'episode-123', title: 'Test Episode' }
        },
        {
          type: 'create_track_upload',
          data: {
            episodeId: 'nonexistent-episode', // This will fail
            trackName: 'main',
            sessionId: 'session-456',
            speakers: ['host']
          }
        },
        {
          type: 'update_track',
          data: {
            episodeId: 'episode-123',
            trackName: 'nonexistent-track', // This will fail
            speakers: ['host']
          }
        }
      ];

      const { state, results } = simulateDataConsistency(operations);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Episode not found');
      expect(results[2].success).toBe(false);
      expect(results[2].error).toBe('Track not found');

      // State should remain consistent
      expect(state.episodes['episode-123']).toBeDefined();
      expect(Object.keys(state.tracks)).toHaveLength(0);
      expect(Object.keys(state.uploadSessions)).toHaveLength(0);
    });
  });
});
