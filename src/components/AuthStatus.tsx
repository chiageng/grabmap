"use client";

import React from 'react';
import { Button, Tag, Space } from 'antd';
import { LogoutOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { PText } from './MyText';

export default function AuthStatus() {
  const { isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      backgroundColor: 'rgb(249, 250, 251)',
      borderRadius: '8px'
    }}>
      <Space>
        {isAuthenticated ? (
          <>
            <Tag color="success">Authenticated</Tag>
            <PText variant="small" style={{ margin: 0 }}>
              Token: {token?.substring(0, 20)}...
            </PText>
            <Button
              size="small"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Tag color="default">Not Authenticated</Tag>
            <Button
              type="primary"
              size="small"
              icon={<LoginOutlined />}
              onClick={handleLogin}
            >
              Login
            </Button>
          </>
        )}
      </Space>
    </div>
  );
}
