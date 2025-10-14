'use client'
import { getDiscussion } from '@/api'
import { GetDiscussionParams, ModelDiscussion, ModelGroupItemInfo, ModelGroupWithItem, ModelListRes } from '@/api/types'
import { Card, CusTabs } from '@/components'
import { AuthContext } from '@/components/authProvider'
import { CommonContext } from '@/components/commonProvider'
import { ReleaseModal } from '@/components/discussion'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, Divider, InputAdornment, OutlinedInput, Stack, Typography } from '@mui/material'
import { useBoolean } from 'ahooks'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import DiscussCard, { DiscussCardMobile } from './discussCard'

export type Status = 'hot' | 'new' | 'mine'

const Article = ({
  data,
  topics,
  groups: groupsData,
}: {
  data: ModelListRes & {
    items?: ModelDiscussion[]
  }
  topics: number[]
  groups?: ModelListRes & {
    items?: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[]
    })[]
  }
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useContext(AuthContext)
  const { checkAuth } = useAuthCheck()
  const { groups: contextGroups, groupsLoading } = useContext(CommonContext)

  // 优先使用SSR传入的groups数据，否则使用Context中的数据
  const groups = groupsData
    ? {
        origin: groupsData.items ?? [],
        flat: (groupsData.items?.filter((i) => !!i.items) || []).reduce((acc, item) => {
          acc.push(...(item.items || []))
          return acc
        }, [] as ModelGroupItemInfo[]),
      }
    : contextGroups

  const [releaseModalVisible, { setTrue: releaseModalOpen, setFalse: releaseModalClose }] = useBoolean(false)
  const [status, setStatus] = useState<Status>((searchParams?.get('sort') as Status) || 'hot')
  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const searchRef = useRef(search)
  const [articleData, setArticleData] = useState(data)
  const [page, setPage] = useState(1)

  const fetchMoreList = useCallback(() => {
    // 防止重复请求
    if (page * 10 >= (articleData.total || 0)) {
      return
    }

    const new_page = page + 1
    setPage(new_page)
    const params: GetDiscussionParams = {
      page: new_page,
      size: 10,
      filter: status as 'hot' | 'new' | 'mine',
    }

    // 如果有搜索关键词，添加到参数中
    if (search && search.trim()) {
      params.keyword = search.trim()
    }

    // 如果有选中的主题，添加到参数中
    if (topics && topics.length > 0) {
      params.group_ids = topics
    }

    getDiscussion(params).then((res) => {
      if (res) {
        setArticleData((pre) => ({
          total: res.total,
          items: [...(pre.items || []), ...(res.items || [])],
        }))
      }
    }).catch((error) => {
      console.error('Failed to fetch more discussions:', error)
      // 回退页码
      setPage(page)
    })
  }, [page, articleData.total, status, search, topics])

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set(name, value)
    return params.toString()
  }

  const fetchList = useCallback((st: Status, se: string, tps: number[]) => {
    setPage(1)
    const params: GetDiscussionParams = {
      page: 1,
      size: 10,
      filter: st as 'hot' | 'new' | 'mine',
    }

    // 如果有搜索关键词，添加到参数中
    if (se && se.trim()) {
      params.keyword = se.trim()
    }

    // 如果有选中的主题，添加到参数中
    if (tps && tps.length > 0) {
      params.group_ids = tps
    }

    return getDiscussion(params).then((res) => {
      if (res) {
        setArticleData(res)
      }
    }).catch((error) => {
      console.error('Failed to fetch discussions:', error)
      // 保持当前数据，不重置为空
    })
  }, [])

  const onInputSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSearch = useCallback(() => {
    const currentSearch = searchParams?.get('search') || ''
    const trimmedSearch = search && search.trim() ? search.trim() : ''
    
    // 只有在搜索内容真正变化时才更新 URL
    if (currentSearch !== trimmedSearch) {
      const params = new URLSearchParams(searchParams?.toString())
      
      // 如果搜索内容为空，移除 search 参数，否则设置 search 参数
      if (trimmedSearch) {
        params.set('search', trimmedSearch)
      } else {
        params.delete('search')
      }
      
      // 如果没有指定排序方式，默认使用 hot
      if (!params.get('sort')) {
        params.set('sort', 'hot')
      }
      
      router.push(`/?${params.toString()}`)
    }
  }, [search, searchParams, router])

  useEffect(() => {
    setArticleData(data)
  }, [data])

  // 监听 URL 参数变化，统一处理状态更新和数据获取
  useEffect(() => {
    const sortParam = (searchParams?.get('sort') as Status) || 'hot'
    const searchParam = searchParams?.get('search') || ''
    const tpsParam = searchParams?.get('tps')
    const currentTopics = tpsParam ? tpsParam.split(',').map(Number) : []
    
    // 更新状态
    setStatus(sortParam)
    
    // 只有在参数真正变化时才发起请求
    if (sortParam !== status || searchParam !== searchRef.current || 
        JSON.stringify(currentTopics) !== JSON.stringify(topics)) {
      fetchList(sortParam, searchParam, currentTopics)
    }
  }, [searchParams, status, topics, fetchList])

  // 更新搜索引用
  useEffect(() => {
    searchRef.current = search
  }, [search])

  const handleTopicClick = useCallback((t: number) => {
    let newTopics: number[]
    if (topics.includes(t)) {
      // 已选中则取消
      newTopics = topics.filter((item) => item !== t)
    } else {
      // 未选中则添加
      newTopics = [...topics, t]
    }
    
    // 只有在主题真正变化时才更新 URL
    if (JSON.stringify(newTopics) !== JSON.stringify(topics)) {
      const params = new URLSearchParams(searchParams?.toString())
      if (newTopics.length > 0) {
        params.set('tps', newTopics.join(','))
      } else {
        params.delete('tps')
      }
      router.replace(`/?${params.toString()}`)
    }
  }, [topics, searchParams, router])

  const handleAsk = () => {
    checkAuth(() => releaseModalOpen())
  }

  return (
    <Stack
      gap={0}
      sx={{
        zIndex: 1,
        width: '100%',
        minHeight: '100vh',
        // backgroundColor: '#fff',
      }}
    >
      {/* 横幅区域 */}
      <Box
        sx={{
          mt: '64px',
          width: '100%',
          height: 200,
          backgroundImage: 'url(/banner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Typography
          variant='h2'
          sx={{
            color: '#fff',
            fontSize: { xs: 32, sm: 48 },
            fontWeight: 700,
            textAlign: 'center',
            zIndex: 1,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          KoalaQA 社区
        </Typography>
      </Box>

      {/* 搜索栏 */}
      <Box
        sx={{
          width: { xs: '90%', sm: 600 },
          mx: 'auto',
          mt: '-30px',
          mb: 3,
          display: 'flex',
          gap: 1,
        }}
      >
        <OutlinedInput
          sx={{
            flex: 1,
            height: 48,
            backgroundColor: '#fff',
            borderRadius: 3,
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            fontSize: 16,
            boxShadow: '0px 2px 6px 0px rgba(0,0,0,0.1), 0px 2px 6px 0px rgba(218,220,224,0.5)',
            px: 2,
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onInputSearch}
          placeholder='输入任意内容，使用 AI 搜索'
          startAdornment={
            <InputAdornment position='start'>
              <SearchIcon sx={{ color: 'rgba(0,0,0,0.4)', mr: 1 }} />
            </InputAdornment>
          }
        />
      </Box>

      {/* 主要内容区域 */}
      <Stack
        gap={3}
        direction='row'
        alignItems='flex-start'
        sx={{
          width: { xs: '100%', sm: 1200 },
          px: { xs: 2, sm: 0 },
          mx: 'auto',
          mb: { xs: 3, sm: '100px' },
        }}
      >
        <Stack
          gap={2}
          sx={{
            width: 280,
            position: 'sticky',
            top: 70,
            display: { xs: 'none', sm: 'flex' },
          }}
        >
          {!groupsData && groupsLoading ? (
            // 只有在客户端渲染且正在加载时显示骨架屏
            <>
              {[1, 2, 3].map((index) => (
                <Card
                  key={index}
                  sx={{
                    p: 2,
                    boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
                  }}
                >
                  <Stack gap={1}>
                    {[1, 2, 3, 4].map((itemIndex) => (
                      <Box
                        key={itemIndex}
                        sx={{
                          height: 32,
                          backgroundColor: 'rgba(0, 0, 0, 0.06)',
                          borderRadius: 1,
                          animation: 'pulse 1.5s ease-in-out infinite',
                          '@keyframes pulse': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.4 },
                            '100%': { opacity: 1 },
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Card>
              ))}
            </>
          ) : (
            groups.origin.map((section) => (
              <Card
                key={section.id}
                sx={{
                  p: 2, // 添加内边距
                  boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Stack gap={0}>
                  {section.items?.map((item, index) => {
                    const color = '#206CFF'
                    const icon = '#'

                    return (
                      <Stack
                        direction='row'
                        key={item.id}
                        alignItems='center'
                        sx={{
                          p: 1,
                          m: 0.5, // 添加选项之间的间距
                          borderRadius: 1, // 添加圆角
                          cursor: 'pointer',
                          backgroundColor: topics.includes(item.id || -1) ? 'rgba(32,108,255,0.08)' : 'transparent',
                          '&:hover': {
                            backgroundColor: 'rgba(32,108,255,0.06)',
                          },
                        }}
                        onClick={() => handleTopicClick(item.id!)}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            backgroundColor: 'rgba(32,108,255,0.1)', // 浅蓝色背景
                            borderRadius: 1, // 添加圆角
                            border: `1px solid ${color}`, // 深蓝色边框
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color, // #符号使用深蓝色
                            fontSize: 12,
                            fontWeight: 'bold',
                            mr: 2,
                          }}
                        >
                          {icon}
                        </Box>
                        <Box
                          sx={{
                            flex: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 14,
                            color: topics.includes(item.id || -1) ? '#206CFF' : '#000', // 选中时使用主题蓝色
                            fontWeight: topics.includes(item.id || -1) ? 500 : 400,
                          }}
                        >
                          <Typography sx={{ fontSize: 14, fontWeight: 'inherit', color: 'inherit' }}>{item.name}</Typography>
                        </Box>
                      </Stack>
                    )
                  })}
                </Stack>
              </Card>
            ))
          )}
        </Stack>
        <Stack gap={2} sx={{ width: { xs: '100%', sm: 900 } }}>
          <Stack
            direction='row'
            gap={3}
            justifyContent='space-between'
            alignItems='center'
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            <CusTabs
              sx={{ height: 40, py: '7px' }}
              value={status}
              onChange={(value: Status) => {
                // 只有在状态真正变化时才更新 URL
                if (value !== status) {
                  const query = createQueryString('sort', value)
                  setStatus(value)
                  router.replace(`/?${query}`)
                }
              }}
              list={[
                { label: '热门问题', value: 'hot' },
                { label: '最新问题', value: 'new' },
                { label: '我参与的', value: 'mine', disabled: !user?.email },
              ]}
            />

            <Button
              sx={{
                height: 40,
                backgroundColor: '#333',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#555',
                },
              }}
              variant='contained'
              onClick={handleAsk}
            >
              发帖提问 👉
            </Button>
          </Stack>
          {searchParams?.get('search') && (!articleData.items || articleData.items.length === 0) && (
            <Card
              sx={{
                p: 3,
                boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
                textAlign: 'center',
              }}
            >
              <Stack gap={1.5} alignItems='center'>
                <Typography variant='h6'>没搜到想要的答案？发帖提问获取帮助</Typography>
                <Button variant='contained' onClick={handleAsk}>
                  发帖提问
                </Button>
              </Stack>
            </Card>
          )}
          {articleData.items?.map((it) => (
            <React.Fragment key={it.uuid}>
              <DiscussCard data={it} keywords={searchRef.current} />
              <DiscussCardMobile data={it} keywords={searchRef.current} />
            </React.Fragment>
          ))}
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            {page * 10 < (articleData.total || 0) ? (
              <Button
                onClick={fetchMoreList}
                variant='outlined'
                sx={{
                  background: '#fff !important',
                  borderColor: '#fff !important',
                  boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
                  fontWeight: 400,
                  '&:hover': {
                    fontWeight: 500,
                    border: '1px solid #206CFF !important',
                  },
                }}
                fullWidth
              >
                查看更多
              </Button>
            ) : (
              <Divider>
                <Typography
                  variant='body2'
                  sx={{
                    color: '#666',
                  }}
                >
                  到底啦
                </Typography>
              </Divider>
            )}
          </Box>
        </Stack>
        <ReleaseModal
          open={releaseModalVisible}
          onClose={releaseModalClose}
          onOk={() => {
            fetchList(status, search, topics)
            router.refresh()
            releaseModalClose()
          }}
          selectedTags={[]}
          initialTitle={searchParams?.get('search') || ''}
        />
      </Stack>
    </Stack>
  )
}

export default Article
