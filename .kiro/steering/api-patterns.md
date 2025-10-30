# API Patterns and Standards

## API Design Philosophy

This API follows RESTful principles with a focus on simplicity, consistency, and developer experience. The API is designed for managing livestream episodes and their associated content (transcripts, video tracks).

## Base URL Structure
```
https://{api-id}.execute-api.{region}.amazonaws.com/api
```

## Resource Hierarchy

### Episodes
- **Base resource**: `/episodes`
- **Individual epi*: `/episodes/{episodeId}`
- **Sub-resources**: Transcripts and tracks belong to episodes

### Upload Management
- **Transcript uploads**: `/episodes/{episodeId}/transcripts`
- **Track uploads**: `/episodes/{episodeId}/tracks`
- **Multipart operations**: `/episodes/{episodeId}/tracks/{trackName}/parts`

## HTTP Methods and Patterns

### GET Requests
- **List operations**: Return arrays of resources with pagination support
- **Retrieve operations**: Return single resource objects
- **Query parameters**: Support filtering, pagination, and sorting where applicable

### POST Requests
- **Create operations**: Create new resources
- **Action operations**: Trigger specific actions (uploads, processing)
- **Request body**: JSON format with validation

### PUT/PATCH Requests
- **Update operations**: Modify existing resources
- **Idempotent**: Safe to retry

### DELETE Requests
- **Remove operations**: Delete resources
- **Cascade behavior**: Document related resource cleanup

## Request/Response Patterns

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer {token}  # When authentication is enabled
```

### Response Headers
```http
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token
```

### Success Response Format
```json
{
  "id": "resource-id",
  "attribute": "value",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Error Response Format
```json
{
  "error": "ErrorType",
  "message": "Human-readable error description"
}
```

## Status Code Standards

### Success Codes
- **200 OK**: Successful GET, PUT, PATCH operations
- **201 Created**: Successful POST operations that create resources
- **204 No Content**: Successful DELETE operations

### Client Error Codes
- **400 Bad Request**: Invalid request data or parameters
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Resource conflict (duplicate creation)
- **422 Unprocessable Entity**: Valid JSON but business logic errors

### Server Error Codes
- **500 Internal Server Error**: Unexpected server errors
- **502 Bad Gateway**: Upstream service errors
- **503 Service Unavailable**: Temporary service issues

## Validation Patterns

### Request Validation
- **Schema validation**: OpenAPI schema validation at API Gateway
- **Business validation**: Additional validation in Lambda functions
- **Error messages**: Specific, actionable error descriptions

### Input Sanitization
- **String trimming**: Remove leading/trailing whitespace
- **Type coercion**: Convert strings to appropriate types where safe
- **Length limits**: Enforce reasonable limits on string fields

## Pagination Patterns

### Cursor-Based Pagination
```json
{
  "items": [...],
  "nextCursor": "encrypted-cursor-string",
  "hasMore": true
}
```

### Query Parameters
- `cursor`: Pagination cursor for next page
- `limit`: Number of items per page (default: 20, max: 100)

## Upload Patterns

### Simple Uploads (Transcripts)
1. **Request presigned URL**: `POST /episodes/{episodeId}/transcripts`
2. **Upload directly to S3**: Use returned presigned URL
3. **Automatic processing**: S3 event triggers processing pipeline

### Multipart Uploads (Large Video Files)
1. **Initiate upload**: `POST /episodes/{episodeId}/tracks`
2. **Get part URLs**: `POST /episodes/{episodeId}/tracks/{trackName}/parts`
3. **Upload parts**: Direct to S3 using presigned URLs
4. **Complete upload**: `POST /episodes/{episodeId}/tracks/{trackName}/complete`

### Upload Response Format
```json
{
  "key": "s3-object-key",
  "uploadUrl": "presigned-url",
  "expiresAt": "2025-01-15T11:00:00Z",
  "requiredHeaders": {
    "x-amz-meta-filename": "original-filename.ext"
  }
}
```

## Error Handling Patterns

### Validation Errors
```json
{
  "error": "ValidationError",
  "message": "The request body contains invalid data",
  "details": {
    "field": "title",
    "issue": "Title is required"
  }
}
```

### Resource Not Found
```json
{
  "error": "NotFound",
  "message": "Episode with ID 'abc123' was not found"
}
```

### Rate Limiting
```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

## CORS Configuration

### Preflight Handling
- **OPTIONS requests**: Automatically handled by API Gateway
- **Allowed origins**: Configurable via `CORSOrigin` parameter
- **Allowed methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed headers**: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token

### Response Headers
All responses include appropriate CORS headers for browser compatibility.

## Authentication Patterns

### Current State
- **No authentication**: Currently open API for development
- **Prepared for auth**: Infrastructure ready for Lambda authorizers

### Future Authentication
```yaml
# Template ready for this configuration
Auth:
  DefaultAuthorizer: LambdaAuthorizer
  Authorizers:
    LambdaAuthorizer:
      FunctionPayloadType: REQUEST
      FunctionArn: !GetAtt AuthorizerFunction.Arn
```

## Content Type Handling

### Request Content Types
- **application/json**: Primary content type for API requests
- **multipart/form-data**: For file uploads (if implemented)

### Response Content Types
- **application/json**: All API responses
- **text/plain**: Error responses in some cases

## Caching Strategies

### Client-Side Caching
- **ETags**: Can be implemented for resource versioning
- **Cache-Control**: Appropriate headers for different resource types
- **Last-Modified**: For time-based caching

### API Gateway Caching
- **Response caching**: Can be enabled for GET endpoints
- **Cache keys**: Based on path parameters and query strings
- **TTL**: Configurable per endpoint

## Rate Limiting

### API Gateway Throttling
- **Request rate**: Configurable requests per second
- **Burst capacity**: Handle traffic spikes
- **Per-client limits**: Can be configured with usage plans

### Lambda Concurrency
- **Reserved concurrency**: Can be set per function
- **Account limits**: AWS account-level Lambda limits apply

## Monitoring and Analytics

### CloudWatch Metrics
- **Request count**: Number of API requests
- **Error rate**: Percentage of failed requests
- **Latency**: Response time metrics
- **Custom metrics**: Business-specific metrics

### API Gateway Logging
- **Access logs**: Request/response logging
- **Execution logs**: Detailed request processing logs
- **Error logs**: Specific error tracking

## Versioning Strategy

### Current Approach
- **Single version**: All endpoints in `/api` stage
- **Backward compatibility**: Changes maintain compatibility

### Future Versioning
- **URL versioning**: `/api/v1`, `/api/v2` for major changes
- **Header versioning**: `Accept: application/vnd.api+json;version=1`
- **Deprecation**: Gradual deprecation of old versions

## Security Headers

### Standard Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### API-Specific Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```
