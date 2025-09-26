import { useEffect, useState } from 'react';
import ModelManagementModal from './ModelManagementModal';
import { getAdminModelList, ModelLLMType } from '@/api';

const Settings = () => {
  const [modelList, setModelList] = useState<any[]>([]);
  
  const getModel = () => {
    getAdminModelList().then(res => {
      const model = Object.values(ModelLLMType);
      setModelList(res.filter(item => model.includes(item.type as any)));
    });
  };

  useEffect(() => {
    getModel();
  }, []);

  return (
    <ModelManagementModal 
      open={true} 
      onClose={() => {}} 
      onConfigured={getModel}
    />
  );
};

export default Settings;
