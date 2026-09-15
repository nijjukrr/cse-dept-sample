import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { parseErrorMessage } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import { CourseCardSkeleton } from '../components/Skeleton';
import CourseModal from '../components/CourseModal';
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  Plus,
  Settings,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Clock,
  Award,
} from 'lucide-react';

export default function Courses() {
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/courses');
      setCourses(res.data || []);
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to load courses. Please check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSem = selectedSemester === 'ALL' || String(c.semester) === String(selectedSemester);
    return matchesSearch && matchesSem;
  });

  return (
    <div className="page-container" style={{ minHeight: 'calc(100vh - 140px)', padding: '36px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 32,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-green)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            <Sparkles size={16} />
            <span>Academic Curriculum & Course Catalog</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text)', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
            Department Courses
          </h1>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Explore syllabus materials, interactive modules, and structured lessons curated by faculty.
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              to="/instructor/courses"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Settings size={16} />
              Manage Curriculum
            </Link>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCreateModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <Plus size={16} />
              New Course
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 14px', flex: '1 1 300px', maxWidth: 440 }}>
          <Search size={18} color="var(--color-text-faint)" />
          <input
            type="text"
            placeholder="Search by course code, title, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 14, color: 'var(--color-text)' }}
          />
        </div>

        {/* Semester Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {['ALL', 1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
            const isSelected = selectedSemester === String(sem);
            return (
              <button
                key={sem}
                type="button"
                onClick={() => setSelectedSemester(String(sem))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--color-green)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--color-green)' : 'var(--bg-card)',
                  color: isSelected ? '#FFFFFF' : 'var(--color-text-muted)',
                  transition: 'var(--transition)',
                  whiteSpace: 'nowrap',
                }}
              >
                {sem === 'ALL' ? 'All Semesters' : `Sem ${sem}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{error}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchCourses} style={{ padding: '4px 12px', fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <CourseCardSkeleton key={k} />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description={
            searchTerm || selectedSemester !== 'ALL'
              ? 'No courses matched your search or semester filter. Try clearing filters.'
              : 'There are no published courses currently available in the catalog.'
          }
          action={
            isAdmin ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={15} style={{ marginRight: 4 }} /> Create First Course
              </button>
            ) : null
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="card animate-scaleIn"
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--border)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'var(--transition)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span
                    style={{
                      background: 'var(--green-50)',
                      color: 'var(--color-green-dark)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: '0.04em',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {course.code}
                  </span>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                      Sem {course.semester} • {course.credits} Credits
                    </span>
                    {isAdmin && (
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
                        {course.is_published ? 'Live' : 'Draft'}
                      </span>
                    )}
                  </div>
                </div>

                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    margin: '0 0 8px 0',
                    fontFamily: "'Space Grotesk', sans-serif",
                    lineHeight: 1.35,
                  }}
                >
                  {course.title}
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.5,
                    margin: '0 0 16px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {course.description || 'Comprehensive curriculum modules, lecture materials, and problem sets.'}
                </p>
              </div>

              <div>
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: 14,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--green-100)',
                      color: 'var(--color-green-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {course.instructor?.name?.[0] || 'I'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                      {course.instructor?.name || 'Faculty Member'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {course.instructor?.designation || 'Course Instructor'}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/courses/${course.id}`}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <BookOpen size={16} />
                  View Course & Modules
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Modal */}
      {isCreateModalOpen && (
        <CourseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSaved={(newCourse) => {
            setCourses((prev) => [newCourse, ...prev]);
          }}
        />
      )}
    </div>
  );
}
