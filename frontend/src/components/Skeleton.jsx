import React from 'react';

export default function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #EAEFE7 25%, #F5F7F3 50%, #EAEFE7 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s infinite ease-in-out',
        ...style,
      }}
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="90px" height="24px" borderRadius="var(--radius-full)" />
        <Skeleton width="110px" height="20px" borderRadius="var(--radius-xs)" />
      </div>
      <Skeleton width="80%" height="24px" />
      <Skeleton width="100%" height="16px" />
      <Skeleton width="60%" height="16px" />
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skeleton width="36px" height="36px" borderRadius="50%" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Skeleton width="120px" height="14px" />
          <Skeleton width="80px" height="12px" />
        </div>
      </div>
    </div>
  );
}
