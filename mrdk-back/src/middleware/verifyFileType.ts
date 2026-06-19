import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileTypeFromFile } from 'file-type';

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export const DOCUMENT_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/x-cfb', // legacy .doc (OLE Compound File Binary)
  'application/zip',   // .docx иногда определяется как обычный zip-контейнер
];

export const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

// Какие расширения на диске допустимы для реального (задетекченного) типа.
// Если расширение сохранённого файла не из этого списка (например, настоящий
// JPEG, присланный как x.html), файл переименовывается под первое из списка —
// иначе reverse-proxy в проде отдаст его с Content-Type по расширению.
const EXTS_BY_MIME: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/zip': ['.docx', '.zip'],
  'application/x-cfb': ['.doc'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
};

async function normalizeExtension(f: Express.Multer.File, mime: string): Promise<void> {
  const allowedExts = EXTS_BY_MIME[mime];
  const currentExt = path.extname(f.path).toLowerCase();
  if (!allowedExts || allowedExts.includes(currentExt)) return;
  const newPath = f.path.slice(0, f.path.length - currentExt.length) + allowedExts[0];
  await fs.promises.rename(f.path, newPath);
  f.path = newPath;
  f.filename = path.basename(newPath);
}

function collectFiles(req: Request): Express.Multer.File[] {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  return files;
}

async function unlinkAll(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(files.map(f => fs.promises.unlink(f.path).catch(() => {})));
}

/**
 * Проверяет реальный тип загруженных файлов по сигнатуре (magic bytes),
 * а не по подделываемому заголовку Content-Type. При несовпадении удаляет
 * все файлы запроса и возвращает 400.
 */
export function verifyFileType(allowedMimes: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const files = collectFiles(req);
    if (files.length === 0) {
      next();
      return;
    }
    try {
      for (const f of files) {
        const detected = await fileTypeFromFile(f.path);
        if (!detected || !allowedMimes.includes(detected.mime)) {
          await unlinkAll(files);
          res.status(400).json({ error: { message: 'Недопустимый тип файла', statusCode: 400 } });
          return;
        }
        await normalizeExtension(f, detected.mime);
      }
      next();
    } catch (err) {
      await unlinkAll(files);
      next(err);
    }
  };
}
