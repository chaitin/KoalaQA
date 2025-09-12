"use client";
import React, { useEffect, useState } from 'react'
import { Dialog, Box, Stack, Button, IconButton } from '@mui/material'
import { useLocalStorageState } from 'ahooks'
import { useNavigate } from 'react-router-dom'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import promotion_ad_bg from '@/asset/img/promotion_ad_bg.webp'
import { getPromotionCheck, postPromotionJoin } from '@/api'
import PdfModal from './PdfModal'

interface AdvertisingModalProps {
  open: boolean
  verified: boolean
  onCancel: () => void
  onAuth: () => void
}

const AdvertisingModal: React.FC<AdvertisingModalProps> = ({ open, onCancel, onAuth }) => {
  const navigate = useNavigate()

  const [checkInfo, setCheckInfo] = useState({ is_real_name: false, is_consume: false })
  const [isRead, setIsRead] = useLocalStorageState('PROMOTION_IS_READ', {
    defaultValue: false,
  })

  const [pdfModalOpen, setPdfModalOpen] = useState(false)

  const onJoinPromotion = () => {
    onCancel()
    postPromotionJoin().then(() => {
      navigate('/console/personal/promotion')
    })
  }

  useEffect(() => {
    if (open) {
      getPromotionCheck().then((res) => {
        setCheckInfo(res)
      })
    }
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      sx={{
        '.MuiDialog-paper': {
          borderRadius: 0,
          minWidth: 770,
          backgroundColor: 'transparent',
          boxShadow: 'none',
        },
      }}
    >
      <PdfModal
        open={pdfModalOpen}
        isRead={isRead!}
        onAgree={setIsRead}
        onCancel={() => {
          setPdfModalOpen(false)
        }}
        onOk={() => {
          setIsRead(true)
          setPdfModalOpen(false)
        }}
      />
      <Box
        sx={{
          position: 'relative',
          backgroundColor: 'transparent',
        }}
      >
        <IconButton size='small' sx={{ position: 'absolute', top: 90, right: 24 }} onClick={onCancel}>
          <CloseRoundedIcon sx={{ color: 'rgba(0,0,0,0.5)', fontSize: 18 }} />
        </IconButton>

        <Box
          sx={{
            mt: '66px',
            px: 5,
            width: 770,
            height: 512,
            backgroundColor: '#fff',
            borderRadius: 3,
            backgroundImage: 'linear-gradient(180deg, rgba(142,197,252,0.7) 20px, rgba(224,195,252,0) 100%)',
          }}
        >
          <Box
            component='img'
            src={promotion_ad_bg}
            sx={{ width: 191, height: 'auto', position: 'absolute', top: 0, right: 77 }}
          />
          <Box
            sx={{
              position: 'relative',
              display: 'inline-flex',
              py: '10px',
              px: 2,
              mt: '36px',
              backgroundColor: 'primary.main',
              color: '#fff',
              fontSize: 20,
              fontWeight: 700,
              borderRadius: '24px',
              boxShadow: '0px 8px 10px 0px rgba(32,108,255,0.2)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 18,
                bottom: -6,
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderWidth: ' 6px 0 6px 6px',
                borderLeftColor: 'primary.main',
                transform: 'rotate(-45deg)',
              }}
            />
            多分享 多分成
          </Box>
          <Stack direction='row' sx={{ mt: 2, color: '#132463', fontSize: 50, fontWeight: 700 }}>
            加入百川云
            <Box sx={{ color: 'primary.main' }}>推广大使</Box>
          </Stack>
          <Box sx={{ width: 433, fontSize: 14, color: 'rgba(0,0,0,0.5)', mt: 2, mb: 5 }}>
            拥有专属码，可分享给他人，下单并获得返现。可自定义返现比例，分享越多，返现越多，而且真的可以提现，百川人不骗百川人
          </Box>
          <Stack gap={3} sx={{ fontSize: 14 }}>
            <Stack direction='row' gap={1.5} alignItems='center'>
              {checkInfo?.is_real_name ? (
                <CheckCircleRoundedIcon color='primary' sx={{ fontSize: '16px' }} />
              ) : (
                <Box sx={{ width: 16, height: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#206CFF' }}></Box>
                </Box>
              )}
              <Box sx={{ width: 182 }}>完成「实名认证」</Box>
              {!checkInfo?.is_real_name && (
                <Box
                  sx={{ color: 'primary.main', cursor: 'pointer' }}
                  onClick={() => {
                    onAuth()
                    onCancel()
                  }}
                >
                  去完成
                </Box>
              )}
            </Stack>
            <Stack direction='row' gap={1.5} alignItems='center'>
              {checkInfo?.is_consume ? (
                <CheckCircleRoundedIcon color='primary' sx={{ fontSize: '16px' }} />
              ) : (
                <Box sx={{ width: 16, height: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#206CFF' }}></Box>
                </Box>
              )}

              <Box sx={{ width: 182 }}>在百川云消费「任意金额」</Box>
              {!checkInfo?.is_consume && (
                <Box sx={{ color: 'primary.main', cursor: 'pointer' }} onClick={() => navigate('/console/workbench')}>
                  去完成
                </Box>
              )}
            </Stack>
            <Stack direction='row' gap={1.5} alignItems='center'>
              {isRead ? (
                <CheckCircleRoundedIcon color='primary' sx={{ fontSize: '16px' }} />
              ) : (
                <Box sx={{ width: 16, height: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#206CFF' }}></Box>
                </Box>
              )}

              <Box sx={{ width: 182 }}>阅读并同意「推广大使协议」</Box>
              {!isRead && (
                <Box
                  sx={{ color: 'primary.main', cursor: 'pointer' }}
                  onClick={() => {
                    setPdfModalOpen(true)
                  }}
                >
                  去完成
                </Box>
              )}
            </Stack>
          </Stack>
          <Button
            variant='contained'
            disabled={!checkInfo?.is_consume || !checkInfo?.is_real_name || !isRead}
            sx={{ width: 295, height: 64, mt: 5, fontSize: 24, borderRadius: 3 }}
            onClick={onJoinPromotion}
          >
            立即加入
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}

export default AdvertisingModal
