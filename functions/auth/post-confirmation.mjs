import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'crypto';

const cognito = new CognitoIdentityProviderClient();

export const handler = async (event) => {
  try {
    const { userPoolId, userName } = event;
    const tenantId = randomUUID();

    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userName,
      UserAttributes: [
        {
          Name: 'custom:tenantId',
          Value: tenantId
        }
      ]
    });

    await cognito.send(updateCommand);

    return event;
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error);
    throw error;
  }
};
