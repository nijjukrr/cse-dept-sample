import React from 'react';
import { cn } from '@/lib/utils';
import { Code, GitBranch, Terminal, Award, Cpu, Database, Flame } from 'lucide-react';

const DEFAULT_PLATFORMS = [
  { name: 'GitHub', code: 'github', icon: GitBranch, color: '#24292F', category: 'Open Source' },
  { name: 'LeetCode', code: 'leetcode', icon: Code, color: '#FFA116', category: 'Algorithms' },
  { name: 'Codeforces', code: 'codeforces', icon: Terminal, color: '#1F8ACB', category: 'Contests' },
  { name: 'HackerRank', code: 'hackerrank', icon: Award, color: '#00EA64', category: 'Certifications' },
  { name: 'CodeChef', code: 'codechef', icon: Flame, color: '#5B4638', category: 'Competitive' },
  { name: 'GeeksforGeeks', code: 'geeksforgeeks', icon: Cpu, color: '#2F8D46', category: 'Data Structures' },
  { name: 'Kaggle', code: 'kaggle', icon: Database, color: '#20BEFF', category: 'Machine Learning' },
];

export function LogosCarousel({ className = '', platforms = DEFAULT_PLATFORMS }) {
  return (
    <div
      className={cn('logos-carousel-chanhdai', className)}
      style={{
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        padding: '16px 0',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '24px',
          width: 'max-content',
          animation: 'scroll-marquee 30s linear infinite',
        }}
      >
        {/* Duplicate list to enable smooth continuous loop */}
        {[...platforms, ...platforms].map((platform, idx) => {
          const Icon = platform.icon;
          return (
            <div
              key={`${platform.code}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--green-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-green-dark)',
                }}
              >
                <Icon size={14} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                {platform.name}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  background: 'var(--bg-primary)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                {platform.category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
