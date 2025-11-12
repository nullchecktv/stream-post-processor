jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Blog Status Transitions', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'blog' });
  });

  describe('Status Validation', () => {
    const validStatuses = [
      'outline_created',
      'content_generating',
      'content_generated',
      'outline_edited',
      'content_edited',
      'regenerating',
      'failed'
    ];

    const isValidStatus = (status) => {
      return validStatuses.includes(status);
    };

    test('should validate all valid statuses', () => {
      validStatuses.forEach(status => {
        expect(isValidStatus(status)).toBe(true);
      });
    });

    test('should reject invalid statuses', () => {
      const invalidStatuses = [
        'invalid',
        'pending',
        'completed',
        'processing',
        ''
      ];

      invalidStatuses.forEach(status => {
        expect(isValidStatus(status)).toBe(false);
      });
    });
  });

  describe('Status Transition Rules', () => {
    const canTransition = (fromStatus, toStatus) => {
      const transitions = {
        'outline_created': ['content_generating', 'outline_edited', 'regenerating'],
        'content_generating': ['content_generated', 'failed'],
        'content_generated': ['outline_edited', 'content_edited', 'regenerating'],
        'outline_edited': ['content_generating', 'regenerating', 'content_edited'],
        'content_edited': ['outline_edited', 'regenerating'],
        'regenerating': ['content_generated', 'failed'],
        'failed': ['content_generating', 'regenerating']
      };

      return transitions[fromStatus]?.includes(toStatus) || false;
    };

    test('should allow outline_created to content_generating', () => {
      expect(canTransition('outline_created', 'content_generating')).toBe(true);
    });

    test('should allow content_generating to content_generated', () => {
      expect(canTransition('content_generating', 'content_generated')).toBe(true);
    });

    test('should allow content_generating to failed', () => {
      expect(canTransition('content_generating', 'failed')).toBe(true);
    });

    test('should allow content_generated to outline_edited', () => {
      expect(canTransition('content_generated', 'outline_edited')).toBe(true);
    });

    test('should allow content_generated to content_edited', () => {
      expect(canTransition('content_generated', 'content_edited')).toBe(true);
    });

    test('should allow outline_edited to regenerating', () => {
      expect(canTransition('outline_edited', 'regenerating')).toBe(true);
    });

    test('should allow regenerating to content_generated', () => {
      expect(canTransition('regenerating', 'content_generated')).toBe(true);
    });

    test('should allow regenerating to failed', () => {
      expect(canTransition('regenerating', 'failed')).toBe(true);
    });

    test('should allow failed to content_generating', () => {
      expect(canTransition('failed', 'content_generating')).toBe(true);
    });

    test('should allow failed to regenerating', () => {
      expect(canTransition('failed', 'regenerating')).toBe(true);
    });

    test('should reject invalid transitions', () => {
      expect(canTransition('content_generated', 'content_generating')).toBe(false);
      expect(canTransition('outline_created', 'content_generated')).toBe(false);
      expect(canTransition('content_generating', 'outline_edited')).toBe(false);
      expect(canTransition('failed', 'content_generated')).toBe(false);
    });
  });

  describe('Status Display Names', () => {
    const getStatusDisplayName = (status) => {
      const displayNames = {
        'outline_created': 'Outline Created',
        'content_generating': 'Generating Content',
        'content_generated': 'Content Generated',
        'outline_edited': 'Outline Edited',
        'content_edited': 'Content Edited',
        'regenerating': 'Regenerating',
        'failed': 'Failed'
      };

      return displayNames[status] || 'Unknown';
    };

    test('should return correct display names', () => {
      expect(getStatusDisplayName('outline_created')).toBe('Outline Created');
      expect(getStatusDisplayName('content_generating')).toBe('Generating Content');
      expect(getStatusDisplayName('content_generated')).toBe('Content Generated');
      expect(getStatusDisplayName('outline_edited')).toBe('Outline Edited');
      expect(getStatusDisplayName('content_edited')).toBe('Content Edited');
      expect(getStatusDisplayName('regenerating')).toBe('Regenerating');
      expect(getStatusDisplayName('failed')).toBe('Failed');
    });

    test('should return Unknown for invalid status', () => {
      expect(getStatusDisplayName('invalid')).toBe('Unknown');
      expect(getStatusDisplayName('')).toBe('Unknown');
      expect(getStatusDisplayName(null)).toBe('Unknown');
    });
  });

  describe('Status Categories', () => {
    const getStatusCategory = (status) => {
      if (['content_generating', 'regenerating'].includes(status)) {
        return 'processing';
      }
      if (['content_generated', 'outline_created'].includes(status)) {
        return 'success';
      }
      if (['outline_edited', 'content_edited'].includes(status)) {
        return 'edited';
      }
      if (status === 'failed') {
        return 'error';
      }
      return 'unknown';
    };

    test('should categorize processing statuses', () => {
      expect(getStatusCategory('content_generating')).toBe('processing');
      expect(getStatusCategory('regenerating')).toBe('processing');
    });

    test('should categorize success statuses', () => {
      expect(getStatusCategory('content_generated')).toBe('success');
      expect(getStatusCategory('outline_created')).toBe('success');
    });

    test('should categorize edited statuses', () => {
      expect(getStatusCategory('outline_edited')).toBe('edited');
      expect(getStatusCategory('content_edited')).toBe('edited');
    });

    test('should categorize error statuses', () => {
      expect(getStatusCategory('failed')).toBe('error');
    });

    test('should return unknown for invalid statuses', () => {
      expect(getStatusCategory('invalid')).toBe('unknown');
      expect(getStatusCategory('')).toBe('unknown');
    });
  });

  describe('Status Icons', () => {
    const getStatusIcon = (status) => {
      const icons = {
        'outline_created': 'check',
        'content_generating': 'spinner',
        'content_generated': 'check-circle',
        'outline_edited': 'edit',
        'content_edited': 'edit',
        'regenerating': 'spinner',
        'failed': 'x-circle'
      };

      return icons[status] || 'question';
    };

    test('should return correct icons for each status', () => {
      expect(getStatusIcon('outline_created')).toBe('check');
      expect(getStatusIcon('content_generating')).toBe('spinner');
      expect(getStatusIcon('content_generated')).toBe('check-circle');
      expect(getStatusIcon('outline_edited')).toBe('edit');
      expect(getStatusIcon('content_edited')).toBe('edit');
      expect(getStatusIcon('regenerating')).toBe('spinner');
      expect(getStatusIcon('failed')).toBe('x-circle');
    });

    test('should return question icon for unknown status', () => {
      expect(getStatusIcon('invalid')).toBe('question');
      expect(getStatusIcon('')).toBe('question');
    });
  });

  describe('Status Colors', () => {
    const getStatusColor = (status) => {
      const colors = {
        'outline_created': 'blue',
        'content_generating': 'yellow',
        'content_generated': 'green',
        'outline_edited': 'purple',
        'content_edited': 'purple',
        'regenerating': 'yellow',
        'failed': 'red'
      };

      return colors[status] || 'gray';
    };

    test('should return correct colors for each status', () => {
      expect(getStatusColor('outline_created')).toBe('blue');
      expect(getStatusColor('content_generating')).toBe('yellow');
      expect(getStatusColor('content_generated')).toBe('green');
      expect(getStatusColor('outline_edited')).toBe('purple');
      expect(getStatusColor('content_edited')).toBe('purple');
      expect(getStatusColor('regenerating')).toBe('yellow');
      expect(getStatusColor('failed')).toBe('red');
    });

    test('should return gray for unknown status', () => {
      expect(getStatusColor('invalid')).toBe('gray');
      expect(getStatusColor('')).toBe('gray');
    });
  });

  describe('Status Workflow', () => {
    test('should follow complete workflow from outline to content', () => {
      const workflow = [
        'outline_created',
        'content_generating',
        'content_generated'
      ];

      for (let i = 0; i < workflow.length - 1; i++) {
        const canTransition = (fromStatus, toStatus) => {
          const transitions = {
            'outline_created': ['content_generating', 'outline_edited', 'regenerating'],
            'content_generating': ['content_generated', 'failed'],
            'content_generated': ['outline_edited', 'content_edited', 'regenerating']
          };
          return transitions[fromStatus]?.includes(toStatus) || false;
        };

        expect(canTransition(workflow[i], workflow[i + 1])).toBe(true);
      }
    });

    test('should follow regeneration workflow', () => {
      const workflow = [
        'content_generated',
        'outline_edited',
        'regenerating',
        'content_generated'
      ];

      for (let i = 0; i < workflow.length - 1; i++) {
        const canTransition = (fromStatus, toStatus) => {
          const transitions = {
            'content_generated': ['outline_edited', 'content_edited', 'regenerating'],
            'outline_edited': ['content_generating', 'regenerating', 'content_edited'],
            'regenerating': ['content_generated', 'failed']
          };
          return transitions[fromStatus]?.includes(toStatus) || false;
        };

        expect(canTransition(workflow[i], workflow[i + 1])).toBe(true);
      }
    });

    test('should follow error recovery workflow', () => {
      const workflow = [
        'content_generating',
        'failed',
        'regenerating',
        'content_generated'
      ];

      for (let i = 0; i < workflow.length - 1; i++) {
        const canTransition = (fromStatus, toStatus) => {
          const transitions = {
            'content_generating': ['content_generated', 'failed'],
            'failed': ['content_generating', 'regenerating'],
            'regenerating': ['content_generated', 'failed']
          };
          return transitions[fromStatus]?.includes(toStatus) || false;
        };

        expect(canTransition(workflow[i], workflow[i + 1])).toBe(true);
      }
    });
  });

  describe('Status Timestamps', () => {
    test('should track status change timestamps', () => {
      const createStatusHistory = (status, timestamp) => {
        return {
          status,
          timestamp,
          changedAt: new Date(timestamp).toISOString()
        };
      };

      const history = createStatusHistory('content_generated', '2025-01-15T10:00:00Z');

      expect(history.status).toBe('content_generated');
      expect(history.timestamp).toBe('2025-01-15T10:00:00Z');
      expect(history.changedAt).toBe('2025-01-15T10:00:00.000Z');
    });

    test('should maintain status history order', () => {
      const history = [
        { status: 'outline_created', timestamp: '2025-01-15T10:00:00Z' },
        { status: 'content_generating', timestamp: '2025-01-15T10:01:00Z' },
        { status: 'content_generated', timestamp: '2025-01-15T10:05:00Z' }
      ];

      for (let i = 0; i < history.length - 1; i++) {
        const current = new Date(history[i].timestamp);
        const next = new Date(history[i + 1].timestamp);
        expect(current.getTime()).toBeLessThan(next.getTime());
      }
    });
  });
});
