"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Skeleton, Spin } from 'antd';
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { usePulseReport } from '@/hooks/usePulseReport';
import PlaceIdentityCard from '@/components/pulse/PlaceIdentityCard';
import RecommendationScore from '@/components/pulse/RecommendationScore';
import DensitySection from '@/components/pulse/DensitySection';
import CompetitorRadar from '@/components/pulse/CompetitorRadar';
import AccessibilityScore from '@/components/pulse/AccessibilityScore';
import AIPulseSummary from '@/components/pulse/AIPulseSummary';
import ShareButton from '@/components/pulse/ShareButton';
import { colorConfig } from '@/config/colors';
import { PText } from '@/components/MyText';
import type { PulseCompetitor, PulseRequest } from '@/types/pulse';

/* ── Layout constants ──────────────────────────────────────────────────── */

const MOBILE_BREAKPOINT = 899; // px — matches the spec's max-width: 899px

interface PulseReportProps {
  request: PulseRequest | null;
  onCompetitorClick?: (competitor: PulseCompetitor) => void;
  onClose?: () => void;
}

/**
 * Responsive Pulse Report panel container.
 *
 * Layout strategy:
 *   - Desktop (>= 900px): fixed right-side panel, 420px wide.
 *   - Mobile  (<= 899px): fixed bottom sheet, 75vh tall with drag-handle.
 *
 * The mobile/desktop switch is driven by a `window.matchMedia` listener
 * mounted inside a `useEffect` (so SSR defaults to desktop, preventing
 * a hydration mismatch on the server).
 *
 * The content area (everything except the Share button) is assigned a ref
 * so html-to-image can snapshot it without the share button appearing in
 * the exported image.
 */
export default function PulseReport({ request, onCompetitorClick, onClose }: PulseReportProps) {
  const { data, isLoading, error, refetch } = usePulseReport(request);

  // SSR-safe mobile detection — default to desktop until client hydrates
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    // Sync immediately on mount
    setIsMobile(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Ref for html-to-image snapshot (excludes the share button)
  const reportRef = useRef<HTMLDivElement>(null);

  // Return nothing when no place is selected
  if (!request) return null;

  /* ── Panel positioning ───────────────────────────────────────────────── */

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '75vh',
        borderRadius: '16px 16px 0 0',
        zIndex: 200,
        background: colorConfig.backgroundColor,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
    : {
        position: 'fixed',
        top: 72,
        right: 16,
        bottom: 16,
        width: 420,
        borderRadius: 16,
        zIndex: 200,
        background: colorConfig.backgroundColor,
        boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      };

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div style={panelStyle}>
      {/* Mobile drag handle */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0 4px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: colorConfig.borderColor,
            }}
          />
        </div>
      )}

      {/* Close button — always shown in top-right corner */}
      <button
        aria-label="Close Pulse Report"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: isMobile ? 16 : 12,
          right: 12,
          background: colorConfig.backgroundSecondary,
          border: 'none',
          borderRadius: '50%',
          width: 30,
          height: 30,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          color: colorConfig.textMuted,
          padding: 0,
        }}
      >
        <CloseOutlined style={{ fontSize: 13 }} />
      </button>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 0',
          scrollbarWidth: 'thin',
        }}
      >
        {/* ── Loading state ────────────────────────────────────────────── */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '60px 0',
            }}
          >
            <Spin size="large" />
            <PText variant="small" style={{ color: colorConfig.textMuted, marginBottom: 0 }}>
              Generating Pulse Report…
            </PText>
            <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 8 }} />
          </div>
        )}

        {/* ── Error state ──────────────────────────────────────────────── */}
        {error && !isLoading && (
          <div style={{ padding: '16px 0' }}>
            <Alert
              type="error"
              showIcon
              message="Failed to load Pulse Report"
              description={error.message || 'An unexpected error occurred. Please try again.'}
              action={
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                  style={{ marginTop: 8 }}
                >
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {/* ── Success state — snapshotted content ──────────────────────── */}
        {data && !isLoading && !error && (
          <div
            ref={reportRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              paddingBottom: 12,
              // Ensure solid background when exported as PNG
              background: colorConfig.backgroundColor,
            }}
          >
            <PlaceIdentityCard place={data.place} />
            <RecommendationScore recommendation={data.recommendation} />
            <DensitySection density={data.density} />
            <CompetitorRadar
              competitors={data.competitors}
              onCompetitorClick={onCompetitorClick}
            />
            <AccessibilityScore accessibility={data.accessibility} />
            <AIPulseSummary
              summary={data.summary}
              generated={data.meta.generatedSummary}
            />
          </div>
        )}
      </div>

      {/* Share button — outside the snapshot ref, fixed at panel bottom */}
      {data && !isLoading && !error && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${colorConfig.borderColor}`,
            background: colorConfig.backgroundColor,
            flexShrink: 0,
          }}
        >
          <ShareButton targetRef={reportRef} placeName={data.place.name} />
        </div>
      )}
    </div>
  );
}
