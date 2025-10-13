import { Stack } from '@mui/material'

const Footer = () => {
  return (
    <Stack
      direction='row'
      justifyContent='center'
      sx={{
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.footer',
        maxWidth: '100%',
        minWidth: 0,
        zIndex: 2,
      }}
    >
      <Stack
        direction={'row'}
        alignItems={'center'}
        sx={{
          fontSize: '14px',
          lineHeight: '54px',
          color: 'rgba(255, 255, 255, 0.30)',
        }}
        // onClick={() => {
        //   window.open('https://pandawiki.docs.baizhi.cloud/');
        // }}
        gap={0.5}
      >
        本网站由
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={'/inverse_logo-text.png'} alt='KoalaQA' width={90} height={16} />
         提供技术支持
      </Stack>
    </Stack>
  )
}

export default Footer
