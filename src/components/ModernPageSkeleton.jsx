import React from 'react';

const Block = ({ width = '100%', height = 14, radius = 8 }) => (
  <div className="rq-skeleton-block" style={{ width, height, borderRadius: radius }} />
);

export const ModernPageSkeleton = ({
  cards = 4,
  showHeading = true,
  compact = false,
  label = 'Sincronizando módulo académico · RimaqMasiEDU',
}) => (
  <div className="rq-modern-skeleton" aria-hidden="true" aria-label="Cargando contenido">
    {!compact && (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '14px 18px',
          marginBottom: 8,
          borderRadius: 'var(--card-radius)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-outline-variant)',
          boxShadow: 'var(--shadow-level-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--color-primary-text)',
                boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-primary-text) 18%, transparent)',
              }}
            />
            <strong style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {label}
            </strong>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
            Cargando…
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 999,
            overflow: 'hidden',
            background: 'var(--color-surface-container-high)',
          }}
        >
          <div
            style={{
              width: '45%',
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-text))',
            }}
          />
        </div>
      </div>
    )}
    {showHeading && (
      <div>
        <div className="rq-modern-skeleton__heading">
          <Block width={4} height={28} radius={999} />
          <Block width="min(280px, 70%)" height={26} radius={7} />
        </div>
        <div style={{ marginTop: 10 }}><Block width="min(540px, 90%)" height={14} /></div>
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
    {!compact && <Block height={210} radius={14} />}
  </div>
);
