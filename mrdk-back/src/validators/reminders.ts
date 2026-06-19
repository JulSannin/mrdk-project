import { body } from 'express-validator';

export const createReminderValidator = [
  body('title').trim().notEmpty().isLength({ max: 255 }),
];

export const updateReminderValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 255 }),
];
