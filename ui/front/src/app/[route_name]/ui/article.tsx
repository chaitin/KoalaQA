'use client'
import { getDiscussion } from '@/api'
import {
  GetDiscussionParams,
  ModelDiscussionListItem,
  ModelForumInfo,
  ModelGroupItemInfo,
  ModelGroupWithItem,
  ModelListRes,
} from '@/api/types'
import { Card, CusTabs } from '@/components'
import { AuthContext } from '@/components/authProvider'
import { CommonContext } from '@/components/commonProvider'
import { ReleaseModal } from '@/components/discussion'
import FloatingActionButton from '@/components/FloatingActionButton'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { useForumId } from '@/hooks/useForumId'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, CircularProgress, Divider, InputAdornment, OutlinedInput, Stack, Typography } from '@mui/material'
import { useBoolean } from 'ahooks'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import React, { useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react'
import DiscussCard, { DiscussCardMobile } from './discussCard'
import SearchResultModal from '@/components/SearchResultModal'
import { useGroupData } from '@/contexts/GroupDataContext'

export type Status = 'hot' | 'new' | 'mine'

const TYPE_LIST = [
  { label: '问答', value: 'qa' },
  // { label: '反馈', value: 'feedback' },
  { label: '文章', value: 'blog' },
]
const Article = ({
  data,
  topics,
  groups: groupsData,
  type,
  forumId,
  forumInfo,
}: {
  data: ModelListRes & {
    items?: ModelDiscussionListItem[]
  }
  topics: number[]
  groups?: ModelListRes & {
    items?: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[]
    })[]
  }
  type?: string
  forumId?: string
  forumInfo?: ModelForumInfo | null
}) => {
  const searchParams = useSearchParams()
  const params = useParams()
  const routeName = params?.route_name as string
  const router = useRouterWithRouteName()
  const nextRouter = useRouter()
  const { user } = useContext(AuthContext)
  const { checkAuth } = useAuthCheck()
  const { groupsLoading } = useContext(CommonContext)
  const { getFilteredGroups } = useGroupData()

  // 根据当前类型从 forumInfo.groups 中筛选对应的分类
  const currentType = (type || 'qa') as 'qa' | 'feedback' | 'blog'
  
  // 使用 useMemo 缓存过滤后的分组数据
  const groups = useMemo(() => {
    return getFilteredGroups(groupsData, forumInfo, currentType)
  }, [groupsData, forumInfo, currentType, getFilteredGroups])

  const [releaseModalVisible, { setTrue: releaseModalOpen, setFalse: releaseModalClose }] = useBoolean(false)
  const status = searchParams?.get('sort') || 'hot'
  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const searchRef = useRef(search)
  const [articleData, setArticleData] = useState(data)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  // 搜索弹窗相关状态
  const [searchModalOpen, { setTrue: openSearchModal, setFalse: closeSearchModal }] = useBoolean(false)
  const [selectedModalType, setSelectedModalType] = useState<'qa' | 'feedback' | 'blog'>('qa')
  const [lastPathname, setLastPathname] = useState('')

  const hookForumId = useForumId()
  const getCurrentForumId = (): number | undefined => {
    const id = forumId || hookForumId
    if (!id) return undefined
    return typeof id === 'string' ? parseInt(id, 10) : id
  }
  const currentForumId = getCurrentForumId()

  // 根据type参数动态生成标签文本，默认为qa
  const getStatusLabels = () => {
    const currentType = type || 'qa' // 默认为qa
    if (currentType === 'feedback') {
      return [
        { label: '热门反馈', value: 'hot' },
        { label: '最新反馈', value: 'new' },
        { label: '我参与的', value: 'mine', disabled: !user?.uid },
      ]
    } else if (currentType === 'blog') {
      return [
        { label: '热门文章', value: 'hot' },
        { label: '最新文章', value: 'new' },
        { label: '我参与的', value: 'mine', disabled: !user?.uid },
      ]
    } else {
      // 默认为问答类型
      return [
        { label: '热门问题', value: 'hot' },
        { label: '最新问题', value: 'new' },
        { label: '我参与的', value: 'mine', disabled: !user?.uid },
      ]
    }
  }

  const fetchMoreList = useCallback(() => {
    // 防止重复请求
    if (page * 10 >= (articleData.total || 0) || loadingMore) {
      return
    }

    setLoadingMore(true)
    const new_page = page + 1
    setPage(new_page)
    const params: GetDiscussionParams & { forum_id?: number } = {
      page: new_page,
      size: 10,
      filter: status as 'hot' | 'new' | 'mine',
      type: type as 'qa' | 'feedback' | 'blog',
    }

    // 如果有搜索关键词，添加到参数中
    if (search && search.trim()) {
      params.keyword = search.trim()
    }

    // 如果有选中的主题，添加到参数中
    if (topics && topics.length > 0) {
      params.group_ids = topics
    }

    // 添加当前选中的板块ID
    if (currentForumId) {
      params.forum_id = currentForumId
    }

    getDiscussion(params)
      .then((res) => {
        if (res) {
          setArticleData((pre) => ({
            total: res.total,
            items: [...(pre.items || []), ...(res.items || [])],
          }))
        }
      })
      .catch((error) => {
        console.error('Failed to fetch more discussions:', error)
        // 回退页码
        setPage(page)
      })
      .finally(() => {
        setLoadingMore(false)
      })
  }, [page, articleData.total, status, search, topics, type, currentForumId, loadingMore])

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set(name, value)
    return params.toString()
  }

  const fetchList = useCallback(
    (st: Status, se: string, tps: number[]) => {
      setPage(1)
      const params: GetDiscussionParams & { forum_id?: number } = {
        page: 1,
        size: 10,
        filter: st as 'hot' | 'new' | 'mine',
        type: type as 'qa' | 'feedback' | 'blog',
      }

      // 如果有搜索关键词，添加到参数中
      if (se && se.trim()) {
        params.keyword = se.trim()
      }

      // 如果有选中的主题，添加到参数中
      if (tps && tps.length > 0) {
        params.group_ids = tps
      }

      // 添加当前选中的板块ID
      if (currentForumId) {
        params.forum_id = currentForumId
      }
      return getDiscussion(params)
        .then((res) => {
          if (res) {
            setArticleData(res)
          }
        })
        .catch((error) => {
          console.error('Failed to fetch discussions:', error)
          // 保持当前数据，不重置为空
        })
    },
    [currentForumId, type],
  )

  const handleSearch = useCallback(() => {
    const trimmedSearch = search && search.trim() ? search.trim() : ''

    if (trimmedSearch) {
      // 打开搜索弹窗，SearchResultModal 会自动执行搜索
      openSearchModal()
    }
  }, [search, openSearchModal])

  const onInputSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  useEffect(() => {
    setArticleData(data)
  }, [data])

  // 当URL参数变化时重置页码
  useEffect(() => {
    setPage(1)
  }, [status, type, topics])

  // 更新搜索引用
  useEffect(() => {
    searchRef.current = search
  }, [search])


  // 监听路由变化，检测是否从详情页返回
  useEffect(() => {
    const currentPath = window.location.pathname

    // 如果当前路径是列表页，且之前记录的不是列表页，说明可能是从详情页返回的
    if (lastPathname && lastPathname !== currentPath && currentPath === `/${routeName}`) {
      fetchList(status as Status, search, topics)
    }

    // 更新记录的路径
    setLastPathname(currentPath)
  }, [routeName, lastPathname, status, search, topics, fetchList])

  const handleTopicClick = useCallback(
    (t: number) => {
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
        router.replace(`/${routeName}?${params.toString()}`)
      }
    },
    [topics, searchParams, router],
  )

  const handleAsk = () => {
    setSelectedModalType('qa')
    checkAuth(() => releaseModalOpen())
  }

  const handleFeedback = () => {
    setSelectedModalType('feedback')
    checkAuth(() => releaseModalOpen())
  }

  const handleArticle = () => {
    setSelectedModalType('blog')
    checkAuth(() => {
      const routeName = (params?.route_name as string) || ''
      nextRouter.push(`/${routeName}/edit`)
    })
  }

  return (
    <>
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
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              zIndex: 0,
            },
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
            {forumInfo?.name || 'KoalaQA 社区'}
          </Typography>
        </Box>

        {/* 搜索栏 */}
        <Box
          id='article-search-box'
          sx={{
            width: { xs: '90%', sm: 600 },
            mx: 'auto',
            mt: '-30px',
            mb: 3,
            display: 'flex',
            gap: 1,
            animation: 'slideInUp 0.8s ease-out',
            '@keyframes slideInUp': {
              '0%': {
                opacity: 0,
                transform: 'translateY(30px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <OutlinedInput
            sx={{
              flex: 1,
              height: 48,
              backgroundColor: '#fff',
              borderRadius: 1,
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
              },
              fontSize: 16,
              boxShadow: '0px 2px 6px 0px rgba(0,0,0,0.1), 0px 2px 6px 0px rgba(218,220,224,0.5)',
              px: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0px 4px 12px 0px rgba(0,0,0,0.15), 0px 4px 12px 0px rgba(218,220,224,0.6)',
                transform: 'translateY(-2px)',
              },
              '&.Mui-focused': {
                boxShadow: '0px 6px 20px 0px rgba(32,108,255,0.2), 0px 6px 20px 0px rgba(32,108,255,0.1)',
                transform: 'translateY(-2px) scale(1.02)',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#206CFF',
                  borderWidth: 2,
                },
              },
              '& .MuiInputAdornment-root': {
                transition: 'all 0.3s ease',
              },
              '&.Mui-focused .MuiInputAdornment-root': {
                transform: 'scale(1.1)',
                '& .MuiSvgIcon-root': {
                  color: '#206CFF',
                },
              },
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
              animation: 'slideInLeft 0.8s ease-out 0.2s both',
              '@keyframes slideInLeft': {
                '0%': {
                  opacity: 0,
                  transform: 'translateX(-50px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateX(0)',
                },
              },
            }}
          >
            <CusTabs
              sx={{
                height: 40,
                py: '7px',
                '& button': {
                  flex: 1,
                },
              }}
              value={type || 'qa'}
              onChange={(value: string) => {
                // 只有在状态真正变化时才更新 URL
                if (value !== (type || 'qa')) {
                  const query = createQueryString('type', value)
                  router.replace(`/${routeName}?${query}`)
                }
              }}
              list={TYPE_LIST}
            />
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
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Stack gap={0}>
                    {section.items?.map((item, _index) => {
                      const color = '#206CFF'
                      const icon = '#'

                      return (
                        <Stack
                          direction='row'
                          key={item.id}
                          alignItems='center'
                          sx={{
                            p: 1,
                            m: 0.5,
                            cursor: 'pointer',
                            backgroundColor: topics.includes(item.id || -1) ? 'rgba(32,108,255,0.08)' : 'transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: 'rgba(32,108,255,0.05)',
                            },
                            '&:active': {
                              backgroundColor: 'rgba(32,108,255,0.1)',
                            },
                          }}
                          onClick={() => handleTopicClick(item.id!)}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              backgroundColor: 'rgba(32,108,255,0.1)',
                              borderRadius: 1,
                              border: `1px solid ${color}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: color,
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
                            <Typography sx={{ fontSize: 14, fontWeight: 'inherit', color: 'rgba(0, 0, 0, 1)' }}>
                              {item.name}
                            </Typography>
                          </Box>
                        </Stack>
                      )
                    })}
                  </Stack>
                </Card>
              ))
            )}
          </Stack>
          <Stack
            gap={2}
            sx={{
              width: { xs: '100%', sm: 900 },
              animation: 'slideInRight 0.8s ease-out 0.4s both',
              '@keyframes slideInRight': {
                '0%': {
                  opacity: 0,
                  transform: 'translateX(50px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateX(0)',
                },
              },
            }}
          >
            <Stack
              direction='row'
              gap={3}
              justifyContent='space-between'
              alignItems='center'
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              <CusTabs
                sx={{
                  height: 40,
                  py: '7px',
                }}
                value={status}
                onChange={(value: Status) => {
                  // 只有在状态真正变化时才更新 URL
                  if (value !== status) {
                    const query = createQueryString('sort', value)
                    router.replace(`/${routeName}?${query}`)
                  }
                }}
                list={getStatusLabels()}
              />

              <Button
                sx={{
                  height: 40,
                  backgroundColor: '#333',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#444',
                  },
                  '&:active': {
                    backgroundColor: '#555',
                  },
                }}
                variant='contained'
                onClick={type === 'feedback' ? handleFeedback : type === 'blog' ? handleArticle : handleAsk}
              >
                {type === 'feedback' ? '提交反馈 👉' : type === 'blog' ? '发布文章 👉' : '发帖提问 👉'}
              </Button>
            </Stack>
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
                  disabled={loadingMore}
                  variant='outlined'
                  sx={{
                    background: '#fff !important',
                    borderColor: '#fff !important',
                    boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
                    fontWeight: 400,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(32,108,255,0.1), transparent)',
                      transition: 'left 0.5s ease',
                    },
                    '&:hover': {
                      fontWeight: 500,
                      border: '1px solid #206CFF !important',
                      transform: 'translateY(-2px)',
                      boxShadow: 'rgba(32, 108, 255, 0.15) 0px 8px 20px 0px',
                      '&::before': {
                        left: '100%',
                      },
                    },
                    '&:active': {
                      transform: 'translateY(0) scale(0.98)',
                    },
                    '&:disabled': {
                      opacity: 0.6,
                      cursor: 'not-allowed',
                      transform: 'none',
                      '&:hover': {
                        transform: 'none',
                        boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
                      },
                    },
                  }}
                  fullWidth
                >
                  {loadingMore ? (
                    <Stack direction='row' alignItems='center' gap={1}>
                      <CircularProgress size={16} sx={{ color: '#206CFF' }} />
                      <Typography>加载中...</Typography>
                    </Stack>
                  ) : (
                    '查看更多'
                  )}
                </Button>
              ) : (
                <Divider
                  sx={{
                    animation: 'fadeIn 1s ease-out',
                    '@keyframes fadeIn': {
                      '0%': {
                        opacity: 0,
                      },
                      '100%': {
                        opacity: 1,
                      },
                    },
                  }}
                >
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
              fetchList(status as Status, search, topics)
              router.refresh()
              releaseModalClose()
            }}
            selectedTags={[]}
            initialTitle={searchParams?.get('search') || ''}
            type={selectedModalType}
            forumInfo={forumInfo}
          />

          {/* 搜索结果弹窗 */}
          <SearchResultModal
            open={searchModalOpen}
            onClose={() => {
              closeSearchModal()
              setSearch('') // 清空搜索输入框内容
            }}
            forumId={currentForumId}
            initialQuery={search}
            onAsk={handleAsk}
            onFeedback={handleFeedback}
            onArticle={handleArticle}
          />
        </Stack>

        {/* 浮动操作按钮 */}
        <FloatingActionButton onAddClick={handleAsk} showScrollToTop={true} />
      </Stack>
    </>
  )
}

export default Article
