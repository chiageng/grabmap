"use client";

import { useQuery } from '@tanstack/react-query';

const PROXY_PREFIX = '/api/map-proxy';
const GRAB_BASE_URL = process.env.NEXT_PUBLIC_GRABMAPS_BASE_URL ?? 'https://maps.grab.com';

// OSM fallback used when the Grab style proxy fails — ensures the map always renders.
const OSM_FALLBACK_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
} as const;

interface UseGrabMapStyleResult {
  style: unknown | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Rewrite every Grab absolute URL inside a style document to point at the
 * same-origin Next.js proxy. Uses ABSOLUTE URLs (not relative) because
 * MapLibre fetches tiles inside a Web Worker, which has no base URL to
 * resolve a relative path against.
 *
 *   https://maps.grab.com/api/maps/tiles/...
 *   → http://localhost:3000/api/map-proxy/api/maps/tiles/...
 */
function rewriteStyleToProxy(input: unknown, origin: string): unknown {
  if (!input || typeof input !== 'object') return input;

  const proxyBase = `${origin}${PROXY_PREFIX}`;

  const rewriteUrl = (url: unknown): unknown => {
    if (typeof url !== 'string') return url;
    if (!url.startsWith(GRAB_BASE_URL)) return url;
    return `${proxyBase}${url.slice(GRAB_BASE_URL.length)}`;
  };

  // Deep-ish clone via JSON so we don't mutate the cached TanStack Query data.
  const style = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;

  if (typeof style.sprite === 'string') {
    style.sprite = rewriteUrl(style.sprite);
  }
  if (typeof style.glyphs === 'string') {
    style.glyphs = rewriteUrl(style.glyphs);
  }

  const sources = style.sources;
  if (sources && typeof sources === 'object') {
    for (const key of Object.keys(sources)) {
      const source = (sources as Record<string, unknown>)[key];
      if (!source || typeof source !== 'object') continue;
      const srcObj = source as Record<string, unknown>;

      if (Array.isArray(srcObj.tiles)) {
        srcObj.tiles = (srcObj.tiles as unknown[]).map(rewriteUrl);
      }
      if (typeof srcObj.url === 'string') {
        srcObj.url = rewriteUrl(srcObj.url);
      }
    }
  }

  return style;
}

/**
 * Fetches the GrabMaps style.json through the same-origin proxy and rewrites
 * its sprite/glyph/tile URLs to also go through the proxy. Falls back to a
 * minimal OSM raster style when the proxy is unreachable, so the map always
 * renders in demo environments.
 */
export function useGrabMapStyle(): UseGrabMapStyleResult {
  const { data, error, isLoading } = useQuery({
    queryKey: ['grabmap-style'],
    staleTime: Infinity,
    queryFn: async (): Promise<unknown> => {
      const response = await fetch(`${PROXY_PREFIX}/api/style.json`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        console.warn(
          `[useGrabMapStyle] proxy style fetch failed (${response.status}), falling back to OSM.`,
        );
        return OSM_FALLBACK_STYLE;
      }

      const raw = (await response.json()) as unknown;
      // window is available here: queryFn only runs on the client.
      return rewriteStyleToProxy(raw, window.location.origin);
    },
  });

  return {
    style: data ?? null,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    isLoading,
  };
}
