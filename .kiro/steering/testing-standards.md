# Testing Standards and Practices

## Testing Philosophy

Testing in this serverless application focuses on **business logic validatiointegration testing**, and **contract testing**. Given the event-driven architecture, testing emphasizes ensuring correct data flow and proper handling of AWS service interactions.

## Testing Structure

### Test Organization
```
tests/
├── unit/                    # Unit tests for business logic
│   ├── utils/              # Utility function tests
│   ├── validators/         # Input validation tests
│   └── handlers/           # Handler logic tests (mocked AWS services)
├── integration/            # Integration tests with AWS services
│   ├── api/               # API Gateway integration tests
│   ├── events/            # EventBridge integration tests
│   └── storage/           # DynamoDB and S3 integration tests
├── contract/              # API contract tests
├── fixtures/              # Test data and fixtures
└── helpers/               # Test utilities and helpers
```

## Unit Testing Standards

### Test Framework
- **Jest**: Primary testing framework
- **AWS SDK mocking**: Use `aws-sdk-client-mock` for AWS service mocking
- **Test isolation**: Each test should be independent and idempotent

### Unit Test Patterns

#### Handler Testing
```javascript
import { handler } from '../functions/episodes/create-episode.mjs';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('create-episode handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  it('should create episode successfully', async () => {
    ddbMock.on(PutCommand).resolves({});

    const event = {
      body: JSON.stringify({
        title: 'Test Episode',
        episodeNumber: 1
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toHaveProperty('id');
    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('should handle validation errors', async () => {
    const event = {
      body: JSON.stringify({
        title: '', // Invalid empty title
        episodeNumber: 1
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('error');
  });
});
```

#### Utility Function Testing
```javascript
import { validateEpisode, createEpisodeKey } from '../functions/utils/episodes.mjs';

describe('episode utilities', () => {
  describe('validateEpisode', () => {
    it('should validate correct episode data', () => {
      const validEpisode = {
        title: 'Test Episode',
        episodeNumber: 1,
        airDate: '2025-01-15T10:30:00Z'
      };

      expect(() => validateEpisode(validEpisode)).not.toThrow();
    });

    it('should reject invalid episode data', () => {
      const invalidEpisode = {
        title: '',
        episodeNumber: -1
      };

      expect(() => validateEpisode(invalidEpisode)).toThrow();
    });
  });

  describe('createEpisodeKey', () => {
    it('should create correct DynamoDB key', () => {
      const episodeId = '123e4567-e89b-12d3-a456-426614174000';
      const key = createEpisodeKey(episodeId);

      expect(key).toEqual({
        pk: episodeId,
        sk: 'metadata'
      });
    });
  });
});
```

### Test Data Management

#### Fixtures
```javascript
// tests/fixtures/episodes.js
export const validEpisode = {
  title: 'Test Episode',
  episodeNumber: 1,
  summary: 'Test episode summary',
  airDate: '2025-01-15T10:30:00Z',
  platforms: ['twitch', 'youtube'],
  themes: ['technology'],
  seriesName: 'Test Series'
};

export const invalidEpisode = {
  title: '',
  episodeNumber: -1
};

export const episodeApiResponse = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  ...validEpisode,
  createdAt: '2025-01-15T10:30:00Z',
  updatedAt: '2025-01-15T10:30:00Z'
};
```

#### Test Helpers
```javascript
// tests/helpers/dynamodb.js
export const createMockDynamoDBItem = (overrides = {}) => ({
  pk: '123e4567-e89b-12d3-a456-426614174000',
  sk: 'metadata',
  title: 'Test Episode',
  episodeNumber: 1,
  createdAt: '2025-01-15T10:30:00Z',
  updatedAt: '2025-01-15T10:30:00Z',
  ...overrides
});

export const createMockApiEvent = (body, pathParameters = {}) => ({
  body: JSON.stringify(body),
  pathParameters,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## Integration Testing

### Local Testing with SAM
```bash
# Start local API
sam local start-api --env-vars env.json

# Test specific function
sam local invoke CreateEpisodeFunction --event events/create-episode.json
```

### Integration Test Patterns

#### API Integration Tests
```javascript
import axios from 'axios';

