import { describe, it, expect } from 'vitest';
import { isAuthenticationError } from './circuitBreaker';

describe('isAuthenticationError', () => {
  it('should return true for ApiError with status 401', () => {
    const error = { status: 401 };
    expect(isAuthenticationError(error)).toBe(true);
  });

  it('should return false for ApiError with status 400', () => {
    const error = { status: 400 };
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('should return false for ApiError with status 500', () => {
    const error = { status: 500 };
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('should return true for Momento PERMISSION_ERROR', () => {
    const error = {
      errorCode: () => 'PERMISSION_ERROR'
    };
    expect(isAuthenticationError(error)).toBe(true);
  });

  it('should return true for Momento AUTHENTICATION_ERROR', () => {
    const error = {
      errorCode: () => 'AUTHENTICATION_ERROR'
    };
    expect(isAuthenticationError(error)).toBe(true);
  });

  it('should return false for Momento other error codes', () => {
    const error = {
      errorCode: () => 'NETWORK_ERROR'
    };
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isAuthenticationError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isAuthenticationError(undefined)).toBe(false);
  });

  it('should return false for string error', () => {
    expect(isAuthenticationError('Error message')).toBe(false);
  });

  it('should return false for Error object without status', () => {
    const error = new Error('Something went wrong');
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('should return false for empty object', () => {
    expect(isAuthenticationError({})).toBe(false);
  });

  it('should return false for object with non-401 status', () => {
    const error = { status: 403, message: 'Forbidden' };
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('should handle errorCode that is not a function', () => {
    const error = {
      errorCode: 'PERMISSION_ERROR'
    };
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('should handle errorCode function returning null', () => {
    const error = {
      errorCode: () => null
    };
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('should handle errorCode function returning undefined', () => {
    const error = {
      errorCode: () => undefined
    };
    expect(isAuthenticationError(error)).toBe(false);
  });
});
