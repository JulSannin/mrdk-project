import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Request, Response } from 'express';
import { verifyFileType, IMAGE_MIMES } from './verifyFileType.js';

// Настоящий 1×1 PNG: file-type читает реальные magic bytes, а не расширение/
// Content-Type, поэтому фикстура должна быть валидным PNG (голой 8-байтовой
// подписи file-type@22 уже недостаточно).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vft-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

function writeFile(name: string, content: Buffer | string): Express.Multer.File {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return { path: p, filename: name } as Express.Multer.File;
}

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('verifyFileType middleware', () => {
  it('пропускает файл с корректной сигнатурой', async () => {
    const file = writeFile('photo.png', PNG);
    const res = mockRes();
    const next = vi.fn();
    await verifyFileType(IMAGE_MIMES)({ file } as unknown as Request, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // next() без ошибки
    expect(res.status).not.toHaveBeenCalled();
    expect(fs.existsSync(file.path)).toBe(true);
  });

  it('отклоняет файл, чья реальная сигнатура не из whitelist, и удаляет его', async () => {
    const file = writeFile('fake.png', 'просто текст, а не картинка');
    const res = mockRes();
    const next = vi.fn();
    await verifyFileType(IMAGE_MIMES)({ file } as unknown as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    expect(fs.existsSync(file.path)).toBe(false); // файл подчищен с диска
  });

  it('переименовывает расширение под реальный тип (PNG, присланный как .bin)', async () => {
    const file = writeFile('upload.bin', PNG);
    const res = mockRes();
    const next = vi.fn();
    await verifyFileType(IMAGE_MIMES)({ file } as unknown as Request, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(file.path.endsWith('.png')).toBe(true);
    expect(fs.existsSync(file.path)).toBe(true);
    expect(fs.existsSync(path.join(dir, 'upload.bin'))).toBe(false);
  });

  it('без файлов сразу вызывает next()', async () => {
    const res = mockRes();
    const next = vi.fn();
    await verifyFileType(IMAGE_MIMES)({} as Request, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
