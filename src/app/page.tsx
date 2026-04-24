"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AimOutlined, CloseOutlined, ShopOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import PlaceSearch from '@/components/PlaceSearch';
import ScoutPrompt from '@/components/ScoutPrompt';
import { usePulseReport } from '@/hooks/usePulseReport';
import { colorConfig } from '@/config/colors';
import { PText } from '@/components/MyText';
import type {
  PlaceSearchResult,
  PulseCompetitor,
  PulseRequest,
  ScoutResponse,
  ScoutAnalysis,
} from '@/types/pulse';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const PulseReport = dynamic(() => import('@/components/PulseReport'), { ssr: false });

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? '1.3521');
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? '103.8198');
const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? 'SGP';

// Comparison layout constants — tuned so two 380px panels + 16px gutters fit
// comfortably inside a typical desktop viewport without covering the map.
const COMPARE_PANEL_WIDTH = 380;
const COMPARE_GUTTER = 12;
const SOLO_PANEL_WIDTH = 420;

interface PanelState {
  request: PulseRequest;
  scoutAnalysis?: ScoutAnalysis;
}

export default function HomePage() {
  const [panels, setPanels] = useState<PanelState[]>([]);
  const [searchSlot, setSearchSlot] = useState<HTMLElement | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setSearchSlot(document.getElementById('pp-search-slot'));
  }, []);

  const primary = panels[0] ?? null;
  const secondary = panels[1] ?? null;
  const isComparing = panels.length >= 2;

  // Fetch primary and secondary in parallel. Both hooks are cached by
  // request coords in TanStack Query so scout cache-seeding still works.
  const { data: primaryData } = usePulseReport(primary?.request ?? null);
  const { data: secondaryData } = usePulseReport(secondary?.request ?? null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const replacePrimary = (req: PulseRequest, analysis?: ScoutAnalysis) => {
    setPanels([{ request: req, scoutAnalysis: analysis }]);
  };

  const addComparisonPanel = (req: PulseRequest, analysis?: ScoutAnalysis) => {
    setPanels((prev) => {
      const head = prev[0];
      if (!head) return [{ request: req, scoutAnalysis: analysis }];
      return [head, { request: req, scoutAnalysis: analysis }];
    });
  };

  const handleSearchSelect = (result: PlaceSearchResult) => {
    replacePrimary({
      placeId: result.placeId,
      lat: result.lat,
      lng: result.lng,
      name: result.name,
      country: DEFAULT_COUNTRY,
    });
  };

  const handlePickLocation = (coords: { lat: number; lng: number }) => {
    replacePrimary({
      lat: coords.lat,
      lng: coords.lng,
      name: 'Dropped pin',
      country: DEFAULT_COUNTRY,
    });
  };

  const handleCompetitorClick = (competitor: PulseCompetitor) => {
    replacePrimary({
      placeId: competitor.placeId,
      lat: competitor.lat,
      lng: competitor.lng,
      name: competitor.name,
      country: DEFAULT_COUNTRY,
    });
  };

  const handleClosePrimary = () => setPanels([]);
  const handleCloseSecondary = () =>
    setPanels((prev) => (prev.length >= 2 ? [prev[0]] : prev));

  const seedCacheAndBuildPanel = (resp: ScoutResponse): PanelState => {
    const req: PulseRequest = {
      placeId: resp.report.place.placeId,
      lat: resp.report.place.lat,
      lng: resp.report.place.lng,
      name: resp.report.place.name,
      country: DEFAULT_COUNTRY,
    };
    // Seed TanStack cache so usePulseReport returns immediately without refetch.
    queryClient.setQueryData(
      ['pulse', req.lat, req.lng, req.placeId],
      resp.report,
    );
    return { request: req, scoutAnalysis: resp.analysis };
  };

  const handlePrimaryScoutSuccess = (resp: ScoutResponse) => {
    const panel = seedCacheAndBuildPanel(resp);
    setPanels([panel]);
  };

  const handleCompareScoutSuccess = (resp: ScoutResponse) => {
    const panel = seedCacheAndBuildPanel(resp);
    addComparisonPanel(panel.request, panel.scoutAnalysis);
  };

  // ── Derived state for map ─────────────────────────────────────────────────

  const primaryPlace = useMemo(
    () =>
      primary
        ? {
            lat: primary.request.lat,
            lng: primary.request.lng,
            name: primary.request.name ?? 'Selected place',
          }
        : null,
    [primary],
  );

  const secondaryPlace = useMemo(
    () =>
      secondary
        ? {
            lat: secondary.request.lat,
            lng: secondary.request.lng,
            name: secondary.request.name ?? 'Comparison place',
          }
        : null,
    [secondary],
  );

  const biasCoords = primary
    ? { lat: primary.request.lat, lng: primary.request.lng }
    : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

  // Panel positioning. When comparing, both panels are narrower.
  const panelWidth = isComparing ? COMPARE_PANEL_WIDTH : SOLO_PANEL_WIDTH;
  const primaryOffset = 16;
  const secondaryOffset = 16 + COMPARE_PANEL_WIDTH + COMPARE_GUTTER;

  // Banner right-offset leaves room for the panel(s) so it doesn't overlap.
  const bannerRightReserve = isComparing
    ? secondaryOffset + panelWidth + 16
    : primaryOffset + panelWidth + 16;

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
      <MapView
        selectedPlace={primaryPlace}
        secondaryPlace={secondaryPlace}
        competitors={primaryData?.competitors}
        nearestMrt={primaryData?.accessibility.nearestMrt ?? null}
        heatmapPoints={primaryData?.density.heatmapPoints}
        secondaryHeatmapPoints={secondaryData?.density.heatmapPoints}
        heatmapMode={primary?.scoutAnalysis ? 'competitors' : 'all'}
        onPickLocation={handlePickLocation}
      />

      {!primary && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: colorConfig.backgroundColor,
            borderRadius: 999,
            padding: '10px 18px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <AimOutlined style={{ color: colorConfig.primaryColor, fontSize: 16 }} />
          <PText variant="small" style={{ margin: 0, color: colorConfig.textSecondary }}>
            Search, tap the map, or Ask AI to generate a Pulse Report
          </PText>
        </div>
      )}

      {primary?.scoutAnalysis && !isComparing && (
        <ScoutContextBanner
          analysis={primary.scoutAnalysis}
          onClose={handleClosePrimary}
          bannerRightReserve={bannerRightReserve}
          onCompareSuccess={handleCompareScoutSuccess}
        />
      )}

      {isComparing && primary && secondary && (
        <CompareContextBanner
          primary={primary}
          secondary={secondary}
          onCloseAll={handleClosePrimary}
          bannerRightReserve={bannerRightReserve}
        />
      )}

      {/* Primary panel */}
      <PulseReport
        request={primary?.request ?? null}
        onCompetitorClick={handleCompetitorClick}
        onClose={handleClosePrimary}
        rightOffset={isComparing ? secondaryOffset : primaryOffset}
        panelWidth={panelWidth}
        panelLabel={isComparing ? 'Location 1' : undefined}
      />

      {/* Secondary panel (compare mode, desktop only) */}
      {isComparing && (
        <PulseReport
          request={secondary?.request ?? null}
          onClose={handleCloseSecondary}
          rightOffset={primaryOffset}
          panelWidth={panelWidth}
          panelLabel="Location 2"
          hideOnMobile
        />
      )}

      {searchSlot &&
        createPortal(
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <PlaceSearch
                onSelect={handleSearchSelect}
                bias={biasCoords}
                country={DEFAULT_COUNTRY}
              />
            </div>
            <ScoutPrompt onScoutSuccess={handlePrimaryScoutSuccess} />
          </div>,
          searchSlot,
        )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

interface ScoutContextBannerProps {
  analysis: ScoutAnalysis;
  onClose: () => void;
  bannerRightReserve: number;
  onCompareSuccess: (resp: ScoutResponse) => void;
}

function ScoutContextBanner({
  analysis,
  onClose,
  bannerRightReserve,
  onCompareSuccess,
}: ScoutContextBannerProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: bannerRightReserve,
        maxWidth: 560,
        background: colorConfig.backgroundColor,
        borderRadius: 14,
        padding: '14px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: `2px solid ${colorConfig.primaryColor}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        zIndex: 6,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: colorConfig.primaryColor,
          color: colorConfig.primaryForegroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ShopOutlined style={{ fontSize: 20 }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: colorConfig.primaryColor,
            marginBottom: 2,
          }}
        >
          Competitor Analysis
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: colorConfig.textPrimary,
            lineHeight: 1.3,
            textTransform: 'capitalize',
          }}
        >
          {analysis.businessType}
        </div>
        <div
          style={{ fontSize: 13, color: colorConfig.textSecondary, marginTop: 2 }}
        >
          near <strong>{analysis.anchorName}</strong>
        </div>
        <div
          style={{
            fontSize: 13,
            color: colorConfig.textPrimary,
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          {analysis.totalCompetitorsFound === 0
            ? `No direct competitors found within ${analysis.competitorRadiusKm}km`
            : `${analysis.totalCompetitorsFound} direct competitor${analysis.totalCompetitorsFound === 1 ? '' : 's'} within ${analysis.competitorRadiusKm}km`}
        </div>

        {/* Compare CTA + heatmap legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <ScoutPrompt
            onScoutSuccess={onCompareSuccess}
            compareForBusinessType={analysis.businessType}
            triggerVariant="compare-chip"
          />
          {analysis.totalCompetitorsFound > 0 && (
            <div
              style={{
                fontSize: 11,
                color: colorConfig.textMuted,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 8,
                  borderRadius: 2,
                  background:
                    'linear-gradient(90deg, rgba(254,215,170,0.6), rgba(251,146,60,0.8), rgba(239,68,68,0.9))',
                }}
              />
              Red heat = competitor clusters
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        aria-label="Clear scout context"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: colorConfig.textMuted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CloseOutlined />
      </button>
    </div>
  );
}

interface CompareContextBannerProps {
  primary: PanelState;
  secondary: PanelState;
  onCloseAll: () => void;
  bannerRightReserve: number;
}

function CompareContextBanner({
  primary,
  secondary,
  onCloseAll,
  bannerRightReserve,
}: CompareContextBannerProps) {
  const businessType =
    primary.scoutAnalysis?.businessType ??
    secondary.scoutAnalysis?.businessType ??
    'selected business';
  const primaryAnchor =
    primary.scoutAnalysis?.anchorName ?? primary.request.name ?? 'Location 1';
  const secondaryAnchor =
    secondary.scoutAnalysis?.anchorName ?? secondary.request.name ?? 'Location 2';
  const primaryCompetitors = primary.scoutAnalysis?.totalCompetitorsFound;
  const secondaryCompetitors = secondary.scoutAnalysis?.totalCompetitorsFound;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: bannerRightReserve,
        maxWidth: 640,
        background: colorConfig.backgroundColor,
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: `2px solid ${colorConfig.primaryColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 6,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: colorConfig.primaryColor,
            marginBottom: 4,
          }}
        >
          Comparing · {businessType}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            fontSize: 13,
            color: colorConfig.textPrimary,
            flexWrap: 'wrap',
          }}
        >
          <CompareAnchorChip
            badge="1"
            color={colorConfig.primaryColor}
            label={primaryAnchor}
            competitors={primaryCompetitors}
          />
          <span style={{ color: colorConfig.textMuted, fontSize: 11 }}>VS</span>
          <CompareAnchorChip
            badge="2"
            color="#1677FF"
            label={secondaryAnchor}
            competitors={secondaryCompetitors}
          />
        </div>

        {/* Heatmap legend — tells user red/blue pair = location 1/2 clusters */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginTop: 8,
            fontSize: 11,
            color: colorConfig.textMuted,
            flexWrap: 'wrap',
          }}
        >
          <LegendSwatch
            gradient="linear-gradient(90deg, rgba(254,215,170,0.6), rgba(251,146,60,0.8), rgba(239,68,68,0.9))"
            label="① heat"
          />
          <LegendSwatch
            gradient="linear-gradient(90deg, rgba(186,230,253,0.6), rgba(56,189,248,0.8), rgba(22,119,255,0.9))"
            label="② heat"
          />
          <span>Cold zones = fewer direct competitors</span>
        </div>
      </div>

      <button
        onClick={onCloseAll}
        aria-label="Clear comparison"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: colorConfig.textMuted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CloseOutlined />
      </button>
    </div>
  );
}

function LegendSwatch({ gradient, label }: { gradient: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: 8,
          borderRadius: 2,
          background: gradient,
        }}
      />
      <span style={{ fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function CompareAnchorChip({
  badge,
  color,
  label,
  competitors,
}: {
  badge: string;
  color: string;
  label: string;
  competitors?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          background: color,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {badge}
      </span>
      <span
        style={{
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 220,
        }}
      >
        {label}
      </span>
      {competitors !== undefined && (
        <span style={{ color: colorConfig.textMuted, fontSize: 12 }}>
          · {competitors} comp.
        </span>
      )}
    </div>
  );
}
