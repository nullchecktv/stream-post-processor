// JSON Schema definitions for AWS Powertools validation

// Episode Schemas
export const EpisodeSchemas = {
  create: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      episodeNumber: { type: 'integer', minimum: 1 },
      description: { type: 'string', maxLength: 1000 },
      airDate: { type: 'string' },
      platforms: {
        type: 'array',
        items: { type: 'string', enum: ['linkedin live', 'X', 'twitch', 'youtube'] }
      },
      themes: {
        type: 'array',
        items: { type: 'string' }
      },
      seriesName: { type: 'string', maxLength: 100 }
    },
    required: ['title', 'episodeNumber'],
    additionalProperties: false
  },
  pathParameters: {
    type: 'object',
    properties: {
      episodeId: { type: 'string' }
    },
    required: ['episodeId'],
    additionalProperties: false
  },
  statusUpdate: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['Ready for Clip Gen'] }
    },
    required: ['status'],
    additionalProperties: false
  }
};

// Track Schemas
export const TrackSchemas = {
  create: {
    type: 'object',
    properties: {
      filename: { type: 'string', minLength: 1, maxLength: 255 },
      trackName: {
        type: 'string',
        minLength: 1,
        maxLength: 150,
        pattern: '^[a-zA-Z0-9_-]+$'
      },
      speakers: {
        type: 'array',
        items: { type: 'string', minLength: 1 }
      }
    },
    required: ['filename', 'trackName'],
    additionalProperties: false
  },
  pathParameters: {
    type: 'object',
    properties: {
      episodeId: { type: 'string' },
      trackName: { type: 'string', minLength: 1, maxLength: 50 }
    },
    required: ['episodeId', 'trackName'],
    additionalProperties: false
  },
  update: {
    type: 'object',
    properties: {
      speakers: {
        type: 'array',
        items: { type: 'string', minLength: 1 }
      }
    },
    additionalProperties: false
  },
  signParts: {
    type: 'object',
    properties: {
      uploadId: { type: 'string', minLength: 1 },
      partNumbers: {
        type: 'array',
        items: { type: 'integer', minimum: 1 }
      }
    },
    required: ['uploadId', 'partNumbers'],
    additionalProperties: false
  },
  complete: {
    type: 'object',
    properties: {
      uploadId: { type: 'string', minLength: 1 },
      parts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ETag: { type: 'string', minLength: 1 },
            PartNumber: { type: 'integer', minimum: 1 }
          },
          required: ['ETag', 'PartNumber'],
          additionalProperties: false
        }
      }
    },
    required: ['uploadId', 'parts'],
    additionalProperties: false
  }
};

// Transcript Schemas
export const TranscriptSchemas = {
  upload: {
    type: 'object',
    properties: {
      filename: { type: 'string', minLength: 1, maxLength: 255 }
    },
    required: ['filename'],
    additionalProperties: false
  }
};

// Team Schemas
export const TeamSchemas = {
  create: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      settings: {
        type: 'object',
        properties: {
          defaultPlatforms: {
            type: 'array',
            items: { type: 'string', enum: ['linkedin live', 'X', 'twitch', 'youtube'] }
          },
          timezone: { type: 'string' }
        },
        additionalProperties: false
      },
      brandVoice: {
        type: 'object',
        properties: {
          tone: { type: 'string', minLength: 1, maxLength: 200 },
          writingStyle: { type: 'string', minLength: 1, maxLength: 200 }
        },
        additionalProperties: false
      }
    },
    required: ['name'],
    additionalProperties: false
  },
  update: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      settings: {
        type: 'object',
        properties: {
          defaultPlatforms: {
            type: 'array',
            items: { type: 'string', enum: ['linkedin live', 'X', 'twitch', 'youtube'] }
          },
          timezone: { type: 'string' }
        },
        additionalProperties: false
      },
      brandVoice: {
        type: 'object',
        properties: {
          tone: { type: 'string', minLength: 1, maxLength: 200 },
          writingStyle: { type: 'string', minLength: 1, maxLength: 200 }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  },
  pathParameters: {
    type: 'object',
    properties: {
      teamId: { type: 'string', minLength: 1 }
    },
    required: ['teamId'],
    additionalProperties: false
  },
  addMember: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['administrator', 'member'], default: 'member' }
    },
    required: ['email'],
    additionalProperties: false
  },
  updateMemberRole: {
    type: 'object',
    properties: {
      role: { type: 'string', enum: ['administrator', 'member'] }
    },
    required: ['role'],
    additionalProperties: false
  },
  pathParametersWithUser: {
    type: 'object',
    properties: {
      teamId: { type: 'string', minLength: 1 },
      userId: { type: 'string', minLength: 1 }
    },
    required: ['teamId', 'userId'],
    additionalProperties: false
  },
  removeMemberQuery: {
    type: 'object',
    properties: {
      confirmDelete: { type: 'string', enum: ['true', 'false'] }
    },
    additionalProperties: false
  }
};

