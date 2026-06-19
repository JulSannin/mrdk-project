import { body } from 'express-validator';

export const loginValidator = [
  body('login').notEmpty().isString().trim().isLength({ min: 3, max: 100 }),
  body('password').notEmpty().isString().isLength({ min: 6, max: 128 }),
];