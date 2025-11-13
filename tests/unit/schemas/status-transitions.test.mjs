import { describe, it, expect } from '@jest/globals';
import {
  EPISODE_STATUS,
  EPISODE_STATUS_TRANSITIONS
} from '../../../schemas/episodes.mjs';
import {
  CLIP_STATUS,
  CLIP_STATUS_TRANSITIONS
} from '../../../schemas/clips.mjs';
import {
  QUOTE_STATUS,
  QUOTE_STATUS_TRANSITIONS
} from '../../../schemas/quotes.mjs';

const validateStatusTransition = (currentStatus, newStatus, transitionMap) => {
  if (!currentStatus) {
    return true;
  }

  const allowedTransitions = transitionMap[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

describe('Status Transition Validation', () => {
  describe('Episode Status Transitions', () => {
    it('should allow transition from Draft to Planning', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.DRAFT,
        EPISODE_STATUS.PLANNING,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow transition from Draft to Archived', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.DRAFT,
        EPISODE_STATUS.ARCHIVED,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject transition from Draft to Processing', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.DRAFT,
        EPISODE_STATUS.PROCESSING,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow transition from Planning to Ready', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.PLANNING,
        EPISODE_STATUS.READY,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow transition from Planning back to Draft', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.PLANNING,
        EPISODE_STATUS.DRAFT,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject transition from Planning to Published', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.PLANNING,
        EPISODE_STATUS.PUBLISHED,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow transition from Ready to Processing', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.READY,
        EPISODE_STATUS.PROCESSING,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow transition from Processing to Published', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.PROCESSING,
        EPISODE_STATUS.PUBLISHED,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow transition from Published to Archived', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.PUBLISHED,
        EPISODE_STATUS.ARCHIVED,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject any transition from Archived', () => {
      const isValid = validateStatusTransition(
        EPISODE_STATUS.ARCHIVED,
        EPISODE_STATUS.DRAFT,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow initial status assignment when currentStatus is null', () => {
      const isValid = validateStatusTransition(
        null,
        EPISODE_STATUS.DRAFT,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow initial status assignment when currentStatus is undefined', () => {
      const isValid = validateStatusTransition(
        undefined,
        EPISODE_STATUS.PLANNING,
        EPISODE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });
  });

  describe('Clip Status Transitions', () => {
    it('should allow transition from Proposed to Processing', () => {
      const isValid = validateStatusTransition(
        CLIP_STATUS.PROPOSED,
        CLIP_STATUS.PROCESSING,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject transition from Proposed to Created', () => {
      const isValid = validateStatusTransition(
        CLIP_STATUS.PROPOSED,
        CLIP_STATUS.CREATED,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow transition from Processing to Created', () => {
      const isValid = validateStatusTransition(
        CLIP_STATUS.PROCESSING,
        CLIP_STATUS.CREATED,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow transition from Processing to Failed', () => {
      const isValid = validateStatusTransition(
        CLIP_STATUS.PROCESSING,
        CLIP_STATUS.FAILED,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject any transition from Created', () => {
      const isValid = validateStatusTransition(
        CLIP_STATUS.CREATED,
        CLIP_STATUS.PROCESSING,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow transition from Failed back to Processing', () => {
      const isValid = validateStatusTransition(
        CLIP_STATUS.FAILED,
        CLIP_STATUS.PROCESSING,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject transition from Failed to Created', () => {
      const isValid = validateStatusTransition(
        CLIP_STATUS.FAILED,
        CLIP_STATUS.CREATED,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow initial status assignment', () => {
      const isValid = validateStatusTransition(
        null,
        CLIP_STATUS.PROPOSED,
        CLIP_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });
  });

  describe('Quote Status Transitions', () => {
    it('should allow transition from Proposed to Processing', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.PROPOSED,
        QUOTE_STATUS.PROCESSING,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject transition from Proposed to Created', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.PROPOSED,
        QUOTE_STATUS.CREATED,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow transition from Processing to Created', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.PROCESSING,
        QUOTE_STATUS.CREATED,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow transition from Processing to Failed', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.PROCESSING,
        QUOTE_STATUS.FAILED,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should allow transition from Created to Edited', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.CREATED,
        QUOTE_STATUS.EDITED,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject transition from Created to Processing', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.CREATED,
        QUOTE_STATUS.PROCESSING,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow transition from Failed back to Processing', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.FAILED,
        QUOTE_STATUS.PROCESSING,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });

    it('should reject transition from Failed to Created', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.FAILED,
        QUOTE_STATUS.CREATED,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should reject any transition from Edited', () => {
      const isValid = validateStatusTransition(
        QUOTE_STATUS.EDITED,
        QUOTE_STATUS.PROCESSING,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(false);
    });

    it('should allow initial status assignment', () => {
      const isValid = validateStatusTransition(
        null,
        QUOTE_STATUS.PROPOSED,
        QUOTE_STATUS_TRANSITIONS
      );
      expect(isValid).toBe(true);
    });
  });

  describe('Cross-entity Status Validation', () => {
    it('should have consistent transition map structure across all entities', () => {
      expect(typeof EPISODE_STATUS_TRANSITIONS).toBe('object');
      expect(typeof CLIP_STATUS_TRANSITIONS).toBe('object');
      expect(typeof QUOTE_STATUS_TRANSITIONS).toBe('object');
    });

    it('should have all episode statuses defined in transition map', () => {
      const allStatuses = Object.values(EPISODE_STATUS);
      allStatuses.forEach(status => {
        expect(EPISODE_STATUS_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(EPISODE_STATUS_TRANSITIONS[status])).toBe(true);
      });
    });

    it('should have all clip statuses defined in transition map', () => {
      const allStatuses = Object.values(CLIP_STATUS);
      allStatuses.forEach(status => {
        expect(CLIP_STATUS_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(CLIP_STATUS_TRANSITIONS[status])).toBe(true);
      });
    });

    it('should have all quote statuses defined in transition map', () => {
      const allStatuses = Object.values(QUOTE_STATUS);
      allStatuses.forEach(status => {
        expect(QUOTE_STATUS_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(QUOTE_STATUS_TRANSITIONS[status])).toBe(true);
      });
    });

    it('should only reference valid statuses in episode transitions', () => {
      const validStatuses = Object.values(EPISODE_STATUS);
      Object.values(EPISODE_STATUS_TRANSITIONS).forEach(transitions => {
        transitions.forEach(status => {
          expect(validStatuses).toContain(status);
        });
      });
    });

    it('should only reference valid statuses in clip transitions', () => {
      const validStatuses = Object.values(CLIP_STATUS);
      Object.values(CLIP_STATUS_TRANSITIONS).forEach(transitions => {
        transitions.forEach(status => {
          expect(validStatuses).toContain(status);
        });
      });
    });

    it('should only reference valid statuses in quote transitions', () => {
      const validStatuses = Object.values(QUOTE_STATUS);
      Object.values(QUOTE_STATUS_TRANSITIONS).forEach(transitions => {
        transitions.forEach(status => {
          expect(validStatuses).toContain(status);
        });
      });
    });
  });

  describe('Terminal Status Validation', () => {
    it('should identify Archived as terminal status for episodes', () => {
      expect(EPISODE_STATUS_TRANSITIONS[EPISODE_STATUS.ARCHIVED]).toEqual([]);
    });

    it('should identify Created as terminal status for clips', () => {
      expect(CLIP_STATUS_TRANSITIONS[CLIP_STATUS.CREATED]).toEqual([]);
    });

    it('should identify Edited as terminal status for quotes', () => {
      expect(QUOTE_STATUS_TRANSITIONS[QUOTE_STATUS.EDITED]).toEqual([]);
    });
  });
});
