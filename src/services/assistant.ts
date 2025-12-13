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

// 获取流式 API 的基础 URL
// 开发环境直接连接后端，避免代理缓冲问题
function getStreamBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境直接连接后端服务器，绕过代理缓冲
    return 'http://127.0.0.1:9527';
  }
  // 生产环境使用相对路径
  return '';
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
    const baseUrl = getStreamBaseUrl();
    const url = `${baseUrl}/api/v1/assistant/chat/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
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
    // 添加缓冲区来处理跨 chunk 的不完整行
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // 处理缓冲区中剩余的数据
        if (buffer.trim()) {
          processSSELine(buffer, onMessage);
        }
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // 按换行符分割，保留未完成的行
      const lines = buffer.split('\n');
      // 最后一个元素可能是未完成的行，保留在缓冲区
      buffer = lines.pop() || '';

      for (const line of lines) {
        processSSELine(line, onMessage);
      }
    }

    onComplete?.();
  } catch (error) {
    console.error('[Stream Error]:', error);
    onError?.(error as Error);
  }
}

// 处理单行 SSE 数据
function processSSELine(line: string, onMessage: (content: string) => void) {
  const trimmedLine = line.trim();
  if (!trimmedLine || !trimmedLine.startsWith('data:')) {
    return;
  }

  const content = trimmedLine.slice(5).trim();
  if (!content || content === '[DONE]') {
    return;
  }

  try {
    // 尝试解析 JSON 格式
    const parsed = JSON.parse(content);
    if (parsed.content) {
      onMessage(parsed.content);
    } else if (parsed.choices?.[0]?.delta?.content) {
      // 兼容 OpenAI 格式
      onMessage(parsed.choices[0].delta.content);
    } else if (typeof parsed === 'string') {
      onMessage(parsed);
    }
  } catch {
    // 如果不是 JSON，直接使用原始内容
    onMessage(content);
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

