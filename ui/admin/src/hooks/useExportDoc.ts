import {
  AnydocListRes,
  postAdminKbDocumentFileExport,
} from '@/api';
import { message } from '@ctzhian/ui';
import { useSearchParams } from 'react-router-dom';


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
      await Promise.all(
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

      // 直接调用完成回调，不再轮询任务状态
      onFinished();
    } catch (error) {
      console.log(error);
      onFinished();
    }
  };

  const fileReImport = (ids: string[], items: AnydocListRes[]) => {
    setLoading(true);
    return handleImport(ids, postAdminKbDocumentFileExport, items);
  };
  return { handleImport, fileReImport };
};
