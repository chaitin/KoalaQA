import { ImportDocProps, ImportDocType } from './type';
import ImportDocConfluence from './Confluence';
import ImportDocYuque from './Yuque';
import EpubImport from './Epub';
import FeishuImport from './Feishu';
import NotionImport from './Notion';
import OfflineFileImport from './OfflineFile';
import RSSImport from './RSS';
import SitemapImport from './Sitemap';
import URLImport from './URL';
import WikijsImport from './Wikijs';
import ImportDocSiyuan from './Siyuan';
import ImportDocMinDoc from './MinDoc';

const ImportDoc = ({
  type,
  open,
  refresh,
  onCancel,
  parentId = null,
}: ImportDocProps & { type: ImportDocType }) => {
  switch (type) {
    case 'OfflineFile':
      return (
        <OfflineFileImport
          open={open}
          refresh={refresh}
          onCancel={onCancel}
          parentId={parentId}
        />
      );
    case 'URL':
      return (
        <URLImport
          open={open}
          refresh={refresh}
          onCancel={onCancel}
          parentId={parentId}
        />
      );
    case 'Sitemap':
      return (
        <SitemapImport
          open={open}
          refresh={refresh}
          onCancel={onCancel}
          parentId={parentId}
        />
      );
    default:
      return null;
  }
};

export default ImportDoc;
