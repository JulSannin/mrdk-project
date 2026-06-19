import { describe, it, expect } from 'vitest';
import { decodeOriginalName } from './decodeOriginalName.js';

// multer/busboy отдаёт originalname как latin1-интерпретацию UTF-8 байтов.
// Воспроизводим это: берём UTF-8 строку → её байты → читаем как latin1 (то,
// что реально приходит в req.file.originalname) → decodeOriginalName должен
// вернуть исходную строку.
function asMulterWouldGiveIt(realName: string): string {
  return Buffer.from(realName, 'utf8').toString('latin1');
}

describe('decodeOriginalName', () => {
  it('восстанавливает кириллицу из latin1-«кракозябр»', () => {
    const real = 'Сентябрь 2019.docx';
    expect(decodeOriginalName(asMulterWouldGiveIt(real))).toBe(real);
  });

  it('round-trip для чисто ASCII-имени — без изменений', () => {
    const ascii = 'report_2024.pdf';
    expect(decodeOriginalName(asMulterWouldGiveIt(ascii))).toBe(ascii);
    // ASCII не меняется даже без «порчи» — байты совпадают в latin1 и utf8
    expect(decodeOriginalName(ascii)).toBe(ascii);
  });

  it('переносит эмодзи/многобайтовые символы', () => {
    const real = 'план—work ✓.docx';
    expect(decodeOriginalName(asMulterWouldGiveIt(real))).toBe(real);
  });
});
