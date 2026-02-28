import OfflineFileImport from './OfflineFile';
import SitemapImport from './Sitemap';
import { ImportDocProps, ImportDocType } from './type';
import URLImport from './URL';
import YuqueImport from './Yuque';

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
    case 'Yuque':
      return (
        <YuqueImport
          open={open}
          refresh={refresh}
          onCancel={onCancel}
        />
      );
    default:
      return null;
  }
};

export default ImportDoc;
