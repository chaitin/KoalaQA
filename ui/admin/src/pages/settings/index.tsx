import { Grid2 as Grid } from '@mui/material';
import GroupTagManager from './component/Topic';
import Access from './component/Access';

const Settings = () => {
  return (
    <Grid container spacing={2}>
      <Grid size={{ sm: 12, md: 6 }}>
        <GroupTagManager />
      </Grid>
      <Grid size={{ sm: 12, md: 6 }}>
        <Access/>
      </Grid>
    </Grid>
  );
};
export default Settings;
