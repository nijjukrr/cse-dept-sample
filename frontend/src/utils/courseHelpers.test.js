import { describe, it, expect } from 'vitest';
import { getEmbedUrl, sortCurriculum, filterCourses } from './courseHelpers';

describe('Course & Curriculum Helpers', () => {
  describe('getEmbedUrl', () => {
    it('extracts YouTube embed URL from standard watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(getEmbedUrl(url)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('extracts YouTube embed URL from youtu.be short link', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(getEmbedUrl(url)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('extracts Vimeo player embed URL from standard Vimeo link', () => {
      const url = 'https://vimeo.com/76979871';
      expect(getEmbedUrl(url)).toBe('https://player.vimeo.com/video/76979871');
    });

    it('returns null for non-embeddable or invalid URLs', () => {
      expect(getEmbedUrl('https://example.com/video.mp4')).toBe(null);
      expect(getEmbedUrl('not-a-url')).toBe(null);
      expect(getEmbedUrl('')).toBe(null);
      expect(getEmbedUrl(null)).toBe(null);
    });
  });

  describe('sortCurriculum', () => {
    it('sorts modules and nested lessons in ascending sequence_order', () => {
      const unsorted = [
        {
          id: 'mod-2',
          title: 'Module 2',
          sequence_order: 2,
          lessons: [
            { id: 'l-2-2', title: 'Lesson 2.2', sequence_order: 2 },
            { id: 'l-2-1', title: 'Lesson 2.1', sequence_order: 1 },
          ],
        },
        {
          id: 'mod-1',
          title: 'Module 1',
          sequence_order: 1,
          lessons: [
            { id: 'l-1-3', title: 'Lesson 1.3', sequence_order: 3 },
            { id: 'l-1-1', title: 'Lesson 1.1', sequence_order: 1 },
          ],
        },
      ];

      const sorted = sortCurriculum(unsorted);
      expect(sorted[0].id).toBe('mod-1');
      expect(sorted[1].id).toBe('mod-2');
      expect(sorted[0].lessons[0].id).toBe('l-1-1');
      expect(sorted[0].lessons[1].id).toBe('l-1-3');
      expect(sorted[1].lessons[0].id).toBe('l-2-1');
      expect(sorted[1].lessons[1].id).toBe('l-2-2');
    });
  });

  describe('filterCourses', () => {
    const courseList = [
      { id: '1', code: 'CS8401', title: 'Algorithms', semester: 4, description: 'Sorting, DP, and graphs' },
      { id: '2', code: 'CS8501', title: 'Operating Systems', semester: 5, description: 'Kernels and processes' },
      { id: '3', code: 'CS8301', title: 'Data Structures', semester: 3, description: 'Trees, heaps, stacks' },
    ];

    it('filters courses by semester', () => {
      const res = filterCourses(courseList, '', 4);
      expect(res).toHaveLength(1);
      expect(res[0].code).toBe('CS8401');
    });

    it('filters courses by search keyword matching code or title', () => {
      const byCode = filterCourses(courseList, 'CS8501', 'ALL');
      expect(byCode).toHaveLength(1);
      expect(byCode[0].title).toBe('Operating Systems');

      const byTitle = filterCourses(courseList, 'Data', 'ALL');
      expect(byTitle).toHaveLength(1);
      expect(byTitle[0].code).toBe('CS8301');
    });

    it('returns all courses when semester is ALL and search is empty', () => {
      const res = filterCourses(courseList, '', 'ALL');
      expect(res).toHaveLength(3);
    });
  });
});
