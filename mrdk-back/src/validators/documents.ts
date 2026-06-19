import { body } from 'express-validator';

export const createDocumentValidator = [
  body('title').trim().notEmpty().isLength({ max: 255 }),
];

export const updateDocumentValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 255 }),
];
