# API Contract Defects - Tasks

## Phase 1: Critical Fixes

### 1. Fix Clip Status Update DynamoDB Key
**Priority:** Critical
**Estimated Time:** 15 minutes

Fix the incorrect DynamoDB key in clip status update function.

**Files to modify:**
- `functions/clips/update-clip-status.mjs`

**Changes:**
- Update GetItemCommand key from `sk: clip#${clipId}` to `sk: data#clip#${clipId}`
- Update UpdateItemCommand key from `sk: data#clip#${clipId}` to `sk: data#clip#${clipId}` (verify correct)
- Test that clip status updates work correctly

**Acceptance Criteria:**
- Clip status updates successfully find clips
- No 404 errors for existing clips
- DynamoDB key matches data model pattern

---

### 2. Fix Blog Generator Error Responses
**Priority:** Critical
**Estimated Time:** 10 minutes

Update blog generator to use standard formatResponse utility.

**Files to modify:**
- `functions/agents/blog-generator.mjs`

**Changes:**
- Import `formatResponse` from `../utils/api.mjs`
- Replace `return { statusCode: 400, message: 'Missing required fields' }` with `formatResponse(400, { error: 'ValidationError', message: 'Missing required fields' })`
- Replace `return { statusCode: 404, message: 'Blog outline not found' }` with `formatResponse(404, { error: 'NotFound', message: 'Blog outline not found' })`

**Acceptance Criteria:**
- All error responses use formatResponse
- All error responses include `error` and `message` fields
- CORS headers are included in all responses

---

### 3. Add Missing Error Types to API Responses
**Priority:** High
**Estimated Time:** 30 minutes

Audit all formatResponse calls and add missing `error` field.

**Files to audit:**
- `functions/episodes/*.mjs`
- `functions/clips/*.mjs`
- `functions/quotes/*.mjs`
- `functions/teams/*.mjs`
- `functions/users/*.mjs`

**Changes:**
- Find all `formatResponse(statusCode, { message: ... })` calls
- Add appropriate `error` field based on status code
- Use error type conventions from design document

**Acceptance Criteria:**
- All error responses include `error` field
- Error types follow naming conventions
- No responses with only `message` field

---

## Phase 2: Consistency Improvements

### 4. Standardize 404 Error Messages
**Priority:** Medium
**Estimated Time:** 45 minutes

Make all 404 error messages follow consistent format.

**Files to modify:**
- All Lambda functions that return 404 errors

**Changes:**
- Update 404 messages to format: `${ResourceType} with ID '${id}' was not found`
- For nested resources, include parent ID: `${ResourceType} with ID '${id}' was not found in ${ParentType} '${parentId}'`
- Ensure al
Use 422 only for business logic errors
- Use 404 for resource not found
- Use 500 for unexpected errors

**Acceptance Criteria:**
- Status codes match design document standards
- Similar errors use same status codes
- No inconsistent status code usage

---

### 6. Improve Error Logging Context
**Priority:** Medium
**Estimated Time:** 1 hour

Add relevant context to all error logs.

**Files to modify:**
- All Lambda functions with error logging

**Changes:**
- Include error message and stack trace
- Include relevant IDs (episodeId, clipId, quoteId, etc.)
- Include user/tenant context from authorizer
- Use structured logging format

**Acceptance Criteria:**
- All error logs include error message and stack
- All error logs include relevant resource IDs
- All error logs include user/tenant context where available
- Logs use structured format (object)

---

## Phase 3: Event Handler Cleanup

### 7. Standardize Event Handler Responses
**Priority:** Low
**Estimated Time:** 45 minutes

Ensure event handlers return consistent response format.

**Files to modify:**
- `functions/events/transcript-added.mjs`
- `functions/events/start-preprocessing.mjs`
- `functions/events/preprocessing-completed.mjs`
- `functions/events/preprocessing-failed.mjs`
- `functions/events/clip-generation-failed.mjs`
- `functions/agents/clip-detector.mjs`
- `functions/agents/quote-detector.mjs`
- `functions/agents/blog-outline-agent.mjs`
- `functions/agents/planning-agent.mjs`

**Changes:**
- Ensure all return `{ statusCode: 200 }` or `{ statusCode: 500 }`
- Add proper error logging with context
- Don't throw errors (EventBridge will retry)
- Use consistent early exit pattern

**Acceptance Criteria:**
- All event handlers return consistent format
- All errors are logged with context
- No thrown errors in event handlers
- Early exits return 200 status

---

## Phase 4: Verification

### 8. Verify Speaker Validation Errors
**Priority:** Low
**Estimated Time:** 30 minutes

Verify speaker validation errors include proper details.

**Files to verify:**
- Functions that validate speakers
- Validation utility functions

**Changes:**
- Verify `invalidSpeakers` array is included
- Verify `validSpeakers` array is included
- Verify error type is `InvalidSpeakers` (plural)
- Add missing details if needed

**Acceptance Criteria:**
- Speaker validation errors include both arrays
- Error type is consistent
- Frontend can display helpful messages

