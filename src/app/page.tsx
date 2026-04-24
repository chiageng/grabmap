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

export default function HomePage() {
  const [request, setRequest] = useState<PulseRequest | null>(null);
  const [scoutAnalysis, setScoutAnalysis] = useState<ScoutAnalysis | null>(null);
  const [searchSlot, setSearchSlot] = useState<HTMLElement | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setSearchSlot(document.getElementById('pp-search-slot'));
  }, []);

  const { data } = usePulseReport(request);

  const clearScoutContext = () => setScoutAnalysis(null);

  const handleSearchSelect = (result: PlaceSearchResult) => {
    clearScoutContext();
    setRequest({
      placeId: result.placeId,
      lat: result.lat,
      lng: result.lng,
      name: result.name,
      country: DEFAULT_COUNTRY,
    });
  };

  const handlePickLocation = (coords: { lat: number; lng: number }) => {
    clearScoutContext();
    setRequest({
      lat: coords.lat,
      lng: coords.lng,
      name: 'Dropped pin',
      country: DEFAULT_COUNTRY,
    });
  };

  const handleCompetitorClick = (competitor: PulseCompetitor) => {
    clearScoutContext();
    setRequest({
      placeId: competitor.placeId,
      lat: competitor.lat,
      lng: competitor.lng,
      name: competitor.name,
      country: DEFAULT_COUNTRY,
    });
  };

  const handleClose = () => {
    clearScoutContext();
    setRequest(null);
  };

  const handleScoutSuccess = ({ report, analysis }: ScoutResponse) => {
    const newRequest: PulseRequest = {
      placeId: report.place.placeId,
      lat: report.place.lat,
      lng: report.place.lng,
      name: report.place.name,
      country: DEFAULT_COUNTRY,
    };

    // Seed the TanStack cache so usePulseReport picks up the scout result
    // without refetching /api/pulse for the same coords.
    queryClient.setQueryData(
      ['pulse', newRequest.lat, newRequest.lng, newRequest.placeId],
      report,
    );

    setScoutAnalysis(analysis);
    setRequest(newRequest);
  };

  const selectedPlace = useMemo(
    () =>
      request
        ? { lat: request.lat, lng: request.lng, name: request.name ?? 'Selected place' }
        : null,
    [request],
  );

  const biasCoords = request
    ? { lat: request.lat, lng: request.lng }
    : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
      <MapView
        selectedPlace={selectedPlace}
        competitors={data?.competitors}
        nearestMrt={data?.accessibility.nearestMrt ?? null}
        heatmapPoints={data?.density.heatmapPoints}
        onPickLocation={handlePickLocation}
      />

      {!request && (
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

      {scoutAnalysis && (
        <ScoutContextBanner
          analysis={scoutAnalysis}
          onClose={clearScoutContext}
        />
      )}

      <PulseReport
        request={request}
        onCompetitorClick={handleCompetitorClick}
        onClose={handleClose}
      />

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
            <ScoutPrompt onScoutSuccess={handleScoutSuccess} />
          </div>,
          searchSlot,
        )}
    </div>
  );
}

/**
 * Prominent banner over the map that tells the user what scouting analysis
 * is currently active — which business type, anchor location, how many
 * direct competitors were found, and the keywords used to match them.
 */
function ScoutContextBanner({
  analysis,
  onClose,
}: {
  analysis: ScoutAnalysis;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 452, // leave room for the 420px desktop report panel + 16px gap
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
          style={{
            fontSize: 13,
            color: colorConfig.textSecondary,
            marginTop: 2,
          }}
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
            : `${analysis.totalCompetitorsFound} direct competitor${analysis.totalCompetitorsFound === 1 ? '' : 's'} within ${analysis.competitorRadiusKm}km` +
              (analysis.totalCompetitorsFound > analysis.competitorsShown
                ? ` (showing nearest ${analysis.competitorsShown})`
                : '')}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 8,
          }}
        >
          {analysis.categoryKeywords.slice(0, 6).map((kw) => (
            <span
              key={kw}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: colorConfig.backgroundSecondary,
                color: colorConfig.textSecondary,
                border: `1px solid ${colorConfig.borderColor}`,
              }}
            >
              {kw}
            </span>
          ))}
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
