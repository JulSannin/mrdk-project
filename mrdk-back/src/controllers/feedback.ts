import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import transporter from '../config/mailer.js';
import logger from '../config/logger.js';

export async function sendFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { message: 'Ошибка валидации', statusCode: 400, details: errors.array() } });
    return;
  }
  try {
    const { name, email, message, phone, subject } = req.body as {
      name: string; email: string; message: string; phone?: string; subject?: string;
    };
    const mailSubject = subject
      ? `Обращение с сайта ДК: ${subject} (от ${name})`
      : `Обращение с сайта ДК от ${name}`;
    const lines = [`От: ${name} <${email}>`];
    if (phone) lines.push(`Телефон: ${phone}`);
    lines.push('', message);
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL,
      replyTo: email,
      subject: mailSubject,
      text: lines.join('\n'),
    });
    logger.info('Письмо обратной связи отправлено', { from: email });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
