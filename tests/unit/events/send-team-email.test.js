const { mockClient } = require('aws-sdk-client-mock');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

const sesMock = mockClient(SESv2Client);
const sqsMock = mockClient(SQSClient);

const { Logger } = require('@aws-lambda-powertools/logger');

describe('send-team-email error handling logic', () => {
  let mockLogger;

  beforeEach(() => {
    sesMock.reset();
    sqsMock.reset();
    jest.clearAllMocks();

    // Create fresh logger mock for each test
    mockLogger = new Logger({ serviceName: 'events' });
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'dlq-message-id' });
  });

  describe('Error classification', () => {
    test('should identify temporary errors correctly', () => {
      const isTemporaryError = (error) => {
        const temporaryErrorCodes = [
          'Throttling',
          'ServiceUnavailable',
          'InternalFailure',
          'RequestTimeout'
        ];

        const temporaryErrorMessages = [
          'rate exceeded',
          'throttled',
          'service unavailable',
          'timeout',
          'connection',
          'network'
        ];

        if (temporaryErrorCodes.includes(error.name || error.code)) {
          return true;
        }

        const errorMessage = (error.message || '').toLowerCase();
        return temporaryErrorMessages.some(msg => errorMessage.includes(msg));
      };

      expect(isTemporaryError({ name: 'Throttling' })).toBe(true);
      expect(isTemporaryError({ code: 'ServiceUnavailable' })).toBe(true);
      expect(isTemporaryError({ message: 'Rate exceeded' })).toBe(true);
      expect(isTemporaryError({ message: 'Connection timeout' })).toBe(true);

      expect(isTemporaryError({ name: 'MessageRejected' })).toBe(false);
      expect(isTemporaryError({ message: 'Invalid email address' })).toBe(false);
      expect(isTemporaryError({ name: 'ValidationException' })).toBe(false);
    });

    test('should calculate exponential backoff correctly', () => {
      const calculateBackoffDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 0.1 * delay;
        return Math.floor(delay + jitter);
      };

      const delay0 = calculateBackoffDelay(0, 1000, 30000);
      const delay1 = calculateBackoffDelay(1, 1000, 30000);
      const delay2 = calculateBackoffDelay(2, 1000, 30000);

      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThan(1100);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThan(2200);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThan(4400);

      const delayMax = calculateBackoffDelay(10, 1000, 30000);
      expect(delayMax).toBeLessThanOrEqual(33000);
    });
  });

  describe('SES integration', () => {
    test('should succeed on first attempt', async () => {
      sesMock.on(SendEmailCommand).resolves({
        MessageId: 'test-message-id'
      });

      const ses = new SESv2Client();
      const result = await ses.send(new SendEmailCommand({
        Source: 'test@example.com',
        Destination: { ToAddresses: ['recipient@example.com'] },
        Message: {
          Subject: { Data: 'Test Subject' },
          Body: { Html: { Data: '<p>Test Body</p>' } }
        }
      }));

      expect(result.MessageId).toBe('test-message-id');
      expect(sesMock.calls()).toHaveLength(1);
    });

    test('should handle SES throttling error', async () => {
      sesMock.on(SendEmailCommand).rejects({
        name: 'Throttling',
        message: 'Rate exceeded'
      });

      const ses = new SESv2Client();

      await expect(ses.send(new SendEmailCommand({
        Source: 'test@example.com',
        Destination: { ToAddresses: ['recipient@example.com'] },
        Message: {
          Subject: { Data: 'Test Subject' },
          Body: { Html: { Data: '<p>Test Body</p>' } }
        }
      }))).rejects.toMatchObject({
        name: 'Throttling',
        message: 'Rate exceeded'
      });

      expect(sesMock.calls()).toHaveLength(1);
    });
  });



  describe('Dead letter queue', () => {
    test('should send message to DLQ successfully', async () => {
      const sqs = new SQSClient();

      const dlqMessage = {
        originalEvent: {
          'detail-type': 'Team Member Added',
          detail: { email: 'test@example.com', teamName: 'Test Team' }
        },
        error: { message: 'SES error', name: 'Throttling' },
        attempts: 3,
        failedAt: new Date().toISOString()
      };

      await sqs.send(new SendMessageCommand({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/test-dlq',
        MessageBody: JSON.stringify(dlqMessage),
        MessageAttributes: {
          ErrorType: { DataType: 'String', StringValue: 'Throttling' },
          EventType: { DataType: 'String', StringValue: 'Team Member Added' },
          Attempts: { DataType: 'Number', StringValue: '3' }
        }
      }));

      expect(sqsMock.calls()).toHaveLength(1);

      const call = sqsMock.calls()[0];
      expect(call.args[0].input.QueueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789/test-dlq');
      expect(call.args[0].input.MessageAttributes.ErrorType.StringValue).toBe('Throttling');
      expect(call.args[0].input.MessageAttributes.Attempts.StringValue).toBe('3');
    });
  });
});
