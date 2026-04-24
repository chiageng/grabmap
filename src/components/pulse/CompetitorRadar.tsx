"use client";

import React from 'react';
import { StarFilled } from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type { PulseCompetitor } from '@/types/pulse';

interface CompetitorRadarProps {
  competitors: PulseCompetitor[];
  onCompetitorClick?: (competitor: PulseCompetitor) => void;
}

const MAX_COMPETITORS = 8;
const DISTANCE_THRESHOLD_M = 1000;

/**
 * Formats a raw distance in meters into a human-readable string.
 * Values >= 1000m are shown as "X.Xkm"; below that as "Xm".
 */
function formatDistance(meters: number): string {
  if (meters >= DISTANCE_THRESHOLD_M) {
    return `${(meters / DISTANCE_THRESHOLD_M).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

/**
 * Lists up to 8 nearby competitors as clickable rows.
 * Clicking a row triggers onCompetitorClick so the parent can
 * re-run a Pulse Report centred on that competitor.
 */
export default function CompetitorRadar({ competitors, onCompetitorClick }: CompetitorRadarProps) {
  const visibleCompetitors = competitors.slice(0, MAX_COMPETITORS);

  return (
    <div
      style={{
        background: colorConfig.backgroundColor,
        borderRadius: 12,
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <HText variant="h5" style={{ marginBottom: 4, color: colorConfig.textPrimary }}>
        Nearby Competitors
      </HText>

      {visibleCompetitors.length === 0 && (
        <PText variant="small" style={{ color: colorConfig.textMuted }}>
          No competitors found within range.
        </PText>
      )}

      {visibleCompetitors.map((competitor, index) => (
        <CompetitorRow
          key={competitor.placeId ?? `${competitor.name}-${index}`}
          competitor={competitor}
          onClick={onCompetitorClick}
        />
      ))}
    </div>
  );
}

/* ── Internal sub-component ─────────────────────────────────────────────── */

interface CompetitorRowProps {
  competitor: PulseCompetitor;
  onClick?: (competitor: PulseCompetitor) => void;
}

function CompetitorRow({ competitor, onClick }: CompetitorRowProps) {
  const isClickable = !!onClick;

  const handleClick = () => {
    if (onClick) {
      onClick(competitor);
    }
  };

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          handleClick();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderRadius: 8,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background 0.15s',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,177,79,0.06)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Left: name + category */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <PText
          variant="small"
          style={{
            color: colorConfig.textPrimary,
            fontWeight: 600,
            marginBottom: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {competitor.name}
        </PText>
        <PText variant="span" style={{ color: colorConfig.textMuted, marginBottom: 0 }}>
          {competitor.category}
        </PText>
      </div>

      {/* Right: distance + optional rating */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: 2,
        }}
      >
        <PText
          variant="span"
          style={{
            color: colorConfig.primaryColor,
            fontWeight: 600,
            marginBottom: 0,
          }}
        >
          {formatDistance(competitor.distanceMeters)}
        </PText>

        {competitor.rating !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <StarFilled style={{ color: '#faad14', fontSize: 11 }} />
            <PText variant="span" style={{ color: colorConfig.textMuted, marginBottom: 0 }}>
              {competitor.rating.toFixed(1)}
            </PText>
          </div>
        )}
      </div>
    </div>
  );
}
