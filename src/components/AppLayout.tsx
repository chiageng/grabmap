"use client";

import React from 'react';
import Image from 'next/image';
import { colorConfig } from '@/config/colors';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Grab-branded top navigation bar layout.
 *
 * Structure:
 *   [Logo + wordmark] | [#pp-search-slot — Pipeline 3 mounts here] | [right actions slot]
 *
 * Content below the nav bar is full-bleed (no sidebar) so MapView can fill the viewport.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <header
        style={{
          height: 64,
          flexShrink: 0,
          background: colorConfig.backgroundColor,
          borderBottom: `1px solid ${colorConfig.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          zIndex: 100,
        }}
      >
        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Image
            src="/grab-logo.svg"
            alt="PlacePulse logo"
            width={36}
            height={36}
            priority
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: colorConfig.textPrimary,
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
            }}
          >
            Place
            <span style={{ color: colorConfig.primaryColor }}>Pulse</span>
          </span>
        </div>

        {/*
         * Search slot — Pipeline 3 will portal a search component into this div.
         * Do not remove or change the id.
         */}
        <div
          id="pp-search-slot"
          style={{ flex: 1, maxWidth: 560, margin: '0 16px' }}
        />

        {/* Right-side actions slot — reserved for future use (auth, profile, etc.) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }} />
      </header>

      {/* ── Full-bleed content area ─────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: colorConfig.backgroundSecondary,
        }}
      >
        {children}
      </main>
    </div>
  );
}
