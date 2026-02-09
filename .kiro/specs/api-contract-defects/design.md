# API Contract Defects - Design Document

## Overview

This design document outlines the technical approach to fix API contract defects and backend workflow issues identified in the requirements document. The solution focuses on standardizing error responses, fixing DynamoDB key mismatches, and ensuring consistent API contracts between backend and frontend.

## Design Principles

1. **Consistency First**: All API responses follow the same format
2. **Backward Compatibility**: Changes don't break existing frontend code
3. **Minimal Changes**: Fix defects without refactoring working code
4. **Standard Utilities**: Use existing `formatResponse` and validation utilities
5. **Clear Error Messages**: Provide actionable error information

## Architecture

### Current State

```
Backend Functions → Mixed Response Formats → Frontend API Client
                  ↓
            - Some use formatResponse
            - Some return raw objects
            - Inconsistent error structures
            - Missing CORS headers
            - Wrong DynamoDB keys
```

### Target State

```
Backend Functions → Standard formatResponse → Frontend API Client
                  ↓
            - All use formatResponse utility
            - Consistent error structures
            - Proper CORS headers
            - Correct DynamoDB keys
            - Standard validation errors
```

## Component Design

### 1. Standard Error Response Format

All API responses must use the `formatResponse` utility from `functions/utils/api.mjs`:

```javascript
// Success Response
formatResponse(statusCode, {
  // response data
})

// Error Response
formatResponse(statusCode, {
  error: 'ErrorType',      // PascalCase error type
  message: 'Human-readable error message',
  details: {}              // Optional additional context
})
```

**Error Type Conventions:**
- `ValidationError` - Invalid input data (400)
- `NotFound` - Resource doesn't exist (404)
- `Unauthorized` - Missing or invalid authentication (401)
- `Forbidden` - Insufficient permissions (403)
- `Conflict` - Resource already exists or state conflict (409)
- `InvalidState` - Operation not allowed in current state (400)
- `InternalError` - Unexpected server error (500)

### 2. Validation Error Format

All validation errors must follow this structure:

```javascript
formatResponse(400, {
  message: 'Validation failed',
  errors: [
    {
      field: 'fieldName',
      message: 'Field-specific error message',
      code: 'error_code'
    }
  ]
})
```

This format is already implemented in `functions/utils/validation.mjs` and should be used consistently.

### 3. DynamoDB Key Patterns

Correct key patterns for each entity type:

```javascript
// Episodes
{
  pk: `${tenantId}#${episodeId}`,
  sk: 'metadata'
}

// Clips
{
  pk: `${tenantId}#${episodeId}`,
  sk: `data#clip#${clipId}`
}

// Quotes
{
  pk: `${tenantId}#${episodeId}`,
  sk: `data#quote#${quoteId}`
}

// Tracks
{
  pk: `${tenantId}#${episodeId}`,
  sk: `data#track#${trackName}`
}

// Blogs
{
  pk: `${tenantId}#${episodeId}`,
  sk: 'data#blog'
}
```

### 4. Event Handler Response Format

Event handlers (EventBridge, S3 events) should return consistent responses:

```javascript
// Success
return { statusCode: 200 };

// Early exit (not an error)
return { statusCode: 200 };

// Error (logged but not thrown)
logger.error('Error message', { context });
return { statusCode: 500 };
```

Event handlers don't need `formatResponse` since they're not API Gateway endpoints, but they should be consistent.

## Detailed Design by Defect

### Defect 1: Blog Generator Non-Standard Errors

**File:** `functions/agents/blog-generator.mjs`

**Current Code:**
```javascript
return { statusCode: 400, message: 'Missing required fields' };
return { statusCode: 404, message: 'Blog outline not found' };
```

**Fixed Code:**
```javascript
return formatResponse(400, {
  error: 'ValidationError',
  message: 'Missing required fields'
});

return formatResponse(404, {
  error: 'NotFound',
  message: 'Blog outline not found'
})
`

**Fixed Code:**
```javascript
const getResult = await ddb.send(new GetItemCommand({
  TableName: process.env.TABLE_NAME,
  Key: marshall({
    pk: `${tenantId}#${episodeId}`,
    sk: `data#clip#${clipId}`  // CORRECT
  })
}));
```

**Changes Required:**
1. Update GetItemCommand key to use `data#clip#` prefix
2. Update UpdateItemCommand key to use `data#clip#` prefix
3. Verify no other clip operations use wrong key

### Defect 3: Event Handlers Inconsistent Responses

**Files:** Multiple event handler functions

**Approach:**
Event handlers are not API Gateway endpoints, so they don't need `formatResponse`. However, they should be consistent:

```javascript
// Standard pattern for event handlers
export const handler = async (event) => {
  try {
    // Validate event structure
    if (!requiredField) {
      logger.warn('Missing required field', { event });
      return { statusCode: 200 };  // Not an error, just skip
    }

    // Process event
    // ...

    return { statusCode: 200 };
  } catch (err) {
    logger.error('Error processing event', {
      error: err.message,
      stack: err.stack,
      event
    });
    return { statusCode: 500 };
  }
};
```

