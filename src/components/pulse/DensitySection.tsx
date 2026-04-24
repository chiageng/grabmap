"use client";

import React from 'react';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type { PulseDensity } from '@/types/pulse';

interface DensitySectionProps {
  density: PulseDensity;
}

const TOP_CATEGORY_COUNT = 5;

/**
 * Renders three stat tiles (300m total, same-category 300m, 1km total)
 * followed by a horizontal list of the top-5 category pills from the
 * category breakdown, giving a quick footprint snapshot of the area.
 */
export default function DensitySection({ density }: DensitySectionProps) {
  const { totalNearby300m, sameCategoryNearby300m, totalNearby1km, categoryBreakdown } = density;

  // Take only the top N categories by count (data may already be sorted)
  const topCategories = [...categoryBreakdown]
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_CATEGORY_COUNT);

  return (
    <div
      style={{
        background: colorConfig.backgroundColor,
        borderRadius: 12,
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <HText variant="h5" style={{ marginBottom: 0, color: colorConfig.textPrimary }}>
        Area Density
      </HText>

      {/* Three stat tiles */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatTile label="300m nearby" value={totalNearby300m} />
        <StatTile label="Same category" value={sameCategoryNearby300m} accent />
        <StatTile label="1km area" value={totalNearby1km} />
      </div>

      {/* Top category pills */}
      {topCategories.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 4,
          }}
        >
          {topCategories.map(({ category, count }) => (
            <span
              key={category}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: colorConfig.accentLight,
                color: colorConfig.primaryColor,
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {category}&nbsp;&middot;&nbsp;{count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Internal sub-component ─────────────────────────────────────────────── */

interface StatTileProps {
  label: string;
  value: number;
  accent?: boolean;
}

function StatTile({ label, value, accent = false }: StatTileProps) {
  return (
    <div
      style={{
        flex: 1,
        background: accent ? colorConfig.accentLight : colorConfig.backgroundSecondary,
        borderRadius: 10,
        padding: '10px 8px',
        textAlign: 'center',
        border: accent ? `1px solid ${colorConfig.primaryColor}` : '1px solid transparent',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: accent ? colorConfig.primaryColor : colorConfig.textPrimary,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <PText
        variant="span"
        style={{
          color: accent ? colorConfig.primaryColor : colorConfig.textMuted,
          marginBottom: 0,
          marginTop: 2,
          display: 'block',
        }}
      >
        {label}
      </PText>
    </div>
  );
}
