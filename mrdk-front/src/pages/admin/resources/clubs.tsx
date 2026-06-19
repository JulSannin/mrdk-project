import {
  List, Datagrid, TextField,
  Create, Edit, SimpleForm, TextInput, required,
} from 'react-admin';
import { RowNumberField } from '../RowNumberField';

export const ClubList = () => (
  <List exporter={false}>
    <Datagrid rowClick="edit">
      <RowNumberField label="№" />
      <TextField source="name" label="Название" sortable={false} />
      <TextField source="leader" label="Руководитель" sortable={false} />
    </Datagrid>
  </List>
);

const ClubForm = () => (
  <SimpleForm>
    <TextInput source="name" label="Название" validate={required()} />
    <TextInput source="leader" label="Руководитель" />
  </SimpleForm>
);

export const ClubCreate = () => (<Create redirect="list"><ClubForm /></Create>);
export const ClubEdit = () => (<Edit><ClubForm /></Edit>);