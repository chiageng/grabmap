# Coding Standards & Best Practices

This document outlines the coding standards, patterns, and best practices to follow when working on projects. These standards ensure consistency, maintainability, and code quality across the codebase.

---

## Table of Contents
1. [General Principles](#general-principles)
2. [TypeScript Standards](#typescript-standards)
3. [React & Component Standards](#react--component-standards)
4. [API Integration Patterns](#api-integration-patterns)
5. [State Management](#state-management)
6. [Styling & UI Standards](#styling--ui-standards)
7. [Error Handling](#error-handling)
8. [Code Organization](#code-organization)
9. [Naming Conventions](#naming-conventions)
10. [Performance & Optimization](#performance--optimization)

---

## General Principles

### 1. Code Philosophy
- **Never edit auto-generated files** - Files with `.gen.ts` suffix are auto-generated and should never be manually edited
- **Prefer editing over creating** - Always edit existing files when possible rather than creating new ones
- **DRY (Don't Repeat Yourself)** - Extract reusable logic into utilities, hooks, or components
- **KISS (Keep It Simple, Stupid)** - Prefer simple, readable solutions over clever ones
- **Use absolute imports** - Always use `@/` prefix for imports instead of relative paths

### 2. Import Standards
```typescript
// ✅ CORRECT - Use absolute imports with @/
import { HText } from '@/components/MyText';
import { useMessage } from '@/utils/common';
import { getUsersUsersGet } from '@/client/sdk.gen';
import type { UserResponse } from '@/client/types.gen';

// ❌ WRONG - Avoid relative imports
import { HText } from '../../../components/MyText';
import { useMessage } from '../../utils/common';
```

### 3. Client Directives
```typescript
// ALWAYS add "use client" directive for client-side React components
"use client";

import React, { useState } from 'react';
import { Button } from 'antd';

export default function MyComponent() {
  // Component code
}
```

---

## TypeScript Standards

### 1. Type Imports
```typescript
// ✅ CORRECT - Use 'type' keyword for type-only imports
import type { UserResponse, AlarmCreate } from '@/client/types.gen';
import type { FC, ReactNode } from 'react';

// ❌ WRONG - Don't import types as regular imports
import { UserResponse, AlarmCreate } from '@/client/types.gen';
```

### 2. Type Definitions
```typescript
// ✅ CORRECT - Use interfaces for object shapes
interface UserCardProps {
  user: UserResponse;
  onEdit: (id: string) => void;
  isEditable?: boolean;
}

// ✅ CORRECT - Use type for unions, intersections, and primitives
type Status = 'pending' | 'approved' | 'rejected';
type ID = string | number;

// ✅ CORRECT - Use satisfies for const assertions with type checking
const CONFIG = {
  API_URL: 'https://api.example.com',
  TIMEOUT: 5000,
} as const satisfies Record<string, string | number>;
```

### 3. Avoid Any
```typescript
// ❌ WRONG - Avoid using 'any'
const data: any = response.data;

// ✅ CORRECT - Use proper types or unknown
const data: UserResponse = response.data;
const unknownData: unknown = response.data;

// ✅ ACCEPTABLE - Use 'any' only when absolutely necessary (e.g., third-party libs)
const handleWebSocketMessage = (data: any) => {
  // When dealing with unpredictable WebSocket messages
};
```

---

## React & Component Standards

### 1. Component Structure
```typescript
"use client";

import React, { useState, useEffect } from 'react';
import { Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { HText, PText } from '@/components/MyText';
import type { UserResponse } from '@/client/types.gen';

// 1. Type definitions
interface MyComponentProps {
  title: string;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

// 2. Component definition
export default function MyComponent({
  title,
  onSubmit,
  isLoading = false
}: MyComponentProps) {
  // 3. State declarations
  const [data, setData] = useState<string>('');

  // 4. Hooks (useQuery, useMutation, useEffect, etc.)
  useEffect(() => {
    // Side effects
  }, []);

  // 5. Event handlers
  const handleSubmit = () => {
    onSubmit(data);
  };

  // 6. Render
  return (
    <Card>
      <HText variant="h4">{title}</HText>
      <Button onClick={handleSubmit} loading={isLoading}>
        Submit
      </Button>
    </Card>
  );
}
```

### 2. Component Organization

**Shared Components** (`src/components/`)
- Place components used across multiple pages
- Part of application shell (layout, navigation)
- Common UI elements (buttons, cards, forms)

**Page-Specific Components** (`src/app/[route]/`)
- Only used within that specific page
- Tightly coupled to page logic
- Keep component file in same directory as page

```
src/app/furnace/
├── page.tsx              # Main page
├── FurnaceForm.tsx      # Page-specific form component
└── create/
    └── page.tsx         # Create page
```

### 3. Hooks Usage
```typescript
// ✅ CORRECT - Custom hooks start with 'use'
function useUserData(userId: string) {
  const [data, setData] = useState<UserResponse | null>(null);
  // Hook logic
  return { data, setData };
}

// ✅ CORRECT - Call hooks at top level
function MyComponent() {
  const { displaySuccessMessage } = useMessage();
  const { data } = useQuery({ /* ... */ });

  return <div>Content</div>;
}

// ❌ WRONG - Don't call hooks conditionally
function MyComponent({ shouldFetch }: Props) {
  if (shouldFetch) {
    const { data } = useQuery({ /* ... */ }); // ❌ ERROR
  }
}
```

---

## API Integration Patterns

### 1. Auto-Generated API Client
```typescript
// NEVER edit these files:
// - src/client/sdk.gen.ts
// - src/client/types.gen.ts
// - src/client/client.gen.ts

// Regenerate client when backend API changes:
// npm run gen-client
```

### 2. Query Pattern (GET Requests)
```typescript
import { useQuery } from '@tanstack/react-query';
import { getUsersUsersGet } from '@/client/sdk.gen';

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const response = await getUsersUsersGet();
    return response.data;
  },
});
```

### 3. Mutation Pattern (POST/PUT/DELETE)
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUserUsersPost } from '@/client/sdk.gen';
import type { UserCreate } from '@/client/types.gen';
import { useMessage } from '@/utils/common';

const queryClient = useQueryClient();
const { displaySuccessMessage, displayErrorMessage } = useMessage();

const { mutate, isPending } = useMutation({
  mutationFn: (userData: UserCreate) =>
    createUserUsersPost({ body: userData }),
  onSuccess: (response) => {
    displaySuccessMessage(response.data, 'User created successfully!');
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
  onError: (error) => {
    displayErrorMessage(error, 'Failed to create user');
  },
});

// Usage
mutate({ name: 'John Doe', email: 'john@example.com' });
```

### 4. Path Parameters
```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: async () => {
    const response = await getUserUsersUserIdGet({
      path: { user_id: userId },
    });
    return response.data;
  },
});
```

### 5. Query Parameters
```typescript
const { data } = useQuery({
  queryKey: ['users', { skip, limit }],
  queryFn: async () => {
    const response = await getUsersUsersGet({
      query: { skip: 0, limit: 10 },
    });
    return response.data;
  },
});
```

---

## State Management

### 1. Local State
```typescript
// ✅ CORRECT - Use useState for component-local state
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<UserResponse | null>(null);

// ✅ CORRECT - Initialize with proper types
const [items, setItems] = useState<string[]>([]);
const [config, setConfig] = useState<{ [key: string]: any }>({});
```

### 2. Server State (TanStack Query)
```typescript
// ✅ CORRECT - Use useQuery for server data
const { data: users, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const response = await getUsersUsersGet();
    return response.data;
  },
});

// ✅ CORRECT - Use useMutation for server mutations
const { mutate: createUser } = useMutation({
  mutationFn: (data: UserCreate) => createUserUsersPost({ body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

### 3. WebSocket State
```typescript
// ✅ CORRECT - Use refs for WebSocket connections
const wsRef = useRef<WebSocket | null>(null);

useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/ws');
  wsRef.current = ws;

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle message
  };

  return () => ws.close();
}, []);
```

### 4. Form State
```typescript
// ✅ CORRECT - Use Ant Design Form for forms
import { Form, Input, Button } from 'antd';

const [form] = Form.useForm();

<Form form={form} onFinish={handleSubmit}>
  <Form.Item name="name" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Button htmlType="submit">Submit</Button>
</Form>
```

---

## Styling & UI Standards

### 1. Color System
```typescript
// ✅ CORRECT - Use colorConfig from @/config/colors.ts
import { colorConfig } from '@/config/colors';

<div style={{ color: colorConfig.primaryColor }}>Text</div>
<div style={{ backgroundColor: colorConfig.successColor }}>Success</div>

// ❌ WRONG - Never hardcode colors
<div style={{ color: '#1890ff' }}>Text</div>
<div style={{ backgroundColor: '#52c41a' }}>Success</div>
```

### 2. Typography Components
```typescript
import { HText, PText } from '@/components/MyText';

// ✅ CORRECT - Use MyText components
<HText variant="h1">Main Title</HText>      // 48px bold
<HText variant="h2">Section Title</HText>   // 40px bold
<HText variant="h4">Card Title</HText>      // 24px bold
<PText variant="normal">Regular text</PText> // 16px
<PText variant="small">Small text</PText>   // 14px

// ❌ WRONG - Avoid direct HTML heading tags
<h1>Main Title</h1>
<p>Regular text</p>
```

### 3. Spacing & Layout
```typescript
// ✅ CORRECT - Use consistent spacing units
<div style={{ padding: 16, margin: 8 }}>Content</div>
<div style={{ gap: 8 }}>Items</div>

// ✅ CORRECT - Use flexbox for layouts
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16
}}>
  Items
</div>
```

### 4. Responsive Design
```typescript
// ✅ CORRECT - Use maxWidth for containers
<SectionContainer maxWidth="1400px">
  Content
</SectionContainer>

// ✅ CORRECT - Use responsive breakpoints
const isMobile = window.innerWidth < 768;
```

---

## Error Handling

### 1. Message Display
```typescript
import { useMessage } from '@/utils/common';

const { displaySuccessMessage, displayErrorMessage, displayInfoMessage, displayWarningMessage } = useMessage();

// ✅ CORRECT - Use utility functions
displaySuccessMessage(response.data, 'Operation successful!');
displayErrorMessage(error, 'Operation failed!');
displayInfoMessage('Processing...', 'Info message');
displayWarningMessage('Warning!', 'Warning message');

// ❌ WRONG - Never import message from antd
import { message } from 'antd';
message.success('Success'); // ❌ WRONG
```

### 2. Modal Utilities
```typescript
import { useModal } from '@/utils/common';

const { modal } = useModal();

// ✅ CORRECT - Use modal utility
modal.confirm({
  title: 'Delete Item',
  content: 'Are you sure?',
  centered: true,  // IMPORTANT: Always center modals
  okText: 'Delete',
  okType: 'danger',
  cancelText: 'Cancel',
  onOk: () => {
    // Handle confirmation
  },
});

// ❌ WRONG - Never import Modal from antd directly
import { Modal } from 'antd';
Modal.confirm({ /* ... */ }); // ❌ WRONG
```

### 3. Try-Catch Pattern
```typescript
// ✅ CORRECT - Async operations with error handling
const handleSubmit = async () => {
  try {
    await someAsyncOperation();
    displaySuccessMessage({}, 'Success!');
  } catch (error) {
    displayErrorMessage(error, 'Failed!');
    console.error('Error:', error);
  }
};
```

---

## Code Organization

### 1. File Structure
```
src/
├── app/                  # Next.js pages (App Router)
├── components/           # Shared components
├── client/              # Auto-generated API client (DO NOT EDIT)
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── config/              # Configuration files
└── utils/               # Utility functions
```

### 2. Component File Naming
```typescript
// ✅ CORRECT - PascalCase for component files
MyComponent.tsx
UserCard.tsx
AlarmForm.tsx

// ❌ WRONG - Don't use camelCase or kebab-case
myComponent.tsx
user-card.tsx
alarm_form.tsx
```

### 3. Utility File Naming
```typescript
// ✅ CORRECT - camelCase for utility files
common.ts
apiClient.ts
formatters.ts

// ❌ WRONG
Common.ts
api-client.ts
```

---

## Naming Conventions

### 1. Variables & Functions
```typescript
// ✅ CORRECT - camelCase
const userName = 'John';
const isLoading = true;
function getUserData() { }

// ❌ WRONG
const UserName = 'John';
const is_loading = true;
function get_user_data() { }
```

### 2. Constants
```typescript
// ✅ CORRECT - UPPER_SNAKE_CASE for true constants
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_COUNT = 3;

// ✅ CORRECT - Use 'as const' with satisfies for typed constants
const ACTION_TYPE = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const satisfies Record<string, string>;
```

### 3. React Components
```typescript
// ✅ CORRECT - PascalCase
function UserProfile() { }
function AlarmList() { }

// ❌ WRONG
function userProfile() { }
function alarm_list() { }
```

### 4. Event Handlers
```typescript
// ✅ CORRECT - Prefix with 'handle'
const handleSubmit = () => { };
const handleChange = (value: string) => { };
const handleClick = () => { };

// ❌ WRONG
const onSubmit = () => { };
const change = (value: string) => { };
const click = () => { };
```

### 5. Boolean Variables
```typescript
// ✅ CORRECT - Prefix with 'is', 'has', 'should', 'can'
const isLoading = true;
const hasError = false;
const shouldRender = true;
const canEdit = false;

// ❌ WRONG
const loading = true;
const error = false;
```

### 6. TanStack Query Keys
```typescript
// ✅ CORRECT - Use array format with descriptive keys
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});

const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});

const { data } = useQuery({
  queryKey: ['users', { status: 'active', limit: 10 }],
  queryFn: () => fetchUsers({ status: 'active', limit: 10 }),
});
```

---

## Performance & Optimization

### 1. Memoization
```typescript
// ✅ CORRECT - Use useMemo for expensive calculations
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);

// ✅ CORRECT - Use useCallback for event handlers passed to children
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);
```

### 2. useEffect Dependencies
```typescript
// ✅ CORRECT - Include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]); // Include userId

// ❌ WRONG - Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId - causes stale closure
```

### 3. Conditional Rendering
```typescript
// ✅ CORRECT - Early returns for loading/error states
if (isLoading) return <Spin />;
if (error) return <PText>Error: {error.message}</PText>;
if (!data) return null;

return <div>{data.name}</div>;

// ❌ WRONG - Nested ternaries
return isLoading ? <Spin /> : error ? <PText>Error</PText> : data ? <div>{data.name}</div> : null;
```

### 4. Key Props in Lists
```typescript
// ✅ CORRECT - Use stable unique keys
{users.map(user => (
  <UserCard key={user.id} user={user} />
))}

// ❌ WRONG - Using index as key
{users.map((user, index) => (
  <UserCard key={index} user={user} />
))}
```

---

## Additional Best Practices

### 1. Comments
```typescript
// ✅ CORRECT - Write self-documenting code, add comments for complex logic
// Calculate the weighted average based on user preferences
const weightedAverage = items.reduce((sum, item) =>
  sum + (item.value * item.weight), 0
) / totalWeight;

// ❌ WRONG - Obvious comments
// Increment counter by 1
counter++;
```

### 2. Console Logs
```typescript
// ✅ CORRECT - Use descriptive console logs for debugging
console.log('[WebSocket] Received:', data);
console.error('[API] Failed to fetch users:', error);

// ✅ CORRECT - Remove console logs before committing (except errors)
// Keep: console.error, console.warn
// Remove: console.log, console.debug
```

### 3. Avoid Magic Numbers
```typescript
// ✅ CORRECT - Use named constants
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;

for (let i = 0; i < MAX_RETRIES; i++) { }

// ❌ WRONG - Magic numbers
for (let i = 0; i < 3; i++) { }
setTimeout(() => { }, 5000);
```

### 4. Destructuring
```typescript
// ✅ CORRECT - Destructure props and objects
function UserCard({ user, onEdit }: UserCardProps) {
  const { name, email, role } = user;
  return <div>{name}</div>;
}

// ❌ WRONG - Accessing properties directly
function UserCard(props: UserCardProps) {
  return <div>{props.user.name}</div>;
}
```

---

## Summary Checklist

✅ Use `@/` for all imports (absolute paths)
✅ Add `"use client"` directive for client components
✅ Use `type` keyword for type-only imports
✅ Never edit `.gen.ts` files (auto-generated)
✅ Use `useMessage()` and `useModal()` from `@/utils/common`
✅ Never import `message` or `Modal` from 'antd' directly
✅ Use `colorConfig` from `@/config/colors.ts` (never hardcode colors)
✅ Use `HText` and `PText` from `@/components/MyText`
✅ Use TanStack Query for all API calls (except WebSocket)
✅ Follow naming conventions (camelCase, PascalCase, UPPER_SNAKE_CASE)
✅ Handle errors with try-catch and display utilities
✅ Include all dependencies in useEffect
✅ Use stable keys in list rendering
✅ Write self-documenting code with minimal comments
✅ Prefer editing existing files over creating new ones

---

**Last Updated**: 2025-01-20
