import React from "react";
import { styled } from "@mui/material/styles";
import { ButtonBase } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

type PageItemType =
  | "previous"
  | "page"
  | "next"
  | "end-ellipsis"
  | "start-ellipsis"
  | "first"
  | "last";
export interface PageItemProp {
  type: PageItemType;
  page: number | null;
  selected: boolean;
  disabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const PageItemComponent = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== "selected",
})<Pick<PageItemProp, "selected" | "disabled">>(({ selected, disabled }) => ({
  alignItems: "center",
  borderRadius: 16,
  display: "inline-flex",
  background: "#fff",
  minWidth: 30,
  height: 30,
  padding: "4px",
  border: "1px solid #E9E9E9FF",
  color: "#ccc",
  margin: 4,
  fontSize: 12,
  fontWeight: "bold",
  userSelect: "none",
  ...(disabled && { cursor: "not-allowed" }),
  ...(selected && {
    color: "#fff",
    background: "#006397",
    transition: "all 0.2 linear",
  }),
}));

const PageItem: React.FC<PageItemProp> = (props) => {
  const { type, page, selected, disabled, onClick } = props;

  const renderItemContent = (type: PageItemType, page: number | null) => {
    switch (type) {
      case "previous": {
        return (
          <ArrowBackIosIcon
            fontSize="small"
            sx={{ fontSize: 12, marginLeft: "4px" }}
          />
        );
      }
      case "next": {
        return <ArrowForwardIosIcon fontSize="small" sx={{ fontSize: 12 }} />;
      }
      case "page": {
        return <span>{page}</span>;
      }
      case "start-ellipsis":
      case "end-ellipsis": {
        return <span>...</span>;
      }
      case "first":
      case "last":
      default: {
        return null;
      }
    }
  };

  return (
    <PageItemComponent
      selected={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {renderItemContent(type, page)}
    </PageItemComponent>
  );
};

export default PageItem;
