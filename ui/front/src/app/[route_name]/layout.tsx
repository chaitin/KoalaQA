import { Container } from '@mui/material'
import { headers } from 'next/headers'

export default async function RouteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ route_name: string }>
}) {

  // 在服务端读取 URL 参数（通过 middleware 设置的 header）
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const searchParamsStr = headersList.get('x-search-params') || ''

  // 解析 searchParams
  let initialSearchParams: { type?: string | null; tps?: string | null; tags?: string | null } = {}
  let initialPathname: string | undefined = undefined

  try {
    if (searchParamsStr) {
      const searchParams = new URLSearchParams(searchParamsStr)
      initialSearchParams = {
        type: searchParams.get('type'),
        tps: searchParams.get('tps'),
        tags: searchParams.get('tags'),
      }
    }
    if (pathname) {
      initialPathname = pathname
    }
  } catch (e) {
    // 如果解析失败，使用空值
    // 在服务端静默失败，不影响渲染
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to parse searchParams in layout:', e)
    }
  }

  return (
    <Container
      className='forum_main'
      sx={{
        minWidth: 0,
        pt: { xs: 0, sm: 3 },
        px: 0,
        mx: 'auto',
        width: 'unset',
        display: { xs: 'block', lg: 'flex' },
        justifyContent: 'center',
        gap: { xs: 0, lg: 3 },
        alignItems: { lg: 'flex-start' },
      }}
    >
      {children}
    </Container>
  )
}
