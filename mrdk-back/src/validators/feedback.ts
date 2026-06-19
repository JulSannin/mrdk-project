import { body } from 'express-validator';

export const feedbackValidator = [
  body('name').trim().notEmpty().isString().isLength({ min: 2, max: 100 }),
  body('email').trim().notEmpty().isEmail().normalizeEmail().isLength({ max: 254 }),
  body('phone').optional({ values: 'falsy' }).trim().isString().isLength({ max: 30 }),
  body('subject').optional({ values: 'falsy' }).trim().isString().isLength({ max: 150 }),
  body('message').trim().notEmpty().isString().isLength({ min: 10, max: 5000 }),
];
