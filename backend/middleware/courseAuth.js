/**
 * LMS Course & Curriculum Authorization Logic
 */

const { getAdminScope } = require('../db/supabase');

/**
 * Pure authorization check for course modification
 * @param {Object} user - Decoded JWT user { id, role, is_hod }
 * @param {Object} course - Course record { instructor_id }
 * @param {Object} [scope] - Optional cached admin scope
 * @returns {boolean}
 */
const canManageCourse = (user, course, scope = null) => {
  if (!user || !user.role) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'student') return false;

  if (user.role === 'faculty') {
    if (user.is_hod || scope?.hasFullAccess) return true;
    if (course && course.instructor_id === user.id) return true;
    return false;
  }

  return false;
};

/**
 * Authorization check for course creation
 * @param {Object} user - Decoded JWT user
 * @returns {boolean}
 */
const canCreateCourse = (user) => {
  if (!user || !user.role) return false;
  return user.role === 'admin' || user.role === 'faculty';
};

module.exports = {
  canManageCourse,
  canCreateCourse,
};