// Clip Schemas
export const ClipSchemas = {
  pathParameters: {
    type: 'object',
    properties: {
      episodeId: { type: 'string'},
      clipId: { type: 'string', minLength: 1 }
    },
    required: ['episodeId', 'clipId'],
    additionalProperties: false
  },
  statusUpdate: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['detected', 'processing', 'created', 'failed', 'reviewed', 'approved', 'rejected', 'published']
      }
    },
    required: ['status'],
    additionalProperties: false
  },
  generate: {
    type: 'object',
    properties: {
      orientation: { type: 'string', enum: ['landscape', 'portrait'] }
    },
    required: ['orientation'],
    additionalProperties: false
  }
};

// User Schemas
export const UserSchemas = {
  updateProfile: {
    type: 'object',
    properties: {
      name: { type: 'string', maxLength: 100 },
      preferences: {
        type: 'object',
        properties: {
          timezone: { type: 'string' },
          notifications: { type: 'boolean' }
        },
        additionalProperties: false
      },
      brandVoice: {
        type: 'object',
        properties: {
          tone: { type: 'string', minLength: 1, maxLength: 200 },
          writingStyle: { type: 'string', minLength: 1, maxLength: 200 }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  },
  setActiveTeam: {
    type: 'object',
    properties: {
      teamId: { type: ['string', 'null'], minLength: 1 }
    },
    required: ['teamId'],
    additionalProperties: false
  }
};

// Notification Schemas
export const NotificationSchemas = {
  list: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      nextToken: { type: 'string' },
      isRead: { type: 'string', enum: ['true', 'false'] }
    },
    additionalProperties: false
  },
  pathParameters: {
    type: 'object',
    properties: {
      notificationId: { type: 'string', minLength: 1 }
    },
    required: ['notificationId'],
    additionalProperties: false
  },
  delete: {
    type: 'object',
    properties: {
      isRead: { type: 'string', enum: ['true'] }
    },
    additionalProperties: false
  }
};

// Invitation Schemas
export const InvitationSchemas = {
  pathParameters: {
    type: 'object',
    properties: {
      invitationId: { type: 'string', minLength: 1 }
    },
    required: ['invitationId'],
    additionalProperties: false
  },
  makeDecision: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['accept', 'reject'] }
    },
    required: ['action'],
    additionalProperties: false
  }
};

// Plan Schemas
export const PlanSchemas = {
  create: {
    type: 'object',
    properties: {
      objectives: { type: 'string', minLength: 1 },
      concepts: { type: 'string', minLength: 1 },
      notes: { type: 'string' }
    },
    required: ['objectives', 'concepts'],
    additionalProperties: false
  },
  update: {
    type: 'object',
    properties: {
      objectives: { type: 'string', minLength: 1 },
      concepts: { type: 'string', minLength: 1 },
      notes: { type: 'string' }
    },
    required: ['objectives', 'concepts'],
    additionalProperties: false
  },
  pathParameters: {
    type: 'object',
    properties: {
      episodeId: { type: 'string', minLength: 1 }
    },
    required: ['episodeId'],
    additionalProperties: false
  }
};

// Recommendations Schemas
export const RecommendationsSchemas = {
  setPlanRecommendations: {
    type: 'object',
    properties: {
      episodeId: { type: 'string', minLength: 1 },
      suggestedFlow: {
        type: 'string',
        minLength: 1,
        pattern: '^flowchart'
      },
      proposedTitle: { type: 'string', minLength: 10, maxLength: 200 },
      proposedDescription: { type: 'string', minLength: 50, maxLength: 1000 },
      keyLearningMoments: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        minItems: 1
      },
      detailedOutline: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            section: { type: 'string', minLength: 1 },
            duration: { type: 'string', minLength: 1 },
            talkingPoints: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              minItems: 1
            },
            demoArtifacts: {
              type: 'array',
              items: { type: 'string', minLength: 1 }
            }
          },
          required: ['section', 'duration', 'talkingPoints'],
          additionalProperties: false
        },
        minItems: 3
      }
    },
    required: ['episodeId', 'suggestedFlow', 'proposedTitle', 'proposedDescription', 'keyLearningMoments', 'detailedOutline'],
    additionalProperties: false
  }
};

// Blog Schemas
export const BlogSchemas = {
  update: {
    type: 'object',
    properties: {
      outline: { type: 'string', minLength: 1 },
      content: { type: 'string', minLength: 1 }
    },
    additionalProperties: false
  },
  regenerate: {
    type: 'object',
    properties: {
      outline: { type: 'string', minLength: 1 }
    },
    required: ['outline'],
    additionalProperties: false
  }
};
