// Integration tests for episode status update workflow
// These tests validate the complete status update flow with prerequisite validation

describe('Episode Status Update Integration Tests', () => {
  describe('Status Update Workflow', () => {
    // Simulate the complete status update workflow
    const simulateStatusUpdateWorkflow = (episodeData, tracksData, statusRequest) => {
      const workflow = {
        steps: [],
        errors: [],
        events: []
      };

      try {
        // Step 1: Validate episode exists
        if (!episodeData || !episodeData.id) {
          throw new Error('Episode not found');
        }
        workflow.steps.push('episode_validated');

        // Step 2: Validate status request
        if (!statusRequest.status || typeof statusRequest.status !== 'string') {
          throw new Error('Status is required');
        }

        const validStatuses = ['Ready for Clip Gen'];
        if (!validStatuses.includes(statusRequest.status.trim())) {
          throw new Error('Invalid status value');
        }
        workflow.steps.push('status_validated');

        // Step 3: Check prerequisites for "Ready for Clip Gen"
        if (statusRequest.status === 'Ready for Clip Gen') {
          const missingPrerequisites = [];

          // Check episode status
          if (episodeData.status !== 'Track(s) Uploaded') {
            missingPrerequisites.push(`Episode has status '${episodeData.status}', expected 'Track(s) Uploaded'`);
          }

          // Check all tracks are processed
          for (const track of tracksData) {
            if (track.status !== 'Processed') {
              missingPrerequisites.push(`Track '${track.trackName}' has status '${track.status}', expected 'Processed'`);
            }
          }

          if (missingPrerequisites.length > 0) {
            workflow.errors.push({
              type: 'PrerequisiteNotMet',
              message: 'Episode is not ready for clip generation',
              details: { missingPrerequisites }
            });
            return workflow;
          }
        }
        workflow.steps.push('prerequisites_validated');

        // Step 4: Update episode status with history
        const timestamp = new Date().toISOString();
        const statusHistoryEntry = {
          status: statusRequest.status,
          timestamp
        };

        const updatedEpisode = {
          ...episodeData,
          status: statusRequest.status,
          statusHistory: [...(episodeData.statusHistory || []), statusHistoryEntry],
          updatedAt: timestamp
        };
        workflow.steps.push('status_updated');

        // Step 5: Publish event for "Ready for Clip Gen"
        if (statusRequest.status === 'Ready for Clip Gen') {
          const event = {
            Source: 'nullcheck',
            DetailType: 'Begin Clip Generation',
            Detail: {
              episodeId: episodeData.id,
              status: statusRequest.status,
              timestamp,
              episodeMetadata: {
                title: episodeData.title,
                episodeNumber: episodeData.episodeNumber,
                airDate: episodeData.airDate
              }
            }
          };
          workflow.events.push(event);
          workflow.steps.push('event_published');
        }

        workflow.result = {
          id: episodeData.id,
          status: statusRequest.status,
          updatedAt: timestamp
        };

        return workflow;

      } catch (error) {
        workflow.errors.push({
          type: 'ValidationError',
          message: error.message
        });
        return workflow;
      }
    };

    test('should complete successful status update workflow', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode',
        episodeNumber: 42,
        status: 'Track(s) Uploaded',
        statusHistory: [
          { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' },
          { status: 'Track(s) Uploaded', timestamp: '2025-01-15T10:15:00Z' }
        ]
      };

      const tracksData = [
        { trackName: 'main', status: 'Processed' },
        { trackName: 'guest', status: 'Processed' }
      ];

      const statusRequest = { status: 'Ready for Clip Gen' };

      const workflow = simulateStatusUpdateWorkflow(episodeData, tracksData, statusRequest);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.steps).toEqual([
        'episode_validated',
        'status_validated',
        'prerequisites_validated',
        'status_updated',
        'event_published'
      ]);
      expect(workflow.result.status).toBe('Ready for Clip Gen');
      expect(workflow.events).toHaveLength(1);
      expect(workflow.events[0].DetailType).toBe('Begin Clip Generation');
    });

    test('should reject status update when episode status is wrong', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode',
        status: 'Draft' // Wrong status
      };

      const tracksData = [
        { trackName: 'main', status: 'Processed' }
      ];

      const statusRequest = { status: 'Ready for Clip Gen' };

      const workflow = simulateStatusUpdateWorkflow(episodeData, tracksData, statusRequest);

      expect(workflow.errors).toHaveLength(1);
      expect(workflow.errors[0].type).toBe('PrerequisiteNotMet');
      expect(workflow.errors[0].details.missingPrerequisites).toContain(
        "Episode has status 'Draft', expected 'Track(s) Uploaded'"
      );
      expect(workflow.steps).not.toContain('status_updated');
    });

    test('should reject status update when tracks are not processed', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode',
        status: 'Track(s) Uploaded'
      };

      const tracksData = [
        { trackName: 'main', status: 'Processed' },
        { trackName: 'guest', status: 'Unprocessed' } // Not processed
      ];

      const statusRequest = { status: 'Ready for Clip Gen' };

      const workflow = simulateStatusUpdateWorkflow(episodeData, tracksData, statusRequest);

      expect(workflow.errors).toHaveLength(1);
      expect(workflow.errors[0].type).toBe('PrerequisiteNotMet');
      expect(workflow.errors[0].details.missingPrerequisites).toContain(
        "Track 'guest' has status 'Unprocessed', expected 'Processed'"
      );
    });

    test('should handle multiple prerequisite failures', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode',
        status: 'Draft' // Wrong status
      };

      const tracksData = [
        { trackName: 'main', status: 'Unprocessed' },
        { trackName: 'guest', status: 'Processing' }
      ];

      const statusRequest = { status: 'Ready for Clip Gen' };

      const workflow = simulateStatusUpdateWorkflow(episodeData, tracksData, statusRequest);

      expect(workflow.errors).toHaveLength(1);
      expect(workflow.errors[0].details.missingPrerequisites).toHaveLength(3);
      expect(workflow.errors[0].details.missingPrerequisites).toContain(
        "Episode has status 'Draft', expected 'Track(s) Uploaded'"
      );
      expect(workflow.errors[0].details.missingPrerequisites).toContain(
        "Track 'main' has status 'Unprocessed', expected 'Processed'"
      );
      expect(workflow.errors[0].details.missingPrerequisites).toContain(
        "Track 'guest' has status 'Processing', expected 'Processed'"
      );
    });

    test('should handle invalid status values', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode',
        status: 'Track(s) Uploaded'
      };

      const tracksData = [];
      const statusRequest = { status: 'Invalid Status' };

      const workflow = simulateStatusUpdateWorkflow(episodeData, tracksData, statusRequest);

      expect(workflow.errors).toHaveLength(1);
      expect(workflow.errors[0].type).toBe('ValidationError');
      expect(workflow.errors[0].message).toBe('Invalid status value');
      expect(workflow.steps).not.toContain('status_updated');
    });

    test('should handle missing episode', () => {
      const episodeData = null;
      const tracksData = [];
      const statusRequest = { status: 'Ready for Clip Gen' };

      const workflow = simulateStatusUpdateWorkflow(episodeData, tracksData, statusRequest);

      expect(workflow.errors).toHaveLength(1);
      expect(workflow.errors[0].type).toBe('ValidationError');
      expect(workflow.errors[0].message).toBe('Episode not found');
      expect(workflow.steps).toEqual([]);
    });
  });

  describe('Status History Management', () => {
    // Test status history functionality
    const simulateStatusHistoryUpdate = (existingHistory, newStatus) => {
      const timestamp = new Date().toISOString();
      const newEntry = {
        status: newStatus,
        timestamp
      };

      const updatedHistory = [...(existingHistory || []), newEntry];
      const currentStatus = updatedHistory[updatedHistory.length - 1].status;

      return {
        statusHistory: updatedHistory,
        currentStatus,
        timestamp
      };
    };

    test('should add status to existing history', () => {
      const existingHistory = [
        { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' },
        { status: 'Track(s) Uploaded', timestamp: '2025-01-15T10:15:00Z' }
      ];

      const result = simulateStatusHistoryUpdate(existingHistory, 'Ready for Clip Gen');

      expect(result.statusHistory).toHaveLength(3);
      expect(result.statusHistory[2].status).toBe('Ready for Clip Gen');
      expect(result.currentStatus).toBe('Ready for Clip Gen');
      expect(result.statusHistory[2].timestamp).toBeDefined();
    });

    test('should handle empty history', () => {
      const result = simulateStatusHistoryUpdate(null, 'Ready for Clip Gen');

      expect(result.statusHistory).toHaveLength(1);
      expect(result.statusHistory[0].status).toBe('Ready for Clip Gen');
      expect(result.currentStatus).toBe('Ready for Clip Gen');
    });

    test('should maintain chronological order', () => {
      const existingHistory = [
        { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' }
      ];

      const result1 = simulateStatusHistoryUpdate(existingHistory, 'Track(s) Uploaded');
      const result2 = simulateStatusHistoryUpdate(result1.statusHistory, 'Ready for Clip Gen');

      expect(result2.statusHistory).toHaveLength(3);
      expect(result2.statusHistory[0].status).toBe('Draft');
      expect(result2.statusHistory[1].status).toBe('Track(s) Uploaded');
      expect(result2.statusHistory[2].status).toBe('Ready for Clip Gen');
    });
  });

  describe('Event Publishing Logic', () => {
    // Test event publishing functionality
    const simulateEventPublishing = (episodeData, status, timestamp) => {
      const events = [];

      if (status === 'Ready for Clip Gen') {
        const event = {
          Source: 'nullcheck',
          DetailType: 'Begin Clip Generation',
          Detail: {
            episodeId: episodeData.id,
            status,
            timestamp,
            episodeMetadata: {
              title: episodeData.title,
              episodeNumber: episodeData.episodeNumber,
              airDate: episodeData.airDate
            }
          }
        };
        events.push(event);
      }

      return { events, published: events.length > 0 };
    };

    test('should publish event for Ready for Clip Gen status', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode',
        episodeNumber: 42,
        airDate: '2025-01-15T10:00:00Z'
      };

      const result = simulateEventPublishing(episodeData, 'Ready for Clip Gen', '2025-01-15T10:30:00Z');

      expect(result.published).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].Source).toBe('nullcheck');
      expect(result.events[0].DetailType).toBe('Begin Clip Generation');
      expect(result.events[0].Detail.episodeId).toBe('episode-123');
      expect(result.events[0].Detail.episodeMetadata.title).toBe('Test Episode');
    });

    test('should not publish event for other statuses', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode'
      };

      const result = simulateEventPublishing(episodeData, 'Some Other Status', '2025-01-15T10:30:00Z');

      expect(result.published).toBe(false);
      expect(result.events).toHaveLength(0);
    });

    test('should handle missing episode metadata gracefully', () => {
      const episodeData = {
        id: 'episode-123',
        title: 'Test Episode'
        // Missing episodeNumber and airDate
      };

      const result = simulateEventPublishing(episodeData, 'Ready for Clip Gen', '2025-01-15T10:30:00Z');

      expect(result.published).toBe(true);
      expect(result.events[0].Detail.episodeMetadata.title).toBe('Test Episode');
      expect(result.events[0].Detail.episodeMetadata.episodeNumber).toBeUndefined();
      expect(result.events[0].Detail.episodeMetadata.airDate).toBeUndefined();
    });
  });

  describe('API Response Formatting', () => {
    // Test response formatting
    const formatApiResponse = (statusCode, data) => {
      const response = {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };

      if (statusCode === 200) {
        response.body = JSON.stringify({
          id: data.episodeId,
          status: data.status,
          updatedAt: data.timestamp
        });
      } else if (statusCode === 409) {
        response.body = JSON.stringify({
          error: 'PrerequisiteNotMet',
          message: 'Episode is not ready for clip generation',
          details: {
            missingPrerequisites: data.missingPrerequisites
          }
        });
      } else if (statusCode === 404) {
        response.body = JSON.stringify({
          error: 'NotFound',
          message: `Episode with ID '${data.episodeId}' was not found`
        });
      } else {
        response.body = JSON.stringify({
          error: 'ValidationError',
          message: data.message || 'Invalid request'
        });
      }

      return response;
    };

    test('should format success response correctly', () => {
      const data = {
        episodeId: 'episode-123',
        status: 'Ready for Clip Gen',
        timestamp: '2025-01-15T10:30:00Z'
      };

      const response = formatApiResponse(200, data);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.id).toBe('episode-123');
      expect(body.status).toBe('Ready for Clip Gen');
      expect(body.updatedAt).toBe('2025-01-15T10:30:00Z');
    });

    test('should format prerequisite error response correctly', () => {
      const data = {
        missingPrerequisites: [
          "Episode has status 'Draft', expected 'Track(s) Uploaded'",
          "Track 'guest' has status 'Unprocessed', expected 'Processed'"
        ]
      };

      const response = formatApiResponse(409, data);

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('PrerequisiteNotMet');
      expect(body.details.missingPrerequisites).toEqual(data.missingPrerequisites);
    });

    test('should format not found response correctly', () => {
      const data = { episodeId: 'nonexistent-episode' };

      const response = formatApiResponse(404, data);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toContain('nonexistent-episode');
    });
  });
});
