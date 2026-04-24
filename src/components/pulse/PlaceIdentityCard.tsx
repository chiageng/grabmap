"use client";

import React from 'react';
import { StarFilled, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type { PulsePlace } from '@/types/pulse';

interface PlaceIdentityCardProps {
  place: PulsePlace;
}

/**
 * Displays the core identity of a place: name, category, address,
 * optional star rating, and opening hours.
 *
 * A 4px Grab-green left border provides the brand accent, consistent
 * with the AI summary card design for visual hierarchy.
 */
export default function PlaceIdentityCard({ place }: PlaceIdentityCardProps) {
  const { name, category, address, rating, hours } = place;

  return (
    <div
      style={{
        background: colorConfig.backgroundColor,
        borderRadius: 12,
        boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        padding: 16,
        borderLeft: `4px solid ${colorConfig.primaryColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Place name */}
      <HText variant="h4" style={{ marginBottom: 2, color: colorConfig.textPrimary }}>
        {name}
      </HText>

      {/* Category + rating row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <PText variant="small" style={{ color: colorConfig.textMuted, marginBottom: 0 }}>
          {category}
        </PText>

        {rating !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StarFilled style={{ color: '#faad14', fontSize: 14 }} />
            <PText
              variant="small"
              style={{ color: colorConfig.textSecondary, marginBottom: 0, fontWeight: 600 }}
            >
              {rating.toFixed(1)}
            </PText>
          </div>
        )}
      </div>

      {/* Address */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
        <EnvironmentOutlined
          style={{ color: colorConfig.primaryColor, fontSize: 13, marginTop: 2, flexShrink: 0 }}
        />
        <PText variant="small" style={{ color: colorConfig.textMuted, marginBottom: 0 }}>
          {address}
        </PText>
      </div>

      {/* Opening hours — rendered only when present */}
      {hours && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <ClockCircleOutlined
            style={{ color: colorConfig.textMuted, fontSize: 13, flexShrink: 0 }}
          />
          <PText variant="small" style={{ color: colorConfig.textMuted, marginBottom: 0 }}>
            {hours}
          </PText>
        </div>
      )}
    </div>
  );
}
