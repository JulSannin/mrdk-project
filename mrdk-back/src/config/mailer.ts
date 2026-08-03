import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Дефолты nodemailer — 2 мин на соединение и 10 мин на сокет. Контроллер
  // обратной связи ждёт sendMail до ответа, поэтому при недоступном SMTP
  // посетитель публичной формы висел бы минутами и получил 500: со стороны это
  // выглядит как зависший сайт. Режем до секунд — живая отправка укладывается.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

export default transporter;