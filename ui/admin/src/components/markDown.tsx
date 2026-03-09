'use client';
import React from 'react';
import { SxProps } from '@mui/material/styles';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { anOldHope } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export interface MarkDownProps {
  title?: string;
  content?: string;
  sx?: SxProps;
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames as string[]), 'center', 'input'],
  attributes: {
    ...(defaultSchema.attributes || {}),
    '*': [
      ...((defaultSchema.attributes as any)?.['*'] || []),
      'className',
      'style',
      'data-sourcepos',
    ],
    ol: [...((defaultSchema.attributes as any)?.ol || []), 'start', 'type'],
    ul: [...((defaultSchema.attributes as any)?.ul || []), 'className'],
    li: [...((defaultSchema.attributes as any)?.li || []), 'className', 'value'],
    input: [
      ...((defaultSchema.attributes as any)?.input || []),
      'type',
      'checked',
      'disabled',
    ],
  },
};

const MarkDown: React.FC<MarkDownProps> = props => {
  const { content = '', sx } = props;
  let contentStr = content;
  if (content.length > 100000) {
    contentStr = content.slice(0, 100000);
  }
  return (
    <Box sx={{ overflow: 'auto', ...sx }} className="markdown-body" id="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
        ]}
        components={{
          h1: ({ ...props }) => <h2 {...props} />,
          img: (props) => {
            const { style, src } = props;
            return src ? (
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
              />
            ) : null;
          },
          code(props) {
            const { children, className, ...rest } = props;
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
    </Box>
  );
};

export default MarkDown;
