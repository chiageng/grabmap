"use client";

import { Button } from "antd";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsersUsersGet } from "@/client/sdk.gen";
import SectionContainer from "@/components/SectionContainer";
import { HText, PText } from "@/components/MyText";

export default function Home() {
  const [status, setStatus] = useState("Disconnected");

  // TanStack Query to fetch users
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await getUsersUsersGet();
      return response.data;
    },
  });

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/general");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setStatus("Connected");
    };

    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
    };

    ws.onerror = (error) => {
      console.log("WebSocket error:", error);
      setStatus("Error");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setStatus("Disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <SectionContainer>
      <HText variant="h1">WebSocket Test Page</HText>
      <PText style={{ marginBottom: '24px' }}>
        WebSocket Status: <strong>{status}</strong>
      </PText>
      <PText variant="small" style={{ marginBottom: '32px' }}>
        Check console for WebSocket messages
      </PText>

      <div style={{ marginBottom: '32px' }}>
        <HText variant="h4" style={{ marginBottom: '16px' }}>Users</HText>
        {isLoading && <PText>Loading users...</PText>}
        {error && (
          <PText style={{ color: 'rgb(239, 68, 68)' }}>
            Error: {(error as Error).message}
          </PText>
        )}
        {users && (
          <pre style={{
            backgroundColor: 'rgb(243, 244, 246)',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px',
            lineHeight: '1.5',
            color: 'rgb(17, 24, 39)'
          }}>
            {JSON.stringify(users, null, 2)}
          </pre>
        )}
      </div>

      <Button type="primary" size="large">Click me</Button>
    </SectionContainer>
  );
}
