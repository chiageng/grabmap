/**
 * External navigation deep links.
 *
 * Google Maps — universal HTTPS URL that works on desktop, iOS, and Android.
 *               On mobile, the Google Maps app handles it natively; desktop
 *               opens maps.google.com. Always works.
 *
 * Grab      — `grab://` app URL scheme. On mobile with Grab installed, opens
 *               the Grab app to the booking screen with the destination
 *               pre-filled. On desktop / without the app, the scheme fails
 *               silently — callers should label the button so users understand
 *               it's a mobile-app hand-off.
 */

export type GoogleMapsTravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export function googleMapsNavigateUrl(
  destLat: number,
  destLng: number,
  mode: GoogleMapsTravelMode = 'driving',
): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destLat},${destLng}`,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function grabBookingUrl(
  destLat: number,
  destLng: number,
  destName?: string,
): string {
  const params = new URLSearchParams({
    screenType: 'BOOKING',
    dropOffLatitude: String(destLat),
    dropOffLongitude: String(destLng),
  });
  if (destName) params.set('dropOffAddress', destName);
  return `grab://open?${params.toString()}`;
}
