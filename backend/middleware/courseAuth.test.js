const { canManageCourse, canCreateCourse } = require('./courseAuth');

describe('LMS Course Authorization Policy', () => {
  const adminUser = { id: 'admin-uuid', role: 'admin' };
  const hodUser = { id: 'hod-uuid', role: 'faculty', is_hod: true };
  const instructor1 = { id: 'faculty-1-uuid', role: 'faculty' };
  const instructor2 = { id: 'faculty-2-uuid', role: 'faculty' };
  const studentUser = { id: 'student-uuid', role: 'student' };

  const courseOwnedBy1 = { id: 'course-1', instructor_id: 'faculty-1-uuid', title: 'Data Structures' };

  describe('canCreateCourse', () => {
    it('rejects unauthenticated users', () => {
      expect(canCreateCourse(null)).toBe(false);
      expect(canCreateCourse({})).toBe(false);
    });

    it('rejects students from creating courses', () => {
      expect(canCreateCourse(studentUser)).toBe(false);
    });

    it('allows faculty / instructors to create courses', () => {
      expect(canCreateCourse(instructor1)).toBe(true);
      expect(canCreateCourse(hodUser)).toBe(true);
    });

    it('allows system admins to create courses', () => {
      expect(canCreateCourse(adminUser)).toBe(true);
    });
  });

  describe('canManageCourse', () => {
    it('rejects unauthenticated requests', () => {
      expect(canManageCourse(null, courseOwnedBy1)).toBe(false);
    });

    it('rejects students from modifying courses', () => {
      expect(canManageCourse(studentUser, courseOwnedBy1)).toBe(false);
    });

    it('allows instructor to manage their own course', () => {
      expect(canManageCourse(instructor1, courseOwnedBy1)).toBe(true);
    });

    it('rejects instructor from modifying another instructors course', () => {
      expect(canManageCourse(instructor2, courseOwnedBy1)).toBe(false);
    });

    it('allows HOD to modify any course in the department', () => {
      expect(canManageCourse(hodUser, courseOwnedBy1)).toBe(true);
      expect(canManageCourse(instructor2, courseOwnedBy1, { hasFullAccess: true })).toBe(true);
    });

    it('allows admin to modify any course', () => {
      expect(canManageCourse(adminUser, courseOwnedBy1)).toBe(true);
    });
  });
});
