const express = require('express');
const router = express.Router();
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validateModuleBody, validateLessonBody } = require('../middleware/validation');
const { canManageCourse } = require('../middleware/courseAuth');

// Helper to fetch module along with parent course for ownership verification
const getModuleWithCourse = async (moduleId) => {
  const { data: moduleData } = await supabase
    .from('modules')
    .select('*, courses(*)')
    .eq('id', moduleId)
    .maybeSingle();

  return moduleData;
};

// ─── PUT /api/modules/:id ────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const moduleWithCourse = await getModuleWithCourse(id);
    if (!moduleWithCourse) {
      return res.status(404).json({ error: 'Module not found.' });
    }

    const course = moduleWithCourse.courses;
    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to modify this module.' });
    }

    const validation = validateModuleBody(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    const updateData = {
      title: req.body.title.trim(),
      updated_at: new Date().toISOString(),
    };
    if (req.body.sequence_order !== undefined) {
      updateData.sequence_order = parseInt(req.body.sequence_order, 10);
    }

    const { data: updated, error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Error updating module:', error);
      return res.status(500).json({ error: 'Failed to update module.' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Unexpected error in PUT /modules/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── DELETE /api/modules/:id ─────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const moduleWithCourse = await getModuleWithCourse(id);
    if (!moduleWithCourse) {
      return res.status(404).json({ error: 'Module not found.' });
    }

    const course = moduleWithCourse.courses;
    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to delete this module.' });
    }

    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) {
      console.error('Error deleting module:', error);
      return res.status(500).json({ error: 'Failed to delete module.' });
    }

    res.json({ message: 'Module deleted successfully.' });
  } catch (err) {
    console.error('Unexpected error in DELETE /modules/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/modules/:moduleId/lessons ──────────────────────────────────────
router.get('/:moduleId/lessons', optionalAuthMiddleware, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleWithCourse = await getModuleWithCourse(moduleId);
    if (!moduleWithCourse) {
      return res.status(404).json({ error: 'Module not found.' });
    }

    const course = moduleWithCourse.courses;
    if (!course.is_published) {
      if (!req.user) return res.status(404).json({ error: 'Module not found.' });
      const scope = await getAdminScope(req.user.id, req.user.role);
      if (!canManageCourse(req.user, course, scope)) {
        return res.status(403).json({ error: 'Access denied to unpublished course content.' });
      }
    }

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('sequence_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to retrieve lessons.' });
    }

    res.json(lessons || []);
  } catch (err) {
    console.error('Unexpected error in GET /modules/:moduleId/lessons:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/modules/:moduleId/lessons ─────────────────────────────────────
router.post('/:moduleId/lessons', authMiddleware, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleWithCourse = await getModuleWithCourse(moduleId);
    if (!moduleWithCourse) {
      return res.status(404).json({ error: 'Module not found.' });
    }

    const course = moduleWithCourse.courses;
    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to add lessons to this module.' });
    }

    const validation = validateLessonBody(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    // Determine sequence order if not specified
    let seq = req.body.sequence_order;
    if (seq === undefined) {
      const { data: maxLesson } = await supabase
        .from('lessons')
        .select('sequence_order')
        .eq('module_id', moduleId)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      seq = (maxLesson?.sequence_order || 0) + 1;
    }

    const newLesson = {
      module_id: moduleId,
      title: req.body.title.trim(),
      content_markdown: req.body.content_markdown ? req.body.content_markdown.trim() : null,
      video_url: req.body.video_url ? req.body.video_url.trim() : null,
      sequence_order: parseInt(seq, 10),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase
      .from('lessons')
      .insert(newLesson)
      .select()
      .single();

    if (error || !created) {
      console.error('Error inserting lesson:', error);
      return res.status(500).json({ error: 'Failed to create lesson.' });
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Unexpected error in POST /modules/:moduleId/lessons:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
