import type { DataProvider, RaRecord } from 'react-admin';
import apiClient from '../../shared/lib/apiClient';

type ApiRecord = { id: string | number; [key: string]: unknown };

const ENDPOINTS: Record<string, string> = {
  events: 'events',
  workplan: 'workplan',
  documents: 'documents',
  reminders: 'reminders',
  clubs: 'clubs',
};

const DOWNLOAD_RESOURCES = ['workplan', 'documents'];

function toDateInputValue(v: unknown): string {
  if (!v) return '';
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalize(resource: string, row: ApiRecord): ApiRecord {
  if (resource === 'events') {
    return { ...row, eventDate: toDateInputValue(row.event_date) };
  }
  return row;
}

function toFormData(data: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (
      typeof value === 'object' &&
      'rawFile' in value &&
      (value as { rawFile: unknown }).rawFile instanceof File
    ) {
      fd.append(key, (value as { rawFile: File }).rawFile);
    } else if (value instanceof File) {
      fd.append(key, value);
    } else if (typeof value !== 'object') {
      fd.append(key, String(value));
    }
  }
  return fd;
}

// У workplan/documents нет JSON-эндпоинта одной записи (GET /:id отдаёт файл на
// скачивание), поэтому getOne для них ищет запись в общем списке — постранично,
// пока не найдём или не дойдём до конца (раньше брали только первые 100 и при
// большем числе записей getOne для «дальних» ломался).
async function findInList(ep: string, id: unknown): Promise<ApiRecord | null> {
  const limit = 100;
  for (let page = 1; ; page++) {
    const res = await apiClient.get(`/${ep}`, { params: { page, limit } });
    const rows = res.data.data as ApiRecord[];
    const found = rows.find((r) => String(r.id) === String(id));
    if (found) return found;
    if (rows.length < limit) return null; // дошли до конца списка
  }
}

// Картинки/видео события грузятся отдельными multipart-запросами на свои эндпоинты
// (/:id/images, /:id/videos). Возвращает true, если что-то отправляли.
async function postEventMedia(
  ep: string,
  id: unknown,
  field: 'images' | 'videos',
  files: unknown,
): Promise<void> {
  const list = files as Array<{ rawFile?: File }> | undefined;
  if (!list || list.length === 0) return;
  const fd = new FormData();
  let has = false;
  for (const f of list) {
    if (f.rawFile instanceof File) {
      fd.append(field, f.rawFile);
      has = true;
    }
  }
  if (has) await apiClient.post(`/${ep}/${id}/${field}`, fd);
}

export const dataProvider = {
  getList: async (resource, params) => {
    const ep = ENDPOINTS[resource];
    // сортировку по столбцу поддерживают только события; остальные — фиксированный порядок
    const { field, order } = params.sort ?? {};
    const sortParams = field && resource === 'events' ? { sort: field, order } : {};
    if (resource === 'clubs') {
      const res = await apiClient.get(`/${ep}`, { params: sortParams });
      const data = res.data.data as ApiRecord[];
      return { data, total: data.length };
    }
    const { page = 1, perPage = 12 } = params.pagination ?? {};
    const res = await apiClient.get(`/${ep}`, { params: { page, limit: perPage, ...sortParams } });
    return {
      data: (res.data.data as ApiRecord[]).map((r) => normalize(resource, r)),
      total: res.data.total,
    };
  },

  getOne: async (resource, params) => {
    const ep = ENDPOINTS[resource];
    if (DOWNLOAD_RESOURCES.includes(resource)) {
      const row = await findInList(ep, params.id);
      if (!row) throw new Error('Запись не найдена');
      return { data: normalize(resource, row) };
    }
    const res = await apiClient.get(`/${ep}/${params.id}`);
    return { data: normalize(resource, res.data.data as ApiRecord) };
  },

  getMany: async (resource, params) => {
    const rows = await Promise.all(
      params.ids.map((id) => dataProvider.getOne(resource, { id }).then((r) => r.data)),
    );
    return { data: rows };
  },

  getManyReference: async () => ({ data: [], total: 0 }),

  create: async (resource, params) => {
    const ep = ENDPOINTS[resource];
    if (resource === 'clubs') {
      const res = await apiClient.post(`/${ep}`, params.data);
      return { data: res.data.data as RaRecord };
    }
    if (resource === 'events') {
      const { additionalImages, additionalVideos, ...rest } = params.data as Record<string, unknown>;
      const res = await apiClient.post(`/${ep}`, toFormData(rest));
      const created = res.data.data as ApiRecord;
      // медиа грузим отдельными запросами после создания; если упадут — событие уже
      // создано, поэтому сообщаем об этом явно, чтобы админ не думал, что ничего не вышло
      try {
        await postEventMedia(ep, created.id, 'images', additionalImages);
        await postEventMedia(ep, created.id, 'videos', additionalVideos);
      } catch {
        throw new Error('Событие создано, но часть медиафайлов не загрузилась — добавьте их повторно через редактирование.');
      }
      return { data: normalize(resource, created) };
    }
    const res = await apiClient.post(`/${ep}`, toFormData(params.data));
    return { data: normalize(resource, res.data.data as ApiRecord) };
  },

  update: async (resource, params) => {
    const ep = ENDPOINTS[resource];
    if (resource === 'clubs') {
      const res = await apiClient.patch(`/${ep}/${params.id}`, params.data);
      return { data: res.data.data as RaRecord };
    }
    if (resource === 'events') {
      const { additionalImages, additionalVideos, ...rest } = params.data as Record<string, unknown>;
      // сначала сохраняем поля события, затем догружаем новые медиа (как и при create)
      const res = await apiClient.patch(`/${ep}/${params.id}`, toFormData(rest));
      try {
        await postEventMedia(ep, params.id, 'images', additionalImages);
        await postEventMedia(ep, params.id, 'videos', additionalVideos);
      } catch {
        throw new Error('Изменения сохранены, но часть медиафайлов не загрузилась — повторите загрузку.');
      }
      return { data: normalize(resource, res.data.data as ApiRecord) };
    }
    const res = await apiClient.patch(`/${ep}/${params.id}`, toFormData(params.data));
    return { data: normalize(resource, res.data.data as ApiRecord) };
  },

  updateMany: async () => ({ data: [] }),

  delete: async (resource, params) => {
    const ep = ENDPOINTS[resource];
    await apiClient.delete(`/${ep}/${params.id}`);
    return { data: (params.previousData ?? { id: params.id }) as RaRecord };
  },

  deleteMany: async (resource, params) => {
    const ep = ENDPOINTS[resource];
    await Promise.all(params.ids.map((id) => apiClient.delete(`/${ep}/${id}`)));
    return { data: params.ids };
  },
} as DataProvider;
