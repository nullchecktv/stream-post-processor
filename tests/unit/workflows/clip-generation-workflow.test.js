// Unit tests for clip generation workflow structure and error handling
const { readFileSync } = require('fs');
const { join } = require('path');

describe('Clip Generation Workflow', () => {
  let workflow;

  beforeAll(() => {
    const workflowPath = join(process.cwd(), 'workflows', 'clip-generation.asl.json');
    const workflowContent = readFileSync(workflowPath, 'utf8');
    workflow = JSON.parse(workflowContent);
  });

  describe('Workflow structure validation', () => {
    test('should have valid JSON structure', () => {
      expect(workflow).toBeDefined();
      expect(workflow.StartAt).toBe('Set In Progress');
      expect(workflow.States).toBeDefined();
    });

    test('should have all required states', () => {
      const requiredStates = [
        'Set In Progress',
        'Iterate Segments',
        'Update Segments Complete Status',
        'Compose Clip From Segments',
        'Set Complete',
        'Error Handler',
        'Final Error State',
        'Fail State'
      ];

      requiredStates.forEach(stateName => {
        expect(workflow.States[stateName]).toBeDefined();
      });
    });
  });

  describe('Error handling validation', () => {
    test('should have Catch blocks on all Lambda invocation states', () => {
      const lambdaStates = [
        'Compose Clip From Segments'
      ];

      lambdaStates.forEach(stateName => {
        const state = workflow.States[stateName];
        expect(state.Catch).toBeDefined();
        expect(state.Catch).toHaveLength(1);
        expect(state.Catch[0].ErrorEquals).toContain('States.ALL');
        expect(state.Catch[0].Next).toBe('Error Handler');
      });
    });

    test('should have Catch blocks on all DynamoDB states', () => {
      const dynamoStates = [
        'Set In Progress',
        'Update Segments Complete Status',
        'Set Complete'
      ];

      dynamoStates.forEach(stateName => {
        const state = workflow.States[stateName];
        expect(state.Catch).toBeDefined();
        expect(state.Catch).toHaveLength(1);
        expect(state.Catch[0].ErrorEquals).toContain('States.ALL');
        expect(state.Catch[0].Next).toBe('Error Handler');
      });
    });

    test('should have retry logic on DynamoDB operations', () => {
      const dynamoStates = [
        'Set In Progress',
        'Update Segments Complete Status',
        'Set Complete',
        'Error Handler'
      ];

      dynamoStates.forEach(stateName => {
        const state = workflow.States[stateName];
        expect(state.Retry).toBeDefined();
        expect(state.Retry).toHaveLength(1);
        expect(state.Retry[0].ErrorEquals).toContain('DynamoDB.ServiceException');
        expect(state.Retry[0].ErrorEquals).toContain('DynamoDB.ProvisionedThroughputExceededException');
        expect(state.Retry[0].ErrorEquals).toContain('DynamoDB.ThrottlingException');
      });
    });

    test('should have comprehensive Error Handler state', () => {
      const errorHandler = workflow.States['Error Handler'];

      expect(errorHandler.Type).toBe('Task');
      expect(errorHandler.Resource).toBe('arn:aws:states:::dynamodb:updateItem');

      // Check that it updates status to "failed"
      expect(errorHandler.Parameters.UpdateExpression).toContain('#status = :status');
      expect(errorHandler.Parameters.ExpressionAttributeValues[':status'].S).toBe('failed');

      // Check that it includes error details in status history
      expect(errorHandler.Parameters.UpdateExpression).toContain('#statusHistory = list_append');
      expect(errorHandler.Parameters.ExpressionAttributeValues[':failureStatus'].L[0].M.status).toBeDefined();
      expect(errorHandler.Parameters.ExpressionAttributeValues[':failureStatus'].L[0].M.timestamp).toBeDefined();

      // Check that it has its own error handling
      expect(errorHandler.Catch).toBeDefined();
      expect(errorHandler.Catch[0].Next).toBe('Final Error State');
    });

    test('should terminate with Fail state', () => {
      const failState = workflow.States['Fail State'];

      expect(failState.Type).toBe('Fail');
      expect(failState.Cause).toBe('Clip generation workflow failed');
      expect(failState.Error).toBe('ClipGenerationError');
    });

    test('should have Final Error State for critical failures', () => {
      const finalErrorState = workflow.States['Final Error State'];

      expect(finalErrorState.Type).toBe('Pass');
      expect(finalErrorState.Parameters.status).toBe('failed');
      expect(finalErrorState.Parameters.message).toContain('Critical error');
      expect(finalErrorState.Next).toBe('Fail State');
    });
  });

  describe('Map state error handling', () => {
    test('should have error handling in segment processing', () => {
      const iterateSegments = workflow.States['Iterate Segments'];

      expect(iterateSegments.Type).toBe('Map');
      expect(iterateSegments.Catch).toBeDefined();
      expect(iterateSegments.Catch[0].Next).toBe('Error Handler');

      // Check segment processor error handling
      const segmentProcessor = iterateSegments.ItemProcessor.States['Extract and store segment'];
      expect(segmentProcessor.Catch).toBeDefined();
      expect(segmentProcessor.Catch[0].Next).toBe('Segment Error Handler');

      // Check segment error handler
      const segmentErrorHandler = iterateSegments.ItemProcessor.States['Segment Error Handler'];
      expect(segmentErrorHandler.Type).toBe('Pass');
      expect(segmentErrorHandler.Parameters.error.message).toBeDefined();
      expect(segmentErrorHandler.Parameters.error['timestamp.$']).toBeDefined();
    });
  });

  describe('DynamoDB integration syntax', () => {
    test('should use correct DynamoDB updateItem syntax', () => {
      const dynamoStates = ['Set In Progress', 'Update Segments Complete Status', 'Set Complete', 'Error Handler'];

      dynamoStates.forEach(stateName => {
        const state = workflow.States[stateName];

        expect(state.Type).toBe('Task');
        expect(state.Resource).toBe('arn:aws:states:::dynamodb:updateItem');
        expect(state.Parameters).toBeDefined();
        expect(state.Parameters.TableName).toBe('${TableName}');
        expect(state.Parameters.Key).toBeDefined();
        expect(state.Parameters.UpdateExpression).toBeDefined();
        expect(state.Parameters.ExpressionAttributeNames).toBeDefined();
        expect(state.Parameters.ExpressionAttributeValues).toBeDefined();
      });
    });

    test('should use correct key structure for clip records', () => {
      const dynamoStates = ['Set In Progress', 'Update Segments Complete Status', 'Set Complete', 'Error Handler'];

      dynamoStates.forEach(stateName => {
        const state = workflow.States[stateName];
        const key = state.Parameters.Key;

        expect(key.pk).toBeDefined();
        expect(key.pk['S.$']).toBe("States.Format('{}#{}', $.tenantId, $.episodeId)");
        expect(key.sk).toBeDefined();
        expect(key.sk['S.$']).toBe("States.Format('clip#{}', $.clipId)");
      });
    });

    test('should use list_append with if_not_exists for status history', () => {
      const setInProgress = workflow.States['Set In Progress'];
      const errorHandler = workflow.States['Error Handler'];

      // Check Set In Progress uses if_not_exists
      expect(setInProgress.Parameters.UpdateExpression).toContain('list_append(if_not_exists(#statusHistory, :emptyList)');
      expect(setInProgress.Parameters.ExpressionAttributeValues[':emptyList']).toBeDefined();
      expect(setInProgress.Parameters.ExpressionAttributeValues[':emptyList'].L).toEqual([]);

      // Check Error Handler also uses if_not_exists
      expect(errorHandler.Parameters.UpdateExpression).toContain('list_append(if_not_exists(#statusHistory, :emptyList)');
      expect(errorHandler.Parameters.ExpressionAttributeValues[':emptyList']).toBeDefined();
      expect(errorHandler.Parameters.ExpressionAttributeValues[':emptyList'].L).toEqual([]);
    });

    test('should include timestamps using State.EnteredTime', () => {
      const statusStates = ['Set In Progress', 'Update Segments Complete Status', 'Set Complete', 'Error Handler'];

      statusStates.forEach(stateName => {
        const state = workflow.States[stateName];
        const statusEntry = state.Parameters.ExpressionAttributeValues[':newStatus'] ||
                           state.Parameters.ExpressionAttributeValues[':failureStatus'];

        expect(statusEntry.L[0].M.timestamp['S.$']).toBe('$$.State.EnteredTime');

        // Check updatedAt field also uses State.EnteredTime
        expect(state.Parameters.ExpressionAttributeValues[':updatedAt']['S.$']).toBe('$$.State.EnteredTime');
      });
    });

    test('should include proper status values', () => {
      const setInProgress = workflow.States['Set In Progress'];
      const setComplete = workflow.States['Set Complete'];
      const errorHandler = workflow.States['Error Handler'];

      expect(setInProgress.Parameters.ExpressionAttributeValues[':status'].S).toBe('processing');
      expect(setComplete.Parameters.ExpressionAttributeValues[':status'].S).toBe('processed');
      expect(errorHandler.Parameters.ExpressionAttributeValues[':status'].S).toBe('failed');
    });

    test('should include segment count in status history', () => {
      const setInProgress = workflow.States['Set In Progress'];
      const statusEntry = setInProgress.Parameters.ExpressionAttributeValues[':newStatus'];

      expect(statusEntry.L[0].M.segmentCount).toBeDefined();
      expect(statusEntry.L[0].M.segmentCount['N.$']).toBe('States.ArrayLength($.segments)');
    });

    test('should include processing metadata in completion state', () => {
      const setComplete = workflow.States['Set Complete'];
      const updateExpression = setComplete.Parameters.UpdateExpression;

      expect(updateExpression).toContain('#s3Key = :s3Key');
      expect(updateExpression).toContain('#duration = :duration');

      expect(setComplete.Parameters.ExpressionAttributeValues[':s3Key']).toBeDefined();
      expect(setComplete.Parameters.ExpressionAttributeValues[':duration']).toBeDefined();
    });

    test('should include error details in failure state', () => {
      const errorHandler = workflow.States['Error Handler'];
      const updateExpression = errorHandler.Parameters.UpdateExpression;

      expect(updateExpression).toContain('#statusHistory = list_append');
      expect(updateExpression).toContain('#status = :status');
      expect(updateExpression).toContain('#updatedAt = :updatedAt');

      const failureStatus = errorHandler.Parameters.ExpressionAttributeValues[':failureStatus'];
      expect(failureStatus.L[0].M.status).toBeDefined();
      expect(failureStatus.L[0].M.timestamp).toBeDefined();
    });
  });

  describe('JSONata expression validation', () => {
    test('should use valid expressions for data transformation', () => {
      const composeClip = workflow.States['Compose Clip From Segments'];

      expect(composeClip.Parameters.Payload['segments.$']).toBe('$');
    });

    test('should use States.Format for string concatenation', () => {
      const dynamoStates = ['Set In Progress', 'Update Segments Complete Status', 'Set Complete', 'Error Handler'];

      dynamoStates.forEach(stateName => {
        const state = workflow.States[stateName];
        const key = state.Parameters.Key;

        expect(key.pk['S.$']).toBe("States.Format('{}#{}', $.tenantId, $.episodeId)");
        expect(key.sk['S.$']).toBe("States.Format('clip#{}', $.clipId)");
      });
    });

    test('should use proper expressions for data access', () => {
      const setComplete = workflow.States['Set Complete'];

      // Check that we can access clip data from the payload
      expect(setComplete.Parameters.ExpressionAttributeValues[':s3Key']['S.$']).toBe('$.clipS3Key');
      expect(setComplete.Parameters.ExpressionAttributeValues[':duration']['S.$']).toBe('$.duration');
    });
  });
});
