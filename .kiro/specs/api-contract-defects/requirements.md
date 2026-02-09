# API Contract Defects and Backend Workflow Issues

## Overview

This specification documents defects and inconsistencies discovered in the backend workflow and API contracts between the backend Lambda functions and the frontend React application. These issues create potential bugs, inconsistent error handling, and contract mismatches that could lead to runtime failures.

## Problem Statement

Through comprehensive repository scanning, several categories of defects have been identified:

1. **Inconsistent Error Response Formats**: Backend functions return errors in different formats, making frontend error handling unpredictable
2. **Contract Mismatches**: Frontend expects certain response structures that backend doesn't provide
3. **Missing Error Handling**: Some backend functions don't use the standard `formatResponse` utility
4. **Status Code Inconsistencies**: Different functions use different status codes for similar error conditions
5. **Validation Error Format Inconsistencies**: Validation errors are formatted differently across functions
6. **Missing CORS Headers**: Some error responses may not include proper CORS headers
7. **Incomplete Error Context**: Some errors don't provide enough information for frontend to display helpful messages

## User Stories

### US-1: Consistent Error Handling
**As a** frontend developer
**I want** all backend API errors to follow a consistent format
**So that** I can reliably parse and display error messages to users

**Acceptance Criteria:**
- All error responses use `formatResponse` utility
- All error responses include `error` (error type) and `message` (human-readable description)
- Status codes are consistent across similar error conditions
- All responses include proper CORS headers

### US-2: Validation Error Consistency
**As a** frontend developer
**I want** validation errors to follow a consistent structure
**So that** I can display field-specific error messages to users

**Acceptance Criteria:**
- All validation errors return 400 status code
- All validation errors include `message: 'Validation failed'`
- All validation errors include `errors` array with field-level details
- Validation error format matches what frontend expects

### US-3: Blog API Contract Compliance
**As a** frontend developer
**I want** the blog API to return consistent response structures
**So that** the blog page can reliably display content and handle errors

**Acceptance Criteria:**
- Blog generator returns proper error responses using `formatResponse`
- Blog not found returns 404 with proper error structure
- Blog status updates follow standard format
- All blog endpoints include proper CORS headers

### US-4: Clip API Contract Compliance
**As a** frontend developer
**I want** clip API endpoints to return consistent response structures
**So that** clip pages can reliably display content and handle errors

**Acceptance Criteria:**
- Clip status updates use correct DynamoDB key format (`data#clip#` not `clip#`)
- Clip responses include all expected fields
- Clip error responses follow standard format
- Clip generation responses match frontend expectations

### US-5: Quote API Contract Compliance
**As a** frontend developer
**I want** quote API endpoints to return consistent response structures
**So that** quote pages can reliably display content and handle errors

**Acceptance Criteria:**
- Quote responses include all expected fields
- Quote error responses follow standard format
- Quote speaker validation errors provide helpful details
- Quote pagination follows standard format

## Specific Defects Identified

### Defect 1: Blog Generator Returns Non-Standard Error Format
**Location:** `functions/agents/blog-generator.mjs`
**Issue:** Returns `{ statusCode, message }` instead of using `formatResponse`
**Impact:** Frontend may not parse error correctly, missing CORS headers

```javascript
// Current (incorrect)
return { statusCode: 404, message: 'Blog outline not found' };

// Should be
return formatResponse(404, {
  error: 'NotFound',
  message: 'Blog outline not found'
});
```

### Defect 2: Clip Status Update Uses Wrong DynamoDB Key
**Location:** `functions/clips/update-clip-status.mjs`
**Issue:** Uses `sk: clip#{clipId}` instead of `sk: data#clip#{clipId}`
**Impact:** Cannot find clips, returns 404 even when clip exists

```javascript
// Current (incorrect)
Key: marshall({
  pk: `${tenantId}#${episodeId}`,
  sk: `clip#${clipId}`  // Wrong!
})

// Should be
Key: marshall({
  pk: `${tenantId}#${episodeId}`,
  sk: `data#clip#${clipId}`  // Correct
})
```

### Defect 3: Event Handlers Return Non-Standard Responses
**Location:** Multiple event handler functions
**Issue:** Event handlers return `{ statusCode: 200 }` without using `formatResponse`
**Impact:** Inconsistent response format, missing CORS headers for EventBridge events

**Affected Files:**
- `functions/events/transcript-added.mjs`
- `functions/event
ns expect different format
**Impact:** Frontend may not display validation errors correctly

