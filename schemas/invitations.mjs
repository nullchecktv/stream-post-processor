import { z } from 'zod';

export const InvitationStatus = z.enum([
  'Pending',
  'Accepted',
  'Declined',
  'Cancelled',
  'Expired'
]);

export const INVITATION_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired'
};

export const INVITATION_STATUS_TRANSITIONS = {
  [INVITATION_STATUS.PENDING]: [
    INVITATION_STATUS.ACCEPTED,
    INVITATION_STATUS.DECLINED,
    INVITATION_STATUS.CANCELLED,
    INVITATION_STATUS.EXPIRED
  ],
  [INVITATION_STATUS.ACCEPTED]: [],
  [INVITATION_STATUS.DECLINED]: [],
  [INVITATION_STATUS.CANCELLED]: [],
  [INVITATION_STATUS.EXPIRED]: []
};

export const InvitationDecisionSchema = z.object({
  action: z.enum(['accept', 'reject'])
});

export const InvitationPathParamsSchema = z.object({
  invitationId: z.string().uuid()
});
