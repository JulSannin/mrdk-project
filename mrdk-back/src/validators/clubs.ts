import { body } from 'express-validator';

export const createClubValidator = [
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('leader').optional().trim().isString().isLength({ max: 255 }),
];

export const updateClubValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('leader').optional().trim().isString().isLength({ max: 255 }),
];
