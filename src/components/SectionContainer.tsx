'use client';

import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { HText, PText } from './MyText';

interface SectionContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
  title?: string;
  titleVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
  description?: string;
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonPath?: string;
  onBackClick?: () => void;
  // Left action button
  leftActionText?: string;
  leftActionOnClick?: () => void;
  leftActionIcon?: React.ReactNode;
  leftActionType?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  leftActionLoading?: boolean;
  // Right action button
  rightActionText?: string;
  rightActionOnClick?: () => void;
  rightActionIcon?: React.ReactNode;
  rightActionType?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  rightActionLoading?: boolean;
}

export default function SectionContainer({
  children,
  maxWidth = '1400px',
  title,
  titleVariant = 'h2',
  description,
  showBackButton = false,
  backButtonText = 'Back',
  backButtonPath,
  onBackClick,
  leftActionText,
  leftActionOnClick,
  leftActionIcon,
  leftActionType = 'default',
  leftActionLoading = false,
  rightActionText,
  rightActionOnClick,
  rightActionIcon,
  rightActionType = 'primary',
  rightActionLoading = false,
}: SectionContainerProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backButtonPath) {
      router.push(backButtonPath);
    } else {
      router.back();
    }
  };

  const showActions = leftActionText || rightActionText;
  const showHeader = title || description || showBackButton || showActions;

  return (
    <div style={{
      paddingTop: 16,
      paddingBottom: 16,
      paddingLeft: 32,
      paddingRight: 32,
      backgroundColor: 'rgb(255, 255, 255)',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth, margin: '0 auto' }}>
        {showHeader && (
          <div style={{ marginBottom: 16 }}>
            {showBackButton && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleBackClick}
                style={{ padding: '4px 8px' }}
              >
                {backButtonText}
              </Button>
            )}
            {(title || description || showActions) && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16
              }}>
                <div style={{ flex: 1 }}>
                  {title && (
                    <HText variant={titleVariant}>{title}</HText>
                  )}
                  {description && (
                    <PText>{description}</PText>
                  )}
                </div>
                {showActions && (
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginTop: 48 }}>
                    {leftActionText && (
                      <Button
                        type={leftActionType}
                        size="large"
                        icon={leftActionIcon}
                        onClick={leftActionOnClick}
                        loading={leftActionLoading}
                      >
                        {leftActionText}
                      </Button>
                    )}
                    {rightActionText && (
                      <Button
                        type={rightActionType}
                        size="large"
                        icon={rightActionIcon}
                        onClick={rightActionOnClick}
                        loading={rightActionLoading}
                      >
                        {rightActionText}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