**Changes Required:**
1. Ensure all event handlers return `{ statusCode: 200 }` or `{ statusCode: 500 }`
2. Add proper error logging with context
3. Don't throw errors (EventBridge will retry)

### Defect 4: Validation Error Format

**File:** `functions/utils/validation.mjs`

**Current Implementation:**
The validation utility already returns the correct format. No changes needed to the utility itself.

**Changes Required:**
1. Ensure all functions use validation utilities consistently
2. Don't manually create validation error responses
3. Use `validateRequest`, `validatePathParameters`, `validateBody`, `validateQueryParameters`

### Defect 5: Missing Error Type

**Multiple Files**

**Pattern to Fix:**
```javascript
// Before
return formatResponse(404, { message: 'Resource not found' });

// After
return formatResponse(404, {
  error: 'NotFound',
  message: 'Resource not found'
});
```

**Changes Required:**
1. Audit all `formatResponse` calls
2. Add `error` field where missing
3. Use consistent error type names

### Defect 6: Inconsistent 404 Messages

**Multiple Files**

**Standard 404 Message Format:**
```javascript
formatResponse(404, {
  error: 'NotFound',
  message: `${ResourceType} with ID '${id}' was not found`
})
```

**Examples:**
```javascript
// Episode
formatResponse(404, {
  error: 'NotFound',
  message: `Episode with ID '${episodeId}' was not found`
})

// Clip
formatResponse(404, {
  error: 'NotFound',
  message: `Clip with ID '${clipId}' was not found in episode '${episodeId}'`
})

// Quote
formatResponse(404, {
  error: 'NotFound',
  message: `Quote with ID '${quoteId}' was not found in episode '${episodeId}'`
})
```

**Changes Required:**
1. Standardize all 404 message formats
2. Include resource type and ID in message
3. For nested resources, include parent ID

### Defect 7: Quote Pagination

**File:** `functions/quotes/list-quotes.mjs`

**Current Code:**
```javascript
return formatResponse(200, buildPagingParams(quotes, result.LastEvaluatedKey));
```

**Analysis:**
This is actually correct! The function already uses `buildPagingParams`. No changes needed.

### Defect 8: Speaker Validation Errors

**Multiple Files**

**Current Pattern:**
Speaker validation is handled by validation schemas and returns proper error details.

**Verification Required:**
1. Check that speaker validation errors include `invalidSpeakers` array
2. Check that speaker validation errors include `validSpeakers` array
3. Ensure error type is `InvalidSpeakers` (plural)

**Example:**
```javascript
return formatResponse(400, {
  error: 'InvalidSpeakers',
  message: 'One or more speakers are not valid for this episode',
  details: {
    invalidSpeakers: ['unknown-speaker'],
    validSpeakers: ['host', 'guest1', 'guest2']
  }
});
```

### Defect 9: Status Code Consistency

**Standard Status Code Usage:**

| Scenario | Status Code | Error Type |
|----------|-------------|------------|
| Invalid input data | 400 | ValidationError |
| Missing authentication | 401 | Unauthorized |
| Insufficient permissions | 403 | Forbidden |
| Resource not found | 404 | NotFound |
| Resource already exists | 409 | Conflict |
| Invalid state transition | 409 | Conflict |
| Business logic error | 422 | UnprocessableEntity |
| Server error | 500 | InternalError |

**Changes Required:**
1. Audit all status code usage
2. Standardize based on table above
3. Use 400 for validation errors, not 422
4. Use 409 for conflicts and invalid states
5. Use 422 only for business logic errors

### Defect 10: Error Context in Logs

**Standard Logging Pattern:**
```javascript
logger.error('Error message', {
  error: err.message,
  stack: err.stack,
  episodeId: event.pathParameters?.episodeId,
  clipId: event.pathParameters?.clipId,
  userId: event.requestContext?.authorizer?.userId,
  tenantId: event.requestContext?.authorizer?.tenantId
});
```

**Changes Required:**
1. Include relevant IDs in all error logs
2. Include error message and stack trace
3. Include user/tenant context where available
4. Use structured logging (object format)

## Implementation Strategy

### Phase 1: Critical Fixes (High Priority)
1. Fix Defect 2: Clip status update DynamoDB key
2. Fix Defect 1: Blog generator error responses
3. Fix Defect 5: Add missing error types

### Phase 2: Consistency Improvements (Medium Priority)
4. Fix Defect 6: Standardize 404 messages
5. Fix Defect 9: Standardize status codes
6. Fix Defect 10: Improve error logging

### Phase 3: Event Handler Cleanup (Low Priority)
7. Fix Defect 3: Event handler response consistency
8. Verify Defect 8: Speaker validation errors

