import { Logger } from '@aws-lambda-powertools/logger';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import Handlebars from 'handlebars';
import teamInvitationTemplate from '../../templates/emails/team-invitation.hbs';
import teamRemovalTemplate from '../../templates/emails/team-removal.hbs';
import roleChangeTemplate from '../../templates/emails/role-change.hbs';
import welcomeAutoLinkTemplate from '../../templates/emails/welcome-auto-link.hbs';

const logger = new Logger({ serviceName: 'events' });
const createSimpleErrorResponse = (message, isTemporary = false) => ({
  error: 'EmailDeliveryError',
  message,
  isTemporary,
  timestamp: new Date().toISOString()
});

const ses = new SESv2Client();
const sqs = new SQSClient();

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const calculateBackoffDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
};

const sendToDeadLetterQueue = async (originalEvent, error, attempts) => {
  if (!process.env.EMAIL_DLQ_URL) {
    logger.warn('Dead letter queue URL not configured, skipping DLQ message');
    return;
  }

  try {
    const dlqMessage = {
      originalEvent,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      },
      attempts,
      failedAt: new Date().toISOString(),
      source: 'send-team-email'
    };

    const params = {
      QueueUrl: process.env.EMAIL_DLQ_URL,
      MessageBody: JSON.stringify(dlqMessage),
      MessageAttributes: {
        ErrorType: {
          DataType: 'String',
          StringValue: error.name || 'UnknownError'
        },
        EventType: {
          DataType: 'String',
          StringValue: originalEvent['detail-type'] || 'Unknown'
        },
        Attempts: {
          DataType: 'Number',
          StringValue: attempts.toString()
        }
      }
    };

    await sqs.send(new SendMessageCommand(params));

    logger.info('Message sent to dead letter queue', {
      eventType: originalEvent['detail-type'],
      recipient: originalEvent.detail?.email,
      attempts
    });
  } catch (dlqError) {
    logger.error('Failed to send message to dead letter queue', {
      error: dlqError.message,
      originalError: error.message
    });
  }
};

const getTemplate = (templateName, data) => {
  let template;

  switch (templateName) {
    case 'team-invitation':
      template = teamInvitationTemplate;
      break;
    case 'team-removal':
      template = teamRemovalTemplate;
      break;
    case 'role-change':
      template = roleChangeTemplate;
      break;
    case 'welcome-auto-link':
      template = welcomeAutoLinkTemplate;
      break;
    case 'invitation-cancelled':
      template = invitationCancelledTemplate;
      break;
    default:
      throw new Error(`Unsupported template: ${templateName}`);
  }

  const htmlTemplate = Handlebars.compile(template);
  return htmlTemplate(data);
};

const getEmailConfig = (eventType, eventData) => {
  const baseConfig = {
    source: process.env.FROM_EMAIL || 'noreply@nullcheck.tv',
    appUrl: process.env.APP_URL || 'https://app.nullcheck.tv'
  };

  switch (eventType) {
    case 'Team Member Added':
      return {
        ...baseConfig,
        template: 'team-invitation',
        subject: `You've been invited to join ${eventData.teamName}`,
        recipient: eventData.email,
        templateData: {
          userName: eventData.memberName || eventData.email,
          teamName: eventData.teamName,
          inviterName: eventData.inviterName,
          role: eventData.role || 'member',
          appUrl: baseConfig.appUrl
        }
      };

    case 'Team Member Removed':
    case 'Team Member Deactivated':
      return {
        ...baseConfig,
        template: 'team-removal',
        subject: `Team membership update for ${eventData.teamName}`,
        recipient: eventData.email,
        templateData: {
          userName: eventData.memberName || eventData.email,
          teamName: eventData.teamName,
          appUrl: baseConfig.appUrl
        }
      };

    case 'Team Member Role Updated':
      return {
        ...baseConfig,
        template: 'role-change',
        subject: `Your role in ${eventData.teamName} has been updated`,
        recipient: eventData.email,
        templateData: {
          userName: eventData.memberName || eventData.email,
          teamName: eventData.teamName,
          newRole: eventData.newRole,
          appUrl: baseConfig.appUrl
        }
      };

    case 'Team Member Auto-Linked':
      return {
        ...baseConfig,
        template: 'welcome-auto-link',
        subject: `Welcome to ${eventData.teamName}!`,
        recipient: eventData.email,
        templateData: {
          userName: eventData.memberName || eventData.email,
          teamName: eventData.teamName,
          appUrl: baseConfig.appUrl
        }
      };

    case 'Team Invitation Cancelled':
      return {
        ...baseConfig,
        template: 'invitation-cancelled',
        subject: `Team invitation cancelled for ${eventData.teamName}`,
        recipient: eventData.email,
        templateData: {
          teamName: eventData.teamName,
          inviterName: eventData.inviterName,
          appUrl: baseConfig.appUrl
        }
      };

    default:
      throw new Error(`Unsupported event type: ${eventType}`);
  }
};