### Defect 5: Missing Error Type in Some Responses
**Location:** Multiple functions
**Issue:** Some error responses don't include `error` field (error type)
**Impact:** Frontend cannot distinguish between different error types

**Examples:**
- Some 404 responses only have `message`, no `error: 'NotFound'`
- Some 400 responses only have `message`, no `error: 'ValidationError'`

### Defect 6: Inconsistent 404 Error Messages
**Location:** Multiple functions
**Issue:** 404 errors use different message formats
**Impact:** Inconsistent user experience

**Examples:**
- `"Episode not found"`
- `"Episode with ID 'abc123' was not found"`
- `"Clip with ID '...' was not found in episode '...'"`
- `"User profile not found"`

### Defect 7: Quote API Missing Pagination Consistency
**Location:** `functions/quotes/list-quotes.mjs`
**Issue:** Uses `nextToken` in response but should use `buildPagingParams` consistently
**Impact:** Pagination may not work correctly

### Defect 8: Missing Speaker Validation Error Details
**Location:** Multiple functions
**Issue:** Speaker validation errors don't always include `invalidSpeakers` and `validSpeakers` arrays
**Impact:** Frontend cannot display helpful speaker validation messages

### Defect 9: Inconsistent Status Code Usage
**Location:** Multiple functions
**Issue:** Similar errors use different status codes
**Impact:** Frontend error handling is unpredictable

**Examples:**
- Some "not found" errors return 404, others return 200 with empty array
- Some "invalid input" errors return 400, others return 422
- Some "conflict" errors return 409, others return 400

### Defect 10: Missing Error Context in Logs
**Location:** Multiple functions
**Issue:** Error logs don't always include relevant context (episodeId, clipId, etc.)
**Impact:** Difficult to debug production issues

## Non-Functional Requirements

### NFR-1: Performance
- Error response formatting should add < 1ms overhead
- Validation should complete in < 10ms

### NFR-2: Backward Compatibility
- Changes should not break existing frontend code
- Gradual migration path for response format changes

### NFR-3: Maintainability
- All error responses should use standard utilities
- Error formats should be documented in API specification
- Validation error format should be centralized

### NFR-4: Observability
- All errors should be logged with proper context
- Error logs should include request IDs for tracing
- Error rates should be monitored via CloudWatch

## Success Criteria

1. All backend functions use `formatResponse` for API responses
2. All error responses include `error` and `message` fields
3. All validation errors follow consistent format
4. Frontend can reliably parse all error responses
5. All API endpoints include proper CORS headers
6. Error messages are helpful and actionable
7. Status codes are consistent across similar operations
8. All errors are logged with proper context

## Out of Scope

- Changing frontend error handling logic (separate task)
- Adding new error types or status codes
- Implementing retry logic
- Adding error recovery mechanisms
- Changing OpenAPI specification (will be updated separately)

## Dependencies

- Access to backend Lambda functions
- Access to frontend API client code
- Understanding of current error handling patterns
- Knowledge of DynamoDB key structures

## Risks and Mitigations

### Risk 1: Breaking Changes
**Mitigation:** Ensure all changes are backward compatible, test thoroughly

### Risk 2: Incomplete Coverage
**Mitigation:** Comprehensive grep search and manual review of all functions

### Risk 3: Frontend Compatibility
**Mitigation:** Review frontend error handling code before making changes

### Risk 4: Testing Complexity
**Mitigation:** Update existing tests, add new tests for error cases

## Technical Notes

### Standard Error Response Format
All API responses should use this format:

```javascript
// Success
formatResponse(200, {
  // response data
})

// Error
formatResponse(statusCode, {
  error: 'ErrorType',  // PascalCase error type
  message: 'Human-readable error message',
  details: {}  // Optional additional details
})
```

### Standard Validation Error Format
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

### DynamoDB Key Patterns
- Episodes: `pk: ${tenantId}#${episodeId}`, `sk: metadata`
- Clips: `pk: ${tenantId}#${episodeId}`, `sk: data#clip#${clipId}`
- Quotes: `pk: ${tenantId}#${episodeId}`, `sk: data#quote#${quoteId}`
- Tracks: `pk: ${tenantId}#${episodeId}`, `sk: data#track#${trackName}`

## References

- `functions/utils/api.mjs` - Standard response formatting utilities
- `functions/utils/validation.mjs` - Validation utilities
- `frontend/src/api/client.ts` - Frontend API client
- `openapi.yaml` - API specification
