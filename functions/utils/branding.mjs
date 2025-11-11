import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

const DEFAULT_BRANDING = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    background: '#1F2937',
    text: '#F9FAFB'
  },
  fontFamily: 'Inter'
};

export const resolveBranding = async (tenantId) => {
  if (!tenantId) {
    return DEFAULT_BRANDING;
  }

  try {
    let tenantKey;

    if (tenantId.startsWith('team#')) {
      tenantKey = {
        pk: tenantId,
        sk: 'metadata'
      };
    } else if (tenantId.startsWith('user#')) {
      tenantKey = {
        pk: tenantId,
        sk: 'profile'
      };
    } else if (tenantId.includes('#')) {
      return DEFAULT_BRANDING;
    } else {
      tenantKey = {
        pk: `team#${tenantId}`,
        sk: 'metadata'
      };
    }

    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall(tenantKey),
      ProjectionExpression: 'branding'
    }));

    if (!response.Item) {
      return DEFAULT_BRANDING;
    }

    const tenant = unmarshall(response.Item);

    if (!tenant.branding) {
      return DEFAULT_BRANDING;
    }

    return {
      colors: {
        primary: tenant.branding.colors?.primary || DEFAULT_BRANDING.colors.primary,
        secondary: tenant.branding.colors?.secondary || DEFAULT_BRANDING.colors.secondary,
        background: tenant.branding.colors?.background || DEFAULT_BRANDING.colors.background,
        text: tenant.branding.colors?.text || DEFAULT_BRANDING.colors.text
      },
      fontFamily: tenant.branding.fontFamily || DEFAULT_BRANDING.fontFamily
    };
  } catch (err) {
    console.error('Error resolving branding', {
      error: err.message,
      tenantId
    });
    return DEFAULT_BRANDING;
  }
};

export { DEFAULT_BRANDING };
