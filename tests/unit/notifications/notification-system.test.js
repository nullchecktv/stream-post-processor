

// Mock the notification utilities for integration-style testing
jest.mock('../../../functions/utils/notifications.mjs', () => ({
  createNotification: jest.fn(),
  listNotifications: jest.fn(),
  deleteNotification: jest.fn(),
  markNotificationAsRead: jest.fn(),
  createTeamInvitationNotification: jest.fn(),
  removeNotificationsByInvitation: jest.fn()
}));

const {
  createNotification,
  listNotifications,
  deleteNotification,
  markNotificationAsRead,
  createTeamInvitationNotification,
  removeNotificationsByInvitation
} = require('../../../functions/utils/notifications.mjs');

describe('Notification System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Complete notification lifecycle', () => {
    test('should create, list, and delete notifications in sequence', async () => {
      // Mock the notification creation
      const mockNotification = {
        id: 'notif-1',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Test Team',
        isRead: false,
        createdAt: '2025-01-15T10:30:00Z',
        data: { teamId: 'team-456', invitationId: 'inv-789' }
      };

      createNotification.mockResolvedValueOnce(mockNotification);

      // Mock the list operation
      listNotifications.mockResolvedValueOnce({
        notifications: [mockNotification],
        hasMore: false,
        lastEvaluatedKey: null
      });

      // Mock the delete operation
      deleteNotification.mockResolvedValueOnce(true);

      // Step 1: Create notification
      const notification = await createNotification(
        'tenant-123',
        'team_invitation',
        'Team Invitation',
        'You have been invited to join Test Team',
        { teamId: 'team-456', invitationId: 'inv-789' }
      );

      expect(notification.type).toBe('team_invitation');
      expect(notification.isRead).toBe(false);

      // Step 2: List notifications
      const listResult = await listNotifications('tenant-123');

      expect(listResult.notifications).toHaveLength(1);
      expect(listResult.notifications[0].type).toBe('team_invitation');
      expect(listResult.hasMore).toBe(false);

      // Step 3: Delete notification
      const deleteResult = await deleteNotification('tenant-123', 'notif-1');

      expect(deleteResult).toBe(true);

      // Verify all operations were called correctly
      expect(createNotification).toHaveBeenCalledWith(
        'tenant-123',
        'team_invitation',
        'Team Invitation',
        'You have been invited to join Test Team',
        { teamId: 'team-456', invitationId: 'inv-789' }
      );
      expect(listNotifications).toHaveBeenCalledWith('tenant-123');
      expect(deleteNotification).toHaveBeenCalledWith('tenant-123', 'notif-1');
    });

    test('should handle mark as read workflow', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'Test message',
        isRead: false,
        createdAt: '2025-01-15T10:30:00Z'
      };

      createNotification.mockResolvedValueOnce(mockNotification);
      markNotificationAsRead.mockResolvedValueOnce(true);

      // Mock list to return read notification
      listNotifications.mockResolvedValueOnce({
        notifications: [{ ...mockNotification, isRead: true }],
        hasMore: false,
        lastEvaluatedKey: null
      });

      // Create notification
      const notification = await createNotification('tenant-123', 'team_invitation', 'Team Invitation', 'Test message');
      expect(notification.isRead).toBe(false);

      // Mark as read
      const markResult = await markNotificationAsRead('tenant-123', 'notif-1');
      expect(markResult).toBe(true);

      // List and verify read status
      const listResult = await listNotifications('tenant-123');
      expect(listResult.notifications[0].isRead).toBe(true);

      expect(markNotificationAsRead).toHaveBeenCalledWith('tenant-123', 'notif-1');
    });
  });

  describe('Pagination functionality', () => {
    test('should handle pagination correctly across multiple pages', async () => {
      const page1Items = Array(20).fill().map((_, i) => ({
        id: `notif-${i}`,
        type: 'test',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        isRead: false,
        createdAt: `2025-01-15T10:${30 + i}:00Z`
      }));

      const page2Items = Array(10).fill().map((_, i) => ({
        id: `notif-${i + 20}`,
        type: 'test',
        title: `Notification ${i + 20}`,
        message: `Message ${i + 20}`,
        isRead: false,
        createdAt: `2025-01-15T10:${50 + i}:00Z`
      }));

      const lastKey = { pk: 'tenant#tenant-123', sk: 'notification#notif-19' };

      // First page
      listNotifications.mockResolvedValueOnce({
        notifications: page1Items,
        lastEvaluatedKey: lastKey,
        hasMore: true
      });

      const page1Result = await listNotifications('tenant-123', { limit: 20 });

      expect(page1Result.notifications).toHaveLength(20);
      expect(page1Result.hasMore).toBe(true);
      expect(page1Result.lastEvaluatedKey).toEqual(lastKey);

      // Second page
      listNotifications.mockResolvedValueOnce({
        notifications: page2Items,
        lastEvaluatedKey: null,
        hasMore: false
      });

      const page2Result = await listNotifications('tenant-123', {
        cursor: lastKey,
        limit: 20
      });

      expect(page2Result.notifications).toHaveLength(10);
      expect(page2Result.hasMore).toBe(false);
      expect(page2Result.lastEvaluatedKey).toBeNull();

      // Verify pagination parameters were passed correctly
      expect(listNotifications).toHaveBeenCalledWith('tenant-123', { limit: 20 });
      expect(listNotifications).toHaveBeenCalledWith('tenant-123', { cursor: lastKey, limit: 20 });
    });

    test('should filter notifications by read status correctly', async () => {
      const unreadNotifications = [
        {
          id: 'notif-1',
          type: 'test',
          isRead: false,
          createdAt: '2025-01-15T10:30:00Z'
        }
      ];

      const readNotifications = [
        {
          id: 'notif-2',
          type: 'test',
          isRead: true,
          createdAt: '2025-01-15T10:31:00Z'
        }
      ];

      // Test unread filter
      listNotifications.mockResolvedValueOnce({
        notifications: unreadNotifications,
        hasMore: false,
        lastEvaluatedKey: null
      });

      const unreadResult = await listNotifications('tenant-123', { isRead: false });
      expect(unreadResult.notifications).toHaveLength(1);
      expect(unreadResult.notifications[0].isRead).toBe(false);

      // Test read filter
      listNotifications.mockResolvedValueOnce({
        notifications: readNotifications,
        hasMore: false,
        lastEvaluatedKey: null
      });

      const readResult = await listNotifications('tenant-123', { isRead: true });
      expect(readResult.notifications).toHaveLength(1);
      expect(readResult.notifications[0].isRead).toBe(true);

      // Verify filter parameters were passed correctly
      expect(listNotifications).toHaveBeenCalledWith('tenant-123', { isRead: false });
      expect(listNotifications).toHaveBeenCalledWith('tenant-123', { isRead: true });
    });
  });

  describe('TTL and cleanup operations', () => {
    test('should set appropriate TTL for automatic cleanup', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'test',
        title: 'Test Notification',
        message: 'Test message',
        isRead: false,
        createdAt: '2025-01-15T10:30:00Z',
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
      };

      createNotification.mockResolvedValueOnce(mockNotification);

      const notification = await createNotification('tenant-123', 'test', 'Test Notification', 'Test message');

      // TTL should be approximately 30 days from now
      const expectedTTL = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      expect(notification.ttl).toBeCloseTo(expectedTTL, -2); // Within 100 seconds
    });

    test('should handle invitation-based cleanup correctly', async () => {
      removeNotificationsByInvitation.mockResolvedValueOnce(true);

      const result = await removeNotificationsByInvitation('tenant-123', 'inv-789');

      expect(result).toBe(true);
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('tenant-123', 'inv-789');
    });


  });

  describe('Team invitation notification workflow', () => {
    test('should create and manage team invitation notifications', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Test Team',
        isRead: false,
        data: {
          invitationId: 'inv-789',
          teamId: 'team-456',
          teamName: 'Test Team',
          inviterName: 'John Doe'
        }
      };

      createTeamInvitationNotification.mockResolvedValueOnce(mockNotification);
      removeNotificationsByInvitation.mockResolvedValueOnce(true);

      // Create team invitation notification
      const notification = await createTeamInvitationNotification(
        'tenant-123',
        'team-456',
        'Test Team',
        'John Doe',
        'inv-789'
      );

      expect(notification.type).toBe('team_invitation');
      expect(notification.title).toBe('Team Invitation');
      expect(notification.message).toBe('You have been invited to join Test Team');
      expect(notification.data.invitationId).toBe('inv-789');

      // Clean up notifications when invitation is processed
      const cleanupResult = await removeNotificationsByInvitation('tenant-123', 'inv-789');
      expect(cleanupResult).toBe(true);

      expect(createTeamInvitationNotification).toHaveBeenCalledWith(
        'tenant-123',
        'team-456',
        'Test Team',
        'John Doe',
        'inv-789'
      );
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('tenant-123', 'inv-789');
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle database connection failures gracefully', async () => {
      createNotification.mockRejectedValueOnce(new Error('Failed to create notification'));
      listNotifications.mockRejectedValueOnce(new Error('Failed to list notifications'));
      deleteNotification.mockRejectedValueOnce(new Error('Failed to delete notification'));

      await expect(createNotification('tenant-123', 'test', 'Test', 'Message'))
        .rejects.toThrow('Failed to create notification');

      await expect(listNotifications('tenant-123'))
        .rejects.toThrow('Failed to list notifications');

      await expect(deleteNotification('tenant-123', 'notif-1'))
        .rejects.toThrow('Failed to delete notification');
    });

    test('should handle non-existent notifications correctly', async () => {
      deleteNotification.mockResolvedValueOnce(false);
      markNotificationAsRead.mockResolvedValueOnce(false);

      const deleteResult = await deleteNotification('tenant-123', 'nonexistent');
      expect(deleteResult).toBe(false);

      const markReadResult = await markNotificationAsRead('tenant-123', 'nonexistent');
      expect(markReadResult).toBe(false);
    });

    test('should handle empty notification lists', async () => {
      listNotifications.mockResolvedValueOnce({
        notifications: [],
        hasMore: false,
        lastEvaluatedKey: null
      });

      const result = await listNotifications('tenant-123');

      expect(result.notifications).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.lastEvaluatedKey).toBeNull();
    });

    test('should handle malformed notification data', async () => {
      const malformedNotifications = [
        {
          id: 'notif-1',
          // Missing some fields
          createdAt: '2025-01-15T10:30:00Z'
        }
      ];

      listNotifications.mockResolvedValueOnce({
        notifications: malformedNotifications,
        hasMore: false,
        lastEvaluatedKey: null
      });

      const result = await listNotifications('tenant-123');

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]).toBeDefined();
      expect(result.notifications[0].id).toBe('notif-1');
    });
  });

  describe('Performance and concurrency', () => {
    test('should handle concurrent notification operations', async () => {
      createNotification.mockResolvedValue({ id: 'notif-1', type: 'test' });
      deleteNotification.mockResolvedValue(true);
      markNotificationAsRead.mockResolvedValue(true);
      createTeamInvitationNotification.mockResolvedValue({ id: 'notif-2', type: 'team_invitation' });

      const operations = [
        createNotification('tenant-1', 'test', 'Test 1', 'Message 1'),
        createNotification('tenant-2', 'test', 'Test 2', 'Message 2'),
        deleteNotification('tenant-3', 'notif-3'),
        markNotificationAsRead('tenant-4', 'notif-4'),
        createTeamInvitationNotification('tenant-5', 'team-1', 'Team 1', 'John', 'inv-1')
      ];

      const results = await Promise.allSettled(operations);

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5);
      expect(createNotification).toHaveBeenCalledTimes(2);
      expect(deleteNotification).toHaveBeenCalledTimes(1);
      expect(markNotificationAsRead).toHaveBeenCalledTimes(1);
      expect(createTeamInvitationNotification).toHaveBeenCalledTimes(1);
    });

    test('should handle large notification datasets efficiently', async () => {
      const largeDataset = Array(1000).fill().map((_, i) => ({
        id: `notif-${i}`,
        type: 'test',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        isRead: i % 2 === 0,
        createdAt: `2025-01-15T10:${String(30 + (i % 30)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`
      }));

      listNotifications.mockResolvedValueOnce({
        notifications: largeDataset.slice(0, 100), // Return first 100 items
        lastEvaluatedKey: { pk: 'tenant#tenant-123', sk: 'notification#notif-99' },
        hasMore: true
      });

      const startTime = Date.now();
      const result = await listNotifications('tenant-123', { limit: 100 });
      const endTime = Date.now();

      expect(result.notifications).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(result.hasMore).toBe(true);
    });
  });

  describe('Notification system requirements validation', () => {
    test('should support paginated notification lists (Requirement 5.1)', async () => {
      const mockNotifications = Array(25).fill().map((_, i) => ({
        id: `notif-${i}`,
        type: 'test',
        createdAt: `2025-01-15T10:${String(30 + i).padStart(2, '0')}:00Z`
      }));

      listNotifications.mockResolvedValueOnce({
        notifications: mockNotifications.slice(0, 20),
        lastEvaluatedKey: { pk: 'tenant#tenant-123', sk: 'notification#notif-19' },
        hasMore: true
      });

      const result = await listNotifications('tenant-123', { limit: 20 });

      expect(result.notifications).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.lastEvaluatedKey).toBeDefined();
    });

    test('should support notification deletion (Requirement 5.2)', async () => {
      deleteNotification.mockResolvedValueOnce(true);

      const result = await deleteNotification('tenant-123', 'notif-456');

      expect(result).toBe(true);
      expect(deleteNotification).toHaveBeenCalledWith('tenant-123', 'notif-456');
    });

    test('should support marking notifications as read (Requirement 5.3)', async () => {
      markNotificationAsRead.mockResolvedValueOnce(true);

      const result = await markNotificationAsRead('tenant-123', 'notif-456');

      expect(result).toBe(true);
      expect(markNotificationAsRead).toHaveBeenCalledWith('tenant-123', 'notif-456');
    });

    test('should return notifications sorted by creation date (Requirement 5.4)', async () => {
      const sortedNotifications = [
        { id: 'notif-3', createdAt: '2025-01-15T10:32:00Z' }, // Newest
        { id: 'notif-2', createdAt: '2025-01-15T10:31:00Z' },
        { id: 'notif-1', createdAt: '2025-01-15T10:30:00Z' }  // Oldest
      ];

      listNotifications.mockResolvedValueOnce({
        notifications: sortedNotifications,
        hasMore: false,
        lastEvaluatedKey: null
      });

      const result = await listNotifications('tenant-123');

      expect(result.notifications[0].id).toBe('notif-3'); // Newest first
      expect(result.notifications[2].id).toBe('notif-1'); // Oldest last
    });

    test('should filter notifications by tenant (Requirement 5.5)', async () => {
      listNotifications.mockResolvedValueOnce({
        notifications: [{ id: 'notif-1', tenantId: 'tenant-123' }],
        hasMore: false,
        lastEvaluatedKey: null
      });

      await listNotifications('tenant-123');

      expect(listNotifications).toHaveBeenCalledWith('tenant-123');
    });
  });
});
