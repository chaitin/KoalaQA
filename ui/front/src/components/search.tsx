'use client'

import React, { useState, useContext } from 'react'
import {
  Box,
  InputBase,
  Button,
  createTheme,
  // ThemeProvider,
  Dialog,
  styled,
  InputBaseProps,
  BoxProps,
  ButtonProps,
  SvgIconProps,
  Stack,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Popover,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import { useLocalStorageState } from 'ahooks'
import { CommonContext } from './commonProvider'
import { useRouterWithForum } from '@/hooks/useRouterWithForum'

const _innerTheme = createTheme({
  palette: {
    primary: {
      main: '#1A191C',
    },
  },
})

export const SearchBaseInput = styled(InputBase)(({ theme }) => ({
  flex: 1,
  padding: '0 30px',
  height: '40px',
  fontSize: 20,
  border: '1px solid',
  borderColor: 'transparent',
  transition: 'all 0.3s',
  borderTopLeftRadius: '4px',
  borderBottomLeftRadius: '4px',
  borderRight: 'none',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
  },
}))

const SearchBaseWrapper = styled(Box)(({ theme: _theme }) => {
  return {
    display: 'flex',
    alignItems: 'center',
    width: 360,
    height: 40,
    borderRadius: '4px',
    transition: 'all 0.3s',
    boxShadow: '0px 0px 20px 0px rgba(0,28,85,0.1)',
    backgroundColor: '#fff',
    '&:hover': {
      boxShadow: '0px 10px 40px 0px rgba(0,28,85,0.15)',
    },
  }
})

const SearchBaseButton = styled(Button)({
  width: 82,
  height: 40,
  borderRadius: '0px 4px 4px 0px',
})

export const SearchBase = React.forwardRef(
  (
    props: {
      type?: 'icon' | 'button' | 'icon-button'
      open?: boolean
      setOpen?(open: boolean): void
      SearchBaseWrapperProps?: BoxProps
      SearchBaseInputProps?: InputBaseProps
      SearchBaseButtonProps?: ButtonProps
      SearchRoundedIconProps?: SvgIconProps
    },
    ref,
  ) => {
    const {
      type = 'button',
      setOpen,
      SearchBaseWrapperProps,
      SearchBaseInputProps,
      SearchBaseButtonProps,
      SearchRoundedIconProps,
    } = props
    const { keywords } = useContext(CommonContext)
    return type === 'icon-button' ? (
      <SearchRoundedIcon
        {...SearchRoundedIconProps}
        onClick={() => {
          setOpen?.(true)
        }}
      />
    ) : (
      <SearchBaseWrapper
        ref={ref}
        onClick={() => {
          setOpen?.(true)
        }}
        {...SearchBaseWrapperProps}
      >
        <SearchBaseInput
          readOnly
          placeholder='请输入'
          value={keywords}
          startAdornment={type === 'icon' && <SearchRoundedIcon />}
          {...SearchBaseInputProps}
        />
        {type === 'button' && (
          <SearchBaseButton variant='contained' {...SearchBaseButtonProps}>
            搜索
          </SearchBaseButton>
        )}
      </SearchBaseWrapper>
    )
  },
)
SearchBase.displayName = 'SearchBase'

export const DialogSearch = (props: { open: boolean; onClose(): void }) => {
  const { open, onClose } = props
  const { keywords, setKeywords } = useContext(CommonContext)
  const router = useRouterWithForum()
  const [recentSearch, setRecentSearch] = useLocalStorageState<string[]>('recent-search', {
    defaultValue: [],
  })

  const onSearch = () => {
    if (!keywords.trim()) {
      return
    }
    onClose()
    if (recentSearch) {
      const index = recentSearch.indexOf(keywords)
      if (index > -1) {
        recentSearch.splice(index, 1)
        recentSearch.unshift(keywords)
      } else {
        if (recentSearch.length >= 10) {
          recentSearch.pop()
        }
        recentSearch.unshift(keywords)
      }
      setRecentSearch([...recentSearch])
    } else {
      setRecentSearch([keywords])
    }
    router.push(`/s?keywords=${keywords}`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        '.MuiDialog-paper': {
          width: 800,
          backgroundColor: 'transparent',
          boxShadow: 'none',
          maxWidth: '100%',
        },
      }}
    >
      <SearchBase
        type='button'
        SearchBaseWrapperProps={{
          sx: {
            height: 56,
            width: '100%',
          },
        }}
        SearchBaseInputProps={{
          value: keywords,
          readOnly: false,
          autoFocus: true,
          onChange: (e) => {
            setKeywords(e.target.value)
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              onSearch()
            }
          },
          sx: {
            height: 56,
            borderTopLeftRadius: '4px',
            borderBottomLeftRadius: '4px',
            borderRight: 'none !important',
          },
        }}
        SearchBaseButtonProps={{
          sx: {
            width: 102,
            height: 56,
            fontSize: 18,
          },
          onClick: () => {
            onSearch()
          },
        }}
      />

      {!!recentSearch?.length && (
        <Box sx={{ py: 2, px: 1, mt: 2, backgroundColor: '#fff', borderRadius: 1 }}>
          <Stack sx={{ pl: 1 }}>
            <Typography variant='body2' sx={{ color: '#666' }}>
              最近搜索
            </Typography>
          </Stack>
          <List dense>
            {recentSearch?.map((k, index) => (
              <ListItem
                key={k}
                disablePadding
                secondaryAction={
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation()
                      recentSearch.splice(index, 1)
                      setRecentSearch([...recentSearch])
                    }}
                  >
                    <ClearRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                }
                onClick={() => {
                  onClose()
                  router.push(`/s?keywords=${k}`)
                }}
              >
                <ListItemButton sx={{ pl: 1 }}>
                  <ListItemText primary={k} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Dialog>
  )
}

export const PopoverContent = React.forwardRef(() => {
  return (
    <Popover
      open={true}
      // anchorEl={anchorEl}
      // onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
    >
      <Typography sx={{ p: 2 }}>The content of the Popover.</Typography>
    </Popover>
  )
})
PopoverContent.displayName = 'PopoverContent'

const Search = React.forwardRef(
  (
    props: {
      type?: 'icon' | 'button' | 'icon-button'
      SearchBaseWrapperProps?: BoxProps
      SearchBaseInputProps?: InputBaseProps
      SearchBaseButtonProps?: ButtonProps
      SearchRoundedIconProps?: SvgIconProps
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const {
      type = 'button',
      SearchBaseWrapperProps,
      SearchBaseInputProps,
      SearchBaseButtonProps,
      SearchRoundedIconProps,
    } = props
    const onClose = () => {
      setOpen(false)
    }
    return (
      <>
        <SearchBase
          ref={ref}
          setOpen={setOpen}
          type={type}
          SearchBaseWrapperProps={SearchBaseWrapperProps}
          SearchBaseInputProps={SearchBaseInputProps}
          SearchBaseButtonProps={SearchBaseButtonProps}
          SearchRoundedIconProps={SearchRoundedIconProps}
        />
        {/* <PopoverContent /> */}
        <DialogSearch open={open} onClose={onClose} />
      </>
    )
  },
)

Search.displayName = 'Search'
export default Search
