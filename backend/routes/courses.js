const express = require('express');
const router = express.Router();
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validateCourseBody, validateModuleBody } = require('../middleware/validation');
const { canManageCourse, canCreateCourse } = require('../middleware/courseAuth');

// Helper to fetch instructor profile
const enrichCoursesWithInstructor = async (courses) => {
  if (!courses || courses.length === 0) return [];
  const instructorIds = [...new Set(courses.map(c => c.instructor_id))];
  
  const { data: facultyProfiles } = await supabase
    .from('faculty')
    .select('user_id, name, designation, department, avatar_url')
    .in('user_id', instructorIds);

  const facultyMap = new Map((facultyProfiles || []).map(f => [f.user_id, f]));

  return courses.map(course => ({
    ...course,
    instructor: facultyMap.get(course.instructor_id) || { name: 'Faculty Member', designation: 'Instructor' },
  }));
};

// ─── GET /api/courses ────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const scope = await getAdminScope(userId, role);
    const { manage, semester } = req.query;

    let query = supabase.from('courses').select('*');

    if (semester) {
      query = query.eq('semester', parseInt(semester, 10));
    }

    if (role === 'student') {
      // Students only see published courses
      query = query.eq('is_published', true);
    } else if (role === 'faculty') {
      if (manage === 'true') {
        if (!scope.hasFullAccess) {
          query = query.eq('instructor_id', userId);
        }
      } else {
        // In general catalog view: show published courses + courses created by this instructor
        if (!scope.hasFullAccess) {
          query = query.or(`is_published.eq.true,instructor_id.eq.${userId}`);
        }
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data: courses, error } = await query;
    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: 'Failed to retrieve courses.' });
    }

    const enriched = await enrichCoursesWithInstructor(courses || []);
    res.json(enriched);
  } catch (err) {
    console.error('Unexpected error in GET /courses:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/courses/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Check visibility if unpublished
    if (!course.is_published) {
      if (!req.user) {
        return res.status(404).json({ error: 'Course not found.' });
      }
      const scope = await getAdminScope(req.user.id, req.user.role);
      if (!canManageCourse(req.user, course, scope)) {
        return res.status(403).json({ error: 'Access denied to unpublished course.' });
      }
    }

    // Fetch instructor profile
    const { data: instructor } = await supabase
      .from('faculty')
      .select('user_id, name, designation, department, avatar_url')
      .eq('user_id', course.instructor_id)
      .maybeSingle();

    // Fetch modules with nested lessons
    const { data: modules, error: modErr } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', id)
      .order('sequence_order', { ascending: true });

    if (modErr) {
      console.error('Error fetching modules for course:', modErr);
    }

    // Sort lessons inside modules deterministically
    const sortedModules = (modules || []).map(mod => ({
      ...mod,
      lessons: (mod.lessons || []).sort((a, b) => a.sequence_order - b.sequence_order),
    }));

    res.json({
      ...course,
      instructor: instructor || { name: 'Faculty Member', designation: 'Instructor' },
      modules: sortedModules,
    });
  } catch (err) {
    console.error('Unexpected error in GET /courses/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/courses ───────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!canCreateCourse(req.user)) {
      return res.status(403).json({ error: 'Only instructors and administrators can create courses.' });
    }

    const payload = {
      ...req.body,
      instructor_id: req.body.instructor_id || req.user.id,
    };

    // If faculty, must be self unless HOD
    const scope = await getAdminScope(req.user.id, req.user.role);
    if (req.user.role === 'faculty' && !scope.hasFullAccess && payload.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Instructors can only create courses assigned to themselves.' });
    }

    const validation = validateCourseBody(payload);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    // Check unique code
    const { data: existingCode } = await supabase
      .from('courses')
      .select('id')
      .ilike('code', payload.code.trim().toUpperCase())
      .maybeSingle();

    if (existingCode) {
      return res.status(409).json({ error: `Course code '${payload.code.toUpperCase()}' is already registered.` });
    }

    const newCourse = {
      code: payload.code.trim().toUpperCase(),
      title: payload.title.trim(),
      description: payload.description ? payload.description.trim() : null,
      instructor_id: payload.instructor_id,
      semester: parseInt(payload.semester, 10),
      credits: payload.credits ? parseInt(payload.credits, 10) : 3,
      target_class: payload.target_class ? payload.target_class.trim() : null,
      target_year: payload.target_year ? parseInt(payload.target_year, 10) : null,
      is_published: Boolean(payload.is_published),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase
      .from('courses')
      .insert(newCourse)
      .select()
      .single();

    if (error || !created) {
      console.error('Error inserting course:', error);
      return res.status(500).json({ error: 'Failed to create course.' });
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Unexpected error in POST /courses:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── PUT /api/courses/:id ────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: course, error: findErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to modify this course.' });
    }

    const payload = {
      ...req.body,
      instructor_id: req.body.instructor_id || course.instructor_id,
    };

    const validation = validateCourseBody(payload);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    // Check code collision if code changed
    if (payload.code.trim().toUpperCase() !== course.code.toUpperCase()) {
      const { data: collision } = await supabase
        .from('courses')
        .select('id')
        .ilike('code', payload.code.trim().toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (collision) {
        return res.status(409).json({ error: `Course code '${payload.code.toUpperCase()}' is already in use.` });
      }
    }

    const updateData = {
      code: payload.code.trim().toUpperCase(),
      title: payload.title.trim(),
      description: payload.description ? payload.description.trim() : null,
      instructor_id: payload.instructor_id,
      semester: parseInt(payload.semester, 10),
      credits: payload.credits ? parseInt(payload.credits, 10) : course.credits,
      target_class: payload.target_class ? payload.target_class.trim() : null,
      target_year: payload.target_year ? parseInt(payload.target_year, 10) : null,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Error updating course:', error);
      return res.status(500).json({ error: 'Failed to update course.' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Unexpected error in PUT /courses/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── PATCH /api/courses/:id/publish ──────────────────────────────────────────
router.patch('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: course, error: findErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to publish/unpublish this course.' });
    }

    const newStatus = typeof req.body.is_published === 'boolean' 
      ? req.body.is_published 
      : !course.is_published;

    const { data: updated, error } = await supabase
      .from('courses')
      .update({ is_published: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      return res.status(500).json({ error: 'Failed to update publication status.' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Unexpected error in PATCH /courses/:id/publish:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── DELETE /api/courses/:id ─────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: course, error: findErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to delete this course.' });
    }

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      console.error('Error deleting course:', error);
      return res.status(500).json({ error: 'Failed to delete course.' });
    }

    res.json({ message: 'Course deleted successfully.' });
  } catch (err) {
    console.error('Unexpected error in DELETE /courses/:id:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/courses/:courseId/modules ───────────────────────────────────────
router.get('/:courseId/modules', optionalAuthMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (!course.is_published) {
      if (!req.user) return res.status(404).json({ error: 'Course not found.' });
      const scope = await getAdminScope(req.user.id, req.user.role);
      if (!canManageCourse(req.user, course, scope)) {
        return res.status(403).json({ error: 'Access denied to unpublished course modules.' });
      }
    }

    const { data: modules, error } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', courseId)
      .order('sequence_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to retrieve modules.' });
    }

    const sorted = (modules || []).map(m => ({
      ...m,
      lessons: (m.lessons || []).sort((a, b) => a.sequence_order - b.sequence_order),
    }));

    res.json(sorted);
  } catch (err) {
    console.error('Unexpected error in GET /courses/:courseId/modules:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/courses/:courseId/modules ──────────────────────────────────────
router.post('/:courseId/modules', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!canManageCourse(req.user, course, scope)) {
      return res.status(403).json({ error: 'You do not have permission to add modules to this course.' });
    }

    const validation = validateModuleBody(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    }

    // Calculate next sequence order if not explicitly given
    let seq = req.body.sequence_order;
    if (seq === undefined) {
      const { data: maxSeqMod } = await supabase
        .from('modules')
        .select('sequence_order')
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      seq = (maxSeqMod?.sequence_order || 0) + 1;
    }

    const { data: created, error } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title: req.body.title.trim(),
        sequence_order: parseInt(seq, 10),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !created) {
      console.error('Error creating module:', error);
      return res.status(500).json({ error: 'Failed to create module.' });
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Unexpected error in POST /courses/:courseId/modules:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
