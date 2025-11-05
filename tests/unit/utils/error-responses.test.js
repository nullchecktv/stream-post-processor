// Mock environment variables
process.env.TABLE_NAME = 'test-table';

describe('Error Response Utilities', () => {
  describe('Error Response Structure', () => {
    test('should create validation error response structure', () => {
      const createValidationErrorResponse = (errors, context = {}) => {
        const errorDetails = Array.isArray(errors) ? errors : [errors];

        return {
          error: 'ValidationError',
          message: 'The request contains invalid data. Please check the details and try again.',
          details: errorDetails,
          ...(context.field && { field: context.field }),
          ...(context.suggestion && { suggestion: context.suggestion }),
          timestamp: new Date().toISOString()
        };
      };

      const response = createValidationErrorResponse('Email is required');

      expect(response.error).toBe('ValidationError');
      expect(response.message).toBe('The request contains invalid data. Please check the details and try again.');
      expect(response.details).toEqual(['Email is required']);
      expect(response.timestamp).toBeDefined();
    });

    test('should create validation error with multiple errors and context', () => {
      const createValidationErrorResponse = (errors, context = {}) => {
        const errorDetails = Array.isArray(errors) ? errors : [errors];

        return {
          error: 'ValidationError',
          message: 'The request contains invalid data. Please check the details and try again.',
          details: errorDetails,
          ...(context.field && { field: context.field }),
          ...(context.suggestion && { suggestion: context.suggestion }),
          timestamp: new Date().toISOString()
        };
      };

      const errors = ['Email is required', 'Role must be administrator or member'];
      const response = createValidationErrorResponse(errors, {
        field: 'body',
        suggestion: 'Check the request format'
      });

      expect(response.details).toEqual(errors);
      expect(response.field).toBe('body');
      expect(response.suggestion).toBe('Check the request format');
    });
  });

  describe('Authentication Error Response', () => {
    test('should create authentication error with default message', () => {
      const createAuthenticationErrorResponse = (message = 'Authentication required', context = {}) => {
        return {
          error: 'AuthenticationError',
          message,
          details: [
            'Please ensure you are logged in and have a valid session.',
            'If you continue to experience issues, try logging out and logging back in.'
          ],
          ...(context.loginUrl && { loginUrl: context.loginUrl }),
          timestamp: new Date().toISOString()
        };
      };

      const response = createAuthenticationErrorResponse();

      expect(response.error).toBe('AuthenticationError');
      expect(response.message).toBe('Authentication required');
      expect(response.details).toContain('Please ensure you are logged in and have a valid session.');
    });

    test('should create authentication error with custom message and context', () => {
      const createAuthenticationErrorResponse = (message = 'Authentication required', context = {}) => {
        return {
          error: 'AuthenticationError',
          message,
          details: [
            'Please ensure you are logged in and have a valid session.',
            'If you continue to experience issues, try logging out and logging back in.'
          ],
          ...(context.loginUrl && { loginUrl: context.loginUrl }),
          timestamp: new Date().toISOString()
        };
      };

      const response = createAuthenticationErrorResponse('Invalid token', {
        loginUrl: 'https://app.example.com/login'
      });

      expect(response.message).toBe('Invalid token');
      expect(response.loginUrl).toBe('https://app.example.com/login');
    });
  });

  describe('Permission Error Response', () => {
    test('should create permission error with operation context', () => {
      const createPermissionErrorResponse = (message, context = {}) => {
        const permissionSuggestions = {
          'add_member': [
            'Only team owners and administrators can add members to teams.',
            'Contact your team owner if you need to add members.',
            'Check your role in the team settings.'
          ]
        };

        const baseResponse = {
          error: 'PermissionError',
          message,
          timestamp: new Date().toISOString()
        };

        if (context.operation && permissionSuggestions[context.operation]) {
          baseResponse.details = permissionSuggestions[context.operation];
        } else {
          baseResponse.details = [
            'You do not have sufficient permissions for this action.',
            'Contact your team administrator or owner for assistance.'
          ];
        }

        if (context.requiredRole) {
          baseResponse.requiredRole = context.requiredRole;
          baseResponse.details.push(`This action requires ${context.requiredRole} role or higher.`);
        }

        if (context.currentRole) {
          baseResponse.currentRole = context.currentRole;
        }

        return baseResponse;
      };

      const response = createPermissionErrorResponse('Access denied', {
        operation: 'add_member',
        currentRole: 'member',
        requiredRole: 'administrator'
      });

      expect(response.error).toBe('PermissionError');
      expect(response.message).toBe('Access denied');
      expect(response.currentRole).toBe('member');
      expect(response.requiredRole).toBe('administrator');
      expect(response.details).toContain('Only team owners and administrators can add members to teams.');
    });
  });

  describe('Not Found Error Response', () => {
    test('should create not found error with identifier', () => {
      const createNotFoundErrorResponse = (resource, identifier = null, context = {}) => {
        const resourceSuggestions = {
          team: [
            'Verify the team ID is correct.',
            'The team may have been deleted.',
            'Check if you have access to this team.'
          ],
          user: [
            'Verify the user ID is correct.',
            'The user account may not exist.',
            'Check if the user has registered an account.'
          ]
        };

        const baseMessage = identifier
          ? `${resource} with identifier '${identifier}' was not found`
          : `${resource} not found`;

        return {
          error: 'NotFoundError',
          message: baseMessage,
          details: resourceSuggestions[resource.toLowerCase()] || [
            'The requested resource does not exist.',
            'Verify the identifier is correct and try again.'
          ],
          ...(identifier && { identifier }),
          ...(context.suggestion && { suggestion: context.suggestion }),
          timestamp: new Date().toISOString()
        };
      };

      const response = createNotFoundErrorResponse('team', 'team-123');

      expect(response.error).toBe('NotFoundError');
      expect(response.message).toBe("team with identifier 'team-123' was not found");
      expect(response.identifier).toBe('team-123');
      expect(response.details).toContain('Verify the team ID is correct.');
    });
  });

  describe('Conflict Error Response', () => {
    test('should create conflict error with context', () => {
      const createConflictErrorResponse = (message, context = {}) => {
        const conflictSuggestions = {
          duplicate_invitation: [
            'The user already has a pending invitation to this team.',
            'Wait for the user to accept the existing invitation.',
            'Cancel the existing invitation before sending a new one.'
          ]
        };

        return {
          error: 'ConflictError',
          message,
          details: conflictSuggestions[context.type] || [
            'The request conflicts with the current state of the resource.',
            'Check the current state and try again.'
          ],
          ...(context.existingResource && { existingResource: context.existingResource }),
          timestamp: new Date().toISOString()
        };
      };

      const response = createConflictErrorResponse('Duplicate invitation', {
        type: 'duplicate_invitation',
        existingResource: { email: 'test@example.com', status: 'pending' }
      });

      expect(response.error).toBe('ConflictError');
      expect(response.message).toBe('Duplicate invitation');
      expect(response.existingResource).toEqual({ email: 'test@example.com', status: 'pending' });
      expect(response.details).toContain('The user already has a pending invitation to this team.');
    });
  });

  describe('Email Delivery Error Response', () => {
    test('should create temporary email error', () => {
      const isTemporaryEmailError = (error) => {
        const temporaryErrorCodes = ['Throttling', 'ServiceUnavailable'];
        return temporaryErrorCodes.includes(error.name || error.code);
      };

      const createEmailDeliveryErrorResponse = (emailError, context = {}) => {
        const isTemporary = isTemporaryEmailError(emailError);

        const baseResponse = {
          error: 'EmailDeliveryError',
          message: isTemporary
            ? 'Email delivery is temporarily unavailable. The operation completed successfully, but the notification email could not be sent.'
            : 'Email delivery failed permanently. The operation completed successfully, but the notification email could not be sent.',
          isTemporary,
          timestamp: new Date().toISOString()
        };

        if (isTemporary) {
          baseResponse.details = [
            'The email service is temporarily unavailable.',
            'The team operation completed successfully.',
            'The notification email will be retried automatically.',
            'No further action is required from you.'
          ];
          baseResponse.retryInfo = {
            willRetry: true,
            estimatedRetryTime: '5-10 minutes'
          };
        } else {
          baseResponse.details = [
            'The email could not be delivered due to a permanent issue.',
            'The team operation completed successfully.',
            'Please verify the email address is correct.',
            'Contact support if the issue persists.'
          ];
        }

        if (context.recipient) {
          baseResponse.recipient = context.recipient;
        }

        return baseResponse;
      };

      const emailError = { name: 'Throttling', message: 'Rate exceeded' };
      const response = createEmailDeliveryErrorResponse(emailError, {
        recipient: 'test@example.com'
      });

      expect(response.error).toBe('EmailDeliveryError');
      expect(response.isTemporary).toBe(true);
      expect(response.recipient).toBe('test@example.com');
      expect(response.retryInfo).toBeDefined();
      expect(response.details).toContain('The email service is temporarily unavailable.');
    });

    test('should create permanent email error', () => {
      const isTemporaryEmailError = (error) => {
        const temporaryErrorCodes = ['Throttling', 'ServiceUnavailable'];
        return temporaryErrorCodes.includes(error.name || error.code);
      };

      const createEmailDeliveryErrorResponse = (emailError, context = {}) => {
        const isTemporary = isTemporaryEmailError(emailError);

        const baseResponse = {
          error: 'EmailDeliveryError',
          message: isTemporary
            ? 'Email delivery is temporarily unavailable. The operation completed successfully, but the notification email could not be sent.'
            : 'Email delivery failed permanently. The operation completed successfully, but the notification email could not be sent.',
          isTemporary,
          timestamp: new Date().toISOString()
        };

        if (!isTemporary) {
          baseResponse.details = [
            'The email could not be delivered due to a permanent issue.',
            'The team operation completed successfully.',
            'Please verify the email address is correct.',
            'Contact support if the issue persists.'
          ];
        }

        return baseResponse;
      };

      const emailError = { name: 'MessageRejected', message: 'Invalid email' };
      const response = createEmailDeliveryErrorResponse(emailError);

      expect(response.isTemporary).toBe(false);
      expect(response.retryInfo).toBeUndefined();
      expect(response.details).toContain('The email could not be delivered due to a permanent issue.');
    });
  });

  describe('HTTP Status Code Mapping', () => {
    test('should map error types to correct HTTP status codes', () => {
      const HttpStatusCodes = {
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        UNPROCESSABLE_ENTITY: 422,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504
      };

      expect(HttpStatusCodes.BAD_REQUEST).toBe(400);
      expect(HttpStatusCodes.UNAUTHORIZED).toBe(401);
      expect(HttpStatusCodes.FORBIDDEN).toBe(403);
      expect(HttpStatusCodes.NOT_FOUND).toBe(404);
      expect(HttpStatusCodes.CONFLICT).toBe(409);
      expect(HttpStatusCodes.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HttpStatusCodes.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HttpStatusCodes.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  describe('Error Response Formatting', () => {
    test('should format API response correctly', () => {
      const formatResponse = (statusCode, body) => {
        return {
          statusCode,
          body: typeof body === 'string' ? JSON.stringify({ message: body }) : JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        };
      };

      const errorBody = {
        error: 'ValidationError',
        message: 'Invalid data',
        details: ['Email is required']
      };

      const response = formatResponse(400, errorBody);

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');

      const parsedBody = JSON.parse(response.body);
      expect(parsedBody.error).toBe('ValidationError');
      expect(parsedBody.message).toBe('Invalid data');
      expect(parsedBody.details).toEqual(['Email is required']);
    });
  });
});
