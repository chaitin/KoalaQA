import { getAdminModelList } from '@/api';
import ModelManagementModal from './ModelManagementModal';

const Settings = () => {
  return (
    <ModelManagementModal 
      open={true} 
      onClose={() => {}} 
      onConfigured={getAdminModelList}
    />
  );
};

export default Settings;
