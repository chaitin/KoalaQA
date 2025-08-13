import React, { useState, type FC } from 'react'

import CloseIcon from '@mui/icons-material/Close'
import { LoadingButton, type LoadingButtonProps } from '@mui/lab'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  styled,
  type ButtonProps,
  type DialogProps,
} from '@mui/material'

export interface ModalProps extends Omit<DialogProps, 'title' | 'open'> {
  open?: boolean
  title?: React.ReactNode
  width?: number | string
  children?: React.ReactNode
  footer?: null | React.ReactNode | ((props: { OkBtn: React.ReactNode; CancelBtn: React.ReactNode }) => React.ReactNode)
  okText?: React.ReactNode
  cancelText?: React.ReactNode
  cancelButtonProps?: ButtonProps
  okButtonProps?: LoadingButtonProps
  showCancel?: boolean
  maskClosable?: boolean
  keyboard?: boolean
  closable?: boolean
  onOk?(): void
  onClose?(e?: any, r?: any): void
  onCancel?(): void
}

interface DialogRootProps {
  ownerState: ModalProps
}

const DialogRoot = styled(Dialog)<DialogRootProps>(({ theme, ownerState }) => {
  return {
    '.MuiDialog-paper': {
      width: ownerState.width,
      borderRadius: theme.shape.borderRadius * 3,
    },
  }
})

const Modal: FC<ModalProps> = (props) => {
  const {
    open = false,
    title,
    children,
    footer,
    okText = '确认',
    showCancel = true,
    keyboard = true,
    maskClosable = false,
    cancelText = '取消',
    onOk,
    onClose: onPropsClose,
    onCancel,
    closable = true,
    cancelButtonProps,
    okButtonProps,
    width = 520,
    ...other
  } = props
  const [loading, setLoading] = useState(false)

  const ownerState = {
    ...props,
    width,
  }

  const onConfirm = async () => {
    setLoading(true)
    try {
      await onOk?.()
    } catch (error) { }

    setLoading(false)
  }

  const onClose = (e: object, reason: 'backdropClick' | 'escapeKeyDown') => {
    onPropsClose?.(e, reason)
    if ((reason === 'backdropClick' && maskClosable) || (reason === 'escapeKeyDown' && keyboard)) {
      onCancel?.()
    }
  }

  return (
    <DialogRoot
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation: 0,
      }}
      maxWidth='lg'
      ownerState={ownerState}
      {...other}
    >
      {(!!title || closable) && (
        <DialogTitle
          sx={{
            color: 'text.primary',
            pb: 0,
            pt: 3,
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          {title}
          {closable && (
            <IconButton
              sx={{
                position: 'absolute',
                right: 20,
                top: 20,
                color: 'text.auxiliary',
              }}
              onClick={onCancel}
            >
              <CloseIcon sx={{ fontSize: '16px' }} />
            </IconButton>
          )}
        </DialogTitle>
      )}
      {children && <DialogContent sx={{ position: 'relative', pt: '20px !important' }}>{children}</DialogContent>}
      {footer === null && null}
      {(footer === void 0 || typeof footer === 'function') && (
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
          }}
        >
          {typeof footer === 'function' &&
            footer({
              OkBtn: (
                <LoadingButton
                  loading={loading}
                  variant='contained'
                  color='primary'
                  onClick={onConfirm}
                  {...okButtonProps}
                >
                  {okText}
                </LoadingButton>
              ),
              CancelBtn: (
                <Button color='primary' onClick={onCancel} {...cancelButtonProps}>
                  {cancelText}
                </Button>
              ),
            })}
          {footer === void 0 && (
            <>
              {showCancel && (
                <Button color='primary' onClick={onCancel} {...cancelButtonProps}>
                  {cancelText}
                </Button>
              )}

              <LoadingButton
                loading={loading}
                variant='contained'
                color='primary'
                onClick={onConfirm}
                {...okButtonProps}
              >
                {okText}
              </LoadingButton>
            </>
          )}
        </DialogActions>
      )}
      {footer !== null && footer !== void 0 && typeof footer !== 'function' && footer}
    </DialogRoot>
  )
}

export default Modal
