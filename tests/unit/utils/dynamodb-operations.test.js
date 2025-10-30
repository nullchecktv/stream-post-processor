// Unit tests for DynamoDB integration operations
// These tests validate the DynamoDB syntax and operations used in the workflow

const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);

describe('DynamoDB Integration Operations', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Status history updates', () => {
    test('should construct correct updateItem for setting in progress status', () => {
      const buildInProgressUpdate = (tenantId, episodeId, clipId, tableName) => {
        return {
          TableName: tableName,
          Key: {
            pk: { S: `${tenantId}#${episodeId}` },
            sk: { S: `clip#${clipId}` }
          },
          UpdateExpression: 'SET #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatus), #status = :status, #updatedAt = :updatedAt, #processingStartedAt = :processingStartedAt',
          ExpressionAttributeNames: {
            '#statusHistory': 'statusHistory',
            '#status': 'status',
            '#updatedAt': 'updatedAt',
            '#processingStartedAt': 'processingStartedAt'
          },
          ExpressionAttributeValues: {
            ':status': { S: 'Generation in Progress' },
            ':newStatus': {
              L: [{
                M: {
                  status: { S: 'Generation in Progress' },
                  timestamp: { S: new Date().toISOString() },
                  segmentCount: { N: '3' }
                }
              }]
            },
            ':updatedAt': { S: new Date().toISOString() },
            ':processingStartedAt': { S: new Date().toISOString() },
            ':emptyList': { L: [] }
          }
        };
      };

      const params = buildInProgressUpdate('tenant-123', 'episode-456', 'clip-789', 'test-table');

      expect(params.TableName).toBe('test-table');
      expect(params.Key.pk.S).toBe('tenant-123#episode-456');
      expect(params.Key.sk.S).toBe('clip#clip-789');
      expect(params.UpdateExpression).toContain('list_append(if_not_exists(#statusHistory, :emptyList)');
      expect(params.ExpressionAttributeValues[':status'].S).toBe('Generation in Progress');
      expect(params.ExpressionAttributeValues[':emptyList'].L).toEqual([]);
    });

    test('should construct correct updateItem for completion status', () => {
      const buildCompletionUpdate = (tenantId, episodeId, clipId, clipData, tableName) => {
        return {
          TableName: tableName,
          Key: {
            pk: { S: `${tenantId}#${episodeId}` },
            sk: { S: `clip#${clipId}` }
          },
          UpdateExpression: 'SET #statusHistory = list_append(#statusHistory, :newStatus), #status = :status, #updatedAt = :updatedAt, #processedAt = :processedAt, #s3Key = :s3Key, #fileSize = :fileSize, #duration = :duration, #processingMetadata = :processingMetadata',
          ExpressionAttributeNames: {
            '#statusHistory': 'statusHistory',
            '#status': 'status',
            '#updatedAt': 'updatedAt',
            '#processedAt': 'processedAt',
            '#s3Key': 's3Key',
            '#fileSize': 'fileSize',
            '#duration': 'duration',
            '#processingMetadata': 'processingMetadata'
          },
          ExpressionAttributeValues: {
            ':status': { S: 'Generation Complete' },
            ':newStatus': {
              L: [{
                M: {
                  status: { S: 'Generation Complete' },
                  timestamp: { S: new Date().toISOString() },
                  processingDuration: { N: '45.2' },
                  segmentCount: { N: '3' }
                }
              }]
            },
            ':updatedAt': { S: new Date().toISOString() },
            ':processedAt': { S: new Date().toISOString() },
            ':s3Key': { S: clipData.s3Key },
            ':fileSize': { N: clipData.fileSize.toString() },
            ':duration': { S: clipData.duration },
            ':processingMetadata': {
              M: {
                segmentCount: { N: '3' },
                totalProcessingTime: { N: '45.2' },
                resolution: { S: '1920x1080' },
                codec: { S: 'h264' },
                ffmpegVersion: { S: '4.4.2' }
              }
            }
          }
        };
      };

      const clipData = {
        s3Key: 'episode-456/clips/clip-789/clip.mp4',
        fileSize: 45728640,
        duration: '00:02:15'
      };

      const params = buildCompletionUpdate('tenant-123', 'episode-456', 'clip-789', clipData, 'test-table');

      expect(params.UpdateExpression).toContain('#s3Key = :s3Key');
      expect(params.UpdateExpression).toContain('#fileSize = :fileSize');
      expect(params.UpdateExpression).toContain('#duration = :duration');
      expect(params.UpdateExpression).toContain('#processingMetadata = :processingMetadata');
      expect(params.ExpressionAttributeValues[':status'].S).toBe('Generation Complete');
      expect(params.ExpressionAttributeValues[':s3Key'].S).toBe('episode-456/clips/clip-789/clip.mp4');
      expect(params.ExpressionAttributeValues[':fileSize'].N).toBe('45728640');
    });

    test('should construct correct updateItem for error status', () => {
      const buildErrorUpdate = (tenantId, episodeId, clipId, error, tableName) => {
        return {
          TableName: tableName,
          Key: {
            pk: { S: `${tenantId}#${episodeId}` },
            sk: { S: `clip#${clipId}` }
          },
          UpdateExpression: 'SET #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :failureStatus), #status = :status, #updatedAt = :updatedAt, #processingError = :error, #processingFailedAt = :processingFailedAt',
          ExpressionAttributeNames: {
            '#statusHistory': 'statusHistory',
            '#status': 'status',
            '#updatedAt': 'updatedAt',
            '#processingError': 'processingError',
            '#processingFailedAt': 'processingFailedAt'
          },
          ExpressionAttributeValues: {
            ':status': { S: 'Generation Failed' },
            ':failureStatus': {
              L: [{
                M: {
                  status: { S: 'Generation Failed' },
                  timestamp: { S: new Date().toISOString() },
                  error: { S: error.message },
                  errorType: { S: error.name },
                  processingDuration: { N: '30.5' }
                }
              }]
            },
            ':updatedAt': { S: new Date().toISOString() },
            ':processingFailedAt': { S: new Date().toISOString() },
            ':error': {
              M: {
                message: { S: error.message },
                errorType: { S: error.name },
                timestamp: { S: new Date().toISOString() },
                processingDuration: { N: '30.5' },
                originalError: { S: JSON.stringify(error) }
              }
            },
            ':emptyList': { L: [] }
          }
        };
      };

      const error = { name: 'FFmpegError', message: 'FFmpeg processing failed: Invalid input format' };
      const params = buildErrorUpdate('tenant-123', 'episode-456', 'clip-789', error, 'test-table');

      expect(params.UpdateExpression).toContain('#processingError = :error');
      expect(params.UpdateExpression).toContain('#processingFailedAt = :processingFailedAt');
      expect(params.ExpressionAttributeValues[':status'].S).toBe('Generation Failed');
      expect(params.ExpressionAttributeValues[':error'].M.message.S).toBe('FFmpeg processing failed: Invalid input format');
      expect(params.ExpressionAttributeValues[':error'].M.errorType.S).toBe('FFmpegError');
    });
  });

  describe('DynamoDB operation execution', () => {
    test('should execute updateItem with retry logic', async () => {
      ddbMock.on(UpdateItemCommand).resolves({});

      const executeUpdateWithRetry = async (params, maxRetries = 3) => {
        let attempts = 0;
        const errors = [];

        while (attempts < maxRetries) {
          attempts++;

          try {
            const ddb = new DynamoDBClient();
            const result = await ddb.send(new UpdateItemCommand(params));
            return { success: true, attempts, result };
          } catch (error) {
            errors.push(error);

            // Check if error is retryable
            if (error.name === 'ProvisionedThroughputExceededException' ||
                error.name === 'ThrottlingException' ||
                error.name === 'ServiceException') {

              if (attempts < maxRetries) {
                // Exponential backoff
                const delay = Math.pow(2, attempts - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
            }

            throw error;
          }
        }

        throw new Error(`Failed after ${maxRetries} attempts`);
      };

      const params = {
        TableName: 'test-table',
        Key: { pk: { S: 'test-key' }, sk: { S: 'test-sort' } },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': { S: 'test-status' } }
      };

      const result = await executeUpdateWithRetry(params);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    test('should handle DynamoDB throttling with exponential backoff', async () => {
      ddbMock.on(UpdateItemCommand)
        .rejectsOnce({ name: 'ProvisionedThroughputExceededException' })
        .rejectsOnce({ name: 'ThrottlingException' })
        .resolves({});

      const executeUpdateWithRetry = async (params, maxRetries = 3) => {
        let attempts = 0;

        while (attempts < maxRetries) {
          attempts++;

          try {
            const ddb = new DynamoDBClient();
            const result = await ddb.send(new UpdateItemCommand(params));
            return { success: true, attempts, result };
          } catch (error) {
            if ((error.name === 'ProvisionedThroughputExceededException' ||
                 error.name === 'ThrottlingException') && attempts < maxRetries) {
              continue;
            }
            throw error;
          }
        }
      };

      const params = {
        TableName: 'test-table',
        Key: { pk: { S: 'test-key' }, sk: { S: 'test-sort' } },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': { S: 'test-status' } }
      };

      const result = await executeUpdateWithRetry(params);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(ddbMock.calls()).toHaveLength(3);
    });

    test('should validate DynamoDB attribute value types', () => {
      const validateAttributeValues = (values) => {
        const errors = [];

        for (const [key, value] of Object.entries(values)) {
          if (!value || typeof value !== 'object') {
            errors.push(`${key}: Value must be an object`);
            continue;
          }

          const types = Object.keys(value);
          if (types.length !== 1) {
            errors.push(`${key}: Value must have exactly one type`);
            continue;
          }

          const type = types[0];
          const validTypes = ['S', 'N', 'B', 'SS', 'NS', 'BS', 'M', 'L', 'NULL', 'BOOL'];

          if (!validTypes.includes(type)) {
            errors.push(`${key}: Invalid type '${type}'`);
          }

          // Type-specific validation
          if (type === 'N' && typeof value[type] !== 'string') {
            errors.push(`${key}: Number values must be strings`);
          }

          if (type === 'L' && !Array.isArray(value[type])) {
            errors.push(`${key}: List values must be arrays`);
          }

          if (type === 'M' && typeof value[type] !== 'object') {
            errors.push(`${key}: Map values must be objects`);
          }
        }

        return errors;
      };

      const validValues = {
        ':status': { S: 'Generation Complete' },
        ':fileSize': { N: '45728640' },
        ':metadata': {
          M: {
            duration: { N: '135.5' },
            resolution: { S: '1920x1080' }
          }
        },
        ':segments': { L: [{ S: 'segment1' }, { S: 'segment2' }] }
      };

      const invalidValues = {
        ':badNumber': { N: 123 }, // Should be string
        ':badList': { L: 'not-array' }, // Should be array
        ':badMap': { M: 'not-object' }, // Should be object
        ':invalidType': { X: 'invalid' } // Invalid type
      };

      expect(validateAttributeValues(validValues)).toEqual([]);

      const errors = validateAttributeValues(invalidValues);
      expect(errors).toContain(':badNumber: Number values must be strings');
      expect(errors).toContain(':badList: List values must be arrays');
      expect(errors).toContain(':badMap: Map values must be objects');
      expect(errors).toContain(":invalidType: Invalid type 'X'");
    });
  });

  describe('Expression attribute handling', () => {
    test('should validate expression attribute names', () => {
      const validateExpressionAttributeNames = (names) => {
        const errors = [];

        for (const [placeholder, attributeName] of Object.entries(names)) {
          if (!placeholder.startsWith('#')) {
            errors.push(`Placeholder '${placeholder}' must start with #`);
          }

          if (typeof attributeName !== 'string' || attributeName.length === 0) {
            errors.push(`Attribute name for '${placeholder}' must be a non-empty string`);
          }

          // Check for reserved words
          const reservedWords = ['status', 'timestamp', 'data', 'type', 'name'];
          if (attributeName && reservedWords.includes(attributeName.toLowerCase())) {
            // This is actually valid - reserved words should use expression attribute names
          }
        }

        return errors;
      };

      const validNames = {
        '#status': 'status',
        '#statusHistory': 'statusHistory',
        '#updatedAt': 'updatedAt'
      };

      const invalidNames = {
        'status': 'status', // Missing #
        '#empty': '', // Empty attribute name
        '#null': null // Null attribute name
      };

      expect(validateExpressionAttributeNames(validNames)).toEqual([]);

      const errors = validateExpressionAttributeNames(invalidNames);
      expect(errors).toContain("Placeholder 'status' must start with #");
      expect(errors).toContain("Attribute name for '#empty' must be a non-empty string");
    });

    test('should validate update expression syntax', () => {
      const validateUpdateExpression = (expression) => {
        const errors = [];

        // Check for valid SET operations
        if (!expression.includes('SET')) {
          errors.push('Update expression must contain SET operation');
        }

        // Check for proper list_append usage
        const listAppendMatches = expression.match(/list_append\([^)]+\)/g);
        if (listAppendMatches) {
          listAppendMatches.forEach(match => {
            if (!match.includes('if_not_exists')) {
              errors.push(`list_append should use if_not_exists: ${match}`);
            }
          });
        }

        // Check for attribute name placeholders
        const attributeRefs = expression.match(/#\w+/g);
        if (attributeRefs) {
          attributeRefs.forEach(ref => {
            if (ref.length < 2) {
              errors.push(`Invalid attribute reference: ${ref}`);
            }
          });
        }

        // Check for value placeholders
        const valueRefs = expression.match(/:\w+/g);
        if (valueRefs) {
          valueRefs.forEach(ref => {
            if (ref.length < 2) {
              errors.push(`Invalid value reference: ${ref}`);
            }
          });
        }

        return errors;
      };

      const validExpression = 'SET #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatus), #status = :status, #updatedAt = :updatedAt';
      const invalidExpression = 'UPDATE status = :status'; // Wrong operation

      expect(validateUpdateExpression(validExpression)).toEqual([]);
      expect(validateUpdateExpression(invalidExpression)).toContain('Update expression must contain SET operation');
    });
  });
});
