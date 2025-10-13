import Pagination from '@/components/pagination';
import Text from '@/components/text';
import { disabledText, leastText } from '@/constant';
import {
  Box,
  Checkbox,
  Table as MuiTable,
  SelectChangeEvent,
  Skeleton,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { styled, SxProps } from '@mui/material/styles';
import React, { useCallback } from 'react';
import { CenterPage, CheckIcon } from './components';

export type ColumnAction = 'edit' | 'delete' | 'status' | 'test';
export interface Column<T extends { [key: string]: unknown }> {
  id: keyof T;
  label: string;
  labelIcon?: React.ReactNode;
  ellipsis?: boolean;
  minWidth?: number;
  width?: number | string;
  align?: 'right' | 'left';
  format?: ({ row, value }: { row: T; value: T[keyof T] }) => React.ReactNode;
}

export const BodyRow = styled(TableRow)(() => ({
  // "&.odd": {
  //   background: "#FFF",
  // },
  // "&.even": {
  //   background: "#F7F7F780",
  // },
}));

export const Cell = styled(TableCell)(() => ({
  borderBottomColor: '#EDEEF2',
}));

export interface PaginationProps extends pageProps {
  onChange: (value: pageProps) => void;
  total: number;
}

export interface pageProps {
  page: number;
  rowsPerPage?: number;
}

export interface TableSelectionProps {
  selectedKeys: (string | number)[];
  disabledKeys?: (string | number)[];
  onSelect: (checked: boolean, selectedKey: string | number) => void;
  onSelectAll: (checked: boolean, selectedKeys: (string | number)[]) => void;
  selectActions?: React.ReactNode[];
}

export interface TableProps<T extends { [key: string]: unknown }> {
  sx?: SxProps;
  rowKey: keyof T;
  data: T[];
  columns: Column<T>[];
  pagination?: PaginationProps | null;
  onRowClick?: (value: T) => void;
  selectionProps?: TableSelectionProps;
  disableHover?: boolean;
  loading?: boolean;
  empty?: React.ReactNode;
}

const Table: <T extends { [key: string]: unknown }>(
  props: TableProps<T>
) => React.ReactElement<TableProps<T>> = (props) => {
  const {
    sx,
    data,
    rowKey,
    columns,
    pagination,
    onRowClick,
    selectionProps,
    disableHover,
    loading,
    empty,
  } = props;

  const handleChangePage = useCallback(
    (_event: unknown, newPage: number) => {
      pagination?.onChange({
        page: newPage,
        rowsPerPage: pagination.rowsPerPage,
      });
    },
    [pagination]
  );

  const handleChangeRowsPerPage = useCallback(
    (event: SelectChangeEvent<number>) => {
      pagination?.onChange({ page: 1, rowsPerPage: +event.target.value });
    },
    [pagination]
  );

  const isCheckAll = () => {
    const currentKeys = data?.map((item) => item[rowKey]) ?? [];
    if (currentKeys.length === 0) {
      return false;
    }
    for (const itemKey of currentKeys) {
      if (selectionProps?.selectedKeys?.indexOf(itemKey as string) === -1) {
        return false;
      }
    }

    return true;
  };

  const isChecked = (currentKey: string | number) => {
    if (selectionProps?.selectedKeys) {
      return selectionProps?.selectedKeys?.indexOf(currentKey) > -1;
    } else {
      return false;
    }
  };

  const isIndeterminate = () => {
    const currentKeys = data?.map((item) => item[rowKey]) as string[];
    if (selectionProps?.selectedKeys) {
      for (const itemKey of selectionProps?.selectedKeys) {
        if (currentKeys?.indexOf(itemKey as string) > -1) {
          return true;
        }
      }
      return false;
    } else {
      return false;
    }
  };

  const onSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.stopPropagation();
      const checked = event?.target?.checked;
      const currentKeys = data
        ?.map((item) => item[rowKey])
        ?.filter(
          (key) => !selectionProps?.disabledKeys?.includes(key as string)
        ) as string[];

      selectionProps?.onSelectAll(checked, currentKeys);
    },
    [data, rowKey, selectionProps]
  );

  const onClickCheckBox = useCallback((event: React.MouseEvent) => {
    event?.stopPropagation();
  }, []);

  const onClickBodyRow = useCallback(
    (row: (typeof data)[number]) => () => {
      onRowClick?.(row);
    },
    [onRowClick]
  );

  const onSelect = useCallback(
    (currentKey: string | number) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        const checked = event?.target?.checked;
        selectionProps?.onSelect(checked, currentKey);
      },
    [selectionProps]
  );

  return (
    <Box sx={{ height: '100%', overflow: 'hidden', ...sx }}>
      <TableContainer
        sx={{
          height: 'calc(100% - 48px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          ...(!disableHover && { padding: '0 8px' }),
          paddingBottom: '16px',
        }}
      >
        <MuiTable
          stickyHeader
          aria-label='sticky table'
          sx={{ tableLayout: 'fixed' }}
        >
          {(selectionProps?.selectedKeys?.length || 0) > 0 &&
            selectionProps?.selectActions ? (
            <TableHead sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <TableRow>
                {selectionProps && (
                  <Cell
                    key={'table-checkbox'}
                    style={{
                      width: '56px',
                      padding: '4px 4px',
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <Checkbox
                      disableRipple
                      disabled={data?.length === 0}
                      icon={<CheckIcon />}
                      checked={isCheckAll()}
                      indeterminate={!isCheckAll() && isIndeterminate()}
                      onChange={onSelectAll}
                      onClick={onClickCheckBox}
                      sx={{
                        background: 'transparent',
                        padding: '8px',
                      }}
                    />
                  </Cell>
                )}

                {columns.map((column) => (
                  <Cell
                    key={column.id as string}
                    align={column.align}
                    style={{
                      minWidth: column.minWidth,
                      width: column.width,
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <Text
                      size='xs'
                      sx={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        color: leastText,
                        fontSize: '14px',
                      }}
                      weight='regular'
                    >
                      {column.label}
                      {column?.labelIcon}
                    </Text>
                  </Cell>
                ))}
              </TableRow>
              <TableRow
                sx={{
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  left: '56px',
                  top: 0,
                  padding: '8px',
                  zIndex: 2,
                  backgroundColor: '#F9FAFB',
                }}
              >
                {selectionProps?.selectActions?.map((action, index) => (
                  <td key={`table-action-${index}`}>{action}</td>
                ))}
              </TableRow>
            </TableHead>
          ) : (
            <TableHead sx={{ zIndex: 2 }}>
              <TableRow>
                {selectionProps && (
                  <Cell
                    key={'table-checkbox'}
                    style={{
                      width: '56px',
                      padding: '4px 4px',
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <Checkbox
                      disableRipple
                      icon={<CheckIcon />}
                      checked={isCheckAll()}
                      indeterminate={!isCheckAll() && isIndeterminate()}
                      onChange={onSelectAll}
                      onClick={onClickCheckBox}
                      sx={{
                        background: 'transparent',
                        padding: '8px',
                      }}
                    />
                  </Cell>
                )}
                {columns.map((column) => (
                  <Cell
                    key={column.id as string}
                    align={column.align}
                    style={{
                      minWidth: column.minWidth,
                      fontWeight: 500,
                      width: column.width,
                      color: '#000',
                      backgroundColor: '#F9FAFB',
                      borderBottom: 'none',
                    }}
                  >
                    <Text
                      size='xs'
                      sx={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        fontWeight: 500,
                        color: '#000',
                        fontSize: '14px',
                      }}
                      weight='regular'
                    >
                      {column.label}
                      {column?.labelIcon}
                    </Text>
                  </Cell>
                ))}
              </TableRow>
            </TableHead>
          )}
          {loading ? (
            <TableBody sx={{ overflow: 'auto' }}>
              {[1, 2, 3, 4, 5]?.map((item) => (
                <BodyRow key={`loading-table-row-${item}`}>
                  {columns.map((column) => (
                    <Cell key={String(column.id)}>
                      <Skeleton height={34} />
                    </Cell>
                  ))}
                </BodyRow>
              ))}
            </TableBody>
          ) : data?.length === 0 ? (
            empty ? (
              <TableBody sx={{ overflow: 'auto', position: 'relative' }}>
                <BodyRow key={`table-empty`}>
                  <Cell sx={{ border: 'none' }}>
                    <CenterPage>{empty}</CenterPage>
                  </Cell>
                </BodyRow>
              </TableBody>
            ) : (
              <></>
            )
          ) : (
            <TableBody sx={{ overflow: 'auto' }}>
              {data?.map((row, index) => {
                return (
                  <BodyRow
                    className={(index + 1) % 2 === 0 ? 'even' : 'odd'}
                    role='checkbox'
                    tabIndex={-1}
                    key={row[rowKey] as string}
                    sx={{
                      cursor: onRowClick && 'pointer',
                      ...(!disableHover && {
                        '&:hover': {
                          boxShadow: '0px 12px 10px 0px rgba(0, 20, 40, 0.1)',
                          transition: 'all 0.2s ease-in-out',
                          position: 'relative',
                          zIndex: 1,
                        },
                      }),
                    }}
                    onClick={onClickBodyRow(row)}
                  >
                    {selectionProps && (
                      <Cell
                        key={`table-checkbox-${index}`}
                        style={{
                          width: '56px',
                          padding: '4px 4px',
                          // backgroundColor:
                          //   (index + 1) % 2 === 0 ? "#F7F7F780" : "#fff",
                        }}
                      >
                        <Checkbox
                          disableRipple
                          icon={<CheckIcon />}
                          sx={{
                            background: 'transparent',
                            padding: '8px',
                          }}
                          disabled={selectionProps?.disabledKeys?.includes(
                            row[rowKey] as string
                          )}
                          checked={isChecked(row[rowKey] as string)}
                          onChange={onSelect(row[rowKey] as string)}
                          onClick={onClickCheckBox}
                        />
                      </Cell>
                    )}
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <Cell
                          title={
                            column?.ellipsis
                              ? typeof value === 'string'
                                ? value
                                : ''
                              : ''
                          }
                          key={column.id as string}
                          align={column.align}
                          style={{
                            padding: '6px 16px',
                            height: '48px',
                            ...(column?.ellipsis && {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: column.width ?? column?.minWidth,
                              whiteSpace: 'nowrap',
                            }),
                            ...(selectionProps?.disabledKeys?.includes(
                              row[rowKey] as string
                            ) && { color: disabledText }),
                          }}
                        >
                          {column.format
                            ? column.format({ row, value })
                            : (value as React.ReactNode)}
                        </Cell>
                      );
                    })}
                  </BodyRow>
                );
              })}
            </TableBody>
          )}
        </MuiTable>
      </TableContainer>
      {pagination && pagination?.total > 0 && (
        <Pagination
          count={pagination?.total}
          page={pagination.page}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[10, 20, 50, 100]}
          rowsPerPage={pagination?.rowsPerPage ?? 10}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            margin: '0px 8px',
            backgroundColor: 'transparent',
            marginTop: '8px',
          }}
        />
      )}
    </Box>
  );
};

export default Table;
