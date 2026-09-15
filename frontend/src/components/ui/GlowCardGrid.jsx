import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export function GlowCardGrid({ children, className = '', style = {} }) {
  return (
    <div
      className={cn('glow-card-grid-chanhdai', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function GlowCard({ children, glowColor = 'rgba(42, 125, 20, 0.25)', className = '', style = {}, ...props }) {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={cn('glow-card-chanhdai card', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--border)',
        background: 'var(--bg-card)',
        padding: '24px',
        overflow: 'hidden',
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...style,
      }}
      {...props}
    >
      {/* Radial spotlight on mouse hover */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 70%)`,
            zIndex: 0,
            opacity: 0.8,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
