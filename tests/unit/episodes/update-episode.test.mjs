import { describe, it, expect, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { handler } from '../../../functions/episodes/update-episode.mjs';

const ddbMock = mockClient(DynamoDBClient);

describe('update-episode', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  it('should update episode successfully', async () => {
    const existingEpisode = {
      pk: 'tenant123#episode-id',
      sk: 'metadata',
      episodeId: 'episode-id',
      tenantId: 'tenant123',
      title: 'Old Title',
      episodeNumber: 1,
      status: 'Draft',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };

    ddbMock.on(GetItemCommand).resolves({
      Item: marshall(existingEpisode)
    });

    ddbMock.on(PutItemCommand).resolves({});

    const event = {
      pathParameters: { episodeId: 'episode-id' },
      body: JSON.stringify({
        title: 'New Title',
        description: 'Updated description'
      }),
      requestContext: {
        authorizer: {
          tenantId: 'tenant123',
          userId: 'user123'
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(204);
    expect(ddbMock.calls()).toHaveLength(2);

    const putCall = ddbMock.commandCalls(PutItemCommand)[0];
    const updatedItem = unmarshall(putCall.args[0].input.Item);
    expect(updatedItem.title).toBe('New Title');
    expect(updatedItem.description).toBe('Updated description');
    expect(updatedItem.episodeNumber).toBe(1);
  });

  it('should return 404 if episode not found', async () => {
    ddbMock.on(GetItemCommand).resolves({});

    const event = {
      pathParameters: { episodeId: 'nonexistent' },
      body: JSON.stringify({ title: 'New Title' }),
      requestContext: {
        authorizer: {
          tenantId: 'tenant123',
          userId: 'user123'
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).message).toBe("Episode with ID 'nonexistent' was not found");
  });

  it('should validate request body', async () => {
    const event = {
      pathParameters: { episodeId: 'episode-id' },
      body: JSON.stringify({
        title: '',
        episodeNumber: -1
      }),
      requestContext: {
        authorizer: {
          tenantId: 'tenant123',
          userId: 'user123'
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });
});
