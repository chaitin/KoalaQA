
import { AnydocListRes, TopicTaskStatus, postAdminKbDocumentTask, postAdminKbDocumentFileExport } from "@/api";
import { Message } from "ct-mui";
import { useState } from "react";
import { useParams } from "react-router-dom";

export const finishedStatus = [
  TopicTaskStatus.TaskStatusCompleted,
  TopicTaskStatus.TaskStatusFailed,
];
export type TaskType = { uuid: string; id: string; status: TopicTaskStatus };
export const useExportDoc = ({ onFinished, setLoading }: {
  onFinished: () => void;
  setLoading:  (loading: boolean) => void;
}) => {
  const { id } = useParams();
  const kb_id = +(id || '0');
  const [taskIds, setTaskIds] = useState<
    TaskType[]
  >([]);
  const loopGetTask = async (ids: string[], items: AnydocListRes[] = []) => {
    const res = await postAdminKbDocumentTask({ ids });
    setTaskIds((pre) =>
      pre.map((item) =>
        res.find((item2) => item2.task_id === item.id)
          ? { ...item, status: item.status }
          : item
      )
    );
    res
      .filter((item) =>
        finishedStatus.includes(item.status as TopicTaskStatus)
      )
      .forEach((item) => {
        const file = items.find((file) => file.docs?.[0].id === item.doc_id);
        if (item.status === TopicTaskStatus.TaskStatusCompleted) {
          Message.success(file?.docs?.[0].title + "导入成功");
        } else if (item.status === TopicTaskStatus.TaskStatusFailed) {
          Message.error(file?.docs?.[0].title + "导入失败");
        }
      });
    const new_ids = res
      .filter(
        (item) => !finishedStatus.includes(item.status as TopicTaskStatus)
      )
      .map((item) => item.task_id || "")
      .filter(Boolean);
    if (new_ids.length === 0) {
      // setStep("done");
      onFinished()
      setTaskIds([]);
      return;
    }
    setTimeout(() => {
      loopGetTask(new_ids, items);
    }, 3000);
  };

  const handleImport = async (selectIds: string[], exportReq: typeof postAdminKbDocumentFileExport, items?: AnydocListRes[]) => {
    if (selectIds.length === 0) {
      Message.error("请选择要导入的文档");
      onFinished()
      return;
    }
    const task_ids: TaskType[] = [];
    for (const uuid of selectIds) {
      try {
        const curItem = items?.find((item) => item.uuid === uuid);
        if (!curItem || curItem.uuid === "") {
          continue;
        }
        const task_id = await exportReq({
          doc_id: curItem.docs?.[0].id || "",
          uuid: curItem.uuid || "",
          kb_id,
          title: curItem.docs?.[0].title || "",
          desc: curItem.docs?.[0]?.summary,
        });

        if (task_id) {
          task_ids.push({
            id: task_id,
            uuid: curItem.uuid || "",
            status: TopicTaskStatus.TaskStatusInProgress,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
    setTaskIds(task_ids);
    loopGetTask(
      task_ids.map((item) => item.id),
      items
    );
  }

  const fileReImport = (ids: string[], items: AnydocListRes[]) => {
    setLoading(true);
    return handleImport(ids, postAdminKbDocumentFileExport, items);
  };
  return { taskIds, setTaskIds, handleImport, fileReImport }
};
