// Локальная проверка SMTP: читает mrdk-back/.env, проверяет соединение/авторизацию
// и отправляет одно тестовое письмо на ADMIN_EMAIL.
// Запуск:  cd mrdk-back && node smtp-test.mjs
// Файл можно удалить после проверки (он не нужен приложению).
import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

console.log(`Проверяю ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} как ${process.env.SMTP_USER} …`);

try {
  await transporter.verify();
  console.log('✅ Соединение и авторизация SMTP в порядке');
  const info = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.ADMIN_EMAIL,
    subject: 'Тест SMTP — сайт ДК',
    text: 'Если вы видите это письмо — SMTP настроен правильно, форма обратной связи будет работать.',
  });
  console.log('✅ Письмо отправлено, messageId:', info.messageId);
  console.log(`   Проверьте ящик: ${process.env.ADMIN_EMAIL}`);
} catch (e) {
  console.error('❌ Ошибка SMTP:', e.message);
  process.exit(1);
}
