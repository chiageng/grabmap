'use client';
import React from 'react';
import { ConfigProvider, App, theme } from 'antd';
import '@ant-design/v5-patch-for-react-19';
import en_US from 'antd/locale/en_US';
import { colorConfig, colorPalette } from '@/config/colors';

function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          // Primary colors — Grab Green
          colorPrimary: colorConfig.primaryColor,
          colorSuccess: colorConfig.successColor,
          colorWarning: colorConfig.warningColor,
          colorError: colorConfig.dangerColor,
          colorInfo: colorConfig.primaryColor,

          // Background colors
          colorBgContainer: colorConfig.backgroundColor,
          colorBgElevated: colorConfig.backgroundColor,
          colorBgLayout: colorConfig.backgroundSecondary,

          // Border
          colorBorder: colorConfig.borderColor,
          colorBorderSecondary: colorPalette.lightGray,

          // Text
          colorText: colorConfig.textPrimary,
          colorTextSecondary: colorConfig.textSecondary,
          colorTextTertiary: colorConfig.textMuted,

          // Border radius
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,

          // Font
          fontSize: 14,
          fontSizeHeading1: 32,
          fontSizeHeading2: 28,
          fontSizeHeading3: 24,
          fontSizeHeading4: 20,
          fontSizeHeading5: 16,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Button: {
            colorPrimary: colorConfig.primaryColor,
            colorPrimaryHover: colorConfig.primaryHoverColor,
            primaryColor: colorConfig.primaryForegroundColor,
            controlHeight: 40,
            controlHeightLG: 48,
            controlHeightSM: 32,
            fontWeight: 500,
          },
          Input: {
            controlHeight: 40,
            controlHeightLG: 48,
            controlHeightSM: 32,
            colorBorder: colorConfig.borderColor,
            colorPrimaryHover: colorConfig.primaryColor,
          },
          Select: {
            controlHeight: 40,
            controlHeightLG: 48,
            controlHeightSM: 32,
          },
          Card: {
            borderRadiusLG: 12,
            colorBorderSecondary: colorPalette.lightGray,
            boxShadowTertiary: '0 4px 16px rgba(0,0,0,0.12)',
          },
          Table: {
            headerBg: colorConfig.backgroundSecondary,
            borderColor: colorConfig.borderColor,
          },
          Menu: {
            itemSelectedBg: colorConfig.primaryColor,
            itemSelectedColor: colorConfig.primaryForegroundColor,
            itemActiveBg: colorConfig.primaryHoverColor,
            itemHoverBg: colorConfig.primaryColor,
            itemHoverColor: colorConfig.primaryForegroundColor,
            iconSize: 22,
            itemHeight: 44,
            itemMarginInline: 0,
            itemBorderRadius: 8,
          },
        },
      }}
      locale={en_US}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}

export default AntdProvider;
