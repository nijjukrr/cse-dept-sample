import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, Video } from 'lucide-react';
import client from '../api/client';
import { parseErrorMessage } from '../utils/errorHandler';

export default function LessonModal({ isOpen, onClose, onSaved, moduleId, lesson = null }) {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(lesson?.id);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setVideoUrl(lesson.video_url || '');
      setContentMarkdown(lesson.content_markdown || '');
      setSequenceOrder(String(lesson.sequence_order || '1'));
    } else {
      setTitle('');
      setVideoUrl('');
      setContentMarkdown('');
      setSequenceOrder('1');
    }
    setError('');
  }, [lesson, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Lesson title is required.');
      return;
    }

    if (videoUrl.trim()) {
      try {
        const u = new URL(videoUrl.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          setError('Video URL must start with http:// or https://');
          return;
        }
      } catch (_) {
        setError('Please enter a valid video URL.');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        video_url: videoUrl.trim() || null,
        content_markdown: contentMarkdown.trim() || null,
        sequence_order: parseInt(sequenceOrder, 10),
      };

      let res;
      if (isEditing) {
        res = await client.put(`/lessons/${lesson.id}`, payload);
      } else {
        res = await client.post(`/modules/${moduleId}/lessons`, payload);
      }

      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to save lesson.'));
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
          maxWidth: 580,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
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
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {isEditing ? 'Edit Lesson' : 'Add Lesson'}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Author lesson reading material and video lecture resources
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
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Lesson Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Master Theorem & Recurrence Relations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Order
              </label>
              <input
                type="number"
                min="0"
                value={sequenceOrder}
                onChange={(e) => setSequenceOrder(e.target.value)}
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
              <Video size={15} color="var(--color-green)" />
              Video Lecture URL (YouTube, Vimeo, MP4 link)
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
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
              Lesson Reading Material (Markdown / Text Notes)
            </label>
            <textarea
              rows={6}
              placeholder="# Introduction to the Topic&#10;&#10;Explain the concepts, examples, and pseudocode here..."
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-input)',
                fontSize: 14,
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Lesson' : 'Add Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
