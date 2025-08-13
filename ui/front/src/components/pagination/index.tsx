import React, { useCallback, useState } from 'react';
import { styled, SxProps } from '@mui/material/styles';
import {
  Pagination as MuiPage,
  Select,
  MenuItem,
  TextField,
  InputBase,
  PaginationRenderItemParams,
  SelectChangeEvent,
} from '@mui/material';
import PageItem from './PageItem';
import Text from '@/components/text';
import { leastText } from '@/constant';

export interface PaginationProps {
  onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void;
  count: number;
  rowsPerPage?: number;
  page: number;
  defaultPage?: number;
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (event: SelectChangeEvent<number>) => void;
  sx?: SxProps;
}

export const getPageCount = (total: number, rowsPerPage: number) => {
  if (total > 0) {
    return total % rowsPerPage === 0
      ? total / rowsPerPage
      : Math.floor(total / rowsPerPage) + 1;
  }
  return 0;
};

const FlexRow = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  display: 'flex',
  justifyContent: 'space-between',
  width: '99%',
  margin: 4,
}));

const Flex = styled('div')`
  display: flex;
  align-items: center;
`;

const NarrowInput = styled(InputBase)`
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding-left: 12px;
  display: flex;
  height: 32px;
  color: #888;
  & > div {
    padding-right: 0 !important;
    height: 18px !important;
    min-height: fit-content !important;
  }
`;

const SimpleInput = styled(TextField)`
  width: 30px;
  margin: 0px 4px;
  background-color: #fff;
  & .MuiOutlinedInput-input {
    padding: 5px 5px;
    color: #888;
  }
`;

const MiddleText = styled(Text)({
  color: leastText,
});

const Pagination: React.FC<PaginationProps> = (props) => {
  const {
    onPageChange,
    count,
    rowsPerPage = 10,
    page,
    rowsPerPageOptions = [],
    onRowsPerPageChange,
    sx,
  } = props;
  const pageCount = getPageCount(count, rowsPerPage);
  const [input, setInput] = useState<string>('');

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const testNumber = /^[0-9]*$/;
      const value = event?.target?.value?.toString();
      const validInput = testNumber.test(value) ? value : input;
      const inRangeInput =
        (parseInt(validInput) ?? 0) >= pageCount ? pageCount : validInput;
      setInput(inRangeInput.toString());
    },
    [input, pageCount]
  );

  const handlePressEnter = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const currentInputNumber = parseInt(input, 10);
      if (event.key === 'Enter' && currentInputNumber > 0) {
        onPageChange(event, currentInputNumber);
        setInput('');
      }
    },
    [input, onPageChange]
  );

  const renderPageItem = useCallback((item: PaginationRenderItemParams) => {
    return (
      <PageItem
        type={item.type}
        page={item.page}
        selected={item.selected}
        disabled={item.disabled}
        onClick={item.onClick}
      />
    );
  }, []);

  return (
    <FlexRow sx={sx}>
      <Flex>
        {rowsPerPageOptions && (
          <>
            <Select
              variant='outlined'
              size='small'
              value={count ? rowsPerPage : ''}
              input={<NarrowInput />}
              sx={{ marginRight: 1, minWidth: '80px', backgroundColor: '#fff' }}
              onChange={onRowsPerPageChange}
            >
              {rowsPerPageOptions.map((option) => (
                <MenuItem key={`rows-pre-page-${option}`} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            <MiddleText size='xs'>条每页，共{count}条</MiddleText>
          </>
        )}
      </Flex>
      <Flex>
        <MuiPage
          variant='outlined'
          color='primary'
          renderItem={renderPageItem}
          count={pageCount}
          page={page}
          boundaryCount={2}
          onChange={onPageChange}
        />
        <MiddleText size='xs'>跳至</MiddleText>
        <SimpleInput
          size={'small'}
          value={input}
          onChange={handleInputChange}
          onKeyUp={handlePressEnter}
        />
        <MiddleText size='xs'>/ {pageCount}页</MiddleText>
      </Flex>
    </FlexRow>
  );
};

export default Pagination;
