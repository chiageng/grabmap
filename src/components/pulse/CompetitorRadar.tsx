"use client";

import React, { useState } from 'react';
import { Button } from 'antd';
import { StarFilled, DownOutlined, UpOutlined } from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type { PulseCompetitor } from '@/types/pulse';

interface CompetitorRadarProps {
  competitors: PulseCompetitor[];
  onCompetitorClick?: (competitor: PulseCompetitor) => void;
}

const DEFAULT_VISIBLE = 8;
const DISTANCE_THRESHOLD_M = 1000;

function formatDistance(meters: number): string {
  if (meters >= DISTANCE_THRESHOLD_M) {
    return `${(meters / DISTANCE_THRESHOLD_M).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

/**
 * Lists competitors sorted by relevance score (from the engine).
 * Shows the top 8 by default; a "Show all" toggle reveals the full list.
 */
export default function CompetitorRadar({
  competitors,
  onCompetitorClick,
}: CompetitorRadarProps) {
  const [expanded, setExpanded] = useState(false);

  const total = competitors.length;
  const hasMore = total > DEFAULT_VISIBLE;
  const visibleCompetitors = expanded ? competitors : competitors.slice(0, DEFAULT_VISIBLE);

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <HText variant="h5" style={{ marginBottom: 0, color: colorConfig.textPrimary }}>
          Nearby Competitors
        </HText>
        {total > 0 && (
          <PText
            variant="span"
            style={{
              color: colorConfig.textMuted,
              marginBottom: 0,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
            }}
          >
            Sorted by relevance
          </PText>
        )}
      </div>

      {total === 0 && (
        <PText variant="small" style={{ color: colorConfig.textMuted }}>
          No competitors found within range.
        </PText>
      )}

      {visibleCompetitors.map((competitor, index) => (
        <CompetitorRow
          key={competitor.placeId ?? `${competitor.name}-${index}`}
          competitor={competitor}
          rank={index + 1}
          onClick={onCompetitorClick}
        />
      ))}

      {hasMore && (
        <Button
          type="text"
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setExpanded((prev) => !prev)}
          style={{
            alignSelf: 'center',
            marginTop: 4,
            color: colorConfig.primaryColor,
            fontWeight: 600,
          }}
        >
          {expanded ? 'Show fewer' : `Show all ${total}`}
        </Button>
      )}
    </div>
  );
}

/* ── Internal sub-component ─────────────────────────────────────────────── */

interface CompetitorRowProps {
  competitor: PulseCompetitor;
  rank: number;
  onClick?: (competitor: PulseCompetitor) => void;
}

function CompetitorRow({ competitor, rank, onClick }: CompetitorRowProps) {
  const isClickable = !!onClick;

  const handleClick = () => {
    if (onClick) onClick(competitor);
  };

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) handleClick();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 10px',
        borderRadius: 8,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background 0.15s',
        gap: 10,
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
      {/* Rank badge */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: colorConfig.backgroundSecondary,
          color: colorConfig.textMuted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {rank}
      </div>

      {/* Name + category */}
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
        <PText
          variant="span"
          style={{
            color: colorConfig.textMuted,
            marginBottom: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {competitor.category}
        </PText>
      </div>

      {/* Right: distance + rating + relevance bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: 2,
          minWidth: 64,
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

        {competitor.relevance !== undefined && (
          <RelevanceBar score={competitor.relevance} />
        )}
      </div>
    </div>
  );
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const color =
    pct >= 70
      ? colorConfig.primaryColor
      : pct >= 40
        ? colorConfig.warningColor
        : colorConfig.textMuted;
  return (
    <div
      title={`Relevance ${pct}%`}
      style={{
        width: 48,
        height: 3,
        borderRadius: 2,
        background: colorConfig.backgroundSecondary,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}
