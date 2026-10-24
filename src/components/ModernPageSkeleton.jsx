import React from 'react';

const Block = ({ width = '100%', height = 14, radius = 8 }) => (
  <div className="rq-skeleton-block" style={{ width, height, borderRadius: radius }} />
);

export const ModernPageSkeleton = ({ cards = 4, showHeading = true, compact = false }) => (
  <div className="rq-modern-skeleton" aria-hidden="true" aria-label="Cargando contenido">
    {showHeading && (
      <div>
        <div className="rq-modern-skeleton__heading">
          <Block width={6} height={32} radius={4} />
          <Block width="min(280px, 70%)" height={28} radius={7} />
        </div>
        <div style={{ marginTop: 10 }}><Block width="min(560px, 90%)" height={14} /></div>
      </div>
    )}
    <div className="rq-modern-skeleton__grid">
      {Array.from({ length: cards }, (_, index) => (
        <div className="rq-modern-skeleton__card" key={index} style={{ minHeight: compact ? 92 : 128 }}>
          <Block width={44} height={44} radius={12} />
          <div style={{ marginTop: 16 }}><Block width={`${55 + (index % 3) * 12}%`} height={17} /></div>
          <div style={{ marginTop: 10 }}><Block width={`${78 - (index % 2) * 12}%`} height={12} /></div>
        </div>
      ))}
    </div>
    {!compact && <Block height={210} radius={16} />}
  </div>
);
