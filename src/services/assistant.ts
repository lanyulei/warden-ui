import { request } from '@umijs/max';

// 智能助手接口

// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 聊天历史消息类型
export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// 聊天历史响应数据
export interface ChatHistoryResponse {
  user_id: string;
  session_id: string;
  messages: ChatHistoryMessage[];
  total: number;
}

// 聊天请求参数
export interface ChatApiRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

// 聊天响应数据
export interface ChatApiResponse {
  message: ChatMessage;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 发送聊天消息
export async function chat(data: ChatApiRequest) {
  return request<{
    code: number;
    message: string;
    data: ChatApiResponse;
  }>('/api/v1/assistant/chat', {
    method: 'POST',
    data,
  });
}

// 流式聊天回调接口
export interface ChatStreamCallbacks {
  onMessage: (content: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// 流式聊天
export async function chatStream(
  data: ChatApiRequest,
  callbacks: ChatStreamCallbacks,
) {
  const { onMessage, onError, onComplete } = callbacks;

  try {
    // 获取 token
    const token = localStorage.getItem('token');

    const response = await fetch('/api/v1/assistant/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const content = line.slice(5).trim();
          if (content && content !== '[DONE]') {
            try {
              // 尝试解析 JSON 格式
              const parsed = JSON.parse(content);
              if (parsed.content) {
                onMessage(parsed.content);
              } else if (typeof parsed === 'string') {
                onMessage(parsed);
              }
            } catch {
              // 如果不是 JSON，直接使用原始内容
              onMessage(content);
            }
          }
        }
      }
    }

    onComplete?.();
  } catch (error) {
    onError?.(error as Error);
  }
}

// 获取聊天历史
export async function getChatHistory() {
  return request<{
    code: number;
    message: string;
    data: ChatHistoryResponse;
  }>('/api/v1/assistant/chat/history', {
    method: 'GET',
  });
}

