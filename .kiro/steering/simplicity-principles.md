# Simplicity Principles

## Core Principle

**Solve the problem directly. Don't invent new paradigms.**

Every line of code should have a clear, immediate purpose. If you can't explain why a piece of code exists in one sentence, it's probably unnecessary complexity.

## Decision Framework

Before adding any abstraction, ask
**Do I have 3+ concrete use cases right now?** (Not theoretical future ones)
2. **Is the current code actually hard to understand or maintain?**
3. **Will this abstraction make the code simpler for the next developer?**
4. **Am I solving a real problem or just following a pattern I read about?**

If any answer is "no", don't abstract.

## Preferred Approaches

### Use Standard Patterns
- **REST APIs**: Standard HTTP methods and status codes
- **AWS Services**: Use them as designed, don't wrap unnecessarily
- **Node.js**: Standard async/await, no custom promise wrappers
- **DynamoDB**: Single table design with direct SDK calls
- **Lambda**: Simple handler functions that do one thing

### Write Explicit Code
```javascript
// Good: Clear and direct
const episode = await docClient.send(new GetCommand({
  TableName: TABLE_NAME,
  Key: { pk: episodeId, sk: 'metadata' }
}));

// Bad: Unnecessary abstraction
const episode = await repository.findById(episodeId);
```

### Handle Errors Simply
```javascript
// Good: Handle errors where they occur
try {
  const result = await someOperation();
  return { statusCode: 200, body: JSON.stringify(result) };
} catch (error) {
  console.error('Operation failed:', error);
  return { statusCode: 500, body: JSON.stringify({ error: 'Failed' }) };
}

// Bad: Complex error handling framework
throw new CustomBusinessError('OPERATION_FAILED', error, context);
```

## What NOT to Build

### Don't Build These Unless You Actually Need Them
- **Generic repository classes** - Use DynamoDB SDK directly
- **Abstract service layers** - Put logic in the handler
- **Custom validation frameworks** - Use Zod schemas directly
- **Configuration management systems** - Use environment variables
- **Custom logging frameworks** - Use console.log with structured data
- **Generic error handling middleware** - Handle errors where they happen
- **Abstract factory patterns** - Instantiate objects directly
- **Custom dependency injection** - Import what you need
- **Generic data mappers** - Transform data inline when needed
- **Custom retry mechanisms** - Use AWS SDK built-in retries

### Don't Abstract AWS Services
- **DynamoDB**: Use the document client directly
- **S3**: Use the S3 client directly
- **Lambda**: Write simple handler functions
- **EventBridge**: Send events with the EventBridge client
- **Step Functions**: Define state machines in JSON/YAML

## When Abstraction IS Appropriate

### Shared Utilities (Not Frameworks)
```javascript
// Good: Simple utility function
export const createEpisodeKey = (episodeId) => ({
  pk: episodeId,
  sk: 'metadata'
});

// Bad: Generic key factory
export class KeyFactory {
  static create(entityType, id, subType = 'metadata') {
    return new EntityKey(entityType, id, subType);
  }
}
```

### Business Logic Extraction
```javascript
// Good: Extract complex business logic
export const calculateClipSegments = (clipStart, clipEnd, chunkDuration) => {
  // Complex calculation logic here
  return segments;
};

// Bad: Generic calculation framework
export class CalculationEngine {
  register(calculationType, calculator) { /* ... */ }
  calculate(type, inputs) { /* ... */ }
}
```

## Testing Approach

### Test Behavior, Not Implementation
- Test what the function does, not how it does it
- Mock external services (AWS SDK calls), not internal functions
- Write integration tests for complete workflows
- Don't test private methods or internal abstractions

### Keep Tests Simple
```javascript
// Good: Clear test of behavior
test('creates episode successfully', async () => {
  ddbMock.on(PutCommand).resolves({});

  const result = await handler(createEpisodeEvent);

  expect(result.statusCode).toBe(201);
  expect(ddbMock.calls()).toHaveLength(1);
});

// Bad: Testing internal abstractions
test('repository calls correct mapper method', async () => {
  const mapper = jest.fn();
  const repository = new Repository(mapper);
  // Testing implementation details
});
```

## Code Review Guidelines

### Red Flags in Code Reviews
- New base classes or interfaces with only one implementation
- Generic utilities that are only used in one place
- Complex configuration objects for simple operations
- Middleware or interceptor patterns for straightforward logic
- Abstract factories or builders for simple object creation
- Custom error hierarchies with multiple inheritance levels

### Green Flags in Code Reviews
- Direct use of AWS SDK with clear error handling
- Simple functions that do one thing well
- Explicit data transformations without generic mappers
- Clear variable names that explain the business purpose
- Straightforward control flow without complex patterns

## Documentation Standards

### Write Documentation That Explains Why
- **Why this approach was chosen** over alternatives
- **Why certain AWS services** were selected
- **Why specific data structures** are used
- **Why certain error handling** patterns are implemented

### Don't Document What the Code Already Says
```javascript
// Bad: Obvious documentation
/**
 * Gets an episode by ID
 * @param {string} episodeId - The episode ID
 * @returns {Object} The episode object
 */
const getEpisode = (episodeId) => { /* ... */ };

// Good: Explains business context
/**
 * Retrieves episode metadata for clip processing.
 * Returns null if episode doesn't exist (not an error condition).
 */
const getEpisode = (episodeId) => { /* ... */ };
```

## Refactoring Guidelines

### When to Refactor
- Code is duplicated in 3+ places with identical logic
- Functions are longer than 50 lines and do multiple things
- Error handling is inconsistent across similar operations
- Business logic is mixed with AWS service calls in complex ways

### When NOT to Refactor
- Code works and is easy to understand
- You're just following a design pattern you learned
- The abstraction would only have one or two use cases
- The current approach is explicit and clear

## Success Metrics

### Good Code Characteristics
- **New developers can understand it quickly**
- **Changes are localized and predictable**
- **Debugging is straightforward with clear error messages**
- **Testing focuses on business behavior**
- **AWS costs are predictable and optimized**

### Warning Signs
- **Need complex documentation to explain simple operations**
- **Changes require updates in multiple abstraction layers**
- **Debugging requires understanding custom frameworks**
- **Tests are testing implementation details**
- **Performance is unpredictable due to abstraction overhead**
