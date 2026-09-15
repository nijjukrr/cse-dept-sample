const {
  validateRegistrationBody,
  validateCourseBody,
  validateModuleBody,
  validateLessonBody,
  isValidHttpUrl,
} = require('./validation');

describe('Backend Request Validation', () => {
  describe('Registration Payload Validation', () => {
    it('validates a complete and correct registration payload', () => {
      const validBody = {
        name: 'Jane Doe',
        roll_no: '7377211CS102',
        year: 3,
        class: 'CSE-A',
        email: 'jane@siet.ac.in',
        password: 'secretpassword',
      };
      const result = validateRegistrationBody(validBody);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing required fields', () => {
      const invalidBody = {
        name: '',
        email: 'invalid-email',
        password: '123',
      };
      const result = validateRegistrationBody(invalidBody);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Course Validation', () => {
    it('approves valid course payload', () => {
      const validCourse = {
        code: 'CS8401',
        title: 'Design and Analysis of Algorithms',
        semester: 4,
        credits: 4,
        instructor_id: '11111111-1111-1111-1111-111111111111',
        description: 'Comprehensive algorithmic paradigms.',
      };
      const result = validateCourseBody(validCourse);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing title and code', () => {
      const invalidCourse = {
        semester: 4,
        credits: 3,
        instructor_id: '11111111-1111-1111-1111-111111111111',
      };
      const result = validateCourseBody(invalidCourse);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Course code'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Course title'))).toBe(true);
    });

    it('rejects invalid semester out of range', () => {
      const badSemester = {
        code: 'CS8401',
        title: 'DAA',
        semester: 9,
        instructor_id: '11111111-1111-1111-1111-111111111111',
      };
      const result = validateCourseBody(badSemester);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Semester'))).toBe(true);
    });

    it('rejects invalid credits', () => {
      const badCredits = {
        code: 'CS8401',
        title: 'DAA',
        semester: 4,
        credits: 15,
        instructor_id: '11111111-1111-1111-1111-111111111111',
      };
      const result = validateCourseBody(badCredits);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Credits'))).toBe(true);
    });
  });

  describe('Module Validation', () => {
    it('approves valid module payload', () => {
      const result = validateModuleBody({ title: 'Module 1: Divide and Conquer', sequence_order: 1 });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing or empty title', () => {
      const result = validateModuleBody({ title: ' ', sequence_order: 1 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Module title'))).toBe(true);
    });

    it('rejects negative sequence order', () => {
      const result = validateModuleBody({ title: 'Greedy Algorithms', sequence_order: -1 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Sequence order'))).toBe(true);
    });
  });

  describe('Lesson Validation', () => {
    it('approves valid lesson payload with valid video URL', () => {
      const result = validateLessonBody({
        title: 'Binary Search Analysis',
        sequence_order: 1,
        video_url: 'https://www.youtube.com/watch?v=example',
        content_markdown: '# Binary Search\nTime complexity is O(log n).',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid video URL format', () => {
      const result = validateLessonBody({
        title: 'Binary Search Analysis',
        video_url: 'not-a-valid-url',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Video URL'))).toBe(true);
    });
  });

  describe('URL validation helper', () => {
    it('identifies http and https URLs correctly', () => {
      expect(isValidHttpUrl('http://localhost:5000')).toBe(true);
      expect(isValidHttpUrl('https://siet.ac.in')).toBe(true);
      expect(isValidHttpUrl('ftp://files.example.com')).toBe(false);
      expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
      expect(isValidHttpUrl('just-a-string')).toBe(false);
    });
  });
});

