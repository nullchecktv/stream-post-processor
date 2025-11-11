// JSON Schema definitions for AWS Powertools validation

// Branding Schema (shared between Team and User)
const BrandingSchema = {
  type: 'object',
  properties: {
    colors: {
      type: 'object',
      properties: {
        primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        secondary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        background: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        text: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
      },
      required: ['primary', 'secondary', 'background', 'text'],
      additionalProperties: false
    },
    fontFamily: { type: 'string', minLength: 1, maxLength: 100 }
  },
  required: ['colors', 'fontFamily'],
  additionalProperties: false
};

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
        maxLength: 50,
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
      branding: BrandingSchema
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
      branding: BrandingSchema
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
      branding: BrandingSchema
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

// Quote Schemas
export const QuoteSchemas = {
  create: {
    type: 'object',
    properties: {
      text: { type: 'string', minLength: 5, maxLength: 280 },
      speaker: { type: 'string', minLength: 1, maxLength: 100 },
      timestamp: { type: 'string', pattern: '^\\d{2}:\\d{2}:\\d{2}$' },
      relevanceScore: { type: 'number', minimum: 0, maximum: 100 },
      context: { type: 'string', maxLength: 500 },
      showSpeaker: { type: 'boolean' },
      showEpisodeTitle: { type: 'boolean' }
    },
    required: ['text', 'speaker', 'timestamp'],
    additionalProperties: false
  },
  update: {
    type: 'object',
    properties: {
      text: { type: 'string', minLength: 5, maxLength: 280 },
      speaker: { type: 'string', minLength: 1, maxLength: 100 },
      showSpeaker: { type: 'boolean' },
      showEpisodeTitle: { type: 'boolean' },
      status: { type: 'string', enum: ['detected', 'generated', 'failed', 'approved', 'rejected'] }
    },
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
  pathParametersWithQuote: {
    type: 'object',
    properties: {
      episodeId: { type: 'string' },
      quoteId: { type: 'string', minLength: 1 }
    },
    required: ['episodeId', 'quoteId'],
    additionalProperties: false
  }
};
