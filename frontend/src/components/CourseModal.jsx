import React, { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import client from '../api/client';
import { parseErrorMessage } from '../utils/errorHandler';

export default function CourseModal({ isOpen, onClose, onSaved, course = null }) {
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    semester: '1',
    credits: '3',
    target_class: '',
    is_published: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(course?.id);

  useEffect(() => {
    if (course) {
      setFormData({
        code: course.code || '',
        title: course.title || '',
        description: course.description || '',
        semester: String(course.semester || '1'),
        credits: String(course.credits || '3'),
        target_class: course.target_class || '',
        is_published: Boolean(course.is_published),
      });
    } else {
      setFormData({
        code: '',
        title: '',
        description: '',
        semester: '1',
        credits: '3',
        target_class: '',
        is_published: false,
      });
    }
    setError('');
  }, [course, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.code.trim()) {
      setError('Course code is required.');
      return;
    }
    if (!formData.title.trim()) {
      setError('Course title is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        semester: parseInt(formData.semester, 10),
        credits: parseInt(formData.credits, 10),
        target_class: formData.target_class.trim() || null,
        is_published: formData.is_published,
      };

      let res;
      if (isEditing) {
        res = await client.put(`/courses/${course.id}`, payload);
      } else {
        res = await client.post('/courses', payload);
      }

      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to save course.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="card animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 540,
          width: '100%',
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--green-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-green)',
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {isEditing ? 'Edit Course' : 'Create New Course'}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {isEditing ? 'Update course metadata and curriculum settings' : 'Add a new subject to the curriculum'}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4, borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: '#FEF2F2',
              color: '#DC2626',
              fontSize: 13,
              marginBottom: 16,
              border: '1px solid #FCA5A5',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Course Code *
              </label>
              <input
                type="text"
                name="code"
                placeholder="e.g. CS8401"
                value={formData.code}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-input)',
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Course Title *
              </label>
              <input
                type="text"
                name="title"
                placeholder="e.g. Design & Analysis of Algorithms"
                value={formData.title}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-input)',
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Semester *
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-input)',
                  fontSize: 14,
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Credits *
              </label>
              <input
                type="number"
                name="credits"
                min="1"
                max="10"
                value={formData.credits}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-input)',
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Target Class
              </label>
              <input
                type="text"
                name="target_class"
                placeholder="e.g. CSE-A, CSE-B"
                value={formData.target_class}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-input)',
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
              Description & Syllabus Summary
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Outline course objectives, prerequisites, and learning outcomes..."
              value={formData.description}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-input)',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              type="checkbox"
              id="is_published"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              style={{ width: 16, height: 16, accentColor: 'var(--color-green)' }}
            />
            <label htmlFor="is_published" style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', cursor: 'pointer' }}>
              Publish immediately (visible to enrolled students in catalog)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
