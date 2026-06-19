import type { FC } from 'react';
import { useListContext, useRecordContext } from 'react-admin';

const RowNumber = () => {
  const { data, page, perPage } = useListContext();
  const record = useRecordContext();
  if (!data || !record) return null;
  const index = data.findIndex((r) => r.id === record.id);
  if (index === -1) return null;
  return <span>{(page - 1) * perPage + index + 1}</span>;
};

// label не нужен внутри — его читает Datagrid из пропсов для заголовка колонки.
export const RowNumberField = RowNumber as FC<{ label?: string }>;
