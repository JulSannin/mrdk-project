import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import apiClient from '../../shared/lib/apiClient';
import ExternalLinkCards from '../../widgets/listExternalLinksCards/ExternalLinkCards';
import VideoBlock from '../../widgets/videoBlock/VideoBlock';
import { ContactsMap } from './ContactsMap';
import styles from './ContactsPage.module.css';

const ADDRESS =
  '652196, Кемеровская область – Кузбасс, Мариинский округ, деревня 2-я Пристань, улица Весенняя, 13, помещение 3';

const info: { label: string; value: ReactNode }[] = [
  { label: 'Наименование учреждения', value: 'Муниципальное бюджетное учреждение культуры «Районный Дом культуры»' },
  { label: 'Директор', value: 'Кушакова Светлана Александровна' },
  { label: 'Телефон', value: <a className={styles.link} href="tel:+73844350282">8 (38443) 5-02-82</a> },
  { label: 'Юридический адрес', value: ADDRESS },
  { label: 'Фактический адрес учреждения', value: ADDRESS },
  { label: 'ИНН', value: '4213003885' },
  { label: 'КПП', value: '421301001' },
  { label: 'ОГРН', value: '1024201365682' },
];

const emails = ['rdk-pristan@mail.ru', 'RDK-Pristan@yandex.ru', 'fedy20155@mail.ru'];

const branches = [
  'Приметкинский ДД (дом досуга)',
  'Раевский СДК (сельский дом культуры)',
  'Первомайский СДК (сельский дом культуры)',
];

const mapLink = `https://2gis.ru/search/${encodeURIComponent('Кемеровская область, Мариинский округ, деревня 2-я Пристань, улица Весенняя, 13')}`;

function serverErrorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: { message?: string } } | undefined;
    return body?.error?.message ?? 'Не удалось отправить сообщение. Попробуйте позже.';
  }
  return 'Не удалось отправить сообщение. Попробуйте позже.';
}

export function ContactsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [clientError, setClientError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [consent, setConsent] = useState(false);

  const { mutate, isPending, isSuccess, isError, error, reset } = useMutation({
    mutationFn: (payload: { name: string; email: string; phone: string; subject: string; message: string }) =>
      apiClient.post('/feedback', payload),
    onSuccess: () => {
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
      setConsent(false);
    },
  });

  const validate = (): { field: string; message: string } | null => {
    if (name.trim().length < 2) return { field: 'name', message: 'Имя: минимум 2 символа' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { field: 'email', message: 'Некорректный email' };
    if (message.trim().length < 10) return { field: 'message', message: 'Сообщение: минимум 10 символов' };
    if (!consent) return { field: 'consent', message: 'Подтвердите согласие на обработку персональных данных' };
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    reset();
    const validationError = validate();
    if (validationError) {
      setClientError(validationError.message);
      setErrorField(validationError.field);
      return;
    }
    setClientError('');
    setErrorField('');
    mutate({ name, email, phone, subject, message });
  };

  // при первом же редактировании любого поля убираем показанную ошибку валидации
  const clearError = () => {
    if (clientError) {
      setClientError('');
      setErrorField('');
    }
  };

  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.title}>Контакты</h1>

        <dl className={styles.info}>
          {info.map((row) => (
            <div key={row.label} className={styles.infoRow}>
              <dt className={styles.infoLabel}>{row.label}:</dt>
              <dd className={styles.infoValue}>{row.value}</dd>
            </div>
          ))}
          <div className={styles.infoRow}>
            <dt className={styles.infoLabel}>E-mail:</dt>
            <dd className={styles.infoValue}>
              {emails.map((mail) => (
                <a key={mail} className={styles.link} href={`mailto:${mail}?subject=rdk-mbuk`}>
                  {mail}
                </a>
              ))}
            </dd>
          </div>
        </dl>

        <div className={styles.filials}>
          <h2 className={styles.filialsTitle}>МБУК «РДК» и его филиалы</h2>
          <ul className={styles.filialsList}>
            {branches.map((b) => (
              <li key={b} className={styles.filialsItem}>
                <span aria-hidden="true">📍</span> {b}
              </li>
            ))}
          </ul>
        </div>

        <ContactsMap fallbackHref={mapLink} />

        <h2 className={styles.formTitle}>Обратная связь</h2>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label htmlFor="cf-name" className="sr-only">Имя</label>
          <input
            id="cf-name"
            className={styles.input}
            value={name}
            onChange={(e) => { setName(e.target.value); clearError(); }}
            placeholder="Имя *"
            autoComplete="name"
            maxLength={100}
            aria-invalid={errorField === 'name' || undefined}
            aria-describedby={errorField === 'name' ? 'cf-error' : undefined}
            required
          />
          <label htmlFor="cf-email" className="sr-only">Email</label>
          <input
            id="cf-email"
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            placeholder="Email *"
            autoComplete="email"
            maxLength={254}
            aria-invalid={errorField === 'email' || undefined}
            aria-describedby={errorField === 'email' ? 'cf-error' : undefined}
            required
          />
          <label htmlFor="cf-phone" className="sr-only">Телефон</label>
          <input
            id="cf-phone"
            className={styles.input}
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); clearError(); }}
            placeholder="Телефон"
            autoComplete="tel"
            maxLength={30}
          />
          <label htmlFor="cf-subject" className="sr-only">Тема</label>
          <input
            id="cf-subject"
            className={styles.input}
            value={subject}
            onChange={(e) => { setSubject(e.target.value); clearError(); }}
            placeholder="Тема"
            maxLength={150}
          />
          <label htmlFor="cf-message" className="sr-only">Сообщение</label>
          <textarea
            id="cf-message"
            className={`${styles.input} ${styles.textarea}`}
            value={message}
            onChange={(e) => { setMessage(e.target.value); clearError(); }}
            placeholder="Сообщение *"
            rows={5}
            maxLength={5000}
            aria-invalid={errorField === 'message' || undefined}
            aria-describedby={errorField === 'message' ? 'cf-error' : undefined}
            required
          />
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => { setConsent(e.target.checked); clearError(); }}
              aria-invalid={errorField === 'consent' || undefined}
              aria-describedby={errorField === 'consent' ? 'cf-error' : undefined}
            />
            <span>
              Я даю согласие на обработку моих персональных данных в соответствии
              с Федеральным законом № 152-ФЗ «О персональных данных».
            </span>
          </label>
          <button className={styles.submit} type="submit" disabled={isPending}>
            {isPending ? 'Отправка…' : 'Отправить сообщение'}
          </button>

          {isSuccess && <p className={styles.success} role="status">Спасибо! Ваше сообщение отправлено.</p>}
          {clientError && <p id="cf-error" className={styles.error} role="alert">{clientError}</p>}
          {isError && <p className={styles.error} role="alert">{serverErrorText(error)}</p>}
        </form>
      </section>
      <ExternalLinkCards />
      <VideoBlock />
    </>
  );
}
