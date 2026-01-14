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

  public subscribe(body: BodyInit, onMessage: SSECallback<T>) {
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
        ...headers,
      },
      body: hasBody ? body : undefined,
      signal: this.controller.signal,
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
    const lines = this.buffer.split('\n');
    let currentData = '';
    let isDataLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('event: ')) {
        this.currentEvent = line.slice(7);
      } else if (line.startsWith('data: ')) {
        if (isDataLine) {
          currentData += '\n';
        }
        currentData += line.slice(6);
        isDataLine = true;
      } else if (line === '') {
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

    this.buffer = lines[lines.length - 1];
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
