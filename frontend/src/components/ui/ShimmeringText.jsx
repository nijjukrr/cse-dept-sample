import React from 'react';
import { cn } from '@/lib/utils';

export function ShimmeringText({
  children,
  className = '',
  shimmerColor = '#F0B400',
  baseColor = 'var(--color-green-dark)',
  style = {},
}) {
  return (
    <span
      className={cn('shimmering-text-chanhdai', className)}
      style={{
        display: 'inline-block',
        background: `linear-gradient(110deg, ${baseColor} 30%, ${shimmerColor} 50%, ${baseColor} 70%)`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shimmer 2.5s infinite linear',
        fontWeight: 800,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
