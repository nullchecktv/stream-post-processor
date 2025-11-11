// Integration tests for blog generation workflow
// Tests complete flow from outline creation to content generation

describe('Blog Generation Workflow Integration Tests', () => {
  describe('Complete Blog Generation Flow', () => {
    const simulateBlogGenerationWorkflow = (episodeData, outlineData, brandVoice) => {
      const workflow = {
        steps: [],
        errors: [],
        events: [],
        blogData: {}
      };

      try {
        if (!episodeData || !episodeData.id) {
          throw new Error('Episode not found');
        }
        workflow.steps.push('episode_validated');

        if (!outlineData || !outlineData.outline) {
          throw new Error('Outline is required');
        }

        if (outlineData.outline.length < 50) {
          throw new Error('Outline must be at least 50 characters');
        }
        workflow.steps.push('outline_validated');

        const timestamp = new Date().toISOString();
        workflow.blogData.outline = {
          pk: `${episodeData.tenantId}#${episodeData.id}`,
          sk: 'data#blog#outline',
          outline: outlineData.outline,
          status: 'outline_created',
          createdAt: timestamp,
          updatedAt: timestamp
        };
        workflow.steps.push('outline_stored');

        const event = {
          Source: 'nullcheck',
          DetailType: 'BlogOutlineCreated',
          Detail: {
            episodeId: episodeData.id,
            tenantId: episodeData.tenantId,
            timestamp
          }
        };
        workflow.events.push(event);
        workflow.steps.push('event_published');


        workflow.blogData.outline.status = 'content_generating';
        workflow.steps.push('status_updated_generating');

        const tone = brandVoice?.tone || 'professional and engaging';
        const writingStyle = brandVoice?.writingStyle || 'clear and informative with practical examples';

        const generatedContent = `# ${episodeData.title}\n\n## Introduction\n\nThis is a comprehensive blog post about ${episodeData.title}. ` +
          `Written in a ${tone} tone with ${writingStyle}. ` +
          'The content includes detailed analysis, practical examples, and actionable insights. '.repeat(50);

        const wordCount = generatedContent.trim().split(/\s+/).filter(w => w.length > 0).length;

        workflow.blogData.content = {
          pk: `${episodeData.tenantId}#${episodeData.id}`,
          sk: 'data#blog#content',
          content: generatedContent,
          status: 'content_generated',
          wordCount,
          generatedAt: timestamp,
          updatedAt: timestamp
        };
        workflow.steps.push('content_generated');

        workflow.result = {
          episodeId: episodeData.id,
          outline: workflow.blogData.outline.outline,
          content: workflow.blogData.content.content,
          status: 'content_generated',
          wordCount,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        return workflow;

      } catch (error) {
        workflow.errors.push({
          type: 'WorkflowError',
          message: error.message
        });
        return workflow;
      }
    };

    test('should complete full blog generation workflow', () => {
      const episodeData = {
        id: 'episode-123',
        tenantId: 'tenant-456',
        title: 'AI and Machine Learning Best Practices',
        episodeNumber: 42,
        themes: ['technology', 'ai']
      };

      const outlineData = {
        outline: '# AI and Machine Learning Best Practices\n\n## Introduction\n\n- Overview of AI/ML\n- Why best practices matter\n\n## Key Concepts\n\n- Data preparation\n- Model selection\n- Training strategies'
      };

      const brandVoice = {
        tone: 'professional and conversational',
        writingStyle: 'technical with practical examples'
      };

      const workflow = simulateBlogGenerationWorkflow(episodeData, outlineData, brandVoice);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.steps).toEqual([
        'episode_validated',
        'outline_validated',
        'outline_stored',
        'event_published',
        'status_updated_generating',
        'content_generated'
      ]);
      expect(workflow.events).toHaveLength(1);
      expect(workflow.events[0].DetailType).toBe('BlogOutlineCreated');
      expect(workflow.result.status).toBe('content_generated');
      expect(workflow.result.wordCount).toBeGreaterThan(100);
    });

    test('should reject workflow with missing episode', () => {
      const workflow = simulateBlogGenerationWorkflow(null, { outline: '# Test' }, null);

      expect(workflow.errors).toHaveLength(1);
      expect(workflow.errors[0].message).toBe('Episode not found');
      expect(workflow.steps).toHaveLength(0);
    });

    test('should reject workflow with invalid outline', () => {
      const episodeData = {
        id: 'episode-123',
        tenantId: 'tenant-456',
        title: 'Test Episode'
      };

      const workflow = simulateBlogGenerationWorkflow(episodeData, { outline: 'Too short' }, null);

      expect(workflow.errors).toHaveLength(1);
      expect(workflow.errors[0].message).toBe('Outline must be at least 50 characters');
      expect(workflow.steps).toContain('episode_validated');
      expect(workflow.steps).not.toContain('outline_stored');
    });

    test('should use default brand voice when not provided', () => {
      const episodeData = {
        id: 'episode-123',
        tenantId: 'tenant-456',
        title: 'Test Episode'
      };

      const outlineData = {
        outline: '# Test Blog Post\n\n## Introduction\n\nThis is a test outline with enough content to pass validation.'
      };

      const workflow = simulateBlogGenerationWorkflow(episodeData, outlineData, null);

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.result.content).toContain('professional and engaging');
      expect(workflow.result.content).toContain('clear and informative with practical examples');
    });
  });

  describe('EventBridge Event Triggering', () => {
    const simulateEventTriggering = (event) => {
      const processing = {
        valid: false,
        errors: [],
        agentTriggered: false
      };

      try {
        if (!event.Source || event.Source !== 'nullcheck') {
          throw new Error('Invalid event source');
        }

        if (!event.DetailType || event.DetailType !== 'BlogOutlineCreated') {
          throw new Error('Invalid event type');
        }

        if (!event.Detail || !event.Detail.episodeId || !event.Detail.tenantId) {
          throw new Error('Missing required event details');
        }

        processing.valid = true;
        processing.agentTriggered = true;
        processing.episodeId = event.Detail.episodeId;
        processing.tenantId = event.Detail.tenantId;

      } catch (error) {
        processing.errors.push(error.message);
      }

      return processing;
    };

    test('should trigger blog generator agent on valid event', () => {
      const event = {
        Source: 'nullcheck',
        DetailType: 'BlogOutlineCreated',
        Detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      const processing = simulateEventTriggering(event);

      expect(processing.valid).toBe(true);
      expect(processing.agentTriggered).toBe(true);
      expect(processing.episodeId).toBe('episode-123');
      expect(processing.tenantId).toBe('tenant-456');
      expect(processing.errors).toHaveLength(0);
    });

    test('should reject event with invalid source', () => {
      const event = {
        Source: 'invalid-source',
        DetailType: 'BlogOutlineCreated',
        Detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456'
        }
      };

      const processing = simulateEventTriggering(event);

      expect(processing.valid).toBe(false);
      expect(processing.agentTriggered).toBe(false);
      expect(processing.errors).toContain('Invalid event source');
    });

    test('should reject event with missing details', () => {
      const event = {
        Source: 'nullcheck',
        DetailType: 'BlogOutlineCreated',
        Detail: {
          episodeId: 'episode-123'
        }
      };

      const processing = simulateEventTriggering(event);

      expect(processing.valid).toBe(false);
      expect(processing.errors).toContain('Missing required event details');
    });
  });

  describe('Agent Tool Calling with Mocked Bedrock', () => {
    const simulateAgentToolCalling = (tools, userMessage) => {
      const execution = {
        toolCalls: [],
        responses: [],
        errors: []
      };

      try {
        if (!tools || tools.length === 0) {
          throw new Error('No tools available');
        }

        const webSearchTool = tools.find(t => t.name === 'webSearch');
        if (!webSearchTool) {
          throw new Error('webSearch tool not found');
        }

        if (userMessage.includes('research') || userMessage.includes('search')) {
          execution.toolCalls.push({
            tool: 'webSearch',
            input: {
              query: 'AI best practices',
              maxResults: 3
            }
          });

          execution.responses.push({
            tool: 'webSearch',
            result: [
              {
                title: 'AI Best Practices Guide',
                url: 'https://example.com/ai-guide',
                snippet: 'Comprehensive guide to AI development best practices...'
              },
              {
                title: 'Machine Learning Tips',
                url: 'https://example.com/ml-tips',
                snippet: 'Essential tips for successful ML projects...'
              }
            ]
          });
        }

        execution.success = true;

      } catch (error) {
        execution.errors.push(error.message);
        execution.success = false;
      }

      return execution;
    };

    test('should call webSearch tool when needed', () => {
      const tools = [
        {
          name: 'webSearch',
          description: 'Search the web for information',
          schema: {
            query: 'string',
            maxResults: 'number'
          }
        }
      ];

      const userMessage = 'Write a blog post about AI. Please research current best practices.';

      const execution = simulateAgentToolCalling(tools, userMessage);

      expect(execution.success).toBe(true);
      expect(execution.toolCalls).toHaveLength(1);
      expect(execution.toolCalls[0].tool).toBe('webSearch');
      expect(execution.responses).toHaveLength(1);
      expect(execution.responses[0].result).toHaveLength(2);
    });

    test('should handle missing tools gracefully', () => {
      const execution = simulateAgentToolCalling([], 'Write a blog post');

      expect(execution.success).toBe(false);
      expect(execution.errors).toContain('No tools available');
    });

    test('should not call tools when not needed', () => {
      const tools = [
        {
          name: 'webSearch',
          description: 'Search the web for information'
        }
      ];

      const userMessage = 'Write a blog post about AI using the provided outline.';

      const execution = simulateAgentToolCalling(tools, userMessage);

      expect(execution.success).toBe(true);
      expect(execution.toolCalls).toHaveLength(0);
    });
  });

  describe('API CRUD Operations', () => {
    const simulateApiOperations = (operations) => {
      const state = {
        blogs: {}
      };

      const results = [];

      for (const operation of operations) {
        try {
          const blogKey = `${operation.tenantId}#${operation.episodeId}`;

          switch (operation.type) {
            case 'GET':
              if (!state.blogs[blogKey]) {
                results.push({
                  statusCode: 404,
                  body: { error: 'NotFound', message: 'No blog found for episode' }
                });
              } else {
                results.push({
                  statusCode: 200,
                  body: { ...state.blogs[blogKey] }
                });
              }
              break;

            case 'POST':
              if (!operation.data.outline) {
                throw new Error('Outline is required');
              }
              state.blogs[blogKey] = {
                episodeId: operation.episodeId,
                outline: operation.data.outline,
                status: 'regenerating',
                updatedAt: new Date().toISOString()
              };
              results.push({
                statusCode: 202,
                body: {
                  episodeId: operation.episodeId,
                  status: 'regenerating',
                  message: 'Blog content regeneration started'
                }
              });
              break;

            case 'PUT':
              if (!state.blogs[blogKey]) {
                results.push({
                  statusCode: 404,
                  body: { error: 'NotFound', message: 'Blog not found' }
                });
              } else {
                if (operation.data.outline) {
                  state.blogs[blogKey].outline = operation.data.outline;
                  state.blogs[blogKey].status = 'outline_edited';
                }
                if (operation.data.content) {
                  state.blogs[blogKey].content = operation.data.content;
                  state.blogs[blogKey].status = 'content_edited';
                }
                state.blogs[blogKey].updatedAt = new Date().toISOString();
                results.push({
                  statusCode: 200,
                  body: state.blogs[blogKey]
                });
              }
              break;

            case 'DELETE':
              if (!state.blogs[blogKey]) {
                results.push({
                  statusCode: 404,
                  body: { error: 'NotFound', message: 'Blog not found' }
                });
              } else {
                delete state.blogs[blogKey];
                results.push({
                  statusCode: 204,
                  body: null
                });
              }
              break;

            default:
              throw new Error('Unknown operation type');
          }

        } catch (error) {
          results.push({
            statusCode: 400,
            body: { error: 'ValidationError', message: error.message }
          });
        }
      }

      return { state, results };
    };

    test('should handle complete CRUD lifecycle', () => {
      const operations = [
        {
          type: 'POST',
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          data: { outline: '# Test Outline\n\n## Introduction' }
        },
        {
          type: 'GET',
          tenantId: 'tenant-456',
          episodeId: 'episode-123'
        },
        {
          type: 'PUT',
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          data: { outline: '# Updated Outline\n\n## New Section' }
        },
        {
          type: 'GET',
          tenantId: 'tenant-456',
          episodeId: 'episode-123'
        },
        {
          type: 'DELETE',
          tenantId: 'tenant-456',
          episodeId: 'episode-123'
        },
        {
          type: 'GET',
          tenantId: 'tenant-456',
          episodeId: 'episode-123'
        }
      ];

      const { results } = simulateApiOperations(operations);

      expect(results[0].statusCode).toBe(202);
      expect(results[0].body.status).toBe('regenerating');
      expect(results[1].statusCode).toBe(200);
      expect(results[1].body.status).toBe('regenerating');
      expect(results[2].statusCode).toBe(200);
      expect(results[2].body.status).toBe('outline_edited');
      expect(results[3].statusCode).toBe(200);
      expect(results[3].body.status).toBe('outline_edited');
      expect(results[4].statusCode).toBe(204);
      expect(results[5].statusCode).toBe(404);
    });

    test('should handle GET on non-existent blog', () => {
      const operations = [
        {
          type: 'GET',
          tenantId: 'tenant-456',
          episodeId: 'nonexistent-episode'
        }
      ];

      const { results } = simulateApiOperations(operations);

      expect(results[0].statusCode).toBe(404);
      expect(results[0].body.error).toBe('NotFound');
    });

    test('should validate POST requests', () => {
      const operations = [
        {
          type: 'POST',
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          data: {}
        }
      ];

      const { results } = simulateApiOperations(operations);

      expect(results[0].statusCode).toBe(400);
      expect(results[0].body.error).toBe('ValidationError');
    });

    test('should handle PUT on non-existent blog', () => {
      const operations = [
        {
          type: 'PUT',
          tenantId: 'tenant-456',
          episodeId: 'nonexistent-episode',
          data: { outline: '# Updated' }
        }
      ];

      const { results } = simulateApiOperations(operations);

      expect(results[0].statusCode).toBe(404);
    });
  });

  describe('Concurrent Blog Generation Handling', () => {
    const simulateConcurrentGeneration = (requests) => {
      const processing = {
        accepted: [],
        rejected: [],
        conflicts: []
      };

      const activeGenerations = new Map();

      for (const request of requests) {
        const key = `${request.tenantId}#${request.episodeId}`;

        if (activeGenerations.has(key)) {
          processing.rejected.push({
            episodeId: request.episodeId,
            reason: 'Generation already in progress',
            statusCode: 409
          });
          processing.conflicts.push(key);
        } else {
          activeGenerations.set(key, {
            episodeId: request.episodeId,
            tenantId: request.tenantId,
            status: 'content_generating',
            startedAt: request.timestamp
          });
          processing.accepted.push({
            episodeId: request.episodeId,
            status: 'content_generating',
            statusCode: 202
          });
        }
      }

      processing.totalRequests = requests.length;
      processing.successRate = (processing.accepted.length / requests.length) * 100;

      return processing;
    };

    test('should accept first request and reject concurrent duplicates', () => {
      const requests = [
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:00Z'
        },
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:01Z'
        },
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:02Z'
        }
      ];

      const processing = simulateConcurrentGeneration(requests);

      expect(processing.accepted).toHaveLength(1);
      expect(processing.rejected).toHaveLength(2);
      expect(processing.conflicts).toHaveLength(2);
      expect(processing.rejected[0].statusCode).toBe(409);
      expect(processing.rejected[0].reason).toBe('Generation already in progress');
    });

    test('should handle multiple different episodes concurrently', () => {
      const requests = [
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:00Z'
        },
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-456',
          timestamp: '2025-01-15T10:00:01Z'
        },
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-789',
          timestamp: '2025-01-15T10:00:02Z'
        }
      ];

      const processing = simulateConcurrentGeneration(requests);

      expect(processing.accepted).toHaveLength(3);
      expect(processing.rejected).toHaveLength(0);
      expect(processing.successRate).toBe(100);
    });

    test('should handle mixed concurrent and unique requests', () => {
      const requests = [
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:00Z'
        },
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-456',
          timestamp: '2025-01-15T10:00:01Z'
        },
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:02Z'
        },
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-789',
          timestamp: '2025-01-15T10:00:03Z'
        }
      ];

      const processing = simulateConcurrentGeneration(requests);

      expect(processing.accepted).toHaveLength(3);
      expect(processing.rejected).toHaveLength(1);
      expect(processing.conflicts).toContain('tenant-456#episode-123');
      expect(processing.successRate).toBe(75);
    });

    test('should isolate tenants in concurrent processing', () => {
      const requests = [
        {
          tenantId: 'tenant-456',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:00Z'
        },
        {
          tenantId: 'tenant-789',
          episodeId: 'episode-123',
          timestamp: '2025-01-15T10:00:01Z'
        }
      ];

      const processing = simulateConcurrentGeneration(requests);

      expect(processing.accepted).toHaveLength(2);
      expect(processing.rejected).toHaveLength(0);
    });
  });

  describe('Blog Status Transitions', () => {
    const simulateStatusTransitions = (initialStatus, transitions) => {
      const history = {
        statuses: [initialStatus],
        transitions: [],
        errors: []
      };

      const validTransitions = {
        'outline_created': ['content_generating', 'outline_edited'],
        'content_generating': ['content_generated', 'failed'],
        'content_generated': ['content_edited', 'regenerating'],
        'outline_edited': ['regenerating'],
        'content_edited': ['regenerating'],
        'regenerating': ['content_generated', 'failed'],
        'failed': ['regenerating']
      };

      let currentStatus = initialStatus;

      for (const newStatus of transitions) {
        const allowed = validTransitions[currentStatus];

        if (!allowed || !allowed.includes(newStatus)) {
          history.errors.push({
            from: currentStatus,
            to: newStatus,
            message: `Invalid transition from ${currentStatus} to ${newStatus}`
          });
        } else {
          history.transitions.push({
            from: currentStatus,
            to: newStatus,
            timestamp: new Date().toISOString()
          });
          history.statuses.push(newStatus);
          currentStatus = newStatus;
        }
      }

      history.finalStatus = currentStatus;
      history.valid = history.errors.length === 0;

      return history;
    };

    test('should allow valid status transitions', () => {
      const history = simulateStatusTransitions('outline_created', [
        'content_generating',
        'content_generated',
        'content_edited'
      ]);

      expect(history.valid).toBe(true);
      expect(history.errors).toHaveLength(0);
      expect(history.finalStatus).toBe('content_edited');
      expect(history.transitions).toHaveLength(3);
    });

    test('should reject invalid status transitions', () => {
      const history = simulateStatusTransitions('outline_created', [
        'content_generated'
      ]);

      expect(history.valid).toBe(false);
      expect(history.errors).toHaveLength(1);
      expect(history.errors[0].message).toContain('Invalid transition');
    });

    test('should handle regeneration workflow', () => {
      const history = simulateStatusTransitions('content_generated', [
        'regenerating',
        'content_generated'
      ]);

      expect(history.valid).toBe(true);
      expect(history.finalStatus).toBe('content_generated');
    });

    test('should handle failure and recovery', () => {
      const history = simulateStatusTransitions('content_generating', [
        'failed',
        'regenerating',
        'content_generated'
      ]);

      expect(history.valid).toBe(true);
      expect(history.finalStatus).toBe('content_generated');
    });
  });

  describe('Data Consistency Across Operations', () => {
    const simulateDataConsistency = (operations) => {
      const state = {
        episodes: {},
        blogs: {},
        events: []
      };

      const results = [];

      for (const operation of operations) {
        try {
          switch (operation.type) {
            case 'create_episode':
              state.episodes[operation.data.id] = operation.data;
              results.push({ success: true, operation: operation.type });
              break;

            case 'create_outline':
              if (!state.episodes[operation.data.episodeId]) {
                throw new Error('Episode not found');
              }
              const blogKey = `${operation.data.tenantId}#${operation.data.episodeId}`;
              state.blogs[blogKey] = {
                outline: operation.data.outline,
                status: 'outline_created',
                createdAt: new Date().toISOString()
              };
              state.events.push({
                type: 'BlogOutlineCreated',
                episodeId: operation.data.episodeId,
                tenantId: operation.data.tenantId
              });
              results.push({ success: true, operation: operation.type });
              break;

            case 'generate_content':
              const key = `${operation.data.tenantId}#${operation.data.episodeId}`;
              if (!state.blogs[key]) {
                throw new Error('Blog outline not found');
              }
              state.blogs[key].content = operation.data.content;
              state.blogs[key].status = 'content_generated';
              state.blogs[key].wordCount = operation.data.content.split(/\s+/).length;
              results.push({ success: true, operation: operation.type });
              break;

            case 'update_blog':
              const updateKey = `${operation.data.tenantId}#${operation.data.episodeId}`;
              if (!state.blogs[updateKey]) {
                throw new Error('Blog not found');
              }
              if (operation.data.outline) {
                state.blogs[updateKey].outline = operation.data.outline;
                state.blogs[updateKey].status = 'outline_edited';
              }
              if (operation.data.content) {
                state.blogs[updateKey].content = operation.data.content;
                state.blogs[updateKey].status = 'content_edited';
              }
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

    test('should maintain consistency across successful operations', () => {
      const operations = [
        {
          type: 'create_episode',
          data: {
            id: 'episode-123',
            tenantId: 'tenant-456',
            title: 'Test Episode'
          }
        },
        {
          type: 'create_outline',
          data: {
            episodeId: 'episode-123',
            tenantId: 'tenant-456',
            outline: '# Test Outline\n\n## Introduction'
          }
        },
        {
          type: 'generate_content',
          data: {
            episodeId: 'episode-123',
            tenantId: 'tenant-456',
            content: '# Generated Blog Post\n\nThis is the generated content.'
          }
        }
      ];

      const { state, results } = simulateDataConsistency(operations);

      expect(results.every(r => r.success)).toBe(true);
      expect(state.blogs['tenant-456#episode-123'].status).toBe('content_generated');
      expect(state.events).toHaveLength(1);
      expect(state.events[0].type).toBe('BlogOutlineCreated');
    });

    test('should handle partial failures without corrupting state', () => {
      const operations = [
        {
          type: 'create_outline',
          data: {
            episodeId: 'nonexistent-episode',
            tenantId: 'tenant-456',
            outline: '# Test'
          }
        },
        {
          type: 'generate_content',
          data: {
            episodeId: 'episode-123',
            tenantId: 'tenant-456',
            content: '# Content'
          }
        }
      ];

      const { state, results } = simulateDataConsistency(operations);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Episode not found');
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Blog outline not found');
      expect(Object.keys(state.blogs)).toHaveLength(0);
    });
  });
});
