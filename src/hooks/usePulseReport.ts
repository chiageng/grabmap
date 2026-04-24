"use client";

import { useQuery } from '@tanstack/react-query';
import type { PulseReport, PulseRequest } from '@/types/pulse';

const STALE_TIME_MS = 60_000;
const GC_TIME_MS = 5 * 60_000;

/**
 * Fetches a full Pulse Report from the /api/pulse endpoint.
 *
 * Query key: ['pulse', lat, lng, placeId]
 * The query is disabled when `request` is null, so callers can safely
 * pass null to indicate "no place selected yet."
 */
export function usePulseReport(request: PulseRequest | null): {
  data: PulseReport | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, error, refetch } = useQuery<PulseReport, Error>({
    queryKey: ['pulse', request?.lat, request?.lng, request?.placeId],
    queryFn: async () => {
      const response = await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Pulse API error ${response.status}: ${errorText}`);
      }

      return response.json() as Promise<PulseReport>;
    },
    enabled: !!request,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    retry: 1,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
