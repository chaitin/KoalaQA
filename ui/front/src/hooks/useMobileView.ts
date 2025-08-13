import { useTheme, useMediaQuery } from "@mui/material";

export const useMobileView = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  return isMobile;
};
