'use client';
import React, { useState } from 'react';
import { SxProps } from '@mui/material/styles';
import { Box, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
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
      {/* 图片预览 Dialog */}
      <Dialog
        open={visible}
        onClose={() => setVisible(false)}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none',
          },
        }}
      >
        <IconButton
          onClick={() => setVisible(false)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
            minHeight: '400px',
          }}
        >
          {previewSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          )}
        </Box>
      </Dialog>

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
            h1: ({ ...props }) => <h2 {...props} />,
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
                    objectFit: 'contain',
                    objectPosition: 'center',
                    maxWidth: '100%',
                    height: 'auto',
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
              const { children, className, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
                <SyntaxHighlighter
                  showLineNumbers
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
