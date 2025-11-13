import store from "@/store";
import { Provider } from "react-redux";
import UserMainLayout from './user';

const MainLayout = () => {
  return (
    <Provider store={store}>
      <UserMainLayout/>
    </Provider>
  );
};

export default MainLayout;
