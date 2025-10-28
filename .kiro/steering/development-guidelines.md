# Development Guidelines

## Core Philosophy

**Keep it simple. Solve the problem directly. Avoid abstraction for the sake of abstraction.**

- Write code that solves the immediate problem without over-engineering
- Use existing patterns and libraries rather than inventing new ones
- Prefer explicit, readable code over clever abstractions
- Only abstract when you have 3+ concrete use cases that would benefit
- Choose boring, proven solutions over novel approaches

## Anti-Patterns to Avoid

### Don't Create Unnecessary Abstractions
- **No generic base classes** unless you have multiple concrete implementations
- **No middleware chains** for simple request/response handling
- **No factory patterns** when direct instantiation is clear
- **No strategy patterns** when a simple if/else or switch works
- **No observer patterns** when direct function calls are sufficient

### Don't Over-Engineer Simple Operations
- **No repository patterns** when you only have one data store
- **No service layers** when the logic fits in the handler
- **No complex configuration systems** when environment variables work
- **No dependency injection containers** for simple Lambda functions
- **No event sourcing** when simple state updates are sufficient

### Don't Abstract AWS Services
- **Use AWS SDK directly** rather than wrapping it in custom abstractions
- **Don't create generic cloud provider interfaces** unless you're actually multi-cloud
- **Don't abstract DynamoDB** behind generic database interfaces
- **Don't create custom S3 wrappers** when the SDK is clear enough

### When Abstraction IS Appropriate
- **Multiple concrete implementations exist** (not theoretical future ones)
- **Complex business logic** that needs to be tested in isolation
- **Shared utilities** used across many functions with identical patterns
- **External API clients** that need consistent error handling and retry logic

## Code Standards

### File Structure and Naming
- **Lambda functions**: Use `.mjs` extension for all Lambda handlers
- **File naming**: Use kebab-case for all file names (e.g., `create-episode.mjs`)
- **Handler exports**: Always export a `handler` function as the main entry point
- **Utility modules**: Place shared code in `functions/utils/` directory
- **Domain organization**: Group functions by business domain (agents, episodes, events, tools)

### JavaScript/Node.js Standards
- **ES Modules**: Use ESM syntax exclusively (`import`/`export`)
- **Node.js version**: Target Node.js 22.x runtime
- **Async/await**: Prefer async/await over Promises and callbacks
- **Error handling**: Use try/catch blocks and proper error propagation
- **Type validation**: Use Zod for runtime type checking and validation

### AWS SDK Usage
- **Version 3**: Use AWS SDK v3 exclusively
- **Modular imports**: Import only specific service clients needed
- **Client reuse**: Create clients outside handler function for connection reuse
- **Error handling**: Handle AWS service errors appropriately with proper status codes

