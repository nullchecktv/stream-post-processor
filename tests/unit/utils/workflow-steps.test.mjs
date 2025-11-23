import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import {
  validateWorkflowStepTransition,
  initializeWorkflowSteps,
  canProceedToUploads,
  updateWorkflowStepStatus,
  WORKFLOW_STEPS
} from '../../../functions/utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../../schemas/episodes.mjs';

const ddbMock = mockClient(DynamoDBDocumentClient);
const eventBridgeMock = mockClient(EventBridgeClient);

describe('Workflow Steps Utilities', () => {
  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('validateWorkflowStepTransition', () => {
    it('should allow transition from Not Started to In Progress', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.NOT_STARTED,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
      }).not.toThrow();
    });

    it('should allow transition from Not Started to Skipped', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.NOT_STARTED,
          WORKFLOW_STEP_STATUS.SKIPPED
        );
      }).not.toThrow();
    });

    it('should allow transition from In Progress to Completed', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.IN_PROGRESS,
          WORKFLOW_STEP_STATUS.COMPLETED
        );
      }).not.toThrow();
    });

    it('should allow transition from In Progress to Failed', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.IN_PROGRESS,
          WORKFLOW_STEP_STATUS.FAILED
        );
      }).not.toThrow();
    });

    it('should allow transition from Failed to In Progress (retry)', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.FAILED,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
      }).not.toThrow();
    });

    it('should allow transition from Skipped to In Progress', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.SKIPPED,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
      }).not.toThrow();
    });

    it('should reject transition from Completed to In Progress', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.COMPLETED,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
      }).toThrow('Invalid workflow step transition');
    });

    it('should reject transition from Not Started to Completed', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.NOT_STARTED,
          WORKFLOW_STEP_STATUS.COMPLETED
        );
      }).toThrow('Invalid workflow step transition');
    });

    it('should reject transition from Not Started to Failed', () => {
      expect(() => {
        validateWorkflowStepTransition(
          WORKFLOW_STEP_STATUS.NOT_STARTED,
          WORKFLOW_STEP_STATUS.FAILED
        );
      }).toThrow('Invalid workflow step transition');
    });

    it('should allow any transition when current status is null', () => {
      expect(() => {
        validateWorkflowStepTransition(null, WORKFLOW_STEP_STATUS.IN_PROGRESS);
      }).not.toThrow();
    });

    it('should allow any transition when current status is undefined', () => {
      expect(() => {
        validateWorkflowStepTransition(undefined, WORKFLOW_STEP_STATUS.COMPLETED);
      }).not.toThrow();
    });
  });

  describe('initializeWorkflowSteps', () => {
    it('should initialize all workflow steps with Not Started status', () => {
      const steps = initializeWorkflowSteps();

      expect(steps).toEqual({
        generatePlan: {
          status: WORKFLOW_STEP_STATUS.NOT_STARTED
        },
        uploadTranscript: {
          status: WORKFLOW_STEP_STATUS.NOT_STARTED
        },
        uploadTracks: {
          status: WORKFLOW_STEP_STATUS.NOT_STARTED
        }
      });
    });

    it('should not include timestamps in initial state', () => {
      const steps = initializeWorkflowSteps();

      expect(steps.generatePlan.startedAt).toBeUndefined();
      expect(steps.generatePlan.completedAt).toBeUndefined();
      expect(steps.uploadTranscript.startedAt).toBeUndefined();
      expect(steps.uploadTranscript.completedAt).toBeUndefined();
      expect(steps.uploadTracks.startedAt).toBeUndefined();
      expect(steps.uploadTracks.completedAt).toBeUndefined();
    });
  });

  describe('canProceedToUploads', () => {
    it('should return false when workflowSteps is null', () => {
      expect(canProceedToUploads(null)).toBe(false);
    });

    it('should return false when workflowSteps is undefined', () => {
      expect(canProceedToUploads(undefined)).toBe(false);
    });

    it('should return false when generatePlan is missing', () => {
      expect(canProceedToUploads({})).toBe(false);
    });

    it('should return false when plan status is Not Started', () => {
      const steps = {
        generatePlan: { status: WORKFLOW_STEP_STATUS.NOT_STARTED }
      };
      expect(canProceedToUploads(steps)).toBe(false);
    });

    it('should return false when plan status is In Progress', () => {
      const steps = {
        generatePlan: { status: WORKFLOW_STEP_STATUS.IN_PROGRESS }
      };
      expect(canProceedToUploads(steps)).toBe(false);
    });

    it('should return true when plan status is Completed', () => {
      const steps = {
        generatePlan: { status: WORKFLOW_STEP_STATUS.COMPLETED }
      };
      expect(canProceedToUploads(steps)).toBe(true);
    });

    it('should return true when plan status is Skipped', () => {
      const steps = {
        generatePlan: { status: WORKFLOW_STEP_STATUS.SKIPPED }
      };
      expect(canProceedToUploads(steps)).toBe(true);
    });

    it('should return true when plan status is Failed', () => {
      const steps = {
        generatePlan: { status: WORKFLOW_STEP_STATUS.FAILED }
      };
      expect(canProceedToUploads(steps)).toBe(true);
    });
  });

  describe('updateWorkflowStepStatus', () => {
    const tenantId = 'tenant123';
    const episodeId = 'episode-uuid';

    beforeEach(() => {
      ddbMock.on(UpdateCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});
    });

    it('should update status to In Progress with startedAt timestamp', async () => {
      await updateWorkflowStepStatus(
        tenantId,
        episodeId,
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const updateCall = updateCalls[0].args[0].input;
      expect(updateCall.Key).toEqual({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      });
      expect(updateCall.UpdateExpression).toBe(
        'SET #workflowSteps = if_not_exists(#workflowSteps, :emptyMap), #workflowSteps.#step = :stepData, updatedAt = :updatedAt'
      );
      expect(updateCall.ExpressionAttributeNames).toEqual({
        '#workflowSteps': 'workflowSteps',
        '#step': WORKFLOW_STEPS.GENERATE_PLAN
      });
      expect(updateCall.ExpressionAttributeValues[':stepData'].status).toBe(
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );
      expect(updateCall.ExpressionAttributeValues[':stepData'].startedAt).toBeDefined();
      expect(updateCall.ExpressionAttributeValues[':stepData'].completedAt).toBeUndefined();
      expect(updateCall.ExpressionAttributeValues[':emptyMap']).toEqual({});
    });

    it('should update status to Completed with completedAt timestamp', async () => {
      await updateWorkflowStepStatus(
        tenantId,
        episodeId,
        WORKFLOW_STEPS.UPLOAD_TRANSCRIPT,
        WORKFLOW_STEP_STATUS.COMPLETED
      );

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      const updateCall = updateCalls[0].args[0].input;

      expect(updateCall.ExpressionAttributeValues[':stepData'].status).toBe(
        WORKFLOW_STEP_STATUS.COMPLETED
      );
      expect(updateCall.ExpressionAttributeValues[':stepData'].completedAt).toBeDefined();
      expect(updateCall.ExpressionAttributeValues[':stepData'].startedAt).toBeUndefined();
    });

    it('should update status to Failed with completedAt and error message', async () => {
      const errorMessage = 'Processing failed due to invalid data';

      await updateWorkflowStepStatus(
        tenantId,
        episodeId,
        WORKFLOW_STEPS.UPLOAD_TRACKS,
        WORKFLOW_STEP_STATUS.FAILED,
        errorMessage
      );

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      const updateCall = updateCalls[0].args[0].input;

      expect(updateCall.ExpressionAttributeValues[':stepData'].status).toBe(
        WORKFLOW_STEP_STATUS.FAILED
      );
      expect(updateCall.ExpressionAttributeValues[':stepData'].completedAt).toBeDefined();
      expect(updateCall.ExpressionAttributeValues[':stepData'].error).toBe(errorMessage);
    });

    it('should update status to Skipped without timestamps', async () => {
      await updateWorkflowStepStatus(
        tenantId,
        episodeId,
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.SKIPPED
      );

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      const updateCall = updateCalls[0].args[0].input;

      expect(updateCall.ExpressionAttributeValues[':stepData'].status).toBe(
        WORKFLOW_STEP_STATUS.SKIPPED
      );
      expect(updateCall.ExpressionAttributeValues[':stepData'].startedAt).toBeUndefined();
      expect(updateCall.ExpressionAttributeValues[':stepData'].completedAt).toBeUndefined();
    });

    it('should publish notification event after updating status', async () => {
      await updateWorkflowStepStatus(
        tenantId,
        episodeId,
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.COMPLETED
      );

      const eventCalls = eventBridgeMock.commandCalls(PutEventsCommand);
      expect(eventCalls).toHaveLength(1);

      const eventCall = eventCalls[0].args[0].input;
      const detail = JSON.parse(eventCall.Entries[0].Detail);

      expect(detail.type).toBe('workflow_step_updated');
      expect(detail.tenantId).toBe(tenantId);
      expect(detail.title).toBe('Workflow Step Updated');
      expect(detail.message).toBe('Generate Plan is now Completed');
      expect(detail.url).toBe(`/episodes/${episodeId}`);
      expect(detail.persist).toBe(false);
      expect(detail.metadata).toEqual({
        episodeId,
        step: WORKFLOW_STEPS.GENERATE_PLAN,
        status: WORKFLOW_STEP_STATUS.COMPLETED
      });
    });

    it('should throw error when DynamoDB update fails', async () => {
      ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB error'));

      await expect(
        updateWorkflowStepStatus(
          tenantId,
          episodeId,
          WORKFLOW_STEPS.GENERATE_PLAN,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        )
      ).rejects.toThrow('Failed to update workflow step status');
    });

    it('should handle notification publishing failure gracefully', async () => {
      eventBridgeMock.on(PutEventsCommand).rejects(new Error('EventBridge error'));

      await expect(
        updateWorkflowStepStatus(
          tenantId,
          episodeId,
          WORKFLOW_STEPS.GENERATE_PLAN,
          WORKFLOW_STEP_STATUS.COMPLETED
        )
      ).rejects.toThrow('Failed to update workflow step status');
    });
  });
});
