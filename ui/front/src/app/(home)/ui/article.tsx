'use client';
import { getDiscussion } from '@/api';
import {
  ModelDiscussion,
  ModelListRes,
  GetDiscussionParams,
} from '@/api/types';
import { Card, CommonProvider, CusTabs, Icon } from '@/components';
import { AuthContext } from '@/components/authProvider';
import { ImgLogo, ReleaseModal } from '@/components/discussion';
import {
  BBS_TAGS,
  BBS_TAG_COLOR_ICON,
  BBS_TOPICS,
} from '@/constant/discussion';
import ArrowCircleRightRoundedIcon from '@mui/icons-material/ArrowCircleRightRounded';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material';
import { useBoolean } from 'ahooks';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';
import DiscussCard, { DiscussCardMobile } from './discussCard';
import { CommonContext } from '@/components/commonProvider';

export type Status = 'hot' | 'new' | 'mine';

const Article = ({
  data,
  topics: topicsList,
}: {
  data: ModelListRes & {
    items?: ModelDiscussion[];
  };
  topics: ModelDiscussion[];
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { groups } = useContext(CommonContext);
  const urlTopic = searchParams.get('topic') || '';
  const urlTag = searchParams.get('tag') || '';
  const [topics, setTopics] = useState<string>(urlTopic);
  const [showTopicsList, setShowTopicsList] = useState(() => {
    if (urlTopic && !BBS_TOPICS.includes(urlTopic)) {
      return [...BBS_TOPICS, urlTopic];
    }
    return [...BBS_TOPICS];
  });
  const [tags, setTags] = useState<string>(urlTag);
  const [
    releaseModalVisible,
    { setTrue: releaseModalOpen, setFalse: releaseModalClose },
  ] = useBoolean(false);
  const [status, setStatus] = useState<Status | 'search_key'>(
    (searchParams.get('sort') as Status) || 'hot'
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const searchRef = useRef(search);
  const [articleData, setArticleData] = useState(data);
  const [page, setPage] = useState(1);
  const fetchMoreList = () => {
    const new_page = page + 1;
    setPage(new_page);
    let params: GetDiscussionParams = {
      page: new_page,
      size: 10,
    };
    getDiscussion(params).then((res) => {
      if (res) {
        setArticleData((pre) => ({
          total: res.total,
          items: [...(pre.items || []), ...(res.items || [])],
        }));
      }
    });
  };

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  };

  const fetchList = ({
    st = status,
    se = search,
    tgs = tags,
    tps = topics,
  }) => {
    setPage(1);
    const params: GetDiscussionParams = {
      page: 1,
      size: 10,
      filter: st as any,
    };

    return getDiscussion(params).then((res) => {
      if (res) {
        setArticleData(res);
      }
    });
  };

  const onInputSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      redirect(`/?sort=${searchParams.get('sort')}&search=${search}`);
    }
  };

  useEffect(() => {
    setArticleData(data);
  }, [data]);

  const handleTagClick = (tag: string) => {
    if (tags === tag) {
      setTags('');
      fetchList({ tgs: '' });
    } else {
      setTags(tag);
      fetchList({ tgs: tag });
    }
  };

  const handleTopicClick = (t: string) => {
    // if (topics === t) {
    //   setTopics('');
    //   fetchList({ tps: '' });
    // } else {
    //   if (!showTopicsList.includes(t)) {
    //     setShowTopicsList([...showTopicsList, t]);
    //   }
    //   setTopics(t);
    //   fetchList({ tps: t });
    // }
  };

  useEffect(() => {
    if (urlTopic || urlTag) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('topic');
      params.delete('tag');
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        `/discussion${query ? '?' + query : ''}`
      );
    }
  }, [urlTag, urlTopic]);

  return (
    <Stack
      gap={3}
      direction='row'
      alignItems='flex-start'
      sx={{
        zIndex: 1,
        width: { xs: '100%', sm: 1200 },
        px: { xs: 2, sm: 0 },
        mx: 'auto',
        mt: 11,
        mb: { xs: 3, sm: '100px' },
      }}
    >
      <Stack
        gap={3}
        sx={{
          width: 300,
          position: 'sticky',
          top: 80,
          display: { xs: 'none', sm: 'flex' },
        }}
      >
        {groups.map((section) => (
          <Card
            key={section.id}
            sx={{
              p: 2,
              boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
            }}
          >
            <Stack gap={1}>
              {section.items?.map((item) => (
                <Stack
                  direction='row'
                  key={item.id}
                  gap={1.5}
                  alignItems='center'
                  sx={{
                    p: 1,
                    cursor: 'pointer',
                    borderRadius: 1,
                    backgroundColor:
                      topics === item ? 'rgba(32,108,255,0.06)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(32,108,255,0.06)',
                    },
                  }}
                  onClick={() => handleTopicClick(item.id! + '')}
                >
                  <ImgLogo>#</ImgLogo>
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      fontSize: 14,
                      color: topics === item ? 'primary.main' : '#000',
                      fontWeight: topics === item ? 500 : 400,
                    }}
                  >
                    {item.name}
                    {/* <Box
                    sx={{
                      backgroundColor: 'rgba(99,115,129,0.06)',
                      px: 1,
                      borderRadius: '2px',
                      color: 'rgba(0,0,0,0.5)',
                    }}
                  >
                    {topicsList.find((it) => it. === item)?.count || 0}
                  </Box> */}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Card>
        ))}
      </Stack>
      <Stack gap={3} sx={{ width: { xs: '100%', sm: 876 } }}>
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
              const query = createQueryString('sort', value);
              setStatus(value);
              router.replace(`/?${query}`);
            }}
            list={[
              { label: '热门讨论', value: 'hot' },
              { label: '最新讨论', value: 'new' },
              { label: '我参与的', value: 'mine', disabled: !user?.user.uid },
            ]}
          />

          <OutlinedInput
            sx={{
              flex: 1,
              height: 40,
              backgroundColor: '#fff',
              boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.05)',
              },
              fontSize: 14,
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onInputSearch}
            placeholder='搜索关键字'
            endAdornment={
              <InputAdornment position='end'>
                <SearchIcon sx={{ color: 'rgba(0,0,0,0.2)' }} />
              </InputAdornment>
            }
          />
          <Button
            sx={{ height: 40 }}
            variant='contained'
            endIcon={<ArrowCircleRightRoundedIcon />}
            onClick={() => {
              releaseModalOpen();
              // if (user?.id) {
              //   releaseModalOpen();
              // } else {
              //   router.push(
              //     `/login?redirect=${encodeURIComponent(location.href.replace(location.origin, ''))}`
              //   );
              // }
            }}
          >
            发布主题
          </Button>
        </Stack>
        {articleData.items?.map((it) => (
          <React.Fragment key={it.uuid}>
            <DiscussCard
              data={it}
              keywords={searchRef.current}
              onTopicClick={handleTopicClick}
              onTagClick={handleTagClick}
            />
            <DiscussCardMobile
              data={it}
              keywords={searchRef.current}
              onTopicClick={handleTopicClick}
              onTagClick={handleTagClick}
            />
          </React.Fragment>
        ))}
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          {page * 10 < (articleData.total || 0) ?
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
          : <Divider>
              <Typography
                variant='body2'
                sx={{
                  color: '#666',
                }}
              >
                到底啦
              </Typography>
            </Divider>
          }
        </Box>
      </Stack>
      <ReleaseModal
        open={releaseModalVisible}
        onClose={releaseModalClose}
        onOk={() => {
          fetchList({});
          router.refresh();
          releaseModalClose();
        }}
      />
    </Stack>
  );
};

export default Article;
