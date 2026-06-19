import { useInput } from 'react-admin';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import type { Validator } from 'react-admin';

type Props = {
  source: string;
  label?: string;
  validate?: Validator | Validator[];
};

export const RuDateInput = ({ source, label, validate }: Props) => {
  const { field, fieldState } = useInput({ source, validate });

  const value = field.value ? dayjs(field.value) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <DatePicker
        label={label}
        value={value}
        onChange={(newValue) => {
          field.onChange(newValue ? newValue.format('YYYY-MM-DD') : '');
        }}
        format="DD.MM.YYYY"
        slotProps={{
          textField: {
            size: 'small',
            error: fieldState.invalid,
            helperText: fieldState.error?.message,
            onBlur: field.onBlur,
            fullWidth: true,
          },
        }}
      />
    </LocalizationProvider>
  );
};
