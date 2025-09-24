'use client';
import React, { useState } from 'react';
import { SxProps } from '@mui/material/styles';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { anOldHope } from 'react-syntax-highlighter/dist/esm/styles/hljs';
// import remarkToc from "remark-toc";

export interface MarkDownProps {
  title?: string;
  content?: string;
  sx?: SxProps;
}

const MarkDown: React.FC<MarkDownProps> = props => {
  const { content = '', sx } = props;
  const [visible, setVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
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
          [rehypeSanitize, { tagNames: [...(defaultSchema.tagNames as string[]), 'center'] }],
        ]}
        components={{
          h1: ({ node, ...props }) => <h2 {...props} />,
          img: props => {
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
                referrerPolicy="no-referrer"
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
    </Box>
  );
};

export default MarkDown;
