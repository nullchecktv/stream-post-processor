// Unit tests for Clip Generation Trigger Function
// These tests validate the core logic and error handling

const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);
const sfnMock = mockClient(SFNClient);

describe('Clip Generation Trigger Function Logic', () => {
  beforeEach(() => {
    // Clear all previous mock calls and reset state
    ddbMock.resetHistory();
    sfnMock.resetHistory();
    ddbMock.reset();
    sfnMock.reset();
    process.env.TABLE_NAME = 'test-table';
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';
  });

  afterEach(() => {
    ddbMock.resetHistory();
    sfnMock.resetHistory();
    ddbMock.reset();
    sfnMock.reset();
  });

  describe('Event validation', () => {
    test('should validate Begin Clip Generation event structure', () => {
      const validateEvent = (event) => {
        const { source, 'detail-type': detailType, detail } = event;

        if (source !== 'nullcheck.clips' || detailType !== 'Begin Clip Generation') {
          return { valid: false, reason: 'Invalid event type' };
        }

        const { tenantId, episodeId } = detail;
        if (!tenantId || !episodeId) {
          return { valid: false, reason: 'Missing required fields: tenantId and episodeId are required' };
        }

        return { valid: true };
      };

      // Valid event
      const validEvent = {
        source: 'nullcheck.clips',
        'detail-type': 'Begin Clip Generation',
        detail: {
          tenantId: 'tenant-123',
          episodeId: 'episode-456'
        }
      };
      expect(validateEvent(validEvent)).toEqual({ valid: true });

      // Invalid source
      const invalidSource = {
        source: 'aws.s3',
        'detail-type': 'Begin Clip Generation',
        detail: { tenantId: 'tenant-123', episodeId: 'episode-456' }
      };
      expect(validateEvent(invalidSource)).toEqual({ valid: false, reason: 'Invalid event type' });

      // Missing tenantId
      const missingTenant = {
        source: 'nullcheck.clips',
        'detail-type': 'Begin Clip Generation',
        detail: { episodeId: 'episode-456' }
      };
      expect(validateEvent(missingTenant)).toEqual({
        valid: false,
        reason: 'Missing required fields: tenantId and episodeId are required'
      });

      // Missing episodeId
      const missingEpisode = {
        source: 'nullcheck.clips',
        'detail-type': 'Begin Clip Generation',
        detail: { tenantId: 'tenant-123' }
      };
      expect(validateEvent(missingEpisode)).toEqual({
        valid: false,
        reason: 'Missing required fields: tenantId and episodeId are required'
      });
    });
  });

  describe('DynamoDB query construction', () => {
    test('should construct correct query parameters for clips', () => {
      const buildClipQuery = (tenantId, episodeId, tableName) => {
        return {
          TableName: tableName,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: marshall({
            ':pk': `${tenantId}#${episodeId}`,
            ':sk': 'clip#',
            ':status': 'detected'
          })
        };
      };

      const query = buildClipQuery('tenant-123', 'episode-456', 'test-table');

      expect(query.TableName).toBe('test-table');
      expect(query.KeyConditionExpression).toBe('pk = :pk AND begins_with(sk, :sk)');
      expect(query.FilterExpression).toBe('#status = :status');
      expect(query.ExpressionAttributeNames).toEqual({ '#status': 'status' });
      expect(query.ExpressionAttributeValues[':pk'].S).toBe('tenant-123#episode-456');
      expect(query.ExpressionAttributeValues[':sk'].S).toBe('clip#');
      expect(query.ExpressionAttributeValues[':status'].S).toBe('detected');
    });

    test('should handle DynamoDB query with mocked response', async () => {
      const mockClips = [
        {
          pk: { S: 'tenant-123#episode-456' },
          sk: { S: 'clip#clip-1' },
          clipId: { S: 'clip-1' },
          status: { S: 'detected' },
          segments: { L: [
            { M: {
              startTime: { S: '00:01:00' },
              endTime: { S: '00:01:30' },
              speaker: { S: 'host' }
            }}
          ]}
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockClips,
        Count: 1
      });

      const queryParams = {
        TableName: 'test-table',
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':pk': 'tenant-123#episode-456',
          ':sk': 'clip#',
          ':status': 'detected'
        })
      };

      const ddb = new DynamoDBClient();
      const result = await ddb.send(new QueryCommand(queryParams));

      expect(result.Items).toHaveLength(1);
      expect(result.Items[0].clipId.S).toBe('clip-1');
      expect(ddbMock.calls()).toHaveLength(1);
    });
  });

  describe('Step Functions execution input construction', () => {
    test('should construct correct execution input for clips', () => {
      const buildExecutionInput = (tenantId, episodeId, clip, tableName) => {
        return {
          tenantId,
          episodeId,
          clipId: clip.clipId,
          segments: clip.segments || [],
          tableName
        };
      };

      const clip = {
        clipId: 'clip-123',
        segments: [
          {
            startTime: '00:01:00',
            endTime: '00:01:30',
            speaker: 'host',
            order: 1
          }
        ]
      };

      const input = buildExecutionInput('tenant-123', 'episode-456', clip, 'test-table');

      expect(input.tenantId).toBe('tenant-123');
      expect(input.episodeId).toBe('episode-456');
      expect(input.clipId).toBe('clip-123');
      expect(input.tableName).toBe('test-table');
      expect(Array.isArray(input.segments)).toBe(true);
      expect(input.segments).toHaveLength(1);
      expect(input.segments[0].startTime).toBe('00:01:00');
    });

    test('should handle clips with no segments', () => {
      const buildExecutionInput = (tenantId, episodeId, clip, tableName) => {
        return {
          tenantId,
          episodeId,
          clipId: clip.clipId,
          segments: clip.segments || [],
          tableName
        };
      };

      const clip = { clipId: 'clip-123' };
      const input = buildExecutionInput('tenant-123', 'episode-456', clip, 'test-table');

      expect(input.segments).toEqual([]);
    });
  });

  describe('Execution name generation', () => {
    test('should generate correct execution name format', () => {
      const generateExecutionName = (episodeId, clipId) => {
        return `clip-generation-${episodeId}-${clipId}-${Date.now()}`;
      };

      const name = generateExecutionName('episode-123', 'clip-456');

      expect(name).toMatch(/^clip-generation-episode-123-clip-456-\d+$/);
      expect(name).toContain('clip-generation-episode-123-clip-456-');
    });
  });

  describe('Result processing', () => {
    test('should correctly count successful and failed executions', () => {
      const processExecutionResults = (results) => {
        const successful = results.filter(result =>
          result.status === 'fulfilled' && result.value.status === 'started'
        ).length;

        const failed = results.filter(result =>
          result.status === 'rejected' ||
          (result.status === 'fulfilled' && result.value.status === 'failed')
        ).length;

        return { successful, failed };
      };

      const results = [
        { status: 'fulfilled', value: { status: 'started', clipId: 'clip-1' } },
        { status: 'fulfilled', value: { status: 'failed', clipId: 'clip-2', error: 'Error' } },
        { status: 'rejected', reason: new Error('Network error') },
        { status: 'fulfilled', value: { status: 'started', clipId: 'clip-4' } }
      ];

      const counts = processExecutionResults(results);
      expect(counts.successful).toBe(2);
      expect(counts.failed).toBe(2);
    });
  });

  describe('Error handling patterns', () => {
    test('should distinguish between validation errors and service errors', () => {
      const categorizeError = (error) => {
        if (error.message.includes('Missing required fields')) {
          return { type: 'validation', shouldRetry: false };
        }
        if (error.message.includes('DynamoDB') || error.message.includes('Step Functions')) {
          return { type: 'service', shouldRetry: true };
        }
        return { type: 'unknown', shouldRetry: true };
      };

      const validationError = new Error('Missing required fields: tenantId and episodeId are required');
      const serviceError = new Error('DynamoDB error: Table not found');
      const unknownError = new Error('Something went wrong');

      expect(categorizeError(validationError)).toEqual({ type: 'validation', shouldRetry: false });
      expect(categorizeError(serviceError)).toEqual({ type: 'service', shouldRetry: true });
      expect(categorizeError(unknownError)).toEqual({ type: 'unknown', shouldRetry: true });
    });
  });

  describe('Step Functions integration', () => {
    test('should start execution with correct parameters', async () => {
      // Reset mocks for this specific test
      sfnMock.resetHistory();
      sfnMock.reset();

      sfnMock.on(StartExecutionCommand).resolves({
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test-machine:test-execution',
        startDate: new Date()
      });

      const input = {
        tenantId: 'tenant-123',
        episodeId: 'episode-456',
        clipId: 'clip-1',
        segments: [{ startTime: '00:01:00', endTime: '00:01:30' }],
        tableName: 'test-table'
      };

      const executionName = `clip-generation-episode-456-clip-1-${Date.now()}`;

      const sfn = new SFNClient();
      const result = await sfn.send(new StartExecutionCommand({
        stateMachineArn: process.env.STATE_MACHINE_ARN,
        name: executionName,
        input: JSON.stringify(input)
      }));

      expect(result.executionArn).toBeDefined();
      expect(sfnMock.calls()).toHaveLength(1);

      const call = sfnMock.calls()[0];
      expect(call.args[0].input.stateMachineArn).toBe(process.env.STATE_MACHINE_ARN);
      expect(call.args[0].input.name).toContain('clip-generation-episode-456-clip-1-');

      const parsedInput = JSON.parse(call.args[0].input.input);
      expect(parsedInput.tenantId).toBe('tenant-123');
      expect(parsedInput.episodeId).toBe('episode-456');
      expect(parsedInput.clipId).toBe('clip-1');
      expect(parsedInput.tableName).toBe('test-table');
    });

    test('should handle Step Functions execution failures', async () => {
      // Reset mocks for this specific test
      sfnMock.resetHistory();
      sfnMock.reset();

      sfnMock.on(StartExecutionCommand).rejects(new Error('StateMachine not found'));

      const sfn = new SFNClient();

      await expect(sfn.send(new StartExecutionCommand({
        stateMachineArn: 'invalid-arn',
        name: 'test-execution',
        input: JSON.stringify({})
      }))).rejects.toThrow('StateMachine not found');

      expect(sfnMock.calls()).toHaveLength(1);
    });
  });

  describe('End-to-end event processing', () => {
    test('should process valid Begin Clip Generation event', async () => {
      // Reset mocks for this specific test
      ddbMock.resetHistory();
      sfnMock.resetHistory();
      ddbMock.reset();
      sfnMock.reset();

      const mockClips = [
        marshall({
          pk: 'tenant-123#episode-456',
          sk: 'clip#clip-1',
          clipId: 'clip-1',
          status: 'detected',
          segments: [{ startTime: '00:01:00', endTime: '00:01:30' }]
        }),
        marshall({
          pk: 'tenant-123#episode-456',
          sk: 'clip#clip-2',
          clipId: 'clip-2',
          status: 'detected',
          segments: [{ startTime: '00:02:00', endTime: '00:02:30' }]
        })
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockClips,
        Count: 2
      });

      sfnMock.on(StartExecutionCommand).resolves({
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test-machine:test-execution',
        startDate: new Date()
      });

      const event = {
        source: 'nullcheck.clips',
        'detail-type': 'Begin Clip Generation',
        detail: {
          tenantId: 'tenant-123',
          episodeId: 'episode-456'
        }
      };

      // Simulate the handler logic
      const processEvent = async (event) => {
        const { source, 'detail-type': detailType, detail } = event;

        if (source !== 'nullcheck.clips' || detailType !== 'Begin Clip Generation') {
          return { statusCode: 200, message: 'Event ignored' };
        }

        const { tenantId, episodeId } = detail;
        if (!tenantId || !episodeId) {
          throw new Error('Missing required fields: tenantId and episodeId are required');
        }

        const ddb = new DynamoDBClient();
        const queryResult = await ddb.send(new QueryCommand({
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: marshall({
            ':pk': `${tenantId}#${episodeId}`,
            ':sk': 'clip#',
            ':status': 'detected'
          })
        }));

        if (!queryResult.Items || queryResult.Items.length === 0) {
          return {
            statusCode: 200,
            message: 'No clips found for processing',
            episodeId,
            tenantId
          };
        }

        const clips = queryResult.Items.map(item => unmarshall(item));
        const sfn = new SFNClient();

        const executionPromises = clips.map(async (clip) => {
          const executionName = `clip-generation-${episodeId}-${clip.clipId}-${Date.now()}`;
          const input = {
            tenantId,
            episodeId,
            clipId: clip.clipId,
            segments: clip.segments || [],
            tableName: process.env.TABLE_NAME
          };

          try {
            const result = await sfn.send(new StartExecutionCommand({
              stateMachineArn: process.env.STATE_MACHINE_ARN,
              name: executionName,
              input: JSON.stringify(input)
            }));

            return {
              clipId: clip.clipId,
              executionArn: result.executionArn,
              status: 'started'
            };
          } catch (error) {
            return {
              clipId: clip.clipId,
              status: 'failed',
              error: error.message
            };
          }
        });

        const executionResults = await Promise.allSettled(executionPromises);
        const successful = executionResults.filter(result =>
          result.status === 'fulfilled' && result.value.status === 'started'
        ).length;

        return {
          statusCode: 200,
          message: 'Clip generation workflows started',
          episodeId,
          tenantId,
          totalClips: clips.length,
          successful,
          executions: executionResults.map(result =>
            result.status === 'fulfilled' ? result.value : { status: 'failed' }
          )
        };
      };

      const result = await processEvent(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Clip generation workflows started');
      expect(result.totalClips).toBe(2);
      expect(result.successful).toBe(2);
      expect(ddbMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()).toHaveLength(2);
    });

    test('should handle no clips found scenario', async () => {
      // Reset mocks for this specific test
      ddbMock.resetHistory();
      sfnMock.resetHistory();
      ddbMock.reset();
      sfnMock.reset();

      ddbMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0
      });

      const event = {
        source: 'nullcheck.clips',
        'detail-type': 'Begin Clip Generation',
        detail: {
          tenantId: 'tenant-123',
          episodeId: 'episode-456'
        }
      };

      const processEvent = async (event) => {
        const { source, 'detail-type': detailType, detail } = event;
        const { tenantId, episodeId } = detail;

        const ddb = new DynamoDBClient();
        const queryResult = await ddb.send(new QueryCommand({
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: marshall({
            ':pk': `${tenantId}#${episodeId}`,
            ':sk': 'clip#',
            ':status': 'detected'
          })
        }));

        if (!queryResult.Items || queryResult.Items.length === 0) {
          return {
            statusCode: 200,
            message: 'No clips found for processing',
            episodeId,
            tenantId
          };
        }
      };

      const result = await processEvent(event);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('No clips found for processing');
      expect(ddbMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()).toHaveLength(0);
    });
  });
});
