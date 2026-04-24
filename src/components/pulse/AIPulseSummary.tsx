"use client";

import React from 'react';
import { Tag } from 'antd';
import {
  RobotOutlined,
  CheckCircleFilled,
  InfoCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  ShopOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type {
  PulseSummary,
  PulseSummarySection,
  PulseSectionTone,
} from '@/types/pulse';

interface AIPulseSummaryProps {
  summary: PulseSummary;
  /** When false, the AI did not generate the text — a "basic summary" tag is shown. */
  generated: boolean;
}

// ── Tone → visual mapping ───────────────────────────────────────────────────

interface ToneVisuals {
  accent: string;
  background: string;
}

function tonePalette(tone: PulseSectionTone | undefined): ToneVisuals {
  switch (tone) {
    case 'positive':
      return { accent: colorConfig.successColor, background: 'rgba(34, 197, 94, 0.08)' };
    case 'warning':
      return { accent: colorConfig.warningColor, background: 'rgba(245, 158, 11, 0.08)' };
    case 'danger':
      return { accent: colorConfig.dangerColor, background: 'rgba(239, 68, 68, 0.08)' };
    case 'neutral':
    default:
      return { accent: colorConfig.primaryColor, background: 'rgba(0, 177, 79, 0.06)' };
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

function sectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('compet')) return <ShopOutlined />;
  if (t.includes('access') || t.includes('reach')) return <EnvironmentOutlined />;
  if (t.includes('neighborhood') || t.includes('mix')) return <AppstoreOutlined />;
  if (t.includes('recommend')) return <BulbOutlined />;
  return <InfoCircleFilled />;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AIPulseSummary({ summary, generated }: AIPulseSummaryProps) {
  // Backwards compatibility: if `sections` wasn't populated for some reason,
  // fall back to rendering the plain `text` as before.
  const sections: PulseSummarySection[] =
    Array.isArray(summary.sections) && summary.sections.length > 0
      ? summary.sections
      : [];

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
        gap: 14,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined
            style={{ color: colorConfig.primaryColor, fontSize: 18, flexShrink: 0 }}
          />
          <HText
            variant="h5"
            style={{ marginBottom: 0, color: colorConfig.textPrimary }}
          >
            AI Pulse Report
          </HText>
        </div>

        {!generated && (
          <Tag
            style={{
              color: colorConfig.textMuted,
              borderColor: colorConfig.borderColor,
              background: colorConfig.backgroundSecondary,
              fontWeight: 400,
              fontSize: 11,
            }}
          >
            basic summary
          </Tag>
        )}
      </div>

      {/* Verdict badge */}
      {summary.verdict && (
        <VerdictBadge label={summary.verdict.label} tone={summary.verdict.tone} />
      )}

      {/* Section blocks */}
      {sections.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sections.map((section, idx) => (
            <SectionBlock key={`${idx}-${section.title}`} section={section} />
          ))}
        </div>
      ) : (
        <PText
          variant="small"
          style={{
            color: colorConfig.textSecondary,
            lineHeight: 1.6,
            marginBottom: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {summary.text}
        </PText>
      )}

      {/* Generation timestamp — muted footer */}
      <PText
        variant="span"
        style={{ color: colorConfig.textMuted, marginBottom: 0, marginTop: 4 }}
      >
        Generated {new Date(summary.generatedAt).toLocaleString()}
        {summary.model ? ` · ${summary.model}` : ''}
      </PText>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function VerdictBadge({ label, tone }: { label: string; tone: PulseSectionTone }) {
  const { accent, background } = tonePalette(tone);
  return (
    <div
      style={{
        background,
        border: `1.5px solid ${accent}`,
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ color: accent, fontSize: 20, display: 'flex' }}>
        {verdictIcon(tone)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PText
          variant="span"
          style={{
            color: colorConfig.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            fontWeight: 700,
            fontSize: 10,
            marginBottom: 0,
          }}
        >
          Verdict
        </PText>
        <div
          style={{
            color: accent,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: PulseSummarySection }) {
  const { accent, background } = tonePalette(section.tone);
  return (
    <div
      style={{
        background,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: accent,
        }}
      >
        <span style={{ fontSize: 14, display: 'flex' }}>{sectionIcon(section.title)}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: colorConfig.textPrimary }}>
          {section.title}
        </span>
      </div>
      <PText
        variant="small"
        style={{
          color: colorConfig.textSecondary,
          lineHeight: 1.6,
          marginBottom: 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {section.body}
      </PText>
    </div>
  );
}
