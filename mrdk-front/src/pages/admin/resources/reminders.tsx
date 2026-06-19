import {
  List, Datagrid, TextField, DateField,
  Create, Edit, SimpleForm, TextInput, ImageInput, ImageField, required,
  useRecordContext,
} from 'react-admin';
import { RowNumberField } from '../RowNumberField';

const CurrentImage = () => {
  const record = useRecordContext();
  const path = record?.image_path as string | null | undefined;
  if (!path) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>Текущее изображение</p>
      <img src={`/${path}`} alt="" style={{ width: 200, height: 'auto', borderRadius: 4 }} />
    </div>
  );
};

export const ReminderList = () => (
  <List exporter={false}>
    <Datagrid rowClick="edit">
      <RowNumberField label="№" />
      <TextField source="title" label="Название" sortable={false} />
      <DateField source="created_at" label="Создано" showTime sortable={false} />
    </Datagrid>
  </List>
);

const ReminderForm = ({ create = false }: { create?: boolean }) => (
  <SimpleForm>
    <TextInput source="title" label="Название" validate={required()} />
    {!create && <CurrentImage />}
    <ImageInput
      source="image"
      label={create ? 'Изображение' : 'Новое изображение (пусто = не менять)'}
      accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
    >
      <ImageField source="src" title="title" />
    </ImageInput>
  </SimpleForm>
);

export const ReminderCreate = () => (<Create redirect="list"><ReminderForm create /></Create>);
export const ReminderEdit = () => (<Edit><ReminderForm /></Edit>);