Example:
```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    // Handler logic here
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## Function Development Patterns

### Lambda Handler Structure
Keep handlers simple and direct:
```javascript
export const handler = async (event, context) => {
  // Parse input
  // Do the work
  // Return result
  // Handle errors inline
};
```

**Avoid:**
- Complex handler frameworks or middleware chains
- Abstract base classes for handlers
- Over-engineered request/response wrappers
- Unnecessary dependency injection patterns

### API Gateway Functions
- **CORS headers**: Always include CORS headers in responses
- **Status codes**: Use appropriate HTTP status codes
- **Request validation**: Validate input using Zod schemas
- **Response format**: Consistent JSON response structure

### Event-Driven Functions
- **Event parsing**: Parse EventBridge/S3 events properly
- **Idempotency**: Handle duplicate events gracefully
- **Error propagation**: Log errors but don't throw unless critical

### Environment Variables
- **Required variables**: Validate required environment variables at startup
- **Naming**: Use UPPER_SNAKE_CASE for environment variable names
- **Defaults**: Provide sensible defaults where appropriate

## Database Patterns

### DynamoDB Best Practices
- **Single table design**: Use the shared `NullCheckTable` for all data
- **Key structure**: Follow `pk` (partition key) and `sk` (sort key) patterns
- **GSI usage**: Use GSI1 for alternative access patterns
- **Attribute naming**: Use consistent attribute naming across entities
- **TTL**: Set TTL for temporary data to enable automatic cleanup

### Data Access Patterns
Use the existing single-table design directly:
```javascript
// Store data simply
const episode = {
  pk: episodeId,
  sk: 'metadata',
  GSI1PK: 'episodes',
  GSI1SK: `${airDate}#${episodeId}`,
  title: 'Episode Title',
  episodeNumber: 1,
  // ... other attributes
};
```

**Avoid:**
- ORM layers or complex data mapping frameworks
- Abstract repository patterns unless you have multiple data stores
- Complex query builders when simple DynamoDB operations work
- Generic CRUD abstractions that hide the actual operations

## Testing Standards

### Unit Testing
- **Test files**: Place tests in `tests/` directory
- **Naming**: Use `.test.js` or `.spec.js` suffix
- **Coverage**: Focus on business logic and error conditions
- **Mocking**: Mock AWS services for unit tests

### Integration Testing
- **Local testing**: Use SAM CLI for local testing
- **Test data**: Use test-specific data that doesn't affect production
- **Cleanup**: Clean up test resources after test completion

## Build and Deployment

### SAM Configuration
- **Build settings**: Use cached and parallel builds for development
- **Environment separation**: Use different stack names for different environments
- **Parameter management**: Use parameter overrides for environment-specific values

### esbuild Configuration
- **Target**: ES2020 for Lambda compatibility
- **Format**: ESM modules
- **External dependencies**: Exclude AWS SDK from bundles
- **Source maps**: Disable for production builds
- **Minification**: Disable for debugging capabilities

### Deployment Process
1. **Build**: `sam build`
2. **Test locally**: `sam local start-api` (if needed)
3. **Deploy**: `sam deploy --config-env [environment]`
4. **Verify**: Test deployed endpoints

## Security Guidelines

### IAM Policies
- **Least privilege**: Grant minimum required permissions
- **Resource-specific**: Use specific resource ARNs when possible
- **Action-specific**: Avoid wildcard actions unless necessary
- **Regular review**: Review and update permissions regularly

### Data Protection
- **Encryption**: Use encryption at rest and in transit
- **Sensitive data**: Never log sensitive information
- **Input validation**: Validate all inputs to prevent injection attacks
- **CORS**: Configure CORS appropriately for your use case

### Environment Variables
- **Secrets**: Use AWS Systems Manager Parameter Store or Secrets Manager for secrets
- **No hardcoding**: Never hardcode sensitive values in code
- **Environment separation**: Use different values for different environments

## Error Handling and Logging

### Error Handling Patterns
```javascript
try {
  // Business logic
} catch (error) {
  console.error('Operation failed:', {
    error: error.message,
    stack: error.stack,
    context: { /* relevant context */ }
  });

  return {
    statusCode: error.statusCode || 500,
    body: JSON.stringify({
      error: error.name || 'InternalError',
      message: error.message || 'Something went wrong'
    })
  };
}
```

### Logging Standards
- **Structured logging**: Use JSON format for logs
- **Context**: Include relevant context in log messages
- **Log levels**: Use appropriate log levels (error, warn, info, debug)
- **No sensitive data**: Never log passwords, tokens, or PII

## Performance Optimization

### Lambda Optimization
- **Cold starts**: Minimize cold start impact by keeping initialization outside handler
- **Memory allocation**: Right-size memory allocation based on function needs
- **Connection reuse**: Reuse database and HTTP connections
- **Bundle size**: Keep bundle sizes small by excluding unnecessary dependencies

### Database Optimization
- **Query patterns**: Design efficient query patterns
- **Batch operations**: Use batch operations when processing multiple items
- **Pagination**: Implement pagination for large result sets
- **Caching**: Consider caching frequently accessed data

## Monitoring and Observability

### CloudWatch Integration
- **Metrics**: Use custom metrics for business-specific monitoring
- **Alarms**: Set up alarms for critical failures
- **Dashboards**: Create dashboards for operational visibility
- **Log retention**: Set appropriate log retention periods

### X-Ray Tracing
- **Tracing enabled**: X-Ray tracing is enabled globally
- **Custom segments**: Add custom segments for detailed tracing
- **Error tracking**: Use tracing to identify performance bottlenecks
