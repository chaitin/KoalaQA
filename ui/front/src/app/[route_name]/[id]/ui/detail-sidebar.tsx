"use client"

import { useState } from "react"
import {
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material"
import {
  QuestionAnswer as QuestionAnswerIcon,
  Article as ArticleIcon,
} from "@mui/icons-material"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"

const postTypes = [
  { id: "question", name: "问题", icon: <QuestionAnswerIcon /> },
  { id: "article", name: "文章", icon: <ArticleIcon /> },
]

const categoryGroups = [
  {
    id: "product",
    name: "产品名称",
    options: [
      { id: "p1", name: "产品A", count: 145 },
      { id: "p2", name: "产品B", count: 98 },
      { id: "p3", name: "产品C", count: 67 },
    ],
  },
  {
    id: "type",
    name: "问题类型",
    options: [
      { id: "t1", name: "功能问题", count: 234 },
      { id: "t2", name: "性能问题", count: 189 },
      { id: "t3", name: "兼容性", count: 156 },
      { id: "t4", name: "其他", count: 98 },
    ],
  },
  {
    id: "status",
    name: "状态",
    options: [
      { id: "s1", name: "待解决", count: 178 },
      { id: "s2", name: "进行中", count: 145 },
      { id: "s3", name: "已解决", count: 312 },
    ],
  },
]

const popularTags = [
  { id: 1, name: "配置", count: 145 },
  { id: 2, name: "API", count: 132 },
  { id: 3, name: "性能优化", count: 98 },
  { id: 4, name: "UI/UX", count: 87 },
  { id: 5, name: "多语言", count: 76 },
  { id: 6, name: "数据导出", count: 65 },
  { id: 7, name: "安全", count: 58 },
  { id: 8, name: "集成", count: 52 },
  { id: 9, name: "文档", count: 47 },
  { id: 10, name: "部署", count: 43 },
]

export default function DetailSidebar() {
  const [selectedPostType, setSelectedPostType] = useState<string>("question")
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({})
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const router = useRouter()
  const params = useParams()
  const route_name = params?.route_name as string

  const handlePostTypeClick = (typeId: string) => {
    setSelectedPostType(typeId)
    router.push(`/${route_name}`)
  }

  const handleCategoryChange = (groupId: string, value: string) => {
    setSelectedCategories((prev) => {
      if (value === "") {
        const newCategories = { ...prev }
        delete newCategories[groupId]
        return newCategories
      }
      return { ...prev, [groupId]: value }
    })
  }

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        display: { xs: "none", lg: "block" },
        bgcolor: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        pt: 3,
        pb: 3,
        px: 2,
        height: "calc(100vh - 63px)",
        overflowY: "auto",
        scrollbarGutter: "stable",
        position: "sticky",
        top: 80,
        "&::-webkit-scrollbar": {
          width: "6px",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#e5e7eb",
          borderRadius: "3px",
          "&:hover": {
            background: "#d1d5db",
          },
        },
        scrollbarWidth: "thin",
        scrollbarColor: "#e5e7eb transparent",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <List disablePadding>
          {postTypes.map((type) => (
            <ListItem key={type.id} disablePadding>
              <ListItemButton
                selected={selectedPostType === type.id}
                onClick={() => handlePostTypeClick(type.id)}
                sx={{
                  py: 0.75,
                  px: 1.5,
                  borderRadius: "4px",
                  mb: 0.5,
                  "&.Mui-selected": {
                    bgcolor: "#f9fafb",
                    color: "#111827",
                    borderLeft: "3px solid #000000",
                    "& .MuiListItemIcon-root": { color: "#111827" },
                    "&:hover": { bgcolor: "#f3f4f6" },
                    "&:focus": {
                      bgcolor: "#f9fafb",
                      color: "#111827",
                    },
                    "&.Mui-focusVisible": {
                      bgcolor: "#f9fafb",
                      color: "#111827",
                      outline: "2px solid #000000",
                      outlineOffset: "2px",
                    },
                  },
                  "&:hover": { bgcolor: "#f3f4f6", color: "#000000" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 28, color: selectedPostType === type.id ? "#111827" : "#6b7280" }}>
                  {type.icon}
                </ListItemIcon>
                <ListItemText
                  primary={type.name}
                  primaryTypographyProps={{
                    fontSize: "0.8125rem",
                    fontWeight: selectedPostType === type.id ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 2 }}>
        {categoryGroups.map((group) => (
          <Box key={group.id} sx={{ mb: 1.5 }}>
            <FormControl fullWidth size="small">
              <Select
                value={selectedCategories[group.id] || ""}
                onChange={(e) => handleCategoryChange(group.id, e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return (
                      <Typography sx={{ color: "#9ca3af", fontSize: "0.8125rem", fontWeight: 500 }}>
                        {group.name}
                      </Typography>
                    )
                  }
                  const option = group.options.find((opt) => opt.id === selected)
                  return (
                    <Chip
                      label={option?.name}
                      size="small"
                      sx={{
                        bgcolor: "#eff6ff",
                        color: "#3b82f6",
                        height: 24,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        borderRadius: "4px",
                        border: "1px solid #bfdbfe",
                      }}
                    />
                  )
                }}
                sx={{
                  bgcolor: "#f9fafb",
                  borderRadius: "6px",
                  fontSize: "0.8125rem",
                  height: "38px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e5e7eb",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#d1d5db",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#000000",
                    borderWidth: 2,
                  },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
                  {group.name}
                </MenuItem>
                {group.options.map((option) => (
                  <MenuItem key={option.id} value={option.id} sx={{ fontSize: "0.8125rem" }}>
                    {option.name} ({option.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {popularTags.map((tag) => (
            <Chip
              key={tag.id}
              label={`${tag.name} (${tag.count})`}
              size="small"
              onClick={() => {
                setSelectedTags((prev) =>
                  prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id],
                )
              }}
              sx={{
                bgcolor: selectedTags.includes(tag.id) ? "#000000" : "#f9fafb",
                color: selectedTags.includes(tag.id) ? "#ffffff" : "#6b7280",
                fontSize: "0.75rem",
                fontWeight: 600,
                height: 26,
                borderRadius: "3px",
                border: selectedTags.includes(tag.id) ? "none" : "1px solid #e5e7eb",
                "&:hover": {
                  bgcolor: selectedTags.includes(tag.id) ? "#111827" : "#f3f4f6",
                  color: selectedTags.includes(tag.id) ? "#ffffff" : "#000000",
                  borderColor: selectedTags.includes(tag.id) ? "transparent" : "#d1d5db",
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

