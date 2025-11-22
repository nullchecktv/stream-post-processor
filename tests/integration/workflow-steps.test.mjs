import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';
import {
  validateWorkflowStepTransition,
  initializeWorkflowSteps,
  canProceedToUploads,
  WORKFLOW_STEPS
} from '../../functions/utils/workflow-steps.mjs';

describe('Workflow Step Integration Tests', () => {
  describe('Complete Workflow: Create → Plan → Upload → Tracks', () => {
    const simulateCompleteWorkflow = () => {
      const workflow = {
        steps: [],
        episode: null,
        workflowSteps: null,
        errors: []
      };

      try {
        workflow.steps.push('create_episode');
        workflow.workflowSteps = initializeWorkflowSteps();
        workflow.episode = {
          id: 'episode-123',
          title: 'Test Episode',
          workflowSteps: workflow.workflowSteps
        };

        workflow.steps.push('initialize_workflow_steps');
        expect(workflow.workflowSteps.generatePlan.status).toBe(WORKFLOW_STEP_STATUS.NOT_STARTED);
        expect(workflow.workflowSteps.uploadTranscript.status).toBe(WORKFLOW_STEP_STATUS.NOT_STARTED);
        expect(workflow.workflowSteps.uploadTracks.status).toBe(WORKFLOW_STEP_STATUS.NOT_STARTED);

        workflow.steps.push('start_plan_generation');
        validateWorkflowStepTransition(
          workflow.workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
        workflow.workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;
        workflow.workflowSteps.generatePlan.startedAt = new Date().toISOString();

        workflow.steps.push('complete_plan_generation');
        validateWorkflowStepTransition(
          workflow.workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.COMPLETED
        );
        workflow.workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;
        workflow.workflowSteps.generatePlan.completedAt = new Date().toISOString();

        workflow.steps.push('check_upload_availability');
        const canUpload = canProceedToUploads(workflow.workflowSteps);
        expect(canUpload).toBe(true);

        workflow.steps.push('start_transcript_upload');
        validateWorkflowStepTransition(
          workflow.workflowSteps.uploadTranscript.status,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
        workflow.workflowSteps.uploadTranscript.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;
        workflow.workflowSteps.uploadTranscript.startedAt = new Date().toISOString();

        workflow.steps.push('complete_transcript_upload');
        validateWorkflowStepTransition(
          workflow.workflowSteps.uploadTranscript.status,
          WORKFLOW_STEP_STATUS.COMPLETED
        );
        workflow.workflowSteps.uploadTranscript.status = WORKFLOW_STEP_STATUS.COMPLETED;
        workflow.workflowSteps.uploadTranscript.completedAt = new Date().toISOString();

        workflow.steps.push('start_tracks_upload');
        validateWorkflowStepTransition(
          workflow.workflowSteps.uploadTracks.status,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
        workflow.workflowSteps.uploadTracks.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;
        workflow.workflowSteps.uploadTracks.startedAt = new Date().toISOString();

        workflow.steps.push('complete_tracks_upload');
        validateWorkflowStepTransition(
          workflow.workflowSteps.uploadTracks.status,
          WORKFLOW_STEP_STATUS.COMPLETED
        );
        workflow.workflowSteps.uploadTracks.status = WORKFLOW_STEP_STATUS.COMPLETED;
        workflow.workflowSteps.uploadTracks.completedAt = new Date().toISOString();

        workflow.steps.push('workflow_complete');

        return workflow;
      } catch (error) {
        workflow.errors.push({
          type: 'WorkflowError',
          message: error.message,
          step: workflow.steps[workflow.steps.length - 1]
        });
        return workflow;
      }
    };

    test('should complete full workflow successfully', () => {
      const workflow = simulateCompleteWorkflow();

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.steps).toContain('create_episode');
      expect(workflow.steps).toContain('initialize_workflow_steps');
      expect(workflow.steps).toContain('start_plan_generation');
      expect(workflow.steps).toContain('complete_plan_generation');
      expect(workflow.steps).toContain('check_upload_availability');
      expect(workflow.steps).toContain('start_transcript_upload');
      expect(workflow.steps).toContain('complete_transcript_upload');
      expect(workflow.steps).toContain('start_tracks_upload');
      expect(workflow.steps).toContain('complete_tracks_upload');
      expect(workflow.steps).toContain('workflow_complete');

      expect(workflow.workflowSteps.generatePlan.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
      expect(workflow.workflowSteps.uploadTranscript.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
      expect(workflow.workflowSteps.uploadTracks.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
    });

    test('should have timestamps for all completed steps', () => {
      const workflow = simulateCompleteWorkflow();

      expect(workflow.workflowSteps.generatePlan.startedAt).toBeDefined();
      expect(workflow.workflowSteps.generatePlan.completedAt).toBeDefined();
      expect(workflow.workflowSteps.uploadTranscript.startedAt).toBeDefined();
      expect(workflow.workflowSteps.uploadTranscript.completedAt).toBeDefined();
      expect(workflow.workflowSteps.uploadTracks.startedAt).toBeDefined();
      expect(workflow.workflowSteps.uploadTracks.completedAt).toBeDefined();
    });
  });

  describe('Skip Plan Workflow', () => {
    const simulateSkipPlanWorkflow = () => {
      const workflow = {
        steps: [],
        workflowSteps: null,
        errors: []
      };

      try {
        workflow.steps.push('create_episode');
        workflow.workflowSteps = initializeWorkflowSteps();

workflow.steps.push('skip_plan_generation');
        validateWorkflowStepTransition(
          workflow.workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.SKIPPED
        );
        workflow.workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.SKIPPED;

        workflow.steps.push('check_upload_availability');
        const canUpload = canProceedToUploads(workflow.workflowSteps);
        expect(canUpload).toBe(true);

        workflow.steps.push('start_transcript_upload');
        validateWorkflowStepTransition(
          workflow.workflowSteps.uploadTranscript.status,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
        workflow.workflowSteps.uploadTranscript.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;

        workflow.steps.push('complete_transcript_upload');
        validateWorkflowStepTransition(
          workflow.workflowSteps.uploadTranscript.status,
          WORKFLOW_STEP_STATUS.COMPLETED
        );
        workflow.workflowSteps.uploadTranscript.status = WORKFLOW_STEP_STATUS.COMPLETED;

        workflow.steps.push('workflow_complete');

        return workflow;
      } catch (error) {
        workflow.errors.push({
          type: 'WorkflowError',
          message: error.message
        });
        return workflow;
      }
    };

    test('should allow uploads after skipping plan', () => {
      const workflow = simulateSkipPlanWorkflow();

      expect(workflow.errors).toHaveLength(0);
      expect(workflow.workflowSteps.generatePlan.status).toBe(WORKFLOW_STEP_STATUS.SKIPPED);
      expect(workflow.workflowSteps.uploadTranscript.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
      expect(workflow.steps).toContain('check_upload_availability');
    });

    test('should allow generating plan after skipping', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.SKIPPED;

      expect(() => {
        validateWorkflowStepTransition(
          workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
      }).not.toThrow();
    });
  });

  describe('Status Transitions During Processing', () => {
    test('should handle plan generation failure and retry', () => {
      const workflowSteps = initializeWorkflowSteps();

      validateWorkflowStepTransition(
        workflowSteps.generatePlan.status,
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;

      validateWorkflowStepTransition(
        workflowSteps.generatePlan.status,
        WORKFLOW_STEP_STATUS.FAILED
      );
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.FAILED;
      workflowSteps.generatePlan.error = 'AI service timeout';

      validateWorkflowStepTransition(
        workflowSteps.generatePlan.status,
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;

      validateWorkflowStepTransition(
        workflowSteps.generatePlan.status,
        WORKFLOW_STEP_STATUS.COMPLETED
      );
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      expect(workflowSteps.generatePlan.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
    });

    test('should handle transcript upload failure', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      validateWorkflowStepTransition(
        workflowSteps.uploadTranscript.status,
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );
      workflowSteps.uploadTranscript.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;

      validateWorkflowStepTransition(
        workflowSteps.uploadTranscript.status,
        WORKFLOW_STEP_STATUS.FAILED
      );
      workflowSteps.uploadTranscript.status = WORKFLOW_STEP_STATUS.FAILED;
      workflowSteps.uploadTranscript.error = 'Invalid transcript format';

      expect(workflowSteps.uploadTranscript.status).toBe(WORKFLOW_STEP_STATUS.FAILED);
      expect(workflowSteps.uploadTranscript.error).toBe('Invalid transcript format');
    });

    test('should handle tracks upload failure', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      validateWorkflowStepTransition(
        workflowSteps.uploadTracks.status,
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );
      workflowSteps.uploadTracks.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;

      validateWorkflowStepTransition(
        workflowSteps.uploadTracks.status,
        WORKFLOW_STEP_STATUS.FAILED
      );
      workflowSteps.uploadTracks.status = WORKFLOW_STEP_STATUS.FAILED;
      workflowSteps.uploadTracks.error = 'MediaConvert job failed';

      expect(workflowSteps.uploadTracks.status).toBe(WORKFLOW_STEP_STATUS.FAILED);
      expect(workflowSteps.uploadTracks.error).toBe('MediaConvert job failed');
    });
  });

  describe('Notification Publishing', () => {
    const simulateNotificationPublishing = (step, status, episodeId) => {
      const notifications = [];

      const stepLabels = {
        [WORKFLOW_STEPS.GENERATE_PLAN]: 'Generate Plan',
        [WORKFLOW_STEPS.UPLOAD_TRANSCRIPT]: 'Upload Transcript',
        [WORKFLOW_STEPS.UPLOAD_TRACKS]: 'Upload Tracks'
      };

      const notification = {
        type: 'workflow_step_updated',
        tenantId: 'tenant123',
        title: 'Workflow Step Updated',
        message: `${stepLabels[step]} is now ${status}`,
        url: `/episodes/${episodeId}`,
        persist: false,
        metadata: {
          episodeId,
          step,
          status
        }
      };

      notifications.push(notification);

      return { notifications, published: true };
    };

    test('should publish notification for plan generation start', () => {
      const result = simulateNotificationPublishing(
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.IN_PROGRESS,
        'episode-123'
      );

      expect(result.published).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe('workflow_step_updated');
      expect(result.notifications[0].metadata.step).toBe(WORKFLOW_STEPS.GENERATE_PLAN);
      expect(result.notifications[0].metadata.status).toBe(WORKFLOW_STEP_STATUS.IN_PROGRESS);
      expect(result.notifications[0].message).toContain('Generate Plan');
      expect(result.notifications[0].message).toContain('In Progress');
    });

    test('should publish notification for plan generation completion', () => {
      const result = simulateNotificationPublishing(
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.COMPLETED,
        'episode-123'
      );

      expect(result.published).toBe(true);
      expect(result.notifications[0].metadata.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
      expect(result.notifications[0].message).toContain('Completed');
    });

    test('should publish notification for plan skip', () => {
      const result = simulateNotificationPublishing(
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.SKIPPED,
        'episode-123'
      );

      expect(result.published).toBe(true);
      expect(result.notifications[0].metadata.status).toBe(WORKFLOW_STEP_STATUS.SKIPPED);
      expect(result.notifications[0].message).toContain('Skipped');
    });

    test('should publish notification for transcript upload', () => {
      const result = simulateNotificationPublishing(
        WORKFLOW_STEPS.UPLOAD_TRANSCRIPT,
        WORKFLOW_STEP_STATUS.COMPLETED,
        'episode-123'
      );

      expect(result.published).toBe(true);
      expect(result.notifications[0].metadata.step).toBe(WORKFLOW_STEPS.UPLOAD_TRANSCRIPT);
      expect(result.notifications[0].message).toContain('Upload Transcript');
    });

    test('should publish notification for tracks upload', () => {
      const result = simulateNotificationPublishing(
        WORKFLOW_STEPS.UPLOAD_TRACKS,
        WORKFLOW_STEP_STATUS.COMPLETED,
        'episode-123'
      );

      expect(result.published).toBe(true);
      expect(result.notifications[0].metadata.step).toBe(WORKFLOW_STEPS.UPLOAD_TRACKS);
      expect(result.notifications[0].message).toContain('Upload Tracks');
    });

    test('should include episode URL in notification', () => {
      const result = simulateNotificationPublishing(
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.COMPLETED,
        'episode-456'
      );

      expect(result.notifications[0].url).toBe('/episodes/episode-456');
    });

    test('should mark notifications as non-persistent', () => {
      const result = simulateNotificationPublishing(
        WORKFLOW_STEPS.GENERATE_PLAN,
        WORKFLOW_STEP_STATUS.IN_PROGRESS,
        'episode-123'
      );

      expect(result.notifications[0].persist).toBe(false);
    });
  });

  describe('Dependency Enforcement', () => {
    test('should block uploads when plan is not started', () => {
      const workflowSteps = initializeWorkflowSteps();

      const canUpload = canProceedToUploads(workflowSteps);

      expect(canUpload).toBe(false);
    });

    test('should block uploads when plan is in progress', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;

      const canUpload = canProceedToUploads(workflowSteps);

      expect(canUpload).toBe(false);
    });

    test('should allow uploads when plan is completed', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      const canUpload = canProceedToUploads(workflowSteps);

      expect(canUpload).toBe(true);
    });

    test('should allow uploads when plan is skipped', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.SKIPPED;

      const canUpload = canProceedToUploads(workflowSteps);

      expect(canUpload).toBe(true);
    });

    test('should allow uploads when plan failed', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.FAILED;

      const canUpload = canProceedToUploads(workflowSteps);

      expect(canUpload).toBe(true);
    });

    test('should handle missing workflow steps', () => {
      const canUpload = canProceedToUploads(null);

      expect(canUpload).toBe(false);
    });

    test('should handle missing generate plan step', () => {
      const workflowSteps = {
        uploadTranscript: { status: WORKFLOW_STEP_STATUS.NOT_STARTED },
        uploadTracks: { status: WORKFLOW_STEP_STATUS.NOT_STARTED }
      };

      const canUpload = canProceedToUploads(workflowSteps);

      expect(canUpload).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    test('should reject invalid status transition', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      expect(() => {
        validateWorkflowStepTransition(
          workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.IN_PROGRESS
        );
      }).toThrow('Invalid workflow step transition');
    });

    test('should reject transition from completed to failed', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      expect(() => {
        validateWorkflowStepTransition(
          workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.FAILED
        );
      }).toThrow('Invalid workflow step transition');
    });

    test('should reject transition from not started to completed', () => {
      const workflowSteps = initializeWorkflowSteps();

      expect(() => {
        validateWorkflowStepTransition(
          workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.COMPLETED
        );
      }).toThrow('Invalid workflow step transition');
    });

    test('should reject transition from not started to failed', () => {
      const workflowSteps = initializeWorkflowSteps();

      expect(() => {
        validateWorkflowStepTransition(
          workflowSteps.generatePlan.status,
          WORKFLOW_STEP_STATUS.FAILED
        );
      }).toThrow('Invalid workflow step transition');
    });
  });

  describe('Concurrent Updates', () => {
    test('should handle multiple steps updating simultaneously', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      const updates = [];

      validateWorkflowStepTransition(
        workflowSteps.uploadTranscript.status,
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );
      updates.push({
        step: WORKFLOW_STEPS.UPLOAD_TRANSCRIPT,
        status: WORKFLOW_STEP_STATUS.IN_PROGRESS
      });

      validateWorkflowStepTransition(
        workflowSteps.uploadTracks.status,
        WORKFLOW_STEP_STATUS.IN_PROGRESS
      );
      updates.push({
        step: WORKFLOW_STEPS.UPLOAD_TRACKS,
        status: WORKFLOW_STEP_STATUS.IN_PROGRESS
      });

      expect(updates).toHaveLength(2);
      expect(updates[0].step).toBe(WORKFLOW_STEPS.UPLOAD_TRANSCRIPT);
      expect(updates[1].step).toBe(WORKFLOW_STEPS.UPLOAD_TRACKS);
    });

    test('should maintain independent step states', () => {
      const workflowSteps = initializeWorkflowSteps();
      workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      workflowSteps.uploadTranscript.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;
      workflowSteps.uploadTracks.status = WORKFLOW_STEP_STATUS.COMPLETED;

      expect(workflowSteps.generatePlan.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
      expect(workflowSteps.uploadTranscript.status).toBe(WORKFLOW_STEP_STATUS.IN_PROGRESS);
      expect(workflowSteps.uploadTracks.status).toBe(WORKFLOW_STEP_STATUS.COMPLETED);
    });
  });

  describe('Skip Plan API Endpoint Simulation', () => {
    const simulateSkipPlanEndpoint = (episode) => {
      const response = {
        statusCode: null,
        body: null
      };

      try {
        if (!episode) {
          response.statusCode = 404;
          response.body = {
            error: 'NotFound',
            message: 'Episode was not found'
          };
          return response;
        }

        const currentStatus = episode.workflowSteps?.generatePlan?.status;

        if (currentStatus === WORKFLOW_STEP_STATUS.COMPLETED) {
          response.statusCode = 409;
          response.body = {
            error: 'Conflict',
            message: 'Plan has already been generated for this episode'
          };
          return response;
        }

        if (currentStatus === WORKFLOW_STEP_STATUS.IN_PROGRESS) {
          response.statusCode = 409;
          response.body = {
            error: 'Conflict',
            message: 'Plan generation is currently in progress'
          };
          return response;
        }

        validateWorkflowStepTransition(
          currentStatus,
          WORKFLOW_STEP_STATUS.SKIPPED
        );

        episode.workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.SKIPPED;

        response.statusCode = 200;
        response.body = {
          message: 'Plan generation skipped'
        };

        return response;
      } catch (error) {
        response.statusCode = 500;
        response.body = {
          message: 'Something went wrong'
        };
        return response;
      }
    };

    test('should skip plan successfully', () => {
      const episode = {
        id: 'episode-123',
        workflowSteps: initializeWorkflowSteps()
      };

      const response = simulateSkipPlanEndpoint(episode);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Plan generation skipped');
      expect(episode.workflowSteps.generatePlan.status).toBe(WORKFLOW_STEP_STATUS.SKIPPED);
    });

    test('should reject skip when plan already generated', () => {
      const episode = {
        id: 'episode-123',
        workflowSteps: initializeWorkflowSteps()
      };
      episode.workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.COMPLETED;

      const response = simulateSkipPlanEndpoint(episode);

      expect(response.statusCode).toBe(409);
      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toContain('already been generated');
    });

    test('should reject skip when plan in progress', () => {
      const episode = {
        id: 'episode-123',
        workflowSteps: initializeWorkflowSteps()
      };
      episode.workflowSteps.generatePlan.status = WORKFLOW_STEP_STATUS.IN_PROGRESS;

      const response = simulateSkipPlanEndpoint(episode);

      expect(response.statusCode).toBe(409);
      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toContain('currently in progress');
    });

    test('should return 404 for missing episode', () => {
      const response = simulateSkipPlanEndpoint(null);

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('NotFound');
    });
  });
});
