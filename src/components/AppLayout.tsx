"use client";

import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  FireOutlined,
  TeamOutlined,
  FileTextOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { colorConfig } from '@/config/colors';
import { HText, PText } from './MyText';

const { Sider, Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: '/teams',
      icon: <TeamOutlined />,
      label: 'Teams',
    },
    {
      key: '/drills',
      icon: <FireOutlined />,
      label: 'Drills',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: '/dummy',
      icon: <SettingOutlined />,
      label: 'Testing',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        style={{
          background: colorConfig.backgroundColor,
          borderRight: `1px solid ${colorConfig.borderColor}`,
          padding: '0',
        }}
        width={300}
      >
        <div style={{
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          marginTop: 16,
          padding: '0 32px 0 32px',
          fontWeight: 700,
          fontSize: '20px',
          color: colorConfig.textPrimary,
        }}>
          <FireOutlined style={{ fontSize: 32, marginRight: 12, color: colorConfig.primaryColor, fontWeight: 900 }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <HText variant="h4">FireDrill</HText>
            <PText variant="span" style={{ marginTop: -8 }}>Training Simulator</PText>
          </div>
        </div>
        <div style={{ padding: '16px 16px 0 16px' }}>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
            style={{
              background: 'transparent',
              border: 'none',
            }}
          />
        </div>
      </Sider>
      <Layout style={{ background: colorConfig.backgroundColor }}>
        <Content style={{ background: colorConfig.backgroundColor }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
