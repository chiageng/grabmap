"use client";

import React, { useState } from 'react';
import { Button } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import * as htmlToImage from 'html-to-image';
import { useMessage } from '@/utils/common';
import { colorConfig } from '@/config/colors';

interface ShareButtonProps {
  /** Ref to the DOM node that will be captured as a PNG. */
  targetRef: React.RefObject<HTMLDivElement | null>;
  /** Used to build the download filename: pulse-<slug>.png */
  placeName: string;
}

/**
 * Converts a place name into a URL-safe, lowercase, hyphenated slug
 * suitable for use in a filename.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Captures the report panel as a PNG using html-to-image and triggers
 * a browser download. If the Web Share API is available and supports files,
 * it also attempts to invoke navigator.share as progressive enhancement.
 */
export default function ShareButton({ targetRef, placeName }: ShareButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const { displayErrorMessage } = useMessage();

  const handleShare = async () => {
    if (!targetRef.current) {
      displayErrorMessage(null, 'Nothing to capture — report panel not mounted.');
      return;
    }

    setIsCapturing(true);
    try {
      const dataUrl = await htmlToImage.toPng(targetRef.current, {
        cacheBust: true,
        backgroundColor: colorConfig.backgroundColor,
      });

      const filename = `pulse-${slugify(placeName) || 'report'}.png`;

      // Attempt progressive-enhancement share via Web Share API
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], filename, { type: 'image/png' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `PlacePulse — ${placeName}`,
              files: [file],
            });
            // Share successful — skip the download fallback
            return;
          }
        } catch (shareError) {
          // User dismissed or share failed — fall through to download
          console.warn('[ShareButton] Web Share API failed, falling back to download:', shareError);
        }
      }

      // Fallback: trigger a programmatic anchor download
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = filename;
      anchor.click();
    } catch (captureError) {
      console.error('[ShareButton] Image capture failed:', captureError);
      displayErrorMessage(captureError, 'Failed to generate image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Button
      type="primary"
      icon={<ShareAltOutlined />}
      loading={isCapturing}
      onClick={handleShare}
      style={{
        background: colorConfig.primaryColor,
        borderColor: colorConfig.primaryColor,
        width: '100%',
        height: 40,
        fontWeight: 600,
      }}
    >
      Share as image
    </Button>
  );
}
