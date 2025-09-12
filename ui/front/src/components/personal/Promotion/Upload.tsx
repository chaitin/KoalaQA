"use client";
import { forwardRef, useState, useEffect } from 'react'

import { Icon, Message } from '@cx/ui'
import { Box, Button, type SxProps, FormHelperText } from '@mui/material'
import { useSetState } from 'ahooks'
import RcUpload, { type UploadProps } from 'rc-upload'

// import UploadStatus from './UploadStatus'

type MUploadProps = UploadProps & {
  file?: File
  text?: string
  sx?: SxProps
  ButtonProps?: any
  onChange?(file: File): void
  size?: number
  error?: string
}

export type Status = 'pedding' | 'success' | 'error'

export interface UploadStatusProps {
  percent: number
  name: string
  status: Status
}

const MUpload = forwardRef((props: MUploadProps, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fileStatus, setFileStatus] = useSetState<UploadStatusProps>({} as UploadStatusProps)
  const { sx = {}, action, onChange, ButtonProps = {}, size, file: propFile, text, error } = props
  const [isDrop, setIsDrop] = useState(false)
  const [file, setFile] = useState<File | string | undefined>(propFile)
  // @ts-ignore
  const { sx: buttonSx, ...restButtonProps } = ButtonProps
  const cus = {
    onStart: (file: any) => {
      setFileStatus({ name: file.name, status: 'pedding', percent: 0 })
    },
    onSuccess(file: any) {
      setFileStatus({ status: 'success', percent: 100 })
    },
    onProgress(step: any, file: any) {
      setFileStatus({ percent: Math.round(step.percent) })
    },
    onError(err: any) {
      setFileStatus({ status: 'error' })
    },
  }
  // const onDeleteFile = () => {
  //   setFileStatus({} as UploadStatusProps)
  // }

  const handleUpload = (option: any) => {
    const file = option.file as File
    // if (size && size < file.size) {
    //   Message.error(`文件大小超过 ${formatByte(size)}，不允许上传`)
    //   return
    // }
    option.onSuccess()
    setFile(file)
    onChange?.(file)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDrop(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDrop(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDrop(false)
  }

  useEffect(() => {
    if (propFile) setFile(propFile)
  }, [propFile])

  return (
    <Box sx={{ ...sx }} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <RcUpload {...props} action={action} customRequest={handleUpload} {...cus}>
        <Button
          size='small'
          sx={{
            height: 100,
            flexDirection: 'column',
            textTransform: 'none',
            fontFamily: 'Mono',
            borderColor: isDrop ? 'primary.main' : error ? 'error.main' : 'divider',
            color: error ? 'error.main' : 'text.auxiliary',
          }}
          fullWidth
          variant='outlined'
          {...restButtonProps}
        >
          {file && typeof file === 'string' ? (
            <Box component='img' src={file} sx={{ height: '100%', width: 'auto' }} />
          ) : (
            <>
              <Box>
                <Icon type='icon-shangchuan' sx={{ fontSize: '40px' }} />
              </Box>

              <Box
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}
              >
                {file ? `已选择 ${(file as File).name}` : text || '点击上传文件，或拖动文件到此处'}
              </Box>
            </>
          )}
        </Button>
      </RcUpload>
      <FormHelperText sx={{ mb: '16px', mt: '4px', mx: '14px' }} error={Boolean(error)}>
        {error}
      </FormHelperText>
    </Box>
  )
})

export default MUpload
