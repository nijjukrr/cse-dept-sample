import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { parseErrorMessage } from '../utils/errorHandler';
import Skeleton from '../components/Skeleton';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Video,
  FileText,
  BookOpen,
  Layers,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

// Helper to convert YouTube URL to embed URL
function getEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
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

export default function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLessonAndCourse = async () => {
      setLoading(true);
      setError('');
      try {
        const [lessonRes, courseRes] = await Promise.all([
          client.get(`/lessons/${lessonId}`),
          client.get(`/courses/${courseId}`),
        ]);
        setLesson(lessonRes.data);
        setCourse(courseRes.data);
      } catch (err) {
        setError(parseErrorMessage(err, 'Failed to load lesson content.'));
      } finally {
        setLoading(false);
      }
    };

    fetchLessonAndCourse();
  }, [courseId, lessonId]);

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 20px' }}>
        <Skeleton width="220px" height="20px" style={{ marginBottom: 20 }} />
        <Skeleton width="70%" height="32px" style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height="380px" borderRadius="var(--radius-lg)" style={{ marginBottom: 24 }} />
        <Skeleton width="100%" height="200px" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="page-container" style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ padding: '24px', background: '#FEF2F2', borderRadius: 'var(--radius-lg)', border: '1px solid #FCA5A5', color: '#DC2626' }}>
          <AlertCircle size={32} style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0' }}>Lesson Unavailable</h2>
          <p style={{ fontSize: 14, margin: '0 0 16px 0' }}>{error || 'Lesson could not be retrieved.'}</p>
          <Link to={`/courses/${courseId}`} className="btn btn-secondary btn-sm">
            Return to Course Outline
          </Link>
        </div>
      </div>
    );
  }

  const siblings = lesson.siblings || [];
  const currentIndex = siblings.findIndex((s) => s.id === lesson.id);
  const prevLesson = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  const embedUrl = getEmbedUrl(lesson.video_url);

  return (
    <div className="page-container" style={{ minHeight: 'calc(100vh - 140px)', padding: '28px 20px 60px 20px', maxWidth: 1180, margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--color-text-muted)',
          marginBottom: 20,
        }}
      >
        <Link to="/courses" style={{ color: 'var(--color-green)', fontWeight: 600 }}>
          Courses
        </Link>
        <span>/</span>
        <Link to={`/courses/${courseId}`} style={{ color: 'var(--color-green)', fontWeight: 600 }}>
          {course?.code || 'Course'}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-text-muted)' }}>{lesson.modules?.title || 'Module'}</span>
        <span>/</span>
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{lesson.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 28, alignItems: 'start' }}>
        {/* Main Lesson Content Area */}
        <div>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-green)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              <BookOpen size={15} />
              <span>{lesson.modules?.title || 'Course Module'}</span>
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: 'var(--color-text)',
                fontFamily: "'Space Grotesk', sans-serif",
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {lesson.title}
            </h1>
          </div>

          {/* Embedded Video Player if present */}
          {lesson.video_url && (
            <div
              style={{
                marginBottom: 28,
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: '#000000',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {embedUrl ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={embedUrl}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Video size={22} color="var(--color-green)" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Attached Video Resource</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Watch the video lecture online</div>
                      </div>
                    </div>
                    <a
                      href={lesson.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <span>Open Video Link</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text / Markdown Content */}
          <div
            className="card"
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--border)',
              padding: '32px',
              lineHeight: 1.7,
              fontSize: 15,
              color: 'var(--color-text)',
              marginBottom: 32,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {lesson.content_markdown ? (
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>
                {lesson.content_markdown}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
                <FileText size={32} style={{ marginBottom: 10, color: 'var(--color-text-faint)' }} />
                <p style={{ margin: 0, fontSize: 14 }}>
                  No written notes authored for this lesson. Refer to the video resource or instructor lectures.
                </p>
              </div>
            )}
          </div>

          {/* Previous / Next Lesson Navigation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              borderTop: '1px solid var(--border)',
              paddingTop: 24,
            }}
          >
            {prevLesson ? (
              <Link
                to={`/courses/${courseId}/lessons/${prevLesson.id}`}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '10px 18px' }}
              >
                <ChevronLeft size={16} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Previous Lesson</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {prevLesson.title}
                  </div>
                </div>
              </Link>
            ) : (
              <div />
            )}

            <Link
              to={`/courses/${courseId}`}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}
            >
              Course Curriculum
            </Link>

            {nextLesson ? (
              <Link
                to={`/courses/${courseId}/lessons/${nextLesson.id}`}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '10px 18px' }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>Next Lesson</div>
                  <div style={{ fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextLesson.title}
                  </div>
                </div>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Sidebar: Module Navigation & Sibling Lessons */}
        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--border)',
            padding: '20px',
            position: 'sticky',
            top: 80,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Layers size={18} color="var(--color-green)" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Module Lessons
            </h3>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.4 }}>
            {lesson.modules?.title}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {siblings.map((sib, index) => {
              const isCurrent = sib.id === lesson.id;
              return (
                <Link
                  key={sib.id}
                  to={`/courses/${courseId}/lessons/${sib.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    fontWeight: isCurrent ? 700 : 500,
                    background: isCurrent ? 'var(--green-50)' : 'transparent',
                    color: isCurrent ? 'var(--color-green-dark)' : 'var(--color-text)',
                    border: isCurrent ? '1px solid var(--border-strong)' : '1px solid transparent',
                    transition: 'var(--transition)',
                  }}
                >
                  <span style={{ fontSize: 11, color: isCurrent ? 'var(--color-green)' : 'var(--color-text-muted)', minWidth: 16 }}>
                    {index + 1}.
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sib.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
