/**
 * LMS Course & Curriculum Helper Utilities
 */

/**
 * Extracts iframe embed URL for YouTube and Vimeo links
 * @param {string} url - Raw video lecture link
 * @returns {string|null}
 */
export function getEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      if (parsed.pathname.startsWith('/embed/')) return url;
    }
    if (parsed.hostname.includes('youtu.be')) {
      const v = parsed.pathname.slice(1);
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const v = parsed.pathname.split('/').filter(Boolean).pop();
      if (v && !isNaN(v)) return `https://player.vimeo.com/video/${v}`;
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Deterministically sorts modules and lessons by sequence_order
 * @param {Array} modules - Array of module objects
 * @returns {Array}
 */
export function sortCurriculum(modules) {
  if (!Array.isArray(modules)) return [];
  return [...modules]
    .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
    .map((mod) => ({
      ...mod,
      lessons: Array.isArray(mod.lessons)
        ? [...mod.lessons].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
        : [],
    }));
}

/**
 * Filters course catalog by semester and keyword search
 * @param {Array} courses - Course list
 * @param {string} searchTerm - Search text
 * @param {string|number} semester - Selected semester
 * @returns {Array}
 */
export function filterCourses(courses, searchTerm = '', semester = 'ALL') {
  if (!Array.isArray(courses)) return [];
  const term = searchTerm.trim().toLowerCase();

  return courses.filter((c) => {
    const matchesSearch =
      !term ||
      c.title?.toLowerCase().includes(term) ||
      c.code?.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term);

    const matchesSem = semester === 'ALL' || String(c.semester) === String(semester);

    return matchesSearch && matchesSem;
  });
}
