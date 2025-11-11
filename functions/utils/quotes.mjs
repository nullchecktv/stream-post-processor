export const QUOTE_STATUS = {
  PROPOSED: 'proposed',
  CREATED: 'created',
  FAILED: 'failed',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const createQuoteKey = (tenantId, episodeId, quoteId) => ({
  pk: `${tenantId}#${episodeId}`,
  sk: `data#quote#${quoteId}`
});

export const createQuoteGSIKey = (tenantId, timestamp, episodeId, quoteId) => ({
  GSI1PK: `${tenantId}#quotes`,
  GSI1SK: `${timestamp}#${episodeId}#${quoteId}`
});

export const generateQuoteS3Key = (tenantId, episodeId, quoteId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for generating quote S3 keys');
  }
  if (!episodeId) {
    throw new Error('episodeId is required for generating quote S3 keys');
  }
  if (!quoteId) {
    throw new Error('quoteId is required for generating quote S3 keys');
  }
  return `${tenantId}/${episodeId}/quotes/${quoteId}.png`;
};

export const validateQuoteStatus = (status) => {
  if (!status || !Object.values(QUOTE_STATUS).includes(status)) {
    throw new Error(`Invalid quote status: ${status}`);
  }
  return true;
};

export const validateQuoteEntity = (quote) => {
  const required = ['pk', 'sk', 'quoteId', 'text', 'speaker', 'timestamp'];
  const missing = required.filter(field => !quote[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required quote fields: ${missing.join(', ')}`);
  }

  if (quote.text && quote.text.length > 280) {
    throw new Error('Quote text must not exceed 280 characters');
  }

  if (quote.timestamp && !/^\d{2}:\d{2}:\d{2}$/.test(quote.timestamp)) {
    throw new Error('Quote timestamp must be in format HH:MM:SS');
  }

  if (quote.relevanceScore !== undefined) {
    if (typeof quote.relevanceScore !== 'number' || quote.relevanceScore < 0 || quote.relevanceScore > 100) {
      throw new Error('Quote relevance score must be a number between 0 and 100');
    }
  }

  return true;
};
