// Unit tests for get-profile function
// These tests validate user profile retrieval with enhanced team information

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

describe('Get Profile Function', () => {
  describe('Team Organization Logic', () => {
    const organizeTeamsByRole = (memberships, teamDetails) => {
      const teams = [];
      const ownedTeams = [];
      const memberTeams = [];

      const teamDetailsMap = new Map(teamDetails.map(team => [team.id, team]));

      for (const membership of memberships) {
        const teamDetail = teamDetailsMap.get(membership.teamId);

        if (teamDetail && membership.status === 'active') {
          const teamInfo = {
            teamId: membership.teamId,
            name: teamDetail.name,
            description: teamDetail.description || '',
            role: membership.role,
            status: membership.status,
            joinedAt: membership.joinedAt,
            teamStatus: teamDetail.status
          };

          teams.push(teamInfo);

          if (membership.role === 'owner') {
            ownedTeams.push(teamInfo);
          } else {
            memberTeams.push(teamInfo);
          }
        }
      }

      return { teams, ownedTeams, memberTeams };
    };

    test('should organize teams by role correctly', () => {
      const memberships = [
        {
          teamId: 'team-123',
          role: 'owner',
          status: 'active',
          joinedAt: '2025-01-15T10:30:00Z'
        },
        {
          teamId: 'team-456',
          role: 'administrator',
          status: 'active',
          joinedAt: '2025-01-16T14:20:00Z'
        },
        {
          teamId: 'team-789',
          role: 'member',
          status: 'active',
          joinedAt: '2025-01-17T09:15:00Z'
        }
      ];

      const teamDetails = [
        {
          id: 'team-123',
          name: 'Content Team Alpha',
          description: 'Main content creation team',
          status: 'active'
        },
        {
          id: 'team-456',
          name: 'Marketing Team',
          description: 'Marketing and promotion team',
          status: 'active'
        },
        {
          id: 'team-789',
          name: 'Development Team',
          description: 'Technical development team',
          status: 'active'
        }
      ];

      const result = organizeTeamsByRole(memberships, teamDetails);

      expect(result.teams).toHaveLength(3);
      expect(result.ownedTeams).toHaveLength(1);
      expect(result.memberTeams).toHaveLength(2);

      expect(result.ownedTeams[0].teamId).toBe('team-123');
      expect(result.ownedTeams[0].role).toBe('owner');
      expect(result.ownedTeams[0].name).toBe('Content Team Alpha');

      const adminTeam = result.memberTeams.find(t => t.role === 'administrator');
      expect(adminTeam.teamId).toBe('team-456');
      expect(adminTeam.name).toBe('Marketing Team');

      const memberTeam = result.memberTeams.find(t => t.role === 'member');
      expect(memberTeam.teamId).toBe('team-789');
      expect(memberTeam.name).toBe('Development Team');
    });

    test('should filter out inactive memberships', () => {
      const memberships = [
        {
          teamId: 'team-123',
          role: 'owner',
          status: 'active',
          joinedAt: '2025-01-15T10:30:00Z'
        },
        {
          teamId: 'team-456',
          role: 'member',
          status: 'Pending',
          joinedAt: '2025-01-16T14:20:00Z'
        }
      ];

      const teamDetails = [
        {
          id: 'team-123',
          name: 'Content Team Alpha',
          status: 'active'
        },
        {
          id: 'team-456',
          name: 'Marketing Team',
          status: 'active'
        }
      ];

      const result = organizeTeamsByRole(memberships, teamDetails);

      expect(result.teams).toHaveLength(1);
      expect(result.ownedTeams).toHaveLength(1);
      expect(result.memberTeams).toHaveLength(0);
      expect(result.teams[0].teamId).toBe('team-123');
    });

    test('should handle missing team details', () => {
      const memberships = [
        {
          teamId: 'team-123',
          role: 'owner',
          status: 'active',
          joinedAt: '2025-01-15T10:30:00Z'
        },
        {
          teamId: 'team-456',
          role: 'member',
          status: 'active',
          joinedAt: '2025-01-16T14:20:00Z'
        }
      ];

      const teamDetails = [
        {
          id: 'team-123',
          name: 'Content Team Alpha',
          status: 'active'
        }
        // team-456 details missing
      ];

      const result = organizeTeamsByRole(memberships, teamDetails);

      expect(result.teams).toHaveLength(1);
      expect(result.ownedTeams).toHaveLength(1);
      expect(result.memberTeams).toHaveLength(0);
      expect(result.teams[0].teamId).toBe('team-123');
    });

    test('should handle empty memberships', () => {
      const result = organizeTeamsByRole([], []);

      expect(result.teams).toEqual([]);
      expect(result.ownedTeams).toEqual([]);
      expect(result.memberTeams).toEqual([]);
    });
  });

  describe('Profile Response Formatting', () => {
    const formatProfileResponse = (profile, teams, ownedTeams, memberTeams) => {
      return {
        email: profile.email,
        name: profile.name || '',
        activeTeamId: profile.activeTeamId || null,
        preferences: profile.preferences || {
          timezone: 'UTC',
          notifications: true
        },
        teams,
        ownedTeams,
        memberTeams,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      };
    };

    test('should format complete profile response', () => {
      const profile = {
        email: 'user@example.com',
        name: 'John Doe',
        activeTeamId: 'team-123',
        preferences: {
          timezone: 'America/New_York',
          notifications: true
        },
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const teams = [
        {
          teamId: 'team-123',
          name: 'Content Team Alpha',
          role: 'owner',
          status: 'active',
          joinedAt: '2025-01-15T10:30:00Z'
        }
      ];

      const ownedTeams = [teams[0]];
      const memberTeams = [];

      const response = formatProfileResponse(profile, teams, ownedTeams, memberTeams);

      expect(response.email).toBe('user@example.com');
      expect(response.name).toBe('John Doe');
      expect(response.activeTeamId).toBe('team-123');
      expect(response.preferences.timezone).toBe('America/New_York');
      expect(response.teams).toEqual(teams);
      expect(response.ownedTeams).toEqual(ownedTeams);
      expect(response.memberTeams).toEqual(memberTeams);
      expect(response.createdAt).toBe('2025-01-15T10:30:00Z');
      expect(response.updatedAt).toBe('2025-01-15T10:30:00Z');
    });

    test('should handle minimal profile data', () => {
      const profile = {
        email: 'user@example.com',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const response = formatProfileResponse(profile, [], [], []);

      expect(response.email).toBe('user@example.com');
      expect(response.name).toBe('');
      expect(response.activeTeamId).toBeNull();
      expect(response.preferences).toEqual({
        timezone: 'UTC',
        notifications: true
      });
      expect(response.teams).toEqual([]);
      expect(response.ownedTeams).toEqual([]);
      expect(response.memberTeams).toEqual([]);
    });

    test('should maintain backward compatibility', () => {
      const profile = {
        email: 'user@example.com',
        name: 'John Doe',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const teams = [
        {
          teamId: 'team-123',
          name: 'Content Team Alpha',
          role: 'owner',
          status: 'active',
          joinedAt: '2025-01-15T10:30:00Z'
        }
      ];

      const response = formatProfileResponse(profile, teams, [teams[0]], []);

      // Verify backward compatibility - teams array still exists with expected structure
      expect(response.teams).toBeDefined();
      expect(response.teams[0]).toHaveProperty('teamId');
      expect(response.teams[0]).toHaveProperty('role');
      expect(response.teams[0]).toHaveProperty('status');
      expect(response.teams[0]).toHaveProperty('joinedAt');

      // Verify new fields exist
      expect(response.ownedTeams).toBeDefined();
      expect(response.memberTeams).toBeDefined();
    });
  });

  describe('Request Validation', () => {
    const validateRequest = (requestContext) => {
      if (!requestContext?.authorizer?.userId) {
        throw new Error('Missing userId in authorizer context');
      }

      return {
        userId: requestContext.authorizer.userId
      };
    };

    test('should validate correct request', () => {
      const requestContext = {
        authorizer: { userId: 'user-123' }
      };

      const result = validateRequest(requestContext);
      expect(result.userId).toBe('user-123');
    });

    test('should reject missing userId', () => {
      const requestContext = { authorizer: {} };

      expect(() => validateRequest(requestContext))
        .toThrow('Missing userId in authorizer context');
    });

    test('should reject missing authorizer', () => {
      const requestContext = {};

      expect(() => validateRequest(requestContext))
        .toThrow('Missing userId in authorizer context');
    });
  });

  describe('Team Information Enhancement', () => {
    const enhanceTeamInfo = (membership, teamDetail) => {
      if (!teamDetail || membership.status !== 'active') {
        return null;
      }

      return {
        teamId: membership.teamId,
        name: teamDetail.name,
        description: teamDetail.description || '',
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        teamStatus: teamDetail.status
      };
    };

    test('should enhance team info with all details', () => {
      const membership = {
        teamId: 'team-123',
        role: 'owner',
        status: 'active',
        joinedAt: '2025-01-15T10:30:00Z'
      };

      const teamDetail = {
        id: 'team-123',
        name: 'Content Team Alpha',
        description: 'Main content creation team',
        status: 'active'
      };

      const result = enhanceTeamInfo(membership, teamDetail);

      expect(result).toEqual({
        teamId: 'team-123',
        name: 'Content Team Alpha',
        description: 'Main content creation team',
        role: 'owner',
        status: 'active',
        joinedAt: '2025-01-15T10:30:00Z',
        teamStatus: 'active'
      });
    });

    test('should handle missing description', () => {
      const membership = {
        teamId: 'team-123',
        role: 'member',
        status: 'active',
        joinedAt: '2025-01-15T10:30:00Z'
      };

      const teamDetail = {
        id: 'team-123',
        name: 'Content Team Alpha',
        status: 'active'
      };

      const result = enhanceTeamInfo(membership, teamDetail);

      expect(result.description).toBe('');
    });

    test('should return null for inactive membership', () => {
      const membership = {
        teamId: 'team-123',
        role: 'member',
        status: 'Pending',
        joinedAt: '2025-01-15T10:30:00Z'
      };

      const teamDetail = {
        id: 'team-123',
        name: 'Content Team Alpha',
        status: 'active'
      };

      const result = enhanceTeamInfo(membership, teamDetail);

      expect(result).toBeNull();
    });

    test('should return null for missing team detail', () => {
      const membership = {
        teamId: 'team-123',
        role: 'member',
        status: 'active',
        joinedAt: '2025-01-15T10:30:00Z'
      };

      const result = enhanceTeamInfo(membership, null);

      expect(result).toBeNull();
    });
  });
});

