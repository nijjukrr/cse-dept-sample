import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { parseErrorMessage } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import CourseModal from '../components/CourseModal';
import ModuleModal from '../components/ModuleModal';
import LessonModal from '../components/LessonModal';
import ConfirmModal from '../components/ConfirmModal';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  Video,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

export default function ManageCourses() {
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Selected course for detailed module/lesson curriculum editing
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [activeCourseData, setActiveCourseData] = useState(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // Modals state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: '', // 'course' | 'module' | 'lesson'
    id: null,
    title: '',
  });

  const fetchManageableCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/courses?manage=true');
      setCourses(res.data || []);
      if (res.data?.length > 0 && !activeCourseId) {
        setActiveCourseId(res.data[0].id);
      }
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to retrieve manageable courses.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCourseCurriculum = async (cId) => {
    if (!cId) return;
    setLoadingCurriculum(true);
    try {
      const res = await client.get(`/courses/${cId}`);
      setActiveCourseData(res.data);
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to fetch course curriculum.'));
    } finally {
      setLoadingCurriculum(false);
    }
  };

  useEffect(() => {
    fetchManageableCourses();
  }, []);

  useEffect(() => {
    if (activeCourseId) {
      fetchActiveCourseCurriculum(activeCourseId);
    }
  }, [activeCourseId]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // Toggle publish status
  const handleTogglePublish = async (course) => {
    try {
      const res = await client.patch(`/courses/${course.id}/publish`, {
        is_published: !course.is_published,
      });
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_published: res.data.is_published } : c))
      );
      if (activeCourseData?.id === course.id) {
        setActiveCourseData((prev) => ({ ...prev, is_published: res.data.is_published }));
      }
      showFeedback(`Course ${res.data.is_published ? 'published live' : 'moved to draft'}.`);
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to toggle publication status.'));
    }
  };

  // Safe delete handler
  const executeDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      if (type === 'course') {
        await client.delete(`/courses/${id}`);
        setCourses((prev) => prev.filter((c) => c.id !== id));
        if (activeCourseId === id) {
          const next = courses.find((c) => c.id !== id);
          setActiveCourseId(next ? next.id : null);
          setActiveCourseData(null);
        }
        showFeedback('Course deleted successfully.');
      } else if (type === 'module') {
        await client.delete(`/modules/${id}`);
        if (activeCourseId) fetchActiveCourseCurriculum(activeCourseId);
        showFeedback('Module deleted successfully.');
      } else if (type === 'lesson') {
        await client.delete(`/lessons/${id}`);
        if (activeCourseId) fetchActiveCourseCurriculum(activeCourseId);
        showFeedback('Lesson deleted successfully.');
      }
    } catch (err) {
      setError(parseErrorMessage(err, `Failed to delete ${type}.`));
    } finally {
      setDeleteConfirm({ isOpen: false, type: '', id: null, title: '' });
    }
  };

  return (
    <div className="page-container" style={{ minHeight: 'calc(100vh - 140px)', padding: '30px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/courses" className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
              Course Studio & Curriculum Manager
            </h1>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Author courses, organize modular syllabi, and attach lecture materials.
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditingCourse(null);
            setIsCourseModalOpen(true);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Plus size={16} />
          Create Course
        </button>
      </div>

      {/* Notifications / Feedback */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            background: '#DCFCE7',
            color: '#166534',
            border: '1px solid #86EFAC',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          <CheckCircle size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FCA5A5',
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError('')} style={{ fontSize: 11, padding: 2 }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Two-Column Studio Layout */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
          <Skeleton width="100%" height="400px" borderRadius="var(--radius-md)" />
          <Skeleton width="100%" height="400px" borderRadius="var(--radius-md)" />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses to manage"
          description="You have not created any courses yet. Create your first course to begin building curriculum modules."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsCourseModalOpen(true)}>
              <Plus size={15} style={{ marginRight: 4 }} /> Create Course
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          {/* Left Column: Manageable Courses List */}
          <div
            className="card"
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--border)',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, paddingLeft: 4 }}>
              My Courses ({courses.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {courses.map((course) => {
                const isSelected = course.id === activeCourseId;
                return (
                  <div
                    key={course.id}
                    onClick={() => setActiveCourseId(course.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1.5px solid var(--color-green)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--green-50)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: isSelected ? 'var(--color-green-dark)' : 'var(--color-text)',
                        }}
                      >
                        {course.code}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-full)',
                          background: course.is_published ? '#DCFCE7' : '#FEF3C7',
                          color: course.is_published ? '#166534' : '#92400E',
                        }}
                      >
                        {course.is_published ? 'Live' : 'Draft'}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4 }}>
                      {course.title}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Sem {course.semester} • {course.credits} Credits
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Course Studio & Curriculum Editor */}
          {loadingCurriculum ? (
            <div className="card" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <Skeleton width="40%" height="28px" style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height="200px" />
            </div>
          ) : activeCourseData ? (
            <div
              className="card"
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--border)',
                padding: '24px',
              }}
            >
              {/* Header Action Toolbar for Active Course */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 18,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green-dark)' }}>
                      {activeCourseData.code}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: activeCourseData.is_published ? '#DCFCE7' : '#FEF3C7',
                        color: activeCourseData.is_published ? '#166534' : '#92400E',
                      }}
                    >
                      {activeCourseData.is_published ? 'Published to Students' : 'Draft Only'}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {activeCourseData.title}
                  </h2>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Semester {activeCourseData.semester} • {activeCourseData.credits} Credits • Instructor: {activeCourseData.instructor?.name}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleTogglePublish(activeCourseData)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {activeCourseData.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                    {activeCourseData.is_published ? 'Unpublish' : 'Publish Live'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingCourse(activeCourseData);
                      setIsCourseModalOpen(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() =>
                      setDeleteConfirm({
                        isOpen: true,
                        type: 'course',
                        id: activeCourseData.id,
                        title: `Delete course ${activeCourseData.code}?`,
                      })
                    }
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                  <Link
                    to={`/courses/${activeCourseData.id}`}
                    target="_blank"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-green)' }}
                  >
                    <span>Student View</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>

              {/* Modules & Lessons Curriculum Tree Editor */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                    Curriculum Modules
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {activeCourseData.modules?.length || 0} Modules defined
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingModule(null);
                    setIsModuleModalOpen(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
                >
                  <Plus size={14} />
                  Add Module
                </button>
              </div>

              {!activeCourseData.modules || activeCourseData.modules.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No modules in this course"
                  description="Begin authoring this course by creating the first curriculum module."
                  action={
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setEditingModule(null);
                        setIsModuleModalOpen(true);
                      }}
                    >
                      <Plus size={14} style={{ marginRight: 4 }} /> Add Module
                    </button>
                  }
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeCourseData.modules.map((mod, mIdx) => (
                    <div
                      key={mod.id}
                      style={{
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        padding: '16px',
                      }}
                    >
                      {/* Module Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              background: 'var(--green-100)',
                              color: 'var(--color-green-dark)',
                              width: 24,
                              height: 24,
                              borderRadius: 'var(--radius-xs)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {mIdx + 1}
                          </span>
                          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                            {mod.title}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActiveModuleForLesson(mod.id);
                              setEditingLesson(null);
                              setIsLessonModalOpen(true);
                            }}
                            style={{ padding: '4px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Plus size={12} /> Add Lesson
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingModule(mod);
                              setIsModuleModalOpen(true);
                            }}
                            style={{ padding: '4px 6px' }}
                            title="Edit Module"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'module',
                                id: mod.id,
                                title: `Delete module "${mod.title}" and its lessons?`,
                              })
                            }
                            style={{ padding: '4px 6px', color: '#DC2626' }}
                            title="Delete Module"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Module Lessons List */}
                      {(!mod.lessons || mod.lessons.length === 0) ? (
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', paddingLeft: 32 }}>
                          No lessons added to this module yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 32 }}>
                          {mod.lessons.map((lesson, lIdx) => (
                            <div
                              key={lesson.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                  {mIdx + 1}.{lIdx + 1}
                                </span>
                                {lesson.video_url ? <Video size={14} color="var(--color-green)" /> : <FileText size={14} color="var(--color-text-muted)" />}
                                <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{lesson.title}</span>
                              </div>

                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => {
                                    setActiveModuleForLesson(mod.id);
                                    setEditingLesson(lesson);
                                    setIsLessonModalOpen(true);
                                  }}
                                  style={{ padding: '3px 6px' }}
                                  title="Edit Lesson"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      isOpen: true,
                                      type: 'lesson',
                                      id: lesson.id,
                                      title: `Delete lesson "${lesson.title}"?`,
                                    })
                                  }
                                  style={{ padding: '3px 6px', color: '#DC2626' }}
                                  title="Delete Lesson"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Modals */}
      {isCourseModalOpen && (
        <CourseModal
          isOpen={isCourseModalOpen}
          course={editingCourse}
          onClose={() => {
            setIsCourseModalOpen(false);
            setEditingCourse(null);
          }}
          onSaved={(savedCourse) => {
            fetchManageableCourses();
            setActiveCourseId(savedCourse.id);
            showFeedback('Course saved successfully.');
          }}
        />
      )}

      {isModuleModalOpen && activeCourseId && (
        <ModuleModal
          isOpen={isModuleModalOpen}
          courseId={activeCourseId}
          module={editingModule}
          onClose={() => {
            setIsModuleModalOpen(false);
            setEditingModule(null);
          }}
          onSaved={() => {
            fetchActiveCourseCurriculum(activeCourseId);
            showFeedback('Module saved successfully.');
          }}
        />
      )}

      {isLessonModalOpen && activeModuleForLesson && (
        <LessonModal
          isOpen={isLessonModalOpen}
          moduleId={activeModuleForLesson}
          lesson={editingLesson}
          onClose={() => {
            setIsLessonModalOpen(false);
            setEditingLesson(null);
            setActiveModuleForLesson(null);
          }}
          onSaved={() => {
            fetchActiveCourseCurriculum(activeCourseId);
            showFeedback('Lesson saved successfully.');
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message="This operation will permanently remove this record from the database."
        onConfirm={executeDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, type: '', id: null, title: '' })}
      />
    </div>
  );
}