describe('Episodes API Integration', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
  });

  it('should create and retrieve episode', async () => {
    // Create episode
    const createResponse = await axios.post(`${baseURL}/episodes`, {
      title: 'Integration Test Episode',
      episodeNumber: 999
    });

    expect(createResponse.status).toBe(201);
    const episodeId = createResponse.data.id;

    // Retrieve episode
    const getResponse = await axios.get(`${baseURL}/episodes`);
    expect(getResponse.status).toBe(200);

    const episode = getResponse.data.find(e => e.id === episodeId);
    expect(episode).toBeDefined();
    expect(episode.title).toBe('Integration Test Episode');
  });
});
```

#### Event Integration Tests
```javascript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

describe('Event Processing Integration', () => {
  const eventBridge = new EventBridgeClient({ region: 'us-east-1' });

  it('should process video upload completed event', async () => {
    const event = {
      Source: 'nullcheck',
      DetailType: 'Video Upload Completed',
      Detail: JSON.stringify({
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        trackName: 'main',
        s3Key: 'test-key'
      })
    };

    await eventBridge.send(new PutEventsCommand({
      Entries: [event]
    }));

    // Wait for processing and verify results
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify processing results in DynamoDB
    // ... verification logic
  });
});
```

## Contract Testing

### OpenAPI Contract Tests
```javascript
import SwaggerParser from '@apidevtools/swagger-parser';
import { readFileSync } from 'fs';

describe('API Contract Tests', () => {
  let apiSpec;

  beforeAll(async () => {
    apiSpec = await SwaggerParser.validate('./openapi.yaml');
  });

  it('should have valid OpenAPI specification', () => {
    expect(apiSpec).toBeDefined();
    expect(apiSpec.openapi).toBe('3.0.0');
  });

  it('should validate episode creation schema', () => {
    const episodeSchema = apiSpec.components.schemas.Episode;
    expect(episodeSchema).toBeDefined();
    expect(episodeSchema.required).toContain('title');
    expect(episodeSchema.required).toContain('episodeNumber');
  });
});
```

### Response Schema Validation
```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

describe('Response Schema Validation', () => {
  it('should validate episode list response', async () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          airDate: { type: 'string', format: 'date-time' },
          platforms: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'title']
      }
    };

    const validate = ajv.compile(schema);

    const response = await axios.get(`${baseURL}/episodes`);
    const isValid = validate(response.data);

    expect(isValid).toBe(true);
    if (!isValid) {
      console.log(validate.errors);
    }
  });
});
```

## Performance Testing

### Load Testing with Artillery
```yaml
# artillery-config.yml
config:
  target: 'https://api-id.execute-api.us-east-1.amazonaws.com/api'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: 'Create and list episodes'
    flow:
      - post:
          url: '/episodes'
          json:
            title: 'Load Test Episode {{ $randomString() }}'
            episodeNumber: '{{ $randomInt(1, 1000) }}'
      - get:
          url: '/episodes'
```

### Performance Assertions
```javascript
describe('Performance Tests', () => {
  it('should respond within acceptable time limits', async () => {
    const start = Date.now();

    const response = await axios.get(`${baseURL}/episodes`);

    const duration = Date.now() - start;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000); // 2 second max
  });
});
```

## Test Environment Setup

### Environment Configuration
```json
{
  "CreateEpisodeFunction": {
    "TABLE_NAME": "test-nullcheck-table",
    "AWS_REGION": "us-east-1"
  },
  "ListEpisodesFunction": {
    "TABLE_NAME": "test-nullcheck-table",
    "ENCRYPTION_KEY": "test-key",
    "AWS_REGION": "us-east-1"
  }
}
```

### Test Database Setup
```javascript
// tests/setup/dynamodb.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';

export const createTestTable = async () => {
  const client = new DynamoDBClient({ region: 'us-east-1' });

  const params = {
    TableName: 'test-nullcheck-table',
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' },
      { AttributeName: 'GSI1SK', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [{
      IndexName: 'GSI1',
      KeySchema: [
        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
        { AttributeName: 'GSI1SK', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }]
  };

  await client.send(new CreateTableCommand(params));
};
```

## Continuous Integration

### GitHub Actions Test Workflow
```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Test Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:contract": "jest tests/contract",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Test Coverage Standards

### Coverage Targets
- **Unit tests**: 80% line coverage minimum
- **Integration tests**: Cover all API endpoints
- **Contract tests**: Validate all request/response schemas

### Coverage Configuration
```javascript
// jest.config.js
export default {
  collectCoverageFrom: [
    'functions/**/*.mjs',
    '!functions/**/*.test.mjs',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```
