import {
  deleteAdminKbKbIdDocumentDocId,
  getAdminKbKbIdDocument,
  getAdminKbKbIdDocumentDocId,
  ModelDocStatus,
  ModelKBDocumentDetail,
  PlatformPlatformType,
  putAdminKbKbIdDocumentDocId,
  SvcDocListItem,
} from "@/api";
import Card from "@/components/card";
import { fileType } from "@/components/ImportDoc/const";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { Ellipsis, message, Modal, Table } from "@c-x/ui";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useRequest } from "ahooks";
import { ColumnsType } from "ct-mui/dist/Table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DocImport from "./docImport";
import MarkDown from "@/components/markDown";
import request from "@/api/httpClient";

// 新增：用于请求 markdown 内容
const fetchMarkdownContent = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("请求 markdown 内容失败");
    return await res.text();
  } catch (e) {
    return "加载内容失败";
  }
};

const AdminDocument = () => {
  const { query, setPage, setPageSize, page, pageSize, setParams } =
    useListQueryParams();
  const { id } = useParams();
  const kb_id = +(id || "0");
  const [title, setTitle] = useState(query.title);
  const [file_type, setFile_type] = useState(query.file_type);
  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(
    (params) => getAdminKbKbIdDocument({ ...params, kbId: kb_id }),
    { manual: true }
  );
  const [detail, setDetail] = useState<ModelKBDocumentDetail | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>("");

  const viewDetail = async (item: SvcDocListItem) => {
    const docDetail = await getAdminKbKbIdDocumentDocId(kb_id, item.id!);
    setDetail(docDetail);
    // 如果 markdown 字段是 url，则请求内容
    if (docDetail?.markdown && /^https?:\/\//.test(docDetail.markdown)) {
      setMarkdownContent("加载中...");
      const content = await fetchMarkdownContent(docDetail.markdown);
      setMarkdownContent(content);
    } else {
      setMarkdownContent(docDetail?.markdown || "");
    }
  };
  const updateDoc = (item: SvcDocListItem) => {
    putAdminKbKbIdDocumentDocId(kb_id, item.id!).then(() => {
      message.success("更新成功");
      fetchData({
        page: 1,
      });
    });
  };
  const deleteDoc = (item: SvcDocListItem) => {
    Modal.confirm({
      title: "提示",
      okText: "删除",
      okButtonProps: {
        color: "error",
      },
      content: (
        <>
          确定要删除
          <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
            {item!.title}
          </Box>{" "}
          吗？
        </>
      ),
      onOk: () => {
        deleteAdminKbKbIdDocumentDocId(kb_id, item.id!).then(() => {
          message.success("删除成功");
          fetchData({
            page: 1,
          });
        });
      },
    });
  };
  const columns: ColumnsType<SvcDocListItem> = [
    {
      title: "标题",
      dataIndex: "title",
      render: (_, record) => {
        return (
          <Ellipsis
            sx={{ cursor: "pointer" }}
            onClick={() => viewDetail(record)}
          >
            {record?.title || "-"}
          </Ellipsis>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (_, record) => {
        if (!record?.status) return "-";
        return record.status === ModelDocStatus.DocStatusAppling
          ? "未应用"
          : "应用中";
      },
    },
    {
      title: "类型",
      dataIndex: "file_type",
      render: (_, record) => {
        return record?.file_type !== undefined
          ? fileType[record.file_type!] || record?.file_type
          : "-";
      },
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      // width: 120,
      render: (_, record) => {
        return dayjs((record?.updated_at || 0) * 1000).format(
          "YYYY-MM-DD HH:mm:ss"
        );
      },
    },
    {
      title: "",
      dataIndex: "opt",
      // width: 120,
      render: (_, record) => {
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              variant="text"
              size="small"
              color="primary"
              disabled={record.platform === PlatformPlatformType.PlatformFile}
              onClick={() => updateDoc(record)}
            >
              更新
            </Button>
            <Button
              variant="text"
              size="small"
              color="error"
              onClick={() => deleteDoc(record)}
            >
              删除
            </Button>
          </Stack>
        );
      },
    },
  ];

  useEffect(() => {
    const _query = { ...query };
    delete _query.name;
    fetchData(_query);
  }, [query]);

  return (
    <Stack component={Card} sx={{ height: "100%" }}>
      <DocImport refresh={fetchData} />
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="caption">共 {data?.total} 个文档</Typography>
        <TextField
          label="标题"
          value={title}
          size="small"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setParams({
                title,
              });
            }
          }}
        />
        <TextField
          label="类型"
          value={file_type}
          size="small"
          onChange={(e) => setFile_type(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setParams({
                file_type,
              });
            }
          }}
        />
      </Stack>
      <Table
        sx={{ mx: -2, flex: 1, overflow: "auto" }}
        PaginationProps={{
          sx: {
            pt: 2,
            mx: 2,
          },
        }}
        loading={loading}
        columns={columns}
        dataSource={data?.items || []}
        rowKey="id"
        pagination={{
          page,
          pageSize,
          total: data?.total || 0,
          onChange: (page: number, size: number) => {
            setPage(page);
            setPageSize(size);
            fetchData({
              page: page,
              size: size,
            });
          },
        }}
      />
      <Modal
        open={!!detail}
        title={detail?.title || "文档详情"}
        onCancel={() => setDetail(null)}
        width={"80%"}
        showCancel={false}
        onOk={() => setDetail(null)}
      >
        <Box sx={{ maxHeight: 600, overflow: "auto", pr: 1 }}>
          {detail ? (
            <MarkDown content={markdownContent || "未查询到回答内容"} />
          ) : (
            <Typography sx={{ color: "text.secondary" }}>
              无可显示内容
            </Typography>
          )}
        </Box>
      </Modal>
    </Stack>
  );
};

export default AdminDocument;
