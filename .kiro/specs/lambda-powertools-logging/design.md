# Lambda Powertools Logging Migration Design

## Overview

This design outlines the systematic migration from console logging to AWS Lambda Powertools Logger across all Lambda functions in the codebase. The migration will provide structured logging with service-specific context while maintaining all existing log information and debugging capabilities.

## Architecture

### Logger Configuration Pattern

Ea function will initialize the Logger with a service name derived from its folder location:

```javascript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'episodes' }); // folder name
```

### Service Name Mapping

The service name will be determined by the function's folder structure:
- `functions/teams/*` → serviceName: 'teams'
- `functions/episodes/*` → serviceName: 'episodes'
- `functions/events/*` → serviceName: 'events'
- `functions/clips/*` → serviceName: 'clips'
- `functions/agents/*` → serviceName: 'agents'
- `functions/auth/*` → serviceName: 'auth'
- `functions/users/*` → serviceName: 'users'
- `functions/video/*` → serviceName: 'video'
- `functions/tools/*` → serviceName: 'tools'
- `functions/utils/*` → serviceName: 'utils'
- `functions/invitations/*` → serviceName: 'invitations'
- `functions/notifications/*` → serviceName: 'notifications'

## Components and Interfaces

### Logger Initialization

Each function will follow this pattern:

```javascript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'episodes', // derived from folder name
  logLevel: process.env.LOG_LEVEL || 'INFO'
});
```

### Migration Mapping

| Console Method | Logger Method | Notes |
|----------------|---------------|-------|
| `console.log()` | `logger.info()` | General information logging |
| `console.error()` | `logger.error()` | Error conditions and exceptions |
| `console.warn()` | `logger.warn()` | Warning conditions |
| `console.info()` | `logger.info()` | Informational messages |
| `console.debug()` | `logger.debug()` | Debug-level information |

### Context Preservation

For structured data logging, the pattern will be:

```javascript
// Before
console.error('Error processing team email event:', {
  error: error.message,
  eventType,
  recipient: eventData.email
});

// After
logger.error('Error processing team email event', {
  error: error.message,
  eventType,
  recipient: eventData.email
});
```

### Error Logging Pattern

For error objects, the logger will capture full error context:

```javascript
// Before
console.error('Operation failed:', error);

// After
logger.error('Operation failed', {
  error: error.message,
  stack: error.stack,
  name: error.name
});
```

## Data Models

### Log Entry Structure

The Logger will produce structured JSON logs with these fields:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "ERROR",
  "message": "Error processing team email event",
  "service": "events",
  "error": "Invalid email address",
  "eventType": "team-invitation",
  "recipient": "user@example.com",
  "cold_start": false,
  "function_name": "send-team-email",
  "function_version": "$LATEST"
}
```

### Service Context

Each service will have consistent logging context:

```javascript
// Service-specific context can be added
logger.addContext({
  tenantId: event.requestContext?.authorizer?.tenantId,
  userId: event.requestContext?.authorizer?.userId
});
```

## Error Handling

### Logger Initialization Errors

If Logger initialization fails, functions will fall back to console logging:

```javascript
let logger;
try {
  logger = new Logger({ serviceName: 'episodes' });
} catch (error) {
  console.warn('Failed to initialize Logger, falling back to console');
  logger = console;
}
```

### Missing Context Handling

The Logger will handle missing AWS Lambda context gracefully for local testing:

```javascript
const logger = new Logger({
  serviceName: 'episodes',
  environment: process.env.NODE_ENV || 'development'
});
```

## Testing Strategy

### Unit Test Compatibility

Tests will mock the Logger to verify log calls:

```javascript
import { Logger } from '@aws-lambda-powertools/logger';

jest.mock('@aws-lambda-powertools/logger');
const mockLogger = Logger as jest.MockedClass<typeof Logger>;

beforeEach(() => {
  mockLogger.mockClear();
});

test('should log error on failure', () => {
  // Test implementation
  expect(mockLogger.prototype.error).toHaveBeenCalledWith(
    'Expected error message',
    expect.objectContaining({ error: 'Expected error details' })
  );
});
```

### Test Environment Configuration

Tests will configure the Logger for test environments:

```javascript
// In test setup
process.env.LOG_LEVEL = 'SILENT';
```

### Integration Test Logging

Integration tests will verify structured log output in CloudWatch:

```javascript
// Verify logs contain expected service name and structure
const logs = await getCloudWatchLogs(functionName);
expect(logs).toContainEqual(
  expect.objectContaining({
    service: 'episodes',
    level: 'INFO',
    message: expect.stringContaining('Expected message')
  })
);
```

## Implementation Phases

### Phase 1: Dependency and Utility Setup
1. Add @aws-lambda-powertools/logger to package.json
2. Create logger utility helper if needed
3. Update build configuration to include logger

### Phase 2: Core Service Migration
1. Migrate `functions/episodes/*` functions
2. Migrate `functions/teams/*` functions
3. Migrate `functions/events/*` functions
4. Migrate `functions/clips/*` functions

### Phase 3: Supporting Service Migration
1. Migrate `functions/auth/*` functions
2. Migrate `functions/users/*` functions
3. Migrate `functions/agents/*` functions
4. Migrate `functions/video/*` functions

### Phase 4: Utility and Tool Migration
1. Migrate `functions/utils/*` functions
2. Migrate `functions/tools/*` functions
3. Migrate `functions/invitations/*` functions
4. Migrate `functions/notifications/*` functions

### Phase 5: Test and Documentation Updates
1. Update all unit tests to work with Logger
2. Update integration tests for structured logging
3. Verify no console statements remain
4. Update documentation and examples

## Performance Considerations

### Bundle Size Impact

The Logger adds minimal overhead:
- @aws-lambda-powertools/logger: ~50KB compressed
- No significant impact on cold start times
- Structured logging provides better CloudWatch integration

### Runtime Performance

Logger performance characteristics:
- Minimal CPU overhead for log formatting
- Better CloudWatch Logs integration than console
- Automatic correlation ID injection
- Built-in sampling for high-volume logging

## Security Considerations

### Sensitive Data Handling

Logger will follow existing patterns for sensitive data:

```javascript
// Avoid logging sensitive information
logger.info('User authentication successful', {
  userId: user.id,
  // Don't log: password, tokens, PII
});
```

### Log Level Configuration

Production environments will use appropriate log levels:
- Production: INFO or WARN
- Development: DEBUG
- Test: SILENT or ERROR

## Monitoring and Observability

### CloudWatch Integration

The Logger provides enhanced CloudWatch integration:
- Structured JSON logs for better searching
- Automatic service and function tagging
- Correlation ID tracking across requests
- Built-in performance metrics

### Log Aggregation

Structured logs enable better log aggregation:
- Filter by service name
- Search by specific error types
- Aggregate metrics by function
- Track request flows across services

## Migration Validation

### Verification Checklist

For each migrated function:
- [ ] Logger initialized with correct service name
- [ ] All console statements replaced
- [ ] Error context preserved
- [ ] Tests updated and passing
- [ ] No regression in functionality
- [ ] Structured logs visible in CloudWatch

### Rollback Strategy

If issues arise during migration:
1. Revert specific function changes
2. Maintain console logging as fallback
3. Gradual rollout per service
4. Monitor CloudWatch for log delivery issues