const sendEmailWithRetry = async (emailConfig, maxAttempts = 3) => {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const htmlContent = getTemplate(emailConfig.template, emailConfig.templateData);
      const params = {
        FromEmailAddress: process.env.FROM_EMAIL,
        Destination: {
          ToAddresses: [emailConfig.recipient]
        },
        Content: {
          Simple: {
            Subject: { Data: emailConfig.subject },
            Body: { Html: { Data: htmlContent } }
          }
        }
      };

      const result = await ses.send(new SendEmailCommand(params));

      logger.info('Email sent successfully', {
        messageId: result.MessageId,
        recipient: emailConfig.recipient,
        subject: emailConfig.subject,
        template: emailConfig.template,
        attempt: attempt + 1
      });

      return {
        success: true,
        messageId: result.MessageId,
        attempts: attempt + 1
      };
    } catch (error) {
      lastError = error;

      logger.error('Email delivery attempt failed', {
        error: error.message,
        errorCode: error.name || error.code,
        recipient: emailConfig.recipient,
        template: emailConfig.template,
        subject: emailConfig.subject,
        attempt: attempt + 1,
        maxAttempts,
        isTemporary: isTemporaryError(error)
      });

      if (!isTemporaryError(error)) {
        logger.error('Permanent email delivery failure detected', {
          error: error.message,
          errorCode: error.name || error.code,
          recipient: emailConfig.recipient
        });
        break;
      }

      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoffDelay(attempt);
        logger.info(`Retrying email delivery in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    errorCode: lastError?.name || lastError?.code,
    attempts: maxAttempts,
    isTemporary: isTemporaryError(lastError)
  };
};

export const handler = async (event) => {
  try {
    logger.info('Processing team email event', {
      eventType: event['detail-type'],
      source: event.source,
      recipient: event.detail?.email,
      teamName: event.detail?.teamName
    });

    const eventType = event['detail-type'];
    const eventData = event.detail;

    if (!eventType || !eventData) {
      logger.error('Invalid event structure - missing detail-type or detail');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Event must contain detail-type and detail fields' })
      };
    }

    if (!eventData.email) {
      logger.error('Missing required field: email');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'email is required in event data' })
      };
    }

    if (!eventData.teamName) {
      logger.error('Missing required field: teamName');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'teamName is required in event data' })
      };
    }

    const emailConfig = getEmailConfig(eventType, eventData);
    const result = await sendEmailWithRetry(emailConfig);

    if (result.success) {
      logger.info('Email processing completed successfully', {
        eventType,
        recipient: eventData.email,
        messageId: result.messageId,
        attempts: result.attempts
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Email sent successfully',
          messageId: result.messageId,
          attempts: result.attempts
        })
      };
    } else {
      logger.error('Email delivery failed after all retries', {
        eventType,
        recipient: eventData.email,
        error: result.error,
        errorCode: result.errorCode,
        attempts: result.attempts,
        isTemporary: result.isTemporary
      });

      await sendToDeadLetterQueue(event, {
        message: result.error,
        name: result.errorCode,
        code: result.errorCode
      }, result.attempts);


      const errorResponse = createSimpleErrorResponse(result.error, result.isTemporary);
      if (result.isTemporary) {
        return {
          statusCode: 503,
          body: JSON.stringify(errorResponse)
        };
      } else {
        return {
          statusCode: 422,
          body: JSON.stringify(errorResponse)
        };
      }
    }
  } catch (error) {
    logger.error('Error processing team email event', {
      error: error.message,
      stack: error.stack,
      eventType: event['detail-type'],
      recipient: event.detail?.email
    });

    await sendToDeadLetterQueue(event, error, 0);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong' })
    };
  }
};
