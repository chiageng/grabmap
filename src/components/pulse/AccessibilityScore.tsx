"use client";

import React from 'react';
import { Progress } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type { PulseAccessibility } from '@/types/pulse';

interface AccessibilityScoreProps {
  accessibility: PulseAccessibility;
}

/**
 * Displays the accessibility score as a circular Antd Progress gauge
 * and shows the nearest MRT station details beneath it.
 *
 * Score is expected to be in the range 0–100.
 */
export default function AccessibilityScore({ accessibility }: AccessibilityScoreProps) {
  const { score, nearestMrt } = accessibility;

  /**
   * Determine the stroke color based on the score bracket so users
   * get an immediate red/amber/green reading at a glance.
   */
  const strokeColor = score >= 75
    ? colorConfig.primaryColor
    : score >= 50
      ? colorConfig.warningColor
      : colorConfig.dangerColor;

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
        Accessibility Score
      </HText>

      {/* Circular progress + score label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <Progress
          type="circle"
          percent={score}
          strokeColor={strokeColor}
          size={80}
          format={(pct) => (
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: strokeColor,
              }}
            >
              {pct}
            </span>
          )}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <PText
            variant="small"
            style={{ color: colorConfig.textMuted, marginBottom: 4 }}
          >
            Based on transit proximity, walkability, and nearby services.
          </PText>

          {/* MRT info */}
          {nearestMrt ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                marginTop: 4,
              }}
            >
              <EnvironmentOutlined
                style={{
                  color: colorConfig.primaryColor,
                  fontSize: 13,
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <PText
                variant="small"
                style={{ color: colorConfig.textSecondary, marginBottom: 0 }}
              >
                <strong>{nearestMrt.name}</strong>
                {' — '}
                {nearestMrt.walkingMinutes} min walk,{' '}
                {nearestMrt.walkingDistanceMeters}m
              </PText>
            </div>
          ) : (
            <PText
              variant="small"
              style={{ color: colorConfig.textMuted, marginBottom: 0, fontStyle: 'italic' }}
            >
              No nearby MRT within 1km
            </PText>
          )}
        </div>
      </div>
    </div>
  );
}
