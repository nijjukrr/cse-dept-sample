/**
 * Common LMS Validation Utilities
 */

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateRollNumber = (rollNo) => {
  if (!rollNo || typeof rollNo !== 'string') return false;
  // SSIET CSE Roll number pattern check (non-empty alphanumeric string)
  return /^[A-Za-z0-9\-\/]{3,20}$/.test(rollNo.trim());
};

export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
};

export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim();
};
