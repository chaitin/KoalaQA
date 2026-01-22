type SSECallback<T> = (data: T) => void;
type SSEErrorCallback = (error: Error) => void;
type SSECompleteCallback = () => void;

interface SSEClientOptions {
  url: string;
  headers?: Record<string, string>;
  onOpen?: SSECompleteCallback;
  onError?: SSEErrorCallback;
  onCancel?: SSEErrorCallback;
  onComplete?: SSECompleteCallback;
  method?: string;
  streamMode?: boolean; // 是否启用流式模式（处理每个数据块）
}

class SSEClient<T> {
  private controller: AbortController;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null;
  private textDecoder: TextDecoder;
  private buffer: string;
  private currentEvent: string | null = null; // 保存当前事件类型，用于跨数据块保持状态

  constructor(private options: SSEClientOptions) {
    this.controller = new AbortController();
    this.reader = null;
    this.textDecoder = new TextDecoder();
    this.buffer = '';
    this.currentEvent = null;
  }

  public subscribe(body: BodyInit, onMessage: SSECallback<T>, additionalHeaders?: Record<string, string>) {
    this.controller.abort();
    this.controller = new AbortController();
    this.currentEvent = null; // 重置事件状态
    const {
      url,
      headers,
      onOpen,
      onError,
      onComplete,
      method = 'POST',
    } = this.options;
    
    // 合并额外的 headers
    const mergedHeaders = {
      ...headers,
      ...additionalHeaders,
    };

    const timeoutDuration = 300000;
    const timeoutId = setTimeout(() => {
      this.unsubscribe();
      onError?.(new Error('Request timed out after 5 minutes'));
    }, timeoutDuration);

    const upperMethod = method.toUpperCase();
    const hasBody =
      upperMethod !== 'GET' &&
      upperMethod !== 'HEAD' &&
      body !== undefined &&
      body !== null;

    fetch(url, {
      method,
      headers: {
        Accept: 'text/event-stream',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...mergedHeaders,
      },
      body: hasBody ? body : undefined,
      signal: this.controller.signal,
      credentials: 'include',
    })
      .then(async response => {
        if (!response.ok) {
          clearTimeout(timeoutId);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          clearTimeout(timeoutId);
          onError?.(new Error('No response body'));
          return;
        }

        // 检查响应类型，如果是 text/event-stream，自动启用流式模式
        const contentType = response.headers.get('content-type');
        const isEventStream = contentType?.includes('text/event-stream');
        if (isEventStream && !this.options.streamMode) {
          this.options.streamMode = true;
        }

        onOpen?.();
        this.reader = response.body.getReader();

        while (true) {
          const { done, value } = await this.reader.read();
          if (done) {
            clearTimeout(timeoutId);
            onComplete?.();
            break;
          }
          this.processChunk(value, onMessage);
        }
      })
      .catch(error => {
        clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
          onError?.(error);
        }
      });
  }

  private processChunk(
    chunk: Uint8Array | undefined,
    callback: SSECallback<T>,
  ) {
    if (!chunk) return;

    this.buffer += this.textDecoder.decode(chunk, { stream: true });

    if (this.options.streamMode) {
      // 流式模式：立即处理缓冲区中的数据，不等待完整消息
      this.processStreamingData(callback);
    } else {
      // 标准SSE模式：按完整消息处理
      this.processStandardSSEData(callback);
    }
  }

  private processStreamingData(callback: SSECallback<T>) {
    // 流式模式：立即处理缓冲区中的数据
    if (this.buffer.length === 0) return;

    const lines = this.buffer.split('\n');
    let processedLines = 0;

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();

      if (line.startsWith('event:') || line.startsWith('event: ')) {
        this.currentEvent = line.startsWith('event: ') ? line.slice(7) : line.slice(6);
        processedLines = i + 1;
      } else if (line.startsWith('data:') || line.startsWith('data: ')) {
        const dataContent = line.startsWith('data: ') ? line.slice(6) : line.slice(5);

        if (dataContent && dataContent !== 'csrf token mismatch') {
          // 如果是 end 事件，不调用 callback
          if (this.currentEvent === 'end') {
            this.currentEvent = null;
            processedLines = i + 1;
            continue;
          }

          try {
            // 尝试解析为JSON
            const parsedData = JSON.parse(dataContent);
            // 如果有 event，将其包含在数据对象中
            if (this.currentEvent) {
              callback({ event: this.currentEvent, data: parsedData } as T);
              this.currentEvent = null;
            } else {
              callback(parsedData as T);
            }
          } catch (error) {
            // 不是JSON，直接作为文本处理
            if (this.currentEvent) {
              callback({ event: this.currentEvent, data: dataContent } as T);
              this.currentEvent = null;
            } else {
              callback(dataContent as any);
            }
          }
        }
        processedLines = i + 1;
      } else if (line === '') {
        // 空行表示消息结束，但流式模式下我们已经处理了数据
        processedLines = i + 1;
      }
    }

    // 保留未处理的行
    this.buffer = lines.slice(processedLines).join('\n');
  }

  private processStandardSSEData(callback: SSECallback<T>) {
    // 标准SSE模式：按完整的SSE消息格式处理
    const lines = this.buffer.split('\n');
    let currentData = '';
    let isDataLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('event:') || line.startsWith('event: ')) {
        this.currentEvent = line.startsWith('event: ') ? line.slice(7) : line.slice(6);
      } else if (line.startsWith('data:') || line.startsWith('data: ')) {
        if (isDataLine) {
          currentData += '\n';
        }
        currentData += line.startsWith('data: ') ? line.slice(6) : line.slice(5);
        isDataLine = true;
      } else if (line === '' || line === '\r') {
        if (isDataLine) {
          try {
            const parsedData = JSON.parse(currentData);
            // 如果有 event，将其包含在数据对象中
            if (this.currentEvent) {
              callback({ event: this.currentEvent, data: parsedData } as T);
              this.currentEvent = null; // 处理完数据后清除事件
            } else {
              callback(parsedData as T);
            }
          } catch (error) {
            // 不是JSON，直接作为文本处理
            if (this.currentEvent) {
              callback({ event: this.currentEvent, data: currentData } as T);
              this.currentEvent = null;
            } else {
              callback(currentData as any);
            }
          }
          currentData = '';
          isDataLine = false;
        }
      }
    }

    // 保留未处理的行
    this.buffer = isDataLine ? currentData : (lines[lines.length - 1] || '');
  }

  public unsubscribe() {
    this.controller.abort();
    if (this.reader) {
      this.reader.cancel();
    }
    this.options.onCancel?.(new Error('Request canceled'));
  }
}

export default SSEClient;
