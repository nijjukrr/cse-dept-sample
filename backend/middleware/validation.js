/**
 * Backend Request Validation Helper
 */

const validateRegistrationBody = (body) => {
  const { name, roll_no, year, class: cls, email, password } = body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) errors.push('Name is required.');
  if (!roll_no || typeof roll_no !== 'string' || !roll_no.trim()) errors.push('Roll number is required.');
  if (!year || isNaN(parseInt(year, 10))) errors.push('Valid year is required.');
  if (!cls || typeof cls !== 'string' || !cls.trim()) errors.push('Class is required.');
  if (!email || typeof email !== 'string' || !email.includes('@')) errors.push('Valid email is required.');
  if (!password || typeof password !== 'string' || password.length < 6) errors.push('Password must be at least 6 characters.');

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const isValidHttpUrl = (string) => {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const validateCourseBody = (body) => {
  const { code, title, semester, credits, instructor_id, description } = body || {};
  const errors = [];

  if (!code || typeof code !== 'string' || code.trim().length < 2 || code.trim().length > 20) {
    errors.push('Course code is required (2-20 characters).');
  }
  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
    errors.push('Course title is required (3-200 characters).');
  }
  const semNum = parseInt(semester, 10);
  if (isNaN(semNum) || semNum < 1 || semNum > 8) {
    errors.push('Semester must be an integer between 1 and 8.');
  }
  if (credits !== undefined) {
    const credNum = parseInt(credits, 10);
    if (isNaN(credNum) || credNum < 1 || credNum > 10) {
      errors.push('Credits must be an integer between 1 and 10.');
    }
  }
  if (!instructor_id || typeof instructor_id !== 'string') {
    errors.push('Instructor ID is required.');
  }
  if (description && typeof description === 'string' && description.length > 5000) {
    errors.push('Description cannot exceed 5000 characters.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateModuleBody = (body) => {
  const { title, sequence_order } = body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 200) {
    errors.push('Module title is required (2-200 characters).');
  }
  if (sequence_order !== undefined) {
    const seq = parseInt(sequence_order, 10);
    if (isNaN(seq) || seq < 0) {
      errors.push('Sequence order must be a non-negative integer.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateLessonBody = (body) => {
  const { title, sequence_order, video_url, content_markdown } = body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 200) {
    errors.push('Lesson title is required (2-200 characters).');
  }
  if (sequence_order !== undefined) {
    const seq = parseInt(sequence_order, 10);
    if (isNaN(seq) || seq < 0) {
      errors.push('Sequence order must be a non-negative integer.');
    }
  }
  if (video_url && typeof video_url === 'string' && video_url.trim().length > 0) {
    if (!isValidHttpUrl(video_url)) {
      errors.push('Video URL must be a valid http or https URL.');
    }
  }
  if (content_markdown && typeof content_markdown === 'string' && content_markdown.length > 50000) {
    errors.push('Lesson content cannot exceed 50,000 characters.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateRegistrationBody,
  validateCourseBody,
  validateModuleBody,
  validateLessonBody,
  isValidHttpUrl,
};

