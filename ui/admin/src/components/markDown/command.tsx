import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';

const Command = ({
  children,
  theme = 'material-theme-darker',
  lang = 'shell',
}: {
  children: React.ReactNode;
  theme?: string;
  lang?: string;
}) => {
  const [html, setHtml] = useState<string>('');
  useEffect(() => {
    codeToHtml(String(children).replace(/\n$/, ''), {
      lang,
      theme,
    }).then((html) => setHtml(html));
  }, [children, theme, lang]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default Command;
