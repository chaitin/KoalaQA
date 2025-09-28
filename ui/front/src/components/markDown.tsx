'use client';
import React, { useState } from 'react';
import { SxProps } from '@mui/material/styles';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Image } from 'antd';
import SyntaxHighlighter from 'react-syntax-highlighter';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { anOldHope } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { extractTextFromHTML, truncateText } from '@/utils/stringUtils';

// 扩展props接口，添加truncate选项
export interface MarkDownProps {
  title?: string;
  content?: string;
  sx?: SxProps;
  truncateLength?: number; // 添加截断长度选项，0表示不截断
}

const MarkDown: React.FC<MarkDownProps> = (props) => {
  const { content = '', sx, truncateLength = 0 } = props;
  const [visible, setVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  let contentStr = content;
  
  // 原始截断逻辑
  if (content.length > 100000) {
    contentStr = content.slice(0, 100000);
  }
  
  // 如果设置了truncateLength，创建一个只包含截断文本的span元素
  // 注意：这种方式会丢失HTML结构，只显示纯文本
  let displayContent = contentStr;
  if (truncateLength > 0) {
    const plainText = extractTextFromHTML(contentStr);
    displayContent = truncateText(plainText, truncateLength);
  }

  return (
    <Box
      sx={{ overflow: 'auto', ...sx }}
      className='markdown-body'
      id='markdown-body'
    >
      {previewSrc && (
        <Image
          alt='markdown-img'
          width={0}
          height={0}
          style={{ display: 'none' }}
          src={previewSrc}
          preview={{
            visible,
            src: previewSrc,
            onVisibleChange: (value) => {
              setVisible(value);
            },
          }}
        />
      )}

      {/* 如果需要截断，直接显示纯文本，否则正常渲染Markdown */}
      {truncateLength > 0 ? (
        <span>{displayContent}</span>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[
            rehypeRaw,
            [
              rehypeSanitize,
              { tagNames: [...(defaultSchema.tagNames as string[]), 'center'] },
            ],
          ]}
          components={{
            h1: ({ node, ...props }) => <h2 {...props} />,
            img: (props) => {
              const { style, src } = props;
              return src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={props.alt || 'markdown-img'}
                  {...props}
                  style={{
                    ...style,
                    borderRadius: '4px',
                    marginLeft: '5px',
                    boxShadow: '0px 0px 3px 1px rgba(0,0,5,0.15)',
                    cursor: 'pointer',
                  }}
                  referrerPolicy='no-referrer'
                  onClick={() => {
                    setPreviewSrc(props.src as string);
                    setVisible(true);
                  }}
                />
              ) : null;
            },
            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
                <SyntaxHighlighter
                  showLineNumbers
                  {...(rest as any)}
                  language={match[1] || 'bash'}
                  style={anOldHope}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code {...rest} className={className}>
                  {children}
                </code>
              );
            },
          }}
        >
          {contentStr}
        </ReactMarkdown>
      )}
    </Box>
  );
};

export default MarkDown;
