/**
 * Standardized LMS Error Handler Utility
 */

export const parseErrorMessage = (error, defaultMsg = 'An unexpected error occurred. Please try again.') => {
  if (!error) return defaultMsg;
  if (typeof error === 'string') return error;
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error;
  }
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  if (error.message) return error.message;
  return defaultMsg;
};
