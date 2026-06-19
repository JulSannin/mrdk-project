import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_MIMES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

function makeStorage(dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, name);
    },
  });
}

export function createImageUpload(dest: string) {
  return multer({
    storage: makeStorage(dest),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('INVALID_MIME'));
      }
    },
  });
}

export function createDocumentUpload(dest: string) {
  return multer({
    storage: makeStorage(dest),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_DOC_MIMES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('INVALID_MIME'));
      }
    },
  });
}

export function createVideoUpload(dest: string) {
  return multer({
    storage: makeStorage(dest),
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('INVALID_MIME'));
      }
    },
  });
}