### Phase 4: Verification
9. Verify Defect 7: Quote pagination (already correct)
10. Verify Defect 4: Validation error format (already correct)

## Testing Strategy

### Unit Tests

**Test Error Response Format:**
```javascript
describe('Error responses', () => {
  it('should return standard error format', async () => {
    const result = await handler(invalidEvent);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
  });

  it('should include CORS headers', async () => {
    const result = await handler(invalidEvent);

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
  });
});
```

**Test DynamoDB Keys:**
```javascript
describe('Clip operations', () => {
  it('should use correct DynamoDB key format', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: mockClip });

    await handler(event);

    const calls = ddbMock.calls();
    expect(calls[0].args[0].input.Key.sk).toBe('data#clip#clip-123');
  });
});
```

### Integration Tests

**Test API Contract:**
```javascript
describe('API contract', () => {
  it('should return consistent error format', async () => {
    const response = await apiRequest('/episodes/invalid-id');

    expect(response.status).toBe(404);
    expect(response.data).toMatchObject({
      error: 'NotFound',
      message: expect.stringContaining('not found')
    });
  });
});
```

## Rollout Plan

### Step 1: Deploy Critical Fixes
- Deploy clip status update fix
- Deploy blog generator fix
- Monitor error rates

### Step 2: Deploy Consistency Improvements
- Deploy 404 message standardization
- Deploy status code fixes
- Deploy logging improvements

### Step 3: Deploy Event Handler Cleanup
- Deploy event handler consistency fixes
- Verify EventBridge processing

### Step 4: Verification
- Run integration tests
- Verify frontend error handling
- Monitor CloudWatch logs

## Validation

### Validation Checklist
- [ ] All API functions use `formatResponse`
- [ ] All errors include `error` and `message` fields
- [ ] All responses include CORS headers
- [ ] DynamoDB keys use correct format
- [ ] Validation errors follow standard format
- [ ] Status codes are consistent
- [ ] Error logs include context
- [ ] Frontend can parse all errors

## Backward Compatibility

### Breaking Changes: None
All changes are additive or fix bugs. No breaking changes to API contracts.

### Frontend Compatibility
Frontend already expects `error` and `message` fields. Adding these fields where missing improves compatibility.

### Gradual Rollout
Changes can be deployed incrementally without coordination with frontend.

## Security Considerations

### CORS Headers
All responses must include proper CORS headers via `formatResponse` utility.

### Error Information Disclosure
Error messages should be helpful but not expose sensitive information:
- ✅ "Episode with ID 'abc123' was not found"
- ❌ "Database query failed: SELECT * FROM episodes WHERE id = 'abc123'"

### Logging Sensitive Data
Never log sensitive information:
- ❌ Passwords, tokens, API keys
- ❌ Full request bodies with PII
- ✅ Request IDs, resource IDs, error types

## Performance Considerations

### Response Time Impact
- `formatResponse` adds < 1ms overhead
- JSON.stringify is fast for small objects
- No database queries added

### Memory Impact
- Error objects are small (< 1KB)
- No memory leaks from error handling
- Proper cleanup in try/catch blocks

## Documentation Updates

### OpenAPI Specification
Update `openapi.yaml` to document standard error responses:

```yaml
components:
  responses:
    BadRequest:
      description: Invalid request data
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: ValidationError
              message:
                type: string
                example: Validation failed
              errors:
                type: array
                items:
                  type: object

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: NotFound
              message:
                type: string
                example: Resource with ID 'abc123' was not found
```

### API Documentation
Update API documentation to reflect standard error formats and status codes.

## Success Criteria

1. ✅ All API functions use `formatResponse`
2. ✅ All error responses include `error` and `message`
3. ✅ All responses include CORS headers
4. ✅ DynamoDB keys use correct format
5. ✅ Validation errors follow standard format
6. ✅ Status codes are consistent
7. ✅ Error logs include context
8. ✅ Frontend can parse all errors
9. ✅ No breaking changes
10. ✅ All tests pass

## Risks and Mitigations

### Risk: Missed Functions
**Mitigation:** Comprehensive grep search and code review

### Risk: Breaking Frontend
**Mitigation:** All changes are backward compatible

### Risk: Performance Impact
**Mitigation:** Minimal overhead, monitor response times

### Risk: Incomplete Testing
**Mitigation:** Update existing tests, add new error case tests

## Future Improvements

1. **Centralized Error Types**: Create error type constants
2. **Error Code Enum**: Standardize error codes
3. **Error Tracking**: Integrate with error tracking service
4. **API Versioning**: Prepare for future API versions
5. **Rate Limiting**: Add rate limit error responses
6. **Retry Logic**: Add retry-after headers

## References

- `functions/utils/api.mjs` - Response formatting utilities
- `functions/utils/validation.mjs` - Validation utilities
- `frontend/src/api/client.ts` - Frontend API client
- `openapi.yaml` - API specification
- AWS Lambda Powertools Logger documentation
