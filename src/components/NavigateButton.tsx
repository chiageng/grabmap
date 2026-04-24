"use client";

import React, { useState } from 'react';
import { Button, Modal, Radio, Alert, Spin } from 'antd';
import {
  CompassOutlined,
  EnvironmentOutlined,
  CarOutlined,
  UserOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import PlaceSearch from '@/components/PlaceSearch';
import { colorConfig } from '@/config/colors';
import { HText, PText } from '@/components/MyText';
import { useMessage } from '@/utils/common';
import type {
  NavigationRoute,
  PlaceSearchResult,
  RouteLineStringClient,
} from '@/types/pulse';

interface NavigateButtonProps {
  destLat: number;
  destLng: number;
  destName: string;
  onRouteReady: (route: NavigationRoute) => void;
  size?: 'small' | 'middle' | 'large';
}

type OriginMode = 'current' | 'search';

async function fetchDirections(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  profile: 'driving' | 'walking';
}): Promise<{
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteLineStringClient;
  profile: 'driving' | 'walking';
}> {
  const q = new URLSearchParams({
    originLat: String(params.originLat),
    originLng: String(params.originLng),
    destLat: String(params.destLat),
    destLng: String(params.destLng),
    profile: params.profile,
  });
  const res = await fetch(`/api/directions?${q}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });
}

export default function NavigateButton({
  destLat,
  destLng,
  destName,
  onRouteReady,
  size = 'small',
}: NavigateButtonProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<'driving' | 'walking'>('driving');
  const [originMode, setOriginMode] = useState<OriginMode>('current');
  const [origin, setOrigin] = useState<
    | { lat: number; lng: number; name: string }
    | null
  >(null);
  const [locating, setLocating] = useState(false);
  const [geolocError, setGeolocError] = useState<string | null>(null);
  const { displayErrorMessage } = useMessage();

  const mutation = useMutation({
    mutationFn: fetchDirections,
    onSuccess: (data, variables) => {
      onRouteReady({
        originLat: variables.originLat,
        originLng: variables.originLng,
        destLat: variables.destLat,
        destLng: variables.destLng,
        originName: origin?.name,
        destName,
        profile: data.profile,
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
        geometry: data.geometry,
      });
      resetAndClose();
    },
    onError: (err) => {
      displayErrorMessage(err, 'Could not calculate the route.');
    },
  });

  const resetAndClose = () => {
    setOpen(false);
    setOrigin(null);
    setGeolocError(null);
    setOriginMode('current');
    setProfile('driving');
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
    setGeolocError(null);
    try {
      const pos = await getCurrentPosition();
      setOrigin({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name: 'My current location',
      });
    } catch (err) {
      const msg =
        err instanceof GeolocationPositionError
          ? err.message || 'Location permission denied'
          : err instanceof Error
            ? err.message
            : 'Unable to get your location';
      setGeolocError(msg);
    } finally {
      setLocating(false);
    }
  };

  const handleOriginPickFromSearch = (result: PlaceSearchResult) => {
    setOrigin({ lat: result.lat, lng: result.lng, name: result.name });
  };

  const handleSubmit = () => {
    if (!origin) return;
    mutation.mutate({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat,
      destLng,
      profile,
    });
  };

  return (
    <>
      <Button
        size={size}
        icon={<CompassOutlined />}
        onClick={() => setOpen(true)}
        style={{
          borderRadius: 999,
          paddingInline: 10,
          fontWeight: 600,
          borderColor: colorConfig.primaryColor,
          color: colorConfig.primaryColor,
          background: colorConfig.backgroundColor,
        }}
      >
        Navigate
      </Button>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CompassOutlined style={{ color: colorConfig.primaryColor }} />
            <HText variant="h5" style={{ margin: 0 }}>
              Navigate to {destName}
            </HText>
          </div>
        }
        open={open}
        onCancel={resetAndClose}
        footer={null}
        centered
        width={560}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          {/* Profile selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <PText variant="small" style={{ color: colorConfig.textSecondary, margin: 0, fontWeight: 600 }}>
              Travel mode
            </PText>
            <Radio.Group
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="driving">
                <CarOutlined style={{ marginRight: 6 }} />
                Driving
              </Radio.Button>
              <Radio.Button value="walking">
                <UserOutlined style={{ marginRight: 6 }} />
                Walking
              </Radio.Button>
            </Radio.Group>
          </div>

          {/* Origin selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <PText variant="small" style={{ color: colorConfig.textSecondary, margin: 0, fontWeight: 600 }}>
              Starting from
            </PText>
            <Radio.Group
              value={originMode}
              onChange={(e) => {
                setOriginMode(e.target.value);
                setOrigin(null);
                setGeolocError(null);
              }}
            >
              <Radio value="current">Use my current location</Radio>
              <Radio value="search">Enter a place</Radio>
            </Radio.Group>
          </div>

          {originMode === 'current' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!origin && (
                <Button
                  icon={locating ? <Spin size="small" /> : <AimOutlined />}
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {locating ? 'Locating…' : 'Detect my location'}
                </Button>
              )}
              {origin && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: colorConfig.backgroundSecondary,
                    border: `1px solid ${colorConfig.borderColor}`,
                  }}
                >
                  <EnvironmentOutlined style={{ color: colorConfig.primaryColor }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: colorConfig.textPrimary, fontSize: 13 }}>
                      {origin.name}
                    </div>
                    <div style={{ color: colorConfig.textMuted, fontSize: 11 }}>
                      {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
                    </div>
                  </div>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => setOrigin(null)}
                    style={{ color: colorConfig.textMuted }}
                  >
                    Change
                  </Button>
                </div>
              )}
              {geolocError && (
                <Alert
                  type="warning"
                  showIcon
                  message="Couldn't get your location"
                  description={`${geolocError}. Try entering a place manually instead.`}
                />
              )}
            </div>
          )}

          {originMode === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PlaceSearch
                onSelect={handleOriginPickFromSearch}
                bias={{ lat: destLat, lng: destLng }}
                placeholder="Where are you starting from?"
              />
              {origin && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: colorConfig.backgroundSecondary,
                    border: `1px solid ${colorConfig.borderColor}`,
                  }}
                >
                  <EnvironmentOutlined style={{ color: colorConfig.primaryColor }} />
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13 }}>
                    {origin.name}
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              borderTop: `1px solid ${colorConfig.borderColor}`,
              paddingTop: 12,
            }}
          >
            <Button onClick={resetAndClose}>Cancel</Button>
            <Button
              type="primary"
              icon={<CompassOutlined />}
              onClick={handleSubmit}
              disabled={!origin}
              loading={mutation.isPending}
            >
              Get directions
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
