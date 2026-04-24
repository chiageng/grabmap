"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGrabMapStyle } from '@/hooks/useGrabMapStyle';
import type { PulseCompetitor, PulseNearestTransit, PulseHeatmapPoint } from '@/types/pulse';

// ─── Constants ───────────────────────────────────────────────────────────────

const GRAB_GREEN = '#00B14F';
const COMPETITOR_ORANGE = '#FF8C00';
const MRT_BLUE = '#1677FF';
const HEATMAP_LAYER_ID = 'pulse-heatmap-layer';
const HEATMAP_SOURCE_ID = 'pulse-heatmap-source';
const MRT_LINE_SOURCE_ID = 'pulse-mrt-line-source';
const MRT_LINE_LAYER_ID = 'pulse-mrt-line-layer';

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? '1.3521');
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? '103.8198');
const DEFAULT_ZOOM = 14;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedPlace?: { lat: number; lng: number; name: string } | null;
  competitors?: PulseCompetitor[];
  nearestMrt?: PulseNearestTransit | null;
  heatmapPoints?: PulseHeatmapPoint[];
  onPickLocation?: (coords: { lat: number; lng: number }) => void;
}

// ─── Marker helpers ───────────────────────────────────────────────────────────

/** Creates the custom HTML element for the selected-place marker (green circle). */
function createSelectedPlaceElement(): HTMLElement {
  const outer = document.createElement('div');
  outer.style.cssText = `
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${GRAB_GREEN};
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  const inner = document.createElement('div');
  inner.style.cssText = `
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
  `;
  outer.appendChild(inner);
  return outer;
}

/** Creates the HTML element for a competitor marker (small orange dot). */
function createCompetitorElement(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${COMPETITOR_ORANGE};
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  return el;
}

/** Creates the HTML element for the MRT marker (blue dot + label). */
function createMrtElement(name: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    cursor: default;
  `;
  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${MRT_BLUE};
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  `;
  const label = document.createElement('div');
  label.textContent = name.length > 12 ? 'MRT' : name;
  label.style.cssText = `
    background: ${MRT_BLUE};
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
  `;
  wrapper.appendChild(dot);
  wrapper.appendChild(label);
  return wrapper;
}

// ─── Idempotent source/layer helpers ─────────────────────────────────────────

/** Removes a layer then its source if they exist, safe to call when absent. */
function removeLayerAndSource(map: maplibregl.Map, layerId: string, sourceId: string): void {
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * MapView renders a full-height MapLibre GL map powered by GrabMaps tiles (or
 * OSM fallback). It manages markers and layers for the selected place,
 * competitors, nearest MRT transit stop, and a foot-traffic heatmap.
 */
const MapView = React.memo(function MapView({
  center,
  zoom = DEFAULT_ZOOM,
  selectedPlace,
  competitors,
  nearestMrt,
  heatmapPoints,
  onPickLocation,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const competitorMarkersRef = useRef<maplibregl.Marker[]>([]);
  const mrtMarkerRef = useRef<maplibregl.Marker | null>(null);
  // Track whether the map style has finished loading so we can safely mutate sources/layers.
  const isStyleReadyRef = useRef(false);

  const { style, isLoading: isStyleLoading } = useGrabMapStyle();

  // Stable callback ref to avoid re-initialising the map when the parent rerenders.
  const onPickLocationRef = useRef(onPickLocation);
  useEffect(() => {
    onPickLocationRef.current = onPickLocation;
  }, [onPickLocation]);

  // ── Map initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !style || isStyleLoading) return;
    // Prevent double-init (React StrictMode fires effects twice in dev).
    if (mapRef.current) return;

    const initialCenter: [number, number] = center
      ? [center.lng, center.lat]
      : [DEFAULT_LNG, DEFAULT_LAT];

    // All Grab URLs have been rewritten by `useGrabMapStyle` to point at our
    // same-origin /api/map-proxy/... endpoints, so the browser never makes
    // cross-origin requests to maps.grab.com and no custom headers are needed.
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style as maplibregl.StyleSpecification,
      center: initialCenter,
      zoom,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right',
    );

    // Mark style as ready so effect callbacks can safely mutate sources/layers.
    map.on('load', () => {
      isStyleReadyRef.current = true;
    });
    map.on('idle', () => {
      isStyleReadyRef.current = true;
    });

    // Fire onPickLocation for every map click.
    map.on('click', (e) => {
      onPickLocationRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    return () => {
      isStyleReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, isStyleLoading]);
  // Intentionally omitting `center` and `zoom` — we only want to init once.

  // ── Utility: run callback when map style is ready ─────────────────────────
  const whenStyleReady = useCallback((fn: (map: maplibregl.Map) => void) => {
    const map = mapRef.current;
    if (!map) return;
    if (isStyleReadyRef.current && map.isStyleLoaded()) {
      fn(map);
    } else {
      // Wait for the next idle event (fires after load + source fetches settle).
      const handler = () => {
        isStyleReadyRef.current = true;
        fn(map);
        map.off('idle', handler);
      };
      map.on('idle', handler);
    }
  }, []);

  // ── Selected place marker + flyTo ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous selected marker.
    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;

    if (!selectedPlace) return;

    map.flyTo({ center: [selectedPlace.lng, selectedPlace.lat], zoom: 16 });

    const marker = new maplibregl.Marker({ element: createSelectedPlaceElement() })
      .setLngLat([selectedPlace.lng, selectedPlace.lat])
      .addTo(map);

    selectedMarkerRef.current = marker;

    return () => {
      marker.remove();
      selectedMarkerRef.current = null;
    };
  }, [selectedPlace]);

  // ── Competitor markers ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous competitor markers.
    competitorMarkersRef.current.forEach((m) => m.remove());
    competitorMarkersRef.current = [];

    if (!competitors?.length) return;

    const markers = competitors.map((competitor) => {
      const el = createCompetitorElement();
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([competitor.lng, competitor.lat])
        .addTo(map);

      // Clicking a competitor marker lets the user drill into that location.
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPickLocationRef.current?.({ lat: competitor.lat, lng: competitor.lng });
      });

      return marker;
    });

    competitorMarkersRef.current = markers;

    return () => {
      markers.forEach((m) => m.remove());
      competitorMarkersRef.current = [];
    };
  }, [competitors]);

  // ── MRT marker + dashed line ──────────────────────────────────────────────
  useEffect(() => {
    // Remove previous MRT marker.
    mrtMarkerRef.current?.remove();
    mrtMarkerRef.current = null;

    if (!nearestMrt) {
      whenStyleReady((map) => removeLayerAndSource(map, MRT_LINE_LAYER_ID, MRT_LINE_SOURCE_ID));
      return;
    }

    const marker = new maplibregl.Marker({
      element: createMrtElement(nearestMrt.name),
    })
      .setLngLat([nearestMrt.lng, nearestMrt.lat]);

    const map = mapRef.current;
    if (map) marker.addTo(map);
    mrtMarkerRef.current = marker;

    // Draw dashed line from selectedPlace (or default) to MRT.
    whenStyleReady((readyMap) => {
      removeLayerAndSource(readyMap, MRT_LINE_LAYER_ID, MRT_LINE_SOURCE_ID);

      const from: [number, number] = selectedPlace
        ? [selectedPlace.lng, selectedPlace.lat]
        : [DEFAULT_LNG, DEFAULT_LAT];
      const to: [number, number] = [nearestMrt.lng, nearestMrt.lat];

      readyMap.addSource(MRT_LINE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [from, to] },
          properties: {},
        },
      });

      readyMap.addLayer({
        id: MRT_LINE_LAYER_ID,
        type: 'line',
        source: MRT_LINE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': GRAB_GREEN,
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    });

    return () => {
      marker.remove();
      mrtMarkerRef.current = null;
      whenStyleReady((map) => removeLayerAndSource(map, MRT_LINE_LAYER_ID, MRT_LINE_SOURCE_ID));
    };
  }, [nearestMrt, selectedPlace, whenStyleReady]);

  // ── Heatmap layer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!heatmapPoints?.length) {
      whenStyleReady((map) => removeLayerAndSource(map, HEATMAP_LAYER_ID, HEATMAP_SOURCE_ID));
      return;
    }

    whenStyleReady((map) => {
      removeLayerAndSource(map, HEATMAP_LAYER_ID, HEATMAP_SOURCE_ID);

      map.addSource(HEATMAP_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: heatmapPoints.map((pt) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
            properties: { weight: pt.weight },
          })),
        },
      });

      map.addLayer({
        id: HEATMAP_LAYER_ID,
        type: 'heatmap',
        source: HEATMAP_SOURCE_ID,
        paint: {
          // Weight each point by the data-driven weight property.
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity': 1,
          'heatmap-radius': 30,
          'heatmap-opacity': 0.7,
          // Neutral (transparent) → yellow-green → Grab green.
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(180,230,150,0.6)',
            0.5, 'rgba(80,200,100,0.8)',
            0.8, 'rgba(0,177,79,0.9)',
            1, 'rgba(0,150,64,1)',
          ],
        },
      });
    });

    return () => {
      whenStyleReady((map) => removeLayerAndSource(map, HEATMAP_LAYER_ID, HEATMAP_SOURCE_ID));
    };
  }, [heatmapPoints, whenStyleReady]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isStyleLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.7)',
            zIndex: 10,
            fontSize: 14,
            color: '#555',
          }}
        >
          Loading map…
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

export default MapView;
