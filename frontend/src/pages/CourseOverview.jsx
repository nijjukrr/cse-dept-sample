import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { parseErrorMessage } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import ModuleModal from '../components/ModuleModal';
import LessonModal from '../components/LessonModal';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  Video,
  ArrowLeft,
  Settings,
  Plus,
  Clock,
  Award,
  AlertCircle,
} from 'lucide-react';

export default function CourseOverview() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openModules, setOpenModules] = useState({});

  // Module & Lesson quick creation for instructors/admins
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState(null);

  const fetchCourse = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/courses/${courseId}`);
      setCourse(res.data);
      // Auto-expand all modules by default
      const initialOpen = {};
      (res.data?.modules || []).forEach((m) => {
        initialOpen[m.id] = true;
      });
      setOpenModules(initialOpen);
    } catch (err) {
      setError(parseErrorMessage(err, 'Course not found or unavailable.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const toggleModule = (moduleId) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const isOwnerOrAdmin = Boolean(
    user && (user.role === 'admin' || user.is_admin || course?.instructor_id === user.id)
  );

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 20px' }}>
        <Skeleton width="180px" height="20px" style={{ marginBottom: 20 }} />
        <Skeleton width="60%" height="36px" style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height="80px" style={{ marginBottom: 32 }} />
        <Skeleton width="100%" height="160px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ padding: '24px', background: '#FEF2F2', borderRadius: 'var(--radius-lg)', border: '1px solid #FCA5A5', color: '#DC2626' }}>
          <AlertCircle size={32} style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0' }}>Unable to load course</h2>
          <p style={{ fontSize: 14, margin: '0 0 16px 0' }}>{error || 'Course not found.'}</p>
          <Link to="/courses" className="btn btn-secondary btn-sm">
            Back to Course Catalog
          </Link>
        </div>
      </div>
    );
  }

  const totalLessons = (course.modules || []).reduce(
    (sum, m) => sum + (m.lessons?.length || 0),
    0
  );

  return (
    <div className="page-container" style={{ minHeight: 'calc(100vh - 140px)', padding: '32px 20px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        <Link to="/courses" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-green)', fontWeight: 600 }}>
          <ArrowLeft size={15} />
          Courses
        </Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{course.code}</span>
      </div>

      {/* Course Hero Banner */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border)',
          padding: '30px',
          marginBottom: 32,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  background: 'var(--green-50)',
                  color: 'var(--color-green-dark)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: 13,
                  border: '1px solid var(--border)',
                }}
              >
                {course.code}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  background: 'var(--bg-primary)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                Semester {course.semester} • {course.credits} Credits
              </span>
              {isOwnerOrAdmin && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: course.is_published ? '#DCFCE7' : '#FEF3C7',
                    color: course.is_published ? '#166534' : '#92400E',
                  }}
                >
                  {course.is_published ? 'Published' : 'Draft'}
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--color-text)',
                fontFamily: "'Space Grotesk', sans-serif",
                lineHeight: 1.3,
                margin: '0 0 12px 0',
              }}
            >
              {course.title}
            </h1>

            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              {course.description || 'Structured academic course syllabus with video lectures and study guides.'}
            </p>

            {/* Instructor badge & Meta */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'var(--green-100)',
                    color: 'var(--color-green-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {course.instructor?.name?.[0] || 'I'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    {course.instructor?.name || 'Faculty Member'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {course.instructor?.designation || 'Instructor'} • {course.instructor?.department || 'CSE Department'}
                  </div>
                </div>
              </div>

              <div style={{ height: 28, width: 1, background: 'var(--border)' }} />

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>{course.modules?.length || 0}</strong> Modules
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>{totalLessons}</strong> Lessons
                </div>
              </div>
            </div>
          </div>

          {isOwnerOrAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                to="/instructor/courses"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <Settings size={15} />
                Course Studio
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsModuleModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <Plus size={15} />
                Add Module
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Curriculum Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
            Curriculum & Modules
          </h2>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Expand modules to view topic lectures, notes, and study resources.
          </span>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const allExpanded = Object.values(openModules).every(Boolean);
            const next = {};
            (course.modules || []).forEach((m) => {
              next[m.id] = !allExpanded;
            });
            setOpenModules(next);
          }}
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          {Object.values(openModules).every(Boolean) ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Modules & Lessons Accordion List */}
      {!course.modules || course.modules.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No modules authored yet"
          description="Curriculum modules and syllabus topics are currently being structured for this course."
          action={
            isOwnerOrAdmin ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsModuleModalOpen(true)}>
                <Plus size={15} style={{ marginRight: 4 }} /> Add First Module
              </button>
            ) : null
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {course.modules.map((module, index) => {
            const isOpen = Boolean(openModules[module.id]);
            const lessonList = module.lessons || [];

            return (
              <div
                key={module.id}
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  transition: 'var(--transition)',
                }}
              >
                {/* Module Accordion Trigger */}
                <div
                  onClick={() => toggleModule(module.id)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isOpen ? 'var(--bg-hover)' : 'var(--bg-card)',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--green-100)',
                        color: 'var(--color-green-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                        {module.title}
                      </h3>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {lessonList.length} {lessonList.length === 1 ? 'Lesson' : 'Lessons'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isOwnerOrAdmin && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModuleForLesson(module.id);
                          setIsLessonModalOpen(true);
                        }}
                        style={{ padding: '4px 10px', fontSize: 12, color: 'var(--color-green)' }}
                      >
                        <Plus size={14} style={{ marginRight: 4 }} />
                        Add Lesson
                      </button>
                    )}
                    {isOpen ? <ChevronDown size={18} color="var(--color-text-muted)" /> : <ChevronRight size={18} color="var(--color-text-muted)" />}
                  </div>
                </div>

                {/* Lessons inside module */}
                {isOpen && (
                  <div style={{ padding: '8px 16px 12px 16px', background: 'var(--bg-card)' }}>
                    {lessonList.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
                        No lessons added to this module yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {lessonList.map((lesson, lIdx) => (
                          <Link
                            key={lesson.id}
                            to={`/courses/${course.id}/lessons/${lesson.id}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-primary)',
                              transition: 'var(--transition)',
                              color: 'var(--color-text)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-green)')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ color: lesson.video_url ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                                {lesson.video_url ? <Video size={16} /> : <FileText size={16} />}
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 500 }}>
                                <span style={{ color: 'var(--color-text-muted)', marginRight: 6, fontWeight: 600 }}>
                                  {index + 1}.{lIdx + 1}
                                </span>
                                {lesson.title}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-green)', fontWeight: 600 }}>
                              <span>Read Lesson</span>
                              <ChevronRight size={15} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Module Modal */}
      {isModuleModalOpen && (
        <ModuleModal
          isOpen={isModuleModalOpen}
          courseId={course.id}
          onClose={() => setIsModuleModalOpen(false)}
          onSaved={() => fetchCourse()}
        />
      )}

      {/* Lesson Modal */}
      {isLessonModalOpen && activeModuleForLesson && (
        <LessonModal
          isOpen={isLessonModalOpen}
          moduleId={activeModuleForLesson}
          onClose={() => {
            setIsLessonModalOpen(false);
            setActiveModuleForLesson(null);
          }}
          onSaved={() => fetchCourse()}
        />
      )}
    </div>
  );
}
