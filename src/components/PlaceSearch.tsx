"use client";

import React, { useState, useRef, useCallback } from 'react';
import { AutoComplete, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { colorConfig } from '@/config/colors';
import type { PlaceSearchResult, PlaceSearchResponse } from '@/types/pulse';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_DELAY_MS = 300;
const MIN_QUERY_LENGTH = 2;
const QUERY_STALE_TIME_MS = 30_000;
const DEFAULT_COUNTRY = 'SGP';
const DEFAULT_PLACEHOLDER = 'Search a place — e.g., Marina Bay, Bugis MRT, kopitiam…';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaceSearchProps {
  onSelect: (result: PlaceSearchResult) => void;
  bias?: { lat: number; lng: number };
  country?: string;
  placeholder?: string;
}

// ─── Inline debounce — avoids adding lodash ───────────────────────────────────

/**
 * Returns a debounced version of `value`.
 * Implemented without lodash by managing a timer ref at render time.
 */
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<T>(value);

  // Fire the debounce whenever `value` changes between renders.
  if (latestRef.current !== value) {
    latestRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedValue(value), delayMs);
  }

  return debouncedValue;
}

// ─── Option renderer ──────────────────────────────────────────────────────────

/** Renders a compact two-line option row: name (bold) and address (muted). */
function renderOptionLabel(result: PlaceSearchResult): React.ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '2px 0' }}>
      <span style={{ fontWeight: 600, fontSize: 14, color: colorConfig.textPrimary }}>
        {result.name}
      </span>
      {result.address && (
        <span style={{ fontSize: 12, color: colorConfig.textMuted, lineHeight: 1.3 }}>
          {result.address}
        </span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PlaceSearch is a pill-shaped autocomplete search bar that queries
 * `/api/places/search` with a 300 ms debounce and server-driven option ranking.
 */
export default function PlaceSearch({
  onSelect,
  bias,
  country = DEFAULT_COUNTRY,
  placeholder = DEFAULT_PLACEHOLDER,
}: PlaceSearchProps) {
  const [inputValue, setInputValue] = useState('');

  // The query key uses the debounced value so API calls are rate-limited.
  const debouncedQuery = useDebounce(inputValue, DEBOUNCE_DELAY_MS);

  const isQueryEnabled = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data: searchResponse } = useQuery<PlaceSearchResponse>({
    queryKey: ['place-search', debouncedQuery, bias?.lat, bias?.lng],
    enabled: isQueryEnabled,
    staleTime: QUERY_STALE_TIME_MS,
    queryFn: async (): Promise<PlaceSearchResponse> => {
      const params = new URLSearchParams({ q: debouncedQuery, country });
      if (bias) {
        params.set('lat', String(bias.lat));
        params.set('lng', String(bias.lng));
      }
      const response = await fetch(`/api/places/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Place search failed: ${response.status}`);
      }
      return response.json() as Promise<PlaceSearchResponse>;
    },
  });

  // Build Antd AutoComplete option list, carrying the full result object
  // so handleSelect can retrieve it without a secondary lookup.
  const options = (searchResponse?.results ?? []).map((result) => ({
    value: result.name,
    label: renderOptionLabel(result),
    result,
  }));

  const handleSelect = useCallback(
    (_value: string, option: { result?: PlaceSearchResult }) => {
      if (option.result) {
        onSelect(option.result);
        // Keep the selected name visible in the input after picking.
        setInputValue(option.result.name);
      }
    },
    [onSelect],
  );

  const handleSearch = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  return (
    <AutoComplete
      value={inputValue}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      // Disable built-in client filtering — the server handles ranking.
      filterOption={false}
      style={{ width: '100%' }}
      popupMatchSelectWidth
    >
      {/*
        Antd AutoComplete forwards its value/onChange to a single direct child.
        Using Antd's Input here ensures correct wiring (focus, keyboard, ARIA).
        The pill style is applied via the `styles` prop on Input.
      */}
      <Input
        prefix={
          <SearchOutlined style={{ color: colorConfig.primaryColor, fontSize: 16 }} />
        }
        placeholder={placeholder}
        style={{
          height: 44,
          borderRadius: 999,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          border: `1.5px solid ${colorConfig.borderColor}`,
          paddingInline: 16,
        }}
      />
    </AutoComplete>
  );
}
