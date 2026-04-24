"use client";

import React from 'react';
import { Button, Space } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { HText, PText } from './MyText';

/**
 * Example component showing how to use authentication
 *
 * Usage:
 * 1. After successful login, call: login(tokenFromBackend)
 * 2. On logout, call: logout()
 * 3. Check authentication status with: isAuthenticated
 * 4. All API calls will automatically include the bearer token
 */
export default function AuthExample() {
  const { isAuthenticated, login, logout } = useAuth();

  const handleLogin = () => {
    // Replace this with your actual login logic
    // For example, after calling a login API:
    const mockToken = 'your-jwt-token-from-backend';
    login(mockToken);
  };

  return (
    <div style={{ padding: '20px' }}>
      <HText variant="h4">Authentication Example</HText>
      <PText style={{ marginTop: '12px', marginBottom: '16px' }}>
        Status: {isAuthenticated ? 'Authenticated ✓' : 'Not Authenticated ✗'}
      </PText>
      <Space>
        <Button type="primary" onClick={handleLogin} disabled={isAuthenticated}>
          Login (Mock)
        </Button>
        <Button onClick={logout} disabled={!isAuthenticated}>
          Logout
        </Button>
      </Space>
    </div>
  );
}
