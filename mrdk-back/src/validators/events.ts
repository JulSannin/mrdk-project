import { body, param } from 'express-validator';

export const createEventValidator = [
  body('title').trim().notEmpty().isLength({ max: 255 }),
  body('description').optional().isString().trim().isLength({ max: 10000 }),
  body('eventDate').trim().notEmpty().isISO8601(),
];

export const updateEventValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 255 }),
  body('description').optional().isString().trim().isLength({ max: 10000 }),
  body('eventDate').optional().trim().notEmpty().isISO8601(),
];

export const eventIdValidator = [
  param('id').isInt({ min: 1 }).toInt(),
];

export const eventImageIdValidator = [
  param('id').isInt({ min: 1 }).toInt(),
  param('imageId').isInt({ min: 1 }).toInt(),
];

export const eventVideoIdValidator = [
  param('id').isInt({ min: 1 }).toInt(),
  param('videoId').isInt({ min: 1 }).toInt(),
];
