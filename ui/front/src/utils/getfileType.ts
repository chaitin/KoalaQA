export type SupportFileType = 'jspx' | 'php' | 'jsp';

export const supportType: SupportFileType[] = ['jspx', 'php', 'jsp'];

export const autoGetFileType = (file: File) => {
  return supportType.filter((type) => file.name.endsWith(type))?.[0];
};
