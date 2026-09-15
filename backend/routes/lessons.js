const express = require('express');
const router = express.Router();
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validateLessonBody } = require('../middleware/validation');
const { canManageCourse } = require('../middleware/courseAuth');

// Helper to fetch lesson with parent module and grandparent course
const getLessonWithContext = async (lessonId) => {
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, modules(*, courses(*))')
    .eq('id', lessonId)
    .maybeSingle();

  return lesson;
};

// ─── GET /api/lessons/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await getLessonWithContext(id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const course = lesson.modules?.courses;
    if (!course?.is_published) {
      if (!req.user) return res.status(404).json({ error: 'Lesson not found.' });
      const scope = await getAdminScope(req.user.id, req.user.role);
      if (!canManageCourse(req.user, course, scope)) {
        return res.status(403).json({ error: 'Access denied to unpublished lesson.' });
      }
    }

    // Also fetch sibling lessons for next/prev navigation
    const { data: siblingLessons } = await supabase
      .from('lessons')
      .select('id, title, sequence_order, module_id')
      .eq('module_id', lesson.module_id)
      .order('sequence_order', { ascending: true });

    res.json({
      ...lesson,
      siblings: siblingLessons || [],
    });
  } catch (err) {
    console.error('Unexpected error in GET /lessons/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── PUT /api/lessons/:id ────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await getLessonWithContext(id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const course = lesson.modules?.courses;
    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to modify this lesson.' });
    }

    const validation = validateLessonBody(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    const updateData = {
      title: req.body.title.trim(),
      content_markdown: req.body.content_markdown !== undefined ? req.body.content_markdown?.trim() || null : lesson.content_markdown,
      video_url: req.body.video_url !== undefined ? req.body.video_url?.trim() || null : lesson.video_url,
      updated_at: new Date().toISOString(),
    };
    if (req.body.sequence_order !== undefined) {
      updateData.sequence_order = parseInt(req.body.sequence_order, 10);
    }

    const { data: updated, error } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Error updating lesson:', error);
      return res.status(500).json({ error: 'Failed to update lesson.' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Unexpected error in PUT /lessons/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── DELETE /api/lessons/:id ─────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await getLessonWithContext(id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const course = lesson.modules?.courses;
    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to delete this lesson.' });
    }

    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      console.error('Error deleting lesson:', error);
      return res.status(500).json({ error: 'Failed to delete lesson.' });
    }

    res.json({ message: 'Lesson deleted successfully.' });
  } catch (err) {
    console.error('Unexpected error in DELETE /lessons/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
