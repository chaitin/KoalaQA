'use client';
import React, { CSSProperties, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import MarkDown from './markDown';
import alert from '@/components/alert';
import { postDiscussionUpload } from '@/api';

const Md = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false,
});

const MdEditor = (props: {
  value?: string;
  onChange?(v: string): void;
  style?: CSSProperties;
}) => {
  const { style } = props;
  const value = props.value || '';
  const mdEditorRef = useRef(undefined);
  const handleChange = (newValue: string) => {
    if (newValue.length > 100000) {
      alert.error('内容过长, 请控制在 10万 字以内');
      return;
    }
    props.onChange && props.onChange(newValue);
  };

  const onImageUpload = (file: any) => {
    return new Promise((resolve) => {
      postDiscussionUpload({ file }).then((res) => {
        resolve(res);
      });
    });
  };

  return (
    <Md
      value={value}
      style={{ height: '300px', ...style }}
      onChange={({ text }) => {
        handleChange(text);
      }}
      plugins={['mode-toggle']}
      config={{
        view: {
          menu: true,
          md: true,
          html: false,
        },
        canView: {
          both: false,
        },
      }}
      onImageUpload={onImageUpload}
      renderHTML={(text) => <MarkDown content={text} />}
    />
  );
};

export default MdEditor;
