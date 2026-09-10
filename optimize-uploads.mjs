/**
 * Разовая перекомпрессия картинок, уже лежащих в томе загрузок.
 *
 * Запускается НЕ напрямую, а через ./optimize-uploads.sh — тот поднимает
 * одноразовый контейнер node:alpine, ставит sharp и монтирует том в /data.
 *
 * Главное правило: имя файла НЕ меняется никогда. В БД пути лежат строкой
 * ('uploads/events/1712...ab.jpg' — это req.file.path из multer), и любое
 * переименование потребовало бы UPDATE в четырёх таблицах. Поэтому JPEG
 * остаётся JPEG, PNG — PNG: выигрыш даёт в первую очередь ресайз, а не смена
 * формата. Смена формата на webp — это уже вариант с обработкой при загрузке,
 * где путь пишется в БД после обработки.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.env.UPLOADS_ROOT ?? '/data';
// Только каталоги с картинками. uploads/documents и uploads/workplan — это
// pdf/doc/docx, их трогать нечем.
const DIRS = ['events', 'reminders'];
// ⚠️ В uploads/events лежат ещё и ВИДЕО: createVideoUpload('uploads/events')
// пишет туда же, куда createImageUpload. Поэтому фильтр по расширению —
// не удобство, а защита: без него sharp упрётся в .mp4 (или, хуже, испортит его).
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Размер диктует НЕ карточка (400px), а страница события: обложка и каждое фото
// галереи выводятся во всю ширину секции — max-width: 1280px, см. .cover и
// .galleryGrid img в EventDetailPage.module.css, и таких фото бывает до десяти
// (upload.array('images', 10)). 1920 даёт полуторный запас над 1280, чтобы на
// ретине фотографии не расплывались.
// ⚠️ Значение выбирается ОДИН раз: скрипт перезаписывает оригиналы, и поднять
// разрешение задним числом можно только восстановлением из бэкапа.
const MAX_SIDE = Number(process.env.MAX_SIDE ?? 1920);
const QUALITY = Number(process.env.QUALITY ?? 82);
// Файл меньше этого размера и в пределах MAX_SIDE считаем уже нормальным
// и не трогаем — чтобы повторный прогон не пережимал одно и то же по кругу.
const SKIP_BYTES = Number(process.env.SKIP_BYTES ?? 400 * 1024);
// Заменяем оригинал, только если выигрыш заметный. Это вторая (и главная)
// страховка от деградации при повторных запусках: если пережимать уже нечего,
// результат отбрасывается и на диске остаётся исходный файл.
const MIN_GAIN = Number(process.env.MIN_GAIN ?? 0.1);
const DRY_RUN = process.env.DRY_RUN === '1';
// Том принадлежит пользователю node (uid 1000) — см. комментарий в mrdk-back/Dockerfile.
// Контейнер здесь работает от root, и без chown перезаписанный файл стал бы
// root-овым: бэкенд (uid 1000) потом словил бы EACCES при удалении события.
const OWNER_UID = Number(process.env.OWNER_UID ?? 1000);
const OWNER_GID = Number(process.env.OWNER_GID ?? 1000);

// Сервер одноядерный: без этих двух строк sharp поднимает пул воркеров по числу
// ядер и держит кэш в памяти — на 1 ГБ это лишний риск.
sharp.cache(false);
sharp.concurrency(1);

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function encoder(pipeline, ext) {
  if (ext === '.png') return pipeline.png({ compressionLevel: 9 });
  if (ext === '.webp') return pipeline.webp({ quality: QUALITY });
  return pipeline.jpeg({ quality: QUALITY, progressive: true, mozjpeg: true });
}

const stats = { scanned: 0, skipped: 0, optimized: 0, failed: 0, before: 0, after: 0 };

for (const sub of DIRS) {
  const files = await walk(path.join(ROOT, sub));
  for (const file of files) {
    stats.scanned += 1;
    const ext = path.extname(file).toLowerCase();
    const rel = path.relative(ROOT, file);

    try {
      const { size } = await fs.stat(file);
      const meta = await sharp(file).metadata();

      // Анимированный webp/gif: sharp по умолчанию возьмёт только первый кадр
      // и молча убьёт анимацию. Такие файлы пропускаем целиком.
      if ((meta.pages ?? 1) > 1) {
        stats.skipped += 1;
        stats.before += size;
        stats.after += size;
        continue;
      }

      const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
      if (longest <= MAX_SIDE && size <= SKIP_BYTES) {
        stats.skipped += 1;
        stats.before += size;
        stats.after += size;
        continue;
      }

      // Пишем во временный файл рядом и переименовываем только по успеху:
      // nginx отдаёт этот том прямо посетителям, и оборванная запись поверх
      // оригинала означала бы битую картинку на живом сайте.
      const tmp = `${file}.opt.tmp`;
      // .rotate() без аргументов применяет EXIF-ориентацию К ПИКСЕЛЯМ. Строка
      // обязательна: sharp по умолчанию выбрасывает метаданные, и без неё
      // фотографии с телефона (снятые «боком») легли бы на сайт повёрнутыми.
      await encoder(
        sharp(file)
          .rotate()
          .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true }),
        ext,
      ).toFile(tmp);

      const { size: newSize } = await fs.stat(tmp);
      if (newSize > size * (1 - MIN_GAIN)) {
        await fs.unlink(tmp);
        stats.skipped += 1;
        stats.before += size;
        stats.after += size;
        continue;
      }

      if (DRY_RUN) {
        await fs.unlink(tmp);
      } else {
        await fs.rename(tmp, file);
        try {
          await fs.chown(file, OWNER_UID, OWNER_GID);
        } catch (e) {
          console.warn(`   !! chown не удался (${rel}): ${e.message}`);
        }
      }

      stats.optimized += 1;
      stats.before += size;
      stats.after += newSize;
      const pct = (100 - (newSize / size) * 100).toFixed(0);
      console.log(
        `   ${rel}: ${meta.width}x${meta.height} ${fmt(size)} -> ${fmt(newSize)} (-${pct}%)`,
      );
    } catch (e) {
      // Один битый файл не должен ронять прогон целиком.
      stats.failed += 1;
      console.warn(`   !! пропущен ${rel}: ${e.message}`);
    }
  }
}

const saved = stats.before - stats.after;
const pct = stats.before > 0 ? ((saved / stats.before) * 100).toFixed(1) : '0.0';
console.log('');
console.log(DRY_RUN ? '== ПРОБНЫЙ ПРОГОН, файлы не изменены ==' : '== готово ==');
console.log(`   найдено картинок: ${stats.scanned}`);
console.log(`   пережато:         ${stats.optimized}`);
console.log(`   пропущено:        ${stats.skipped}`);
if (stats.failed) console.log(`   с ошибкой:        ${stats.failed}`);
console.log(`   было:             ${fmt(stats.before)}`);
console.log(`   стало:            ${fmt(stats.after)}`);
console.log(`   экономия:         ${fmt(saved)} (-${pct}%)`);
