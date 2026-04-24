'use client';
import React from 'react';
import {
  Button,
  Card,
  Tag,
  Space,
  Table,
  Input,
  Select,
  Row,
  Col,
  Divider,
  Badge,
  Alert,
  Progress
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { checkHealthHealthGet } from '@/client/sdk.gen';
import SectionContainer from '@/components/SectionContainer';
import { HText, PText } from '@/components/MyText';
import AuthStatus from '@/components/AuthStatus';

const { Search } = Input;

// Sample data for the table
const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    render: (role: string) => {
      const color = role === 'Admin' ? 'error' : role === 'Instructor' ? 'processing' : 'success';
      return <Tag color={color}>{role}</Tag>;
    },
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const color = status === 'Active' ? 'success' : 'default';
      return <Tag color={color}>{status}</Tag>;
    },
  },
];

const data = [
  {
    key: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    status: 'Active',
  },
  {
    key: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Instructor',
    status: 'Active',
  },
  {
    key: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'Trainee',
    status: 'Inactive',
  },
];

export default function Home() {
  const { data: healthData, isLoading, error, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await checkHealthHealthGet();
      return response.data;
    },
    enabled: false, // Only fetch when button is clicked
  });

  return (
    <SectionContainer>
      <div style={{ marginBottom: '24px' }}>
        <AuthStatus />
      </div>

      {/* Health Check Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <HText variant="h5">Health Check</HText>
          <Space>
            <Button
              type="primary"
              icon={<HeartOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              Check Health
            </Button>
          </Space>
          {error && (
            <Alert
              message="Health Check Failed"
              description={(error as Error).message}
              type="error"
              showIcon
            />
          )}
          {healthData !== undefined && (
            <Alert
              message="Health Check Passed"
              description={<pre style={{ margin: 0 }}>{JSON.stringify(healthData, null, 2)}</pre>}
              type="success"
              showIcon
            />
          )}
        </Space>
      </Card>

      <HText variant="h1">FireSim Pro Training Simulator</HText>
      <HText variant="h5" style={{ fontWeight: 400, marginTop: '8px' }}>
        User Management
      </HText>
      <PText style={{ marginTop: '16px', marginBottom: '24px' }}>
        Manage system users and their permissions
      </PText>

      <Card
        title={<HText variant="h5">System Users</HText>}
        style={{ marginBottom: '24px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Search and Actions */}
          <Row justify="space-between" align="middle">
            <Col>
              <Space size="middle">
                <Search
                  placeholder="Search users..."
                  style={{ width: 300 }}
                  prefix={<SearchOutlined />}
                />
                <Select
                  placeholder="Filter by role"
                  style={{ width: 150 }}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'instructor', label: 'Instructor' },
                    { value: 'trainee', label: 'Trainee' },
                  ]}
                />
              </Space>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} size="large">
                Create User
              </Button>
            </Col>
          </Row>

          {/* Stats Cards */}
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <Space>
                  <Badge count={12} color="#22C55E" />
                  <PText>Active Users</PText>
                </Space>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Space>
                  <Badge count={3} color="#EF4444" />
                  <PText>Admins</PText>
                </Space>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Space>
                  <Badge count={5} color="#3B82F6" />
                  <PText>Instructors</PText>
                </Space>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Space>
                  <Badge count={4} color="#84CC16" />
                  <PText>Trainees</PText>
                </Space>
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* User Table */}
          <Table 
            columns={columns} 
            dataSource={data} 
            pagination={false}
            style={{ marginTop: '16px' }}
          />
        </Space>
      </Card>

      {/* Theme Testing Section */}
      <Card
        title={<HText variant="h5">Theme Testing</HText>}
        style={{ marginBottom: '24px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <HText variant="h4">Buttons</HText>
            <Space wrap>
              <Button type="primary">Primary Button</Button>
              <Button>Default Button</Button>
              <Button type="dashed">Dashed Button</Button>
              <Button type="link">Link Button</Button>
              <Button danger>Danger Button</Button>
            </Space>
          </div>

          <div>
            <HText variant="h4">Tags</HText>
            <Space wrap>
              <Tag color="success">Active</Tag>
              <Tag color="error">Admin</Tag>
              <Tag color="processing">Instructor</Tag>
              <Tag color="warning">Trainee</Tag>
              <Tag>Observer</Tag>
              <Tag color="default">Inactive</Tag>
            </Space>
          </div>

          <div>
            <HText variant="h4">Alerts</HText>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Success Alert"
                description="This is a success alert with the theme colors."
                type="success"
                icon={<CheckCircleOutlined />}
                showIcon
              />
              <Alert
                message="Error Alert"
                description="This is an error alert with the theme colors."
                type="error"
                icon={<CloseCircleOutlined />}
                showIcon
              />
              <Alert
                message="Info Alert"
                description="This is an info alert with the theme colors."
                type="info"
                icon={<InfoCircleOutlined />}
                showIcon
              />
            </Space>
          </div>

          <div>
            <HText variant="h4">Progress Bars</HText>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <PText>Default Progress</PText>
                <Progress percent={30} />
              </div>
              <div>
                <PText>Success Progress</PText>
                <Progress percent={70} status="success" />
              </div>
              <div>
                <PText>Error Progress</PText>
                <Progress percent={50} status="exception" />
              </div>
            </Space>
          </div>
        </Space>
      </Card>
    </SectionContainer>
  );
}
