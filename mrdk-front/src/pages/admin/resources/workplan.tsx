import {
  List, Datagrid, TextField, NumberField, FunctionField,
  Create, Edit, SimpleForm, TextInput, NumberInput, SelectInput, FileInput, FileField, required, minValue, maxValue,
  useRecordContext,
} from 'react-admin';
import { RowNumberField } from '../RowNumberField';

const MONTHS = [
  { id: 1, name: 'Январь' }, { id: 2, name: 'Февраль' }, { id: 3, name: 'Март' },
  { id: 4, name: 'Апрель' }, { id: 5, name: 'Май' }, { id: 6, name: 'Июнь' },
  { id: 7, name: 'Июль' }, { id: 8, name: 'Август' }, { id: 9, name: 'Сентябрь' },
  { id: 10, name: 'Октябрь' }, { id: 11, name: 'Ноябрь' }, { id: 12, name: 'Декабрь' },
];

const monthName = (m: unknown): string => MONTHS.find((x) => x.id === m)?.name ?? '';

const CurrentFile = () => {
  const record = useRecordContext();
  const name = record?.original_name as string | undefined;
  if (!record || !name) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>Текущий файл</p>
      <a href={`/api/workplan/${record.id}`} target="_blank" rel="noreferrer">
        📄 {name}
      </a>
    </div>
  );
};

export const WorkPlanList = () => (
  <List exporter={false}>
    <Datagrid rowClick="edit">
      <RowNumberField label="№" />
      <TextField source="title" label="Название" sortable={false} />
      <FunctionField label="Месяц" render={(r) => monthName(r.month)} />
      <NumberField source="year" label="Год" sortable={false} options={{ useGrouping: false }} />
    </Datagrid>
  </List>
);

const WorkPlanForm = ({ create = false }: { create?: boolean }) => (
  <SimpleForm>
    <TextInput source="title" label="Название" validate={required()} />
    <NumberInput
      source="year"
      label="Год"
      validate={[required(), minValue(2000), maxValue(2100)]}
    />
    <SelectInput source="month" label="Месяц" choices={MONTHS} validate={required()} />
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

export const WorkPlanCreate = () => (<Create redirect="list"><WorkPlanForm create /></Create>);
export const WorkPlanEdit = () => (<Edit><WorkPlanForm /></Edit>);
