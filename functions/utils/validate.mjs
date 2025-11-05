import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from './api.mjs';

const ddb = new DynamoDBClient();

export const validateRequest = (event, schema) => {
  const userId = event?.requestContext?.authorizer?.userId;
  if (!userId) {
    return { error: formatResponse(401, { message: 'Unauthorized' }) };
  }

  let data = {};
  if (event.body) {
    try {
      data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      return { error: formatResponse(400, { message: 'Invalid JSON format' }) };
    }
  }

  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value !== undefined && value !== null) {
      if (rules.type === 'string') {
        const str = String(value).trim();
        if (rules.minLength && str.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && str.length > rules.maxLength) {
          errors.push(`${field} must be ${rules.maxLength} characters or less`);
        }
        if (rules.email && !isValidEmail(str)) {
          errors.push(`${field} must be a valid email address`);
        }
        if (rules.enum && !rules.enum.includes(str)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
        data[field] = str;
      }

      if (rules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${field} must be a number`);
        } else {
          if (rules.min !== undefined && num < rules.min) {
            errors.push(`${field} must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push(`${field} must be at most ${rules.max}`);
          }
          data[field] = num;
        }
      }

      if (rules.type === 'boolean') {
        data[field] = Boolean(value);
      }

      if (rules.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push(`${field} must be an array`);
        } else {
          data[field] = value;
        }
      }

      if (rules.type === 'object') {
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${field} must be an object`);
        } else {
          data[field] = value;
        }
      }
    }
  }

  if (errors.length > 0) {
    return { error: formatResponse(400, { message: errors.join(', ') }) };
  }

  return { userId, data };
};

export const checkExists = async (pk, sk) => {
  try {
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk, sk })
    }));
    return response.Item ? unmarshall(response.Item) : null;
  } catch (error) {
    console.error('Error checking existence:', error);
    return null;
  }
};

export const requireTeamMember = async (teamId, userId, requiredRole = null) => {
  const membership = await checkExists(`team#${teamId}`, `user#${userId}`);

  if (!membership) {
    return { error: formatResponse(403, { message: 'Not a team member' }) };
  }

  if (membership.status !== 'active') {
    return { error: formatResponse(403, { message: 'Membership not active' }) };
  }

  if (requiredRole) {
    const roleHierarchy = { member: 1, administrator: 2, owner: 3 };
    const userLevel = roleHierarchy[membership.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return { error: formatResponse(403, { message: `Requires ${requiredRole} role or higher` }) };
    }
  }

  return { membership };
};

export const requireTeamExists = async (teamId) => {
  const team = await checkExists(`team#${teamId}`, 'metadata');
  if (!team) {
    return { error: formatResponse(404, { message: 'Team not found' }) };
  }
  return { team };
};

export const requireUserExists = async (userId) => {
  const user = await checkExists(`user#${userId}`, 'profile');
  if (!user) {
    return { error: formatResponse(404, { message: 'User not found' }) };
  }
  return { user };
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};