---

### 9. Verify Quote Pagination
**Priority:** Low
**Estimated Time:** 15 minutes

Verify quote pagination uses buildPagingParams correctly.

**Files to verify:**
- `functions/quotes/list-quotes.mjs`

**Changes:**
- Verify buildPagingParams is used
- Verify nextToken is returned correctly
- No changes needed if already correct

**Acceptance Criteria:**
- Pagination works correctly
- nextToken is properly encrypted
- Response format matches other list endpoints

---

### 10. Verify Validation Error Format
**Priority:** Low
**Estimated Time:** 15 minutes

Verify validation utilities return correct format.

**Files to verify:**
- `functions/utils/validation.mjs`

**Changes:**
- Verify validation errors return correct format
- Verify all functions use validation utilities
- No changes needed if already correct

**Acceptance Criteria:**
- Validation utility returns correct format
- All functions use validation utilities
- No manual validation error responses

---

## Testing Tasks

### 11. Update Unit Tests for Error Responses
**Priority:** High
**Estimated Time:** 2 hours

Update unit tests to verify error response format.

**Files to modify:**
- Test files for modified functions

**Changes:**
- Add tests for error response format
- Verify `error` and `message` fields present
- Verify CORS headers present
- Verify status codes correct

**Acceptance Criteria:**
- All modified functions have updated tests
- Tests verify error response structure
- Tests verify CORS headers
- All tests pass

---

### 12. Add Integration Tests for API Contracts
**Priority:** Medium
**Estimated Time:** 1 hour

Add integration tests to verify API contracts.

**Files to create:**
- `tests/integration/api-contract.test.mjs`

**Changes:**
- Test error response format
- Test 404 error messages
- Test validation error format
- Test status code consistency

**Acceptance Criteria:**
- Integration tests verify error formats
- Tests cover all error types
- Tests verify frontend compatibility
- All tests pass

---

## Deployment Tasks

### 13. Deploy Critical Fixes
**Priority:** Critical
**Estimated Time:** 30 minutes

Deploy Phase 1 critical fixes.

**Steps:**
1. Run unit tests
2. Build with `sam build`
3. Deploy with `sam deploy`
4. Verify clip status updates work
5. Verify blog generator errors work
6. Monitor error rates

**Acceptance Criteria:**
- Deployment successful
- No increase in error rates
- Critical bugs fixed
- Frontend works correctly

---

### 14. Deploy Consistency Improvements
**Priority:** Medium
**Estimated Time:** 30 minutes

Deploy Phase 2 consistency improvements.

**Steps:**
1. Run unit tests
2. Build with `sam build`
3. Deploy with `sam deploy`
4. Verify 404 messages consistent
5. Verify status codes correct
6. Monitor logs for context

**Acceptance Criteria:**
- Deployment successful
- Error messages consistent
- Status codes standardized
- Logs include context

---

### 15. Deploy Event Handler Cleanup
**Priority:** Low
**Estimated Time:** 30 minutes

Deploy Phase 3 event handler cleanup.

**Steps:**
1. Run unit tests
2. Build with `sam build`
3. Deploy with `sam deploy`
4. Verify EventBridge processing
5. Monitor event handler logs

**Acceptance Criteria:**
- Deployment successful
- Event handlers work correctly
- No EventBridge errors
- Logs are consistent

---

## Documentation Tasks

### 16. Update OpenAPI Specification
**Priority:** Medium
**Estimated Time:** 1 hour

Update OpenAPI spec to document standard error responses.

**Files to modify:**
- `openapi.yaml`

**Changes:**
- Add standard error response schemas
- Document error types
- Document status codes
- Add examples for each error type

**Acceptance Criteria:**
- OpenAPI spec documents all error types
- Error response schemas are complete
- Examples are provided
- Spec validates correctly

---

### 17. Update API Documentation
**Priority:** Low
**Estimated Time:** 30 minutes

Update API documentation with error handling patterns.

**Files to modify:**
- API documentation files

**Changes:**
- Document standard error format
- Document error types
- Document status codes
- Provide examples

**Acceptance Criteria:**
- Documentation is complete
- Examples are clear
- Error handling is well documented

---

## Summary

**Total Estimated Time:** ~12 hours

**Critical Path:**
1. Task 1: Fix clip status update (15 min)
2. Task 2: Fix blog generator (10 min)
3. Task 3: Add missing error types (30 min)
4. Task 11: Update unit tests (2 hours)
5. Task 13: Deploy critical fixes (30 min)

**Recommended Order:**
1. Phase 1: Tasks 1-3 (Critical fixes)
2. Task 11: Update tests
3. Task 13: Deploy critical fixes
4. Phase 2: Tasks 4-6 (Consistency)
5. Task 14: Deploy consistency improvements
6. Phase 3: Task 7 (Event handlers)
7. Task 15: Deploy event handler cleanup
8. Phase 4: Tasks 8-10 (Verification)
9. Tasks 12, 16-17: Testing and documentation
