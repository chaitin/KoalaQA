import { Card } from '@/components'
import type { Metadata } from 'next'
import Register from './ui'

export const metadata: Metadata = {
  title: '注册',
}

const page = () => {
  return (
    <Card
      sx={{
        border: '1px solid #D9DEE2',
        borderRadius: '8px',
        width: 400,
        maxWidth: '80%',
      }}
    >
      <Register />
    </Card>
  )
}

export default page
