import { body } from 'express-validator';

export const createWorkplanValidator = [
  body('title').trim().notEmpty().isLength({ max: 255 }),
  body('year').isInt({ min: 2000, max: 2100 }).toInt(),
  body('month').isInt({ min: 1, max: 12 }).toInt(),
];

export const updateWorkplanValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 255 }),
  body('year').optional().isInt({ min: 2000, max: 2100 }).toInt(),
  body('month').optional().isInt({ min: 1, max: 12 }).toInt(),
];
