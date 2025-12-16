import {
  AnydocListRes,
  TopicTaskStatus,
  postAdminKbDocumentFileExport,
  postAdminKbDocumentTask,
} from '@/api';
import { message } from '@ctzhian/ui';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const finishedStatus = [
  TopicTaskStatus.TaskStatusCompleted,
  TopicTaskStatus.TaskStatusFailed,
  TopicTaskStatus.TaskStatusTimeout,
];
export type TaskType = { uuid: string; docId: string; id: string; status: TopicTaskStatus };

const SELECT_KEY_SEP = '::';
const parseSelectKey = (key: string): { uuid: string; docId?: string; docIdx?: number } => {
  const idx = key.indexOf(SELECT_KEY_SEP);
  if (idx === -1) return { uuid: key };
  const parts = key.split(SELECT_KEY_SEP);
  const uuid = parts[0] || '';
  const docId = parts[1] || '';
  const docIdxStr = parts[2];
  const docIdx =
    docIdxStr !== undefined && docIdxStr !== '' && !Number.isNaN(Number(docIdxStr))
      ? Number(docIdxStr)
      : undefined;
  return { uuid, docId: docId || undefined, docIdx };
};
export const useExportDoc = ({
  onFinished,
  setLoading,
}: {
  onFinished: () => void;
  setLoading: (loading: boolean) => void;
}) => {
  const [searchParams] = useSearchParams();
  const kb_id = +searchParams.get('id')!;
  const [taskIds, setTaskIds] = useState<TaskType[]>([]);

  // 保证任意时刻只有一个轮询在跑，避免同参重复打 /admin/kb/document/task
  const pollTokenRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskInFlightRef = useRef(false);
  const stopPolling = () => {
    pollTokenRef.current += 1;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    taskInFlightRef.current = false;
  };
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const loopGetTask = async (ids: string[], items: AnydocListRes[] = [], token?: number) => {
    const curToken = token ?? pollTokenRef.current;
    if (curToken !== pollTokenRef.current) return;
    if (!ids || ids.length === 0) return;
    // 避免同一 hook 实例里并发/重入请求（会导致同参“一口气”打多次）
    if (taskInFlightRef.current) {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      pollTimerRef.current = setTimeout(() => {
        loopGetTask(ids, items, curToken);
      }, 300);
      return;
    }

    taskInFlightRef.current = true;
    type TaskMetaList = Awaited<ReturnType<typeof postAdminKbDocumentTask>>;
    let res: TaskMetaList;
    try {
      res = await postAdminKbDocumentTask({ ids });
    } finally {
      taskInFlightRef.current = false;
    }
    if (curToken !== pollTokenRef.current) return;
    setTaskIds(pre =>
      pre.map(t => {
        const meta = res.find(m => m.task_id === t.id);
        return meta ? { ...t, status: meta.status as TopicTaskStatus } : t;
      })
    );

    res
      .filter(meta => finishedStatus.includes(meta.status as TopicTaskStatus))
      .forEach(meta => {
        const file = items.find(f => f.docs?.some(d => d.id === meta.doc_id));
        const doc = file?.docs?.find(d => d.id === meta.doc_id);
        const title = doc?.title || '文档';
        if (meta.status === TopicTaskStatus.TaskStatusCompleted) {
          message.success(title + '导入成功');
        } else if (
          [TopicTaskStatus.TaskStatusFailed, TopicTaskStatus.TaskStatusTimeout].includes(
            meta.status as TopicTaskStatus
          )
        ) {
          message.error(title + '导入失败');
        }
      });
    const new_ids = res
      .filter(item => !finishedStatus.includes(item.status as TopicTaskStatus))
      .map(item => item.task_id || '')
      .filter(Boolean);
    if (new_ids.length === 0) {
      // setStep("done");
      stopPolling();
      onFinished();
      setTaskIds([]);
      return;
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(() => {
      loopGetTask(new_ids, items, curToken);
    }, 3000);
  };

  const handleImport = async (
    selectIds: string[],
    exportReq: typeof postAdminKbDocumentFileExport,
    items?: AnydocListRes[]
  ) => {
    if (selectIds.length === 0) {
      message.error('请选择要导入的文档');
      onFinished();
      return;
    }
    // 开始新导入时，先终止旧轮询，避免 /task 同参并发
    stopPolling();
    const exportTargets: Array<{ uuid: string; docId: string; title: string; desc?: string }> = [];

    for (const key of selectIds) {
      const { uuid, docId, docIdx } = parseSelectKey(key);
      const candidates = (items || []).filter(it => it.uuid === uuid);
      if (candidates.length === 0) continue;

      if (docId) {
        // 关键：同一个 uuid 可能对应多条 item（例如 sitemap/url 拆分），需要找到包含该 docId 的那条
        const curItem =
          candidates.find(it => it.docs?.some(d => d.id === docId)) || candidates[0];
        if (!curItem?.uuid) continue;
        const docs = curItem.docs || [];
        if (docs.length === 0) continue;
        const doc =
          docIdx !== undefined && docs[docIdx] ? docs[docIdx] : docs.find(d => d.id === docId);
        if (!doc?.id) continue;
        exportTargets.push({
          uuid: curItem.uuid,
          docId: doc.id,
          title: doc.title || '',
          desc: doc.summary,
        });
      } else {
        // 兼容父级选择：同 uuid 的所有 item 里的 docs 都导入
        candidates.forEach(curItem => {
          const docs = curItem.docs || [];
          docs.forEach(doc => {
            if (!doc?.id) return;
            exportTargets.push({
              uuid: curItem.uuid || '',
              docId: doc.id,
              title: doc.title || '',
              desc: doc.summary,
            });
          });
        });
      }
    }

    // 去重，避免父级与子级同时被选导致重复导入
    const uniq = new Map<string, { uuid: string; docId: string; title: string; desc?: string }>();
    exportTargets.forEach(t => {
      uniq.set(`${t.uuid}${SELECT_KEY_SEP}${t.docId}`, t);
    });
    const finalTargets = Array.from(uniq.values());
    if (finalTargets.length === 0) {
      message.error('未找到可导入的文档');
      onFinished();
      return;
    }

    try {
      const task_ids: TaskType[] = [];
      const taskIdsRaw = await Promise.all(
        finalTargets.map(t =>
          exportReq({
            doc_id: t.docId,
            uuid: t.uuid,
            kb_id,
            title: t.title,
            desc: t.desc,
          }).catch(err => {
            console.log(err);
            return '';
          })
        )
      );

      taskIdsRaw.forEach((taskId, idx) => {
        if (!taskId) return;
        const t = finalTargets[idx];
        task_ids.push({
          id: taskId,
          uuid: t.uuid,
          docId: t.docId,
          status: TopicTaskStatus.TaskStatusInProgress,
        });
      });

      setTaskIds(task_ids);
      const curToken = pollTokenRef.current;
      loopGetTask(
        task_ids.map(t => t.id),
        items,
        curToken
      );
    } catch (error) {
      console.log(error);
    }
  };

  const fileReImport = (ids: string[], items: AnydocListRes[]) => {
    setLoading(true);
    return handleImport(ids, postAdminKbDocumentFileExport, items);
  };
  return { taskIds, setTaskIds, handleImport, fileReImport };
};
