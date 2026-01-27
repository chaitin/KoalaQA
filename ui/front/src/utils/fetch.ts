type SSECallback<T> = (data: T) => void
type SSEErrorCallback = (error: Error) => void
type SSECompleteCallback = () => void

interface SSEClientOptions {
  url: string
  headers?: Record<string, string>
  onOpen?: SSECompleteCallback
  onError?: SSEErrorCallback
  onCancel?: SSEErrorCallback
  onComplete?: SSECompleteCallback
  method?: string
  streamMode?: boolean // 新增：是否启用流式模式（处理每个数据块）
}

class SSEClient<T> {
  private controller: AbortController
  private reader: ReadableStreamDefaultReader<Uint8Array> | null
  private textDecoder: TextDecoder
  private buffer: string
  private currentEvent: string | null = null // 保存当前事件类型，用于跨数据块保持状态

  constructor(private options: SSEClientOptions) {
    this.controller = new AbortController()
    this.reader = null
    this.textDecoder = new TextDecoder()
    this.buffer = ''
    this.currentEvent = null
  }

  public subscribe(body: BodyInit, onMessage: SSECallback<T>, isRetry = false) {
    this.controller.abort()
    this.controller = new AbortController()
    this.currentEvent = null // 重置事件状态
    const { url, headers, onOpen, onError, onComplete, method = 'POST' } = this.options

    const timeoutDuration = 300000
    const timeoutId = setTimeout(() => {
      this.unsubscribe()
      onError?.(new Error('Request timed out after 5 minutes'))
    }, timeoutDuration)

    const upperMethod = method.toUpperCase()
    const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD' && body !== undefined && body !== null

    fetch(url, {
      method,
      headers: {
        ...(headers || {}), // 用户提供的headers优先级最低
        Accept: 'text/event-stream', // 确保SSE的Accept头不被覆盖
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? body : undefined,
      signal: this.controller.signal,
    })
      .then(async (response) => {
        const contentType = response.headers.get('content-type')
        const isEventStream = contentType?.includes('text/event-stream')

        // 避免在流式响应上读取完整 body，导致流式输出阻塞
        if (response.ok && !this.options.streamMode && !isEventStream) {
          // 克隆响应以便可以多次读取
          const clonedResponse = response.clone()
          const text = await clonedResponse.text()

          // 检测 CSRF mismatch 错误
          if (text.includes('csrf token mismatch') && !isRetry) {
            clearTimeout(timeoutId)
            console.log('CSRF token mismatch detected in SSE, retrying with new token...')

            // 动态导入并清除 CSRF token 缓存
            try {
              const { clearCsrfTokenCache, getCsrfToken } = await import('@/api/httpClient')
              clearCsrfTokenCache()

              // 获取新的 token
              const newToken = await getCsrfToken()

              // 更新 headers 中的 CSRF token
              this.options.headers = {
                ...(this.options.headers || {}),
                'X-CSRF-TOKEN': newToken,
              }

              // 重试请求
              this.subscribe(body, onMessage, true)
              return
            } catch (retryError) {
              console.error('Failed to retry SSE request:', retryError)
              onError?.(new Error('CSRF token refresh failed'))
              return
            }
          }
        }

        if (response.status === 400 && !isRetry) {
          // 克隆响应以便读取错误信息
          const clonedResponse = response.clone()
          try {
            const text = await clonedResponse.text()
            // 检测 CSRF mismatch 错误
            if (text.includes('csrf token mismatch')) {
              clearTimeout(timeoutId)
              console.log('CSRF token mismatch detected in SSE (400), retrying with new token...')

              // 动态导入并清除 CSRF token 缓存
              try {
                const { clearCsrfTokenCache, getCsrfToken } = await import('@/api/httpClient')
                clearCsrfTokenCache()

                // 获取新的 token
                const newToken = await getCsrfToken()

                // 更新 headers 中的 CSRF token
                this.options.headers = {
                  ...(this.options.headers || {}),
                  'X-CSRF-TOKEN': newToken,
                }

                // 重试请求
                this.subscribe(body, onMessage, true)
                return
              } catch (retryError) {
                console.error('Failed to retry SSE request:', retryError)
                onError?.(new Error('CSRF token refresh failed'))
                return
              }
            }
          } catch (e) {
            console.warn('Failed to read error response body:', e)
          }
        }

        if (!response.ok) {
          clearTimeout(timeoutId)
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        if (!response.body) {
          clearTimeout(timeoutId)
          onError?.(new Error('No response body'))
          return
        }

        // 强制设置为流式模式，无论Content-Type如何
        if (!this.options.streamMode && isEventStream) {
          this.options.streamMode = true
        }

        onOpen?.()
        this.reader = response.body.getReader()

        try {
          while (true) {
            const { done, value } = await this.reader.read()
            if (done) {
              clearTimeout(timeoutId)
              onComplete?.()
              break
            }
            this.processChunk(value, onMessage)
          }
        } catch (error) {
          clearTimeout(timeoutId)
          // 如果是因为中止导致的错误，不调用 onError
          if (error instanceof Error && error.name !== 'AbortError') {
            onError?.(error)
          }
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name !== 'AbortError') {
          onError?.(error)
        }
      })
  }

  private processChunk(chunk: Uint8Array | undefined, callback: SSECallback<T>) {
    if (!chunk) return

    // 解码新的数据块
    const chunkText = this.textDecoder.decode(chunk, { stream: true })
    this.buffer += chunkText

    if (this.options.streamMode) {
      // 流式模式：逐字符处理
      this.processStreamingData(callback)
    } else {
      // 标准SSE模式：按完整消息处理
      this.processStandardSSEData(callback)
    }
  }

  private processStreamingData(callback: SSECallback<T>) {
    // 流式模式：立即处理缓冲区中的数据，不等待完整消息
    if (this.buffer.length === 0) return

    try {
      // 检查是否包含SSE格式的数据
      if (this.buffer.includes('data:')) {
        // 包含SSE格式，按SSE处理（该方法内部会管理缓冲区）
        this.processStreamingSSEData(callback)
      } else if (this.buffer.includes('{') || this.buffer.includes('[')) {
        console.log('Detected JSON format, processing as JSON chunks')
        // 尝试按JSON块处理
        this.processJsonChunks(callback)
        // 清空缓冲区
        this.buffer = ''
      } else {
        console.log('Processing as plain text stream')
        // 纯文本流，直接处理
        const textData = this.buffer.replace(/[\r\n]/g, '') // 移除换行符
        if (textData) {
          callback(textData as any)
        }
        // 清空缓冲区
        this.buffer = ''
      }
    } catch (error) {
      console.error('Error processing streaming data:', error)
      // 出错时仍然尝试发送原始数据
      if (this.buffer) {
        try {
          callback(this.buffer as any)
        } catch (fallbackError) {
          this.options.onError?.(new Error('Failed to process streaming data'))
        }
      }
      this.buffer = ''
    }
  }

  private processJsonChunks(callback: SSECallback<T>) {
    // 尝试处理JSON格式的流式数据
    const chunks = this.buffer.split(/(?<=\})\s*(?=\{)|(?<=\])\s*(?=\{)|(?<=\})\s*(?=\[)|(?<=\])\s*(?=\[)/)

    for (const chunk of chunks) {
      const trimmedChunk = chunk.trim()
      if (trimmedChunk) {
        try {
          const parsed = JSON.parse(trimmedChunk)
          console.log('Parsed JSON chunk:', parsed)
          callback(parsed as T)
        } catch (e) {
          // 如果不是完整JSON，当作文本处理
          if (trimmedChunk) {
            console.log('Invalid JSON chunk, treating as text:', trimmedChunk)
            callback(trimmedChunk as any)
          }
        }
      }
    }
  }

  private processStreamingSSEData(callback: SSECallback<T>) {
    // 处理流式SSE数据格式，立即提取并处理数据
    const lines = this.buffer.split('\n')

    // 保留最后一个可能不完整的行（如果缓冲区不是以换行符结尾）
    const hasTrailingNewline = this.buffer.endsWith('\n')
    const linesToProcess = hasTrailingNewline ? lines : lines.slice(0, -1)
    const remainingBuffer = hasTrailingNewline ? '' : lines[lines.length - 1]

    for (let i = 0; i < linesToProcess.length; i++) {
      const line = linesToProcess[i].trim()

      if (line.startsWith('event:')) {
        // 处理 event: 或 event:（有无空格都支持）
        this.currentEvent = line.startsWith('event: ') ? line.slice(7) : line.slice(6)
      } else if (line.startsWith('data:')) {
        const dataContent = line.startsWith('data: ') ? line.slice(6) : line.slice(5)

        if (dataContent && dataContent !== 'csrf token mismatch') {
          // 如果是 end 事件，不调用 callback，等待流结束时会触发 onComplete
          if (this.currentEvent === 'end') {
            this.currentEvent = null
            continue
          }

          try {
            // 尝试解析为JSON
            const parsedData = JSON.parse(dataContent)
            // 如果有 event，将其包含在数据对象中
            if (this.currentEvent) {
              const eventData = { event: this.currentEvent, data: parsedData } as T
              callback(eventData)

              // 如果是 no_disc 事件且 data 为 true，表示结束
              if (this.currentEvent === 'no_disc' && parsedData === true) {
                this.currentEvent = null
                // 调用 onComplete 并停止处理
                this.options.onComplete?.()
                this.unsubscribe()
                return
              }

              this.currentEvent = null // 处理完数据后清除事件
            } else {
              callback(parsedData as T)
            }
          } catch (jsonError) {
            // 不是JSON，直接作为文本处理
            if (dataContent) {
              if (this.currentEvent) {
                callback({ event: this.currentEvent, data: dataContent } as T)
                this.currentEvent = null // 处理完数据后清除事件
              } else {
                callback(dataContent as any)
              }
            }
          }
        }
      }
    }

    // 更新缓冲区，只保留未处理的不完整行
    this.buffer = remainingBuffer
  }

  private processStandardSSEData(callback: SSECallback<T>) {
    // 标准SSE模式：按完整的SSE消息格式处理
    const lines = this.buffer.split('\n')
    let currentData = ''
    let currentEvent: string | null = null
    let isDataLine = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 处理不同格式的 SSE 数据
      if (line.startsWith('data: ')) {
        if (isDataLine) {
          currentData += '\n'
        }
        const dataContent = line.slice(6)
        currentData += dataContent
        isDataLine = true
      } else if (line.startsWith('data:')) {
        // 处理没有空格的 data: 格式
        if (isDataLine) {
          currentData += '\n'
        }
        const dataContent = line.slice(5)
        currentData += dataContent
        isDataLine = true
      } else if (line.startsWith('event:')) {
        // 处理事件类型（支持有无空格）
        currentEvent = line.startsWith('event: ') ? line.slice(7) : line.slice(6)
      } else if (line === '' || line === '\r') {
        if (isDataLine) {
          this.processData(currentData, callback, currentEvent)
          currentData = ''
          currentEvent = null
          isDataLine = false
        }
      }
    }

    // 如果还有未处理的数据，保留在缓冲区中
    this.buffer = isDataLine ? currentData : ''
  }

  private processData(rawData: string, callback: SSECallback<T>, event: string | null = null) {
    try {
      // 如果是 end 事件，不调用 callback
      if (event === 'end') {
        return
      }

      // 尝试解析为 JSON
      let data: T
      try {
        data = JSON.parse(rawData) as T
      } catch (jsonError) {
        data = { content: rawData } as T
      }

      // 如果有 event，将其包含在数据对象中
      if (event) {
        const eventData = { event, data } as T
        callback(eventData)

        // 如果是 no_disc 事件且 data 为 true，表示结束
        if (event === 'no_disc' && data === true) {
          // 调用 onComplete 并停止处理
          this.options.onComplete?.()
          this.unsubscribe()
          return
        }
      } else {
        callback(data)
      }
    } catch (error) {
      console.error('Error processing SSE data:', error)
      console.error('Raw data:', rawData)
      this.options.onError?.(new Error('Failed to parse SSE data'))
    }
  }

  public unsubscribe() {
    this.controller.abort()
    if (this.reader) {
      this.reader.cancel().catch((error) => {
        // 忽略 AbortError，这是正常的中止行为
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Error canceling stream reader:', error)
        }
      })
    }
    this.options.onCancel?.(new Error('Request canceled'))
  }
}

export default SSEClient
