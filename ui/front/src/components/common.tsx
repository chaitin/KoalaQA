'use client';
import { alpha, styled } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';

export const LinkText = styled(Link)(({ theme }) => ({
  color: theme.palette.primary.main,
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  textDecoration: 'none',
  fontSize: 12,
  '&:hover': {
    fontWeight: 600,
  },
}));

export const LinkTag = styled(Link)(({ theme }) => ({
  padding: '2px 8px',
  borderRadius: '10px',
  fontFamily: 'var(--font-mono)',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  cursor: 'pointer',
  textDecoration: 'none',
  fontSize: 12,
  '&:hover': {
    fontWeight: 600,
  },
}));
interface LinkImageProps {
  url: string;
  picture: string;
}
export const LinkImage: React.FC<LinkImageProps> = ({ url, picture }) => {
  return (
    <Link
      href={url!}
      style={{ cursor: 'pointer', position: 'relative' }}
      target='_blank'
    >
      <Image
        src={picture}
        alt='广告图'
        width={0}
        height={0}
        sizes="100vw"
        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
      />
      {/* <Box
        sx={{
          position: 'absolute',
          backgroundColor: 'rgba(216,216,216,0.18)',
          border: '1px solid #FFFFFF',
          borderRadius: '2px',
          fontSize: 12,
          color: '#fff',
          px: 1,
          lineHeight: '16px',
          bottom: 16,
          right: 16,
          cursor: 'pointer',
        }}
      >
        广告
      </Box> */}
    </Link>
  );
};

export const TopicLink: React.FC<
  Partial<React.ComponentProps<typeof LinkText>> & { name: string }
> = (props) => {
  const { name, ...rest } = props;
  return (
    <LinkText href={`/s?keywords=${name}`} target='_blank' {...rest}>
      <span style={{ paddingRight: '2px' }}>#</span>
      {name}
    </LinkText>
  );
};
