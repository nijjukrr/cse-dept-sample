import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import client from '../api/client';
import { parseErrorMessage } from '../utils/errorHandler';

export default function ModuleModal({ isOpen, onClose, onSaved, courseId, module = null }) {
  const [title, setTitle] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(module?.id);

  useEffect(() => {
    if (module) {
      setTitle(module.title || '');
      setSequenceOrder(String(module.sequence_order || '1'));
    } else {
      setTitle('');
      setSequenceOrder('1');
    }
    setError('');
  }, [module, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Module title is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        sequence_order: parseInt(sequenceOrder, 10),
      };

      let res;
      if (isEditing) {
        res = await client.put(`/modules/${module.id}`, payload);
      } else {
        res = await client.post(`/courses/${courseId}/modules`, payload);
      }

      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(parseErrorMessage(err, 'Failed to save module.'));
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
          maxWidth: 480,
          width: '100%',
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
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
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {isEditing ? 'Edit Module' : 'Add Course Module'}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Organize lessons into conceptual curriculum units
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
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
              Module Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Unit 1: Asymptotic Complexity & Divide-and-Conquer"
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
              Sequence Order
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Module' : 'Add Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
