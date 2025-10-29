export const handler = async (event) => {
  try {
    const { request } = event;
    const userAttributes = request.userAttributes;

    let tenantId = userAttributes['tenantId'];
    if (!tenantId) {
      tenantId = userAttributes.sub;
      console.log(`No tenantId found for user ${userAttributes.sub}, using sub as tenantId`);
    }

    if (!event.response.claimsOverrideDetails) {
      event.response.claimsOverrideDetails = {};
    }

    if (!event.response.claimsOverrideDetails.claimsToAddOrOverride) {
      event.response.claimsOverrideDetails.claimsToAddOrOverride = {};
    }

    event.response.claimsOverrideDetails.claimsToAddOrOverride.tenantId = tenantId;
    return event;
  } catch (error) {
    console.error('Error in pre-token generation trigger:', error);
    throw error;
  }
};
