import {
  List, Datagrid, TextField,
  Create, Edit, SimpleForm, TextInput, FileInput, FileField, required,
  useRecordContext,
} from 'react-admin';
import { RowNumberField } from '../RowNumberField';

// Документ инлайн не превьюим, поэтому показываем имя файла со ссылкой на скачивание.
const CurrentFile = () => {
  const record = useRecordContext();
  const name = record?.original_name as string | undefined;
  if (!record || !name) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>Текущий файл</p>
      <a href={`/api/documents/${record.id}`} target="_blank" rel="noreferrer">
        📄 {name}
      </a>
    </div>
  );
};

export const DocumentList = () => (
  <List exporter={false}>
    <Datagrid rowClick="edit">
      <RowNumberField label="№" />
      <TextField source="title" label="Название" sortable={false} />
    </Datagrid>
  </List>
);

const DocumentForm = ({ create = false }: { create?: boolean }) => (
  <SimpleForm>
    <TextInput source="title" label="Название" validate={required()} />
    {!create && <CurrentFile />}
    <FileInput
      source="document"
      label={create ? 'Файл (.doc, .docx, .pdf)' : 'Новый файл (пусто = не менять)'}
      validate={create ? required() : undefined}
      accept={{
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/pdf': ['.pdf'],
      }}
    >
      <FileField source="src" title="title" />
    </FileInput>
  </SimpleForm>
);

export const DocumentCreate = () => (<Create redirect="list"><DocumentForm create /></Create>);
export const DocumentEdit = () => (<Edit><DocumentForm /></Edit>);
