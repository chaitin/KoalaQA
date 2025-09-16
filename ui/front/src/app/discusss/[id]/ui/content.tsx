'use client';
import {
  deleteDiscussionDiscIdCommentCommentId,
  postDiscussionDiscIdComment,
  postDiscussionDiscIdCommentCommentIdAccept,
  postDiscussionDiscIdCommentCommentIdDislike,
  postDiscussionDiscIdCommentCommentIdLike,
  postDiscussionDiscIdCommentCommentIdRevokeLike,
  putDiscussionDiscIdCommentCommentId,
} from '@/api';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  ModelCommentLikeState,
  ModelDiscussionComment,
  ModelDiscussionDetail,
  ModelDiscussionReply,
  SvcCommentUpdateReq,
} from '@/api/types';
import { Card, MarkDown } from '@/components';
import { AuthContext } from '@/components/authProvider';
import { Avatar } from '@/components/discussion';
import MdEditor from '@/components/mdEditor';
import Modal from '@/components/modal';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  OutlinedInput,
  Stack,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams, useRouter } from 'next/navigation';
import React, { useContext, useId, useState } from 'react';
import EditCommentModal from './editCommentModal';

import LoadingBtn from '@/components/loadingButton';
import { formatNumber } from '@/utils';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const BaseDiscussCard = (props: {
  isReply?: boolean;
  data: ModelDiscussionComment | ModelDiscussionReply;
  disData: ModelDiscussionDetail;
  index: number;
  onOpt(
    event: React.MouseEvent<HTMLButtonElement>,
    comment: string,
    index: ModelDiscussionComment | ModelDiscussionReply
  ): void;
}) => {
  const { data, onOpt, disData, index, isReply } = props;
  const router = useRouter();
  // 检查是否有可用的菜单项
  const hasMenuItems =
    // 是当前用户的评论（可以编辑和删除）
    data.user_id === disData.current_user_id ||
    // 是问题作者且问题未被采纳，且不是回复（只有评论可以被采纳）
    (disData.user_id === disData.current_user_id &&
      !disData.accepted &&
      !isReply);

  const revokeLike = () => {
    postDiscussionDiscIdCommentCommentIdRevokeLike({
      discId: disData.uuid!,
      commentId: data.id!,
    });
  };
  const isLiked =
    data.user_like_state == ModelCommentLikeState.CommentLikeStateLike;
  const isDisliked =
    data.user_like_state == ModelCommentLikeState.CommentLikeStateDislike;
  const handleLike = async () => {
    try {
      if (isLiked) await revokeLike();
      else
        await postDiscussionDiscIdCommentCommentIdLike({
          discId: disData.uuid!,
          commentId: data.id!,
        });
    } finally {
      router.refresh();
    }
  };
  const handleDislike = async () => {
    try {
      if (isDisliked) await revokeLike();
      else
        await postDiscussionDiscIdCommentCommentIdDislike({
          discId: disData.uuid!,
          commentId: data.id!,
        });
    } finally {
      router.refresh();
    }
  };

  return (
    <Box
      sx={{
        ...(isReply ?
          {
            p: { xs: 1.5, sm: 3 },
            backgroundColor: 'rgba(242, 243, 245, 0.5)',
            mt: 2,
            borderRadius: 2,
            width: '100%',
          }
        : {
            width: '100%',
          }),
        '&:hover #accept_btn': {
          display: 'block',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}
      >
        <Stack direction='row' gap={1} alignItems='center' sx={{ flex: 1 }}>
          {data.user_avatar ?
            <img
              src={data.user_avatar}
              alt='头像'
              style={{ height: 28, width: 28, borderRadius: '50%' }}
            />
          : <Avatar size={28} />}

          <Typography
            className='text-ellipsis'
            sx={{
              fontSize: 16,
              color: '#000',
              cursor: 'pointer',
              '&:hover': {
                color: 'primary.main',
              },
              maxWidth: { xs: 'calc(100% - 82px)', sm: 'auto' },
            }}
          >
            {data.user_name}
          </Typography>
          {/* 已采纳标签 */}
          {data?.accepted && (
            <Stack
              direction='row'
              alignItems='center'
              gap={0.5}
              sx={{
                backgroundColor: '#E8F5E8',
                color: '#2E7D32',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                已采纳
              </Typography>
            </Stack>
          )}
        </Stack>

        <Stack
          direction='row'
          gap={2}
          alignItems='center'
          sx={{ mt: { xs: '12px', sm: 0 } }}
        >
          <Typography
            variant='body2'
            sx={{
              fontSize: 12,
              color: 'rgba(0,0,0,0.5)',
            }}
          >
            更新于 {dayjs.unix(data.updated_at!).fromNow()}
          </Typography>
          <Stack
            direction='row'
            gap={2}
            alignItems='center'
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            <Stack
              direction='row'
              alignItems='center'
              gap={1}
              sx={{
                background: isLiked ? 'rgba(32,108,255,0.1)' : '#F2F3F5',
                borderRadius: 0.5,
                px: 1,
                py: '1px',
                cursor: 'pointer',
                '&:hover': {
                  background:
                    isLiked ? 'rgba(32,108,255,0.2)' : 'rgba(0, 0, 0, 0.12)',
                },
              }}
              onClick={() => handleLike()}
            >
              <ThumbUpAltOutlinedIcon
                sx={{
                  color: isLiked ? 'primary.main' : 'rgba(0,0,0,0.5)',
                  fontSize: 14,
                }}
              />
              <Typography
                variant='body2'
                sx={{
                  fontSize: 14,
                  color: isLiked ? 'primary.main' : 'rgba(0,0,0,0.5)',
                  lineHeight: '20px',
                }}
              >
                {formatNumber(data.like || 0)}
              </Typography>
            </Stack>
            <Stack
              direction='row'
              alignItems='center'
              gap={1}
              sx={{
                background: isDisliked ? 'rgba(32,108,255,0.1)' : '#F2F3F5',
                borderRadius: 0.5,
                px: 1,
                py: '1px',
                cursor: 'pointer',
                '&:hover': {
                  background:
                    isDisliked ? 'rgba(32,108,255,0.2)' : 'rgba(0, 0, 0, 0.12)',
                },
              }}
              onClick={() => handleDislike()}
            >
              <ThumbDownAltOutlinedIcon
                sx={{
                  color: isDisliked ? 'primary.main' : 'rgba(0,0,0,0.5)',
                  fontSize: 14,
                }}
              />
              <Typography
                variant='body2'
                sx={{
                  fontSize: 14,
                  lineHeight: '20px',
                  color: isDisliked ? 'primary.main' : 'rgba(0,0,0,0.5)',
                }}
              >
                {formatNumber(data.dislike || 0)}
              </Typography>
            </Stack>
            {/* 只在有可用菜单项时显示 MoreVertIcon */}
            {hasMenuItems && (
              <IconButton
                sx={{ display: { xs: 'none', sm: 'flex' } }}
                onClick={(e) => {
                  onOpt(e, data.content || '', data);
                }}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Stack>
      <MarkDown
        content={data.content}
        sx={{
          backgroundColor: isReply ? 'transparent !important' : 'inherit',
        }}
      />
      {!isReply &&
        (data as ModelDiscussionComment)?.replies?.map((it) => (
          <BaseDiscussCard
            isReply
            key={it.id}
            data={it}
            disData={disData}
            onOpt={onOpt}
            index={1}
          />
        ))}
    </Box>
  );
};

const DiscussCard = (props: any) => {
  const idKey = useId();
  const { id }: { id: string } = useParams();
  const { user } = useContext(AuthContext);
  const [comment, setComment] = useState('');
  const router = useRouter();
  const [mdEditShow, setMdEditShow] = useState(false);
  const onSubmit = () => {
    postDiscussionDiscIdComment(
      { discId: id },
      {
        content: comment,
        comment_id: props.data.id,
      }
    ).then(() => {
      setComment('');
      setMdEditShow(false);
      router.refresh();
    });
  };

  return (
    <Card
      sx={{
        boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
        cursor: 'auto',
        pt: 2,
      }}
    >
      <BaseDiscussCard {...props}></BaseDiscussCard>
      <Box
        sx={{
          mt: 3,
        }}
      >
        <Box sx={{ display: !mdEditShow ? 'none' : 'block' }}>
          <MdEditor value={comment} onChange={setComment} />
          <Stack
            direction='row'
            gap={2}
            justifyContent='flex-end'
            sx={{ mt: 2 }}
          >
            <Button size='small' onClick={() => setMdEditShow(false)}>
              取消
            </Button>
            <LoadingBtn
              id={idKey}
              variant='contained'
              size='small'
              disabled={!comment.trim()}
              onClick={onSubmit}
            >
              发布
            </LoadingBtn>
          </Stack>
        </Box>
        <OutlinedInput
          fullWidth
          size='small'
          sx={{ display: mdEditShow ? 'none' : 'block' }}
          placeholder='回复'
          onFocus={() => {
            setMdEditShow(true);
          }}
        />
      </Box>
    </Card>
  );
};

const Content = (props: { data: ModelDiscussionDetail }) => {
  const { data } = props;
  const { id }: { id: string } = useParams();
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [commentIndex, setCommentIndex] = useState<
    ModelDiscussionComment | ModelDiscussionReply | null
  >(null);
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    comment: SvcCommentUpdateReq,
    index: ModelDiscussionComment | ModelDiscussionReply
  ) => {
    setAnchorEl(event.currentTarget);
    setCommentIndex(index);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const onCommentSubmit = () => {
    postDiscussionDiscIdComment(
      { discId: id },
      {
        content: comment,
      }
    ).then(() => {
      setComment('');
      router.refresh();
    });
  };
  const onSubmit = (comment: string) => {
    // @ts-ignore
    return putDiscussionDiscIdCommentCommentId(
      { discId: id, commentId: commentIndex?.id! },
      {
        content: comment,
      }
    ).then(() => {
      router.refresh();
      setComment('');
      setEditCommentModalVisible(false);
    });
  };
  const handleDelete = () => {
    setAnchorEl(null);
    Modal.confirm({
      title: '确定删除吗？',
      okButtonProps: { color: 'error' },
      onOk: async () => {
        if (!commentIndex) return;
        await deleteDiscussionDiscIdCommentCommentId({
          discId: data.uuid!,
          commentId: commentIndex.id!,
        });
        router.refresh();
      },
    });
  };
  const handleAccept = () => {
    Modal.confirm({
      title: '确定采纳吗？',
      okButtonProps: { color: 'info' },
      onOk: async () => {
        if (!commentIndex) return;
        await postDiscussionDiscIdCommentCommentIdAccept({
          discId: data.uuid!,
          commentId: commentIndex.id!,
        });
        router.refresh();
      },
    });
  };
  const handleEditComment = () => {
    setEditCommentModalVisible(true);
    setAnchorEl(null);
  };
  return (
    <Stack id='comment-card' gap={3} sx={{ width: { xs: '100%' } }}>
      <Menu
        id='basic-menu'
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {commentIndex?.user_id == data.current_user_id && (
          <MenuItem onClick={handleEditComment}>编辑</MenuItem>
        )}
        {commentIndex?.user_id == data.current_user_id && (
          <MenuItem onClick={handleDelete}>删除</MenuItem>
        )}
        {data?.user_id == data.current_user_id &&
          !data.accepted &&
          !data.comments?.[0]?.accepted &&
          (commentIndex as any)?.replies && (
            <MenuItem onClick={handleAccept}>采纳</MenuItem>
          )}
      </Menu>
      <EditCommentModal
        open={editCommentModalVisible}
        data={commentIndex!}
        onOk={onSubmit}
        onClose={() => setEditCommentModalVisible(false)}
      />
      {data.comments?.map((it, index) => (
        <DiscussCard
          data={it}
          index={index}
          key={it.id}
          disData={data}
          onOpt={handleClick}
        />
      ))}
      <Card>
        <MdEditor style={{ flex: 1 }} value={comment} onChange={setComment} />
        <Stack direction='row' justifyContent='flex-end' sx={{ mt: 2 }}>
          <LoadingBtn
            id='s-captcha-button'
            variant='contained'
            size='small'
            disabled={!comment.trim()}
            onClick={onCommentSubmit}
          >
            发布
          </LoadingBtn>
        </Stack>
      </Card>
    </Stack>
  );
};

export default Content;
