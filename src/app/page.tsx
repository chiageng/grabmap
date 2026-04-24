"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AimOutlined } from '@ant-design/icons';
import PlaceSearch from '@/components/PlaceSearch';
import { usePulseReport } from '@/hooks/usePulseReport';
import { colorConfig } from '@/config/colors';
import { PText } from '@/components/MyText';
import type { PlaceSearchResult, PulseCompetitor, PulseRequest } from '@/types/pulse';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const PulseReport = dynamic(() => import('@/components/PulseReport'), { ssr: false });

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? '1.3521');
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? '103.8198');
const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? 'SGP';

export default function HomePage() {
  const [request, setRequest] = useState<PulseRequest | null>(null);
  const [searchSlot, setSearchSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSearchSlot(document.getElementById('pp-search-slot'));
  }, []);

  const { data } = usePulseReport(request);

  const handleSearchSelect = (result: PlaceSearchResult) => {
    setRequest({
      placeId: result.placeId,
      lat: result.lat,
      lng: result.lng,
      name: result.name,
      country: DEFAULT_COUNTRY,
    });
  };

  const handlePickLocation = (coords: { lat: number; lng: number }) => {
    setRequest({
      lat: coords.lat,
      lng: coords.lng,
      name: 'Dropped pin',
      country: DEFAULT_COUNTRY,
    });
  };

  const handleCompetitorClick = (competitor: PulseCompetitor) => {
    setRequest({
      placeId: competitor.placeId,
      lat: competitor.lat,
      lng: competitor.lng,
      name: competitor.name,
      country: DEFAULT_COUNTRY,
    });
  };

  const handleClose = () => setRequest(null);

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
            Search a place or tap the map to generate a Pulse Report
          </PText>
        </div>
      )}

      <PulseReport
        request={request}
        onCompetitorClick={handleCompetitorClick}
        onClose={handleClose}
      />

      {searchSlot &&
        createPortal(
          <PlaceSearch
            onSelect={handleSearchSelect}
            bias={biasCoords}
            country={DEFAULT_COUNTRY}
          />,
          searchSlot,
        )}
    </div>
  );
}
