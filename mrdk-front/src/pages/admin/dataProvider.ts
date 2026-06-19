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
// скачивание), поэтому getOne для них ищет запись в общем списке (первые 100).
async function findInList(ep: string, id: unknown): Promise<ApiRecord | null> {
  const res = await apiClient.get(`/${ep}`, { params: { page: 1, limit: 100 } });
  return (res.data.data as ApiRecord[]).find((r) => String(r.id) === String(id)) ?? null;
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
      const newImages = additionalImages as Array<{ rawFile?: File }> | undefined;
      if (newImages && newImages.length > 0) {
        const fd = new FormData();
        for (const img of newImages) {
          if (img.rawFile instanceof File) fd.append('images', img.rawFile);
        }
        await apiClient.post(`/${ep}/${created.id}/images`, fd);
      }
      const newVideos = additionalVideos as Array<{ rawFile?: File }> | undefined;
      if (newVideos && newVideos.length > 0) {
        const fd = new FormData();
        for (const v of newVideos) {
          if (v.rawFile instanceof File) fd.append('videos', v.rawFile);
        }
        await apiClient.post(`/${ep}/${created.id}/videos`, fd);
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
      const newImages = additionalImages as Array<{ rawFile?: File }> | undefined;
      if (newImages && newImages.length > 0) {
        const fd = new FormData();
        for (const img of newImages) {
          if (img.rawFile instanceof File) fd.append('images', img.rawFile);
        }
        await apiClient.post(`/${ep}/${params.id}/images`, fd);
      }
      const newVideos = additionalVideos as Array<{ rawFile?: File }> | undefined;
      if (newVideos && newVideos.length > 0) {
        const fd = new FormData();
        for (const v of newVideos) {
          if (v.rawFile instanceof File) fd.append('videos', v.rawFile);
        }
        await apiClient.post(`/${ep}/${params.id}/videos`, fd);
      }
      const res = await apiClient.patch(`/${ep}/${params.id}`, toFormData(rest));
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
