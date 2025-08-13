import store from "@/store";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import UserMainLayout from './user';

const MainLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  return (
    <Provider store={store}>
      <UserMainLayout/>
    </Provider>
  );
};

export default MainLayout;
