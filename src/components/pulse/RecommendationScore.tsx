"use client";

import React from 'react';
import { Progress } from 'antd';
import {
  CheckCircleFilled,
  InfoCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  ShopOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type {
  PulseRecommendation,
  PulseSectionTone,
  PulseRecommendationBreakdown,
} from '@/types/pulse';

interface RecommendationScoreProps {
  recommendation: PulseRecommendation;
}

// ── Tone → palette ──────────────────────────────────────────────────────────

function tonePalette(tone: PulseSectionTone): { accent: string; background: string } {
  switch (tone) {
    case 'positive':
      return { accent: colorConfig.successColor, background: 'rgba(34,197,94,0.08)' };
    case 'warning':
      return { accent: colorConfig.warningColor, background: 'rgba(245,158,11,0.08)' };
    case 'danger':
      return { accent: colorConfig.dangerColor, background: 'rgba(239,68,68,0.08)' };
    case 'neutral':
    default:
      return { accent: colorConfig.primaryColor, background: 'rgba(0,177,79,0.06)' };
  }
}

function verdictIcon(tone: PulseSectionTone) {
  switch (tone) {
    case 'positive':
      return <CheckCircleFilled />;
    case 'warning':
      return <WarningFilled />;
    case 'danger':
      return <CloseCircleFilled />;
    case 'neutral':
    default:
      return <InfoCircleFilled />;
  }
}

// ── Factor metadata for the breakdown ───────────────────────────────────────

interface FactorMeta {
  key: keyof PulseRecommendationBreakdown;
  label: string;
  weight: number;
  icon: React.ReactNode;
  tooltip: string;
}

const FACTORS: FactorMeta[] = [
  {
    key: 'competition',
    label: 'Competition',
    weight: 40,
    icon: <ShopOutlined />,
    tooltip: 'Fewer direct competitors = higher score',
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    weight: 30,
    icon: <EnvironmentOutlined />,
    tooltip: 'MRT proximity + local cluster density',
  },
  {
    key: 'demand',
    label: 'Demand',
    weight: 20,
    icon: <TeamOutlined />,
    tooltip: 'Total POIs in 1km as foot-traffic proxy',
  },
  {
    key: 'diversity',
    label: 'Diversity',
    weight: 10,
    icon: <AppstoreOutlined />,
    tooltip: 'Variety of nearby POI categories',
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function RecommendationScore({
  recommendation,
}: RecommendationScoreProps) {
  const { accent, background } = tonePalette(recommendation.tone);

  return (
    <div
      style={{
        background,
        borderRadius: 12,
        padding: 16,
        border: `2px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: colorConfig.textPrimary,
        }}
      >
        <div style={{ color: accent, fontSize: 20, display: 'flex' }}>
          {verdictIcon(recommendation.tone)}
        </div>
        <HText variant="h5" style={{ marginBottom: 0 }}>
          Recommendation Score
        </HText>
      </div>

      {/* Main score row: circular progress + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Progress
          type="circle"
          percent={recommendation.score}
          size={108}
          strokeColor={accent}
          trailColor={colorConfig.backgroundSecondary}
          strokeWidth={10}
          format={() => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: 1,
              }}
            >
              <span
                style={{ fontSize: 28, fontWeight: 800, color: accent }}
              >
                {recommendation.score}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: colorConfig.textMuted,
                  marginTop: 2,
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                /100
              </span>
            </div>
          )}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <PText
            variant="span"
            style={{
              color: colorConfig.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              fontWeight: 700,
              fontSize: 10,
              marginBottom: 0,
              display: 'block',
            }}
          >
            Verdict
          </PText>
          <div
            style={{
              color: accent,
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1.15,
              marginTop: 2,
            }}
          >
            {recommendation.label}
          </div>
          <PText
            variant="small"
            style={{
              color: colorConfig.textSecondary,
              marginBottom: 0,
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            System recommendation for opening your business at this location.
          </PText>
        </div>
      </div>

      {/* Breakdown bars */}
      <div
        style={{
          borderTop: `1px solid ${colorConfig.borderColor}`,
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <PText
          variant="span"
          style={{
            color: colorConfig.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            fontWeight: 700,
            fontSize: 10,
            marginBottom: 2,
          }}
        >
          How the score is built
        </PText>
        {FACTORS.map((f) => (
          <BreakdownRow
            key={f.key}
            label={f.label}
            weight={f.weight}
            value={recommendation.breakdown[f.key]}
            icon={f.icon}
            tooltip={f.tooltip}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sub-component: one breakdown row ────────────────────────────────────────

interface BreakdownRowProps {
  label: string;
  weight: number;
  value: number;
  icon: React.ReactNode;
  tooltip: string;
}

function BreakdownRow({ label, weight, value, icon, tooltip }: BreakdownRowProps) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor =
    pct >= 70
      ? colorConfig.successColor
      : pct >= 40
        ? colorConfig.warningColor
        : colorConfig.dangerColor;

  return (
    <div
      title={tooltip}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: colorConfig.backgroundColor,
          color: colorConfig.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <PText
            variant="small"
            style={{
              color: colorConfig.textPrimary,
              fontWeight: 600,
              marginBottom: 0,
            }}
          >
            {label}
            <span
              style={{
                color: colorConfig.textMuted,
                fontWeight: 400,
                fontSize: 11,
                marginLeft: 6,
              }}
            >
              · {weight}%
            </span>
          </PText>
          <PText
            variant="small"
            style={{
              color: barColor,
              fontWeight: 700,
              marginBottom: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pct}
          </PText>
        </div>
        <div
          style={{
            height: 5,
            background: colorConfig.backgroundColor,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: barColor,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
