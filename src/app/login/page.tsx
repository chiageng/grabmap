"use client";

import React, { useState } from 'react';
import { Button, Input, Form, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { HText, PText } from '@/components/MyText';
import SectionContainer from '@/components/SectionContainer';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      console.log('Login attempt with:', values);

      // TODO: Replace this with your actual login API call
      // Example:
      // const response = await loginUsersLoginPost({
      //   body: {
      //     username: values.username,
      //     password: values.password,
      //   }
      // });

      // Mock login for testing - Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      // Mock token - Replace with actual token from API response
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token';

      // Set the token in auth context
      login(mockToken);

      message.success('Login successful!');
      router.push('/'); // Redirect to dashboard
    } catch (error) {
      message.error('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionContainer maxWidth="500px">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 32px)'
      }}>
        <Card style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <HText variant="h2">Welcome Back</HText>
            <PText style={{ marginTop: '8px' }}>
              Sign in to your account
            </PText>
          </div>

          <Form
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: 'Please input your username!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your username"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                style={{ marginTop: '16px' }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'rgb(249, 250, 251)',
            borderRadius: '8px'
          }}>
            <PText variant="small" style={{ marginBottom: '8px' }}>
              <strong>Testing Note:</strong>
            </PText>
            <PText variant="small">
              This is a mock login page. Replace the mock token with actual API integration.
              Any username/password will work for testing.
            </PText>
          </div>
        </Card>
      </div>
    </SectionContainer>
  );
}
