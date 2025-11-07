// Logger mock helper for unit tests
// This helper provides consistent mocking of @aws-lambda-powertools/logger

const createLoggerMock = () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    addContext: jest.fn(),
    removeKeys: jest.fn(),
    appendKeys: jest.fn()
  };

  return mockLogger;
};

// Mock the Logger class constructor
const MockLogger = jest.fn().mockImplementation(() => createLoggerMock());

// Export both the constructor mock and helper
module.exports = {
  Logger: MockLogger,
  createLoggerMock
};
