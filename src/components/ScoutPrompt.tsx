"use client";

import React, { useState } from 'react';
import { Button, Modal, Input, Tag } from 'antd';
import { ThunderboltFilled, SendOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { colorConfig } from '@/config/colors';
import { HText, PText } from '@/components/MyText';
import { useMessage } from '@/utils/common';
import type { ScoutResponse } from '@/types/pulse';

const { TextArea } = Input;

interface ScoutPromptProps {
  onScoutSuccess: (response: ScoutResponse) => void;
}

const EXAMPLE_PROMPTS: readonly string[] = [
  'I want to build chicken rice shop near Lavender MRT, help me analyse the competitors',
  'Looking to start a bubble tea shop around Orchard — too saturated?',
  'Thinking of a nail salon near Tampines Mall. Competitor analysis please.',
  'Want to open a bookstore near NUS. What are the competitors around?',
];

async function postScout(prompt: string): Promise<ScoutResponse> {
  const res = await fetch('/api/pulse/scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'unknown' }));
    const msg = body?.detail || body?.error || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return (await res.json()) as ScoutResponse;
}

export default function ScoutPrompt({ onScoutSuccess }: ScoutPromptProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const { displayErrorMessage } = useMessage();

  const mutation = useMutation({
    mutationFn: postScout,
    onSuccess: (data) => {
      setOpen(false);
      setPrompt('');
      onScoutSuccess(data);
    },
    onError: (err) => {
      displayErrorMessage(err, 'Could not analyze that prompt. Try rephrasing.');
    },
  });

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 5) return;
    mutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<ThunderboltFilled />}
        onClick={() => setOpen(true)}
        style={{
          height: 44,
          borderRadius: 999,
          paddingInline: 18,
          fontWeight: 600,
          boxShadow: '0 2px 12px rgba(0, 177, 79, 0.25)',
          flexShrink: 0,
        }}
      >
        Ask AI
      </Button>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltFilled style={{ color: colorConfig.primaryColor }} />
            <HText variant="h5" style={{ margin: 0 }}>
              Scout a location with AI
            </HText>
          </div>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        centered
        width={640}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <PText variant="small" style={{ color: colorConfig.textSecondary, margin: 0 }}>
            Describe any business you&apos;re thinking of opening and where. Works for F&B,
            retail, services, clinics, anything. AI will resolve the location, analyze
            direct competitors within 1km, and give you an actionable advisory.
          </PText>

          <TextArea
            autoFocus
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. I want to build a chicken rice shop near Lavender MRT, help me analyse the competitors"
            maxLength={500}
            showCount
            style={{ borderRadius: 10 }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <PText
              variant="small"
              style={{ width: '100%', margin: 0, color: colorConfig.textMuted }}
            >
              Try:
            </PText>
            {EXAMPLE_PROMPTS.map((example) => (
              <Tag
                key={example}
                style={{
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '4px 12px',
                  border: `1px solid ${colorConfig.borderColor}`,
                  background: colorConfig.backgroundSecondary,
                  whiteSpace: 'normal',
                  maxWidth: '100%',
                  lineHeight: 1.4,
                }}
                onClick={() => setPrompt(example)}
              >
                {example}
              </Tag>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={mutation.isPending}
              disabled={prompt.trim().length < 5}
            >
              {mutation.isPending ? 'Analyzing…' : 'Analyze'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
