"use client";

import React from 'react';
import { Tag } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import { colorConfig } from '@/config/colors';
import type { PulseSummary } from '@/types/pulse';

interface AIPulseSummaryProps {
  summary: PulseSummary;
  /** When false, the AI did not generate the text — a "basic summary" tag is shown. */
  generated: boolean;
}

/**
 * Card displaying the AI-generated (or fallback) textual summary of a place's
 * commercial environment. The Grab-green left border mirrors PlaceIdentityCard
 * for visual consistency across the report.
 */
export default function AIPulseSummary({ summary, generated }: AIPulseSummaryProps) {
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
        gap: 8,
      }}
    >
      {/* Header row: icon + title + optional tag */}
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
            AI Pulse Summary
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

      {/* Summary body */}
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
