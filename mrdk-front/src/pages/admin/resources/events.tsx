import { useState } from 'react';
import {
  List, Datagrid, TextField, DateField,
  Create, Edit, SimpleForm,
  TextInput, ImageInput, ImageField, FileInput, FileField, required,
  useRecordContext, useNotify,
} from 'react-admin';
import { RuDateInput } from '../RuDateInput';
import { RowNumberField } from '../RowNumberField';
import type { EventImage, EventVideo } from '../../../entities/types';
import apiClient from '../../../shared/lib/apiClient';

export const EventList = () => (
  <List exporter={false} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="edit">
      <RowNumberField label="№" />
      <TextField source="title" label="Название" />
      <DateField
        source="event_date"
        label="Дата"
        locales="ru-RU"
        options={{ day: '2-digit', month: '2-digit', year: 'numeric' }}
      />
      <DateField source="created_at" label="Создано" locales="ru-RU" showTime />
    </Datagrid>
  </List>
);

const GalleryManager = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  const images = ((record?.images as EventImage[]) ?? []).filter(
    (img) => !deletedIds.has(img.id),
  );

  const handleDelete = async (img: EventImage) => {
    try {
      await apiClient.delete(`/events/${record!.id}/images/${img.id}`);
      setDeletedIds((prev) => new Set(prev).add(img.id));
    } catch {
      notify('Не удалось удалить фото', { type: 'error' });
    }
  };

  if (images.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>Текущие фотографии</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {images.map((img) => (
          <div key={img.id} style={{ position: 'relative' }}>
            <img
              src={`/${img.image_path}`}
              alt=""
              style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 4 }}
            />
            <button
              type="button"
              onClick={() => handleDelete(img)}
              style={{
                position: 'absolute', top: 4, right: 4,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                padding: '2px 6px', fontSize: 12,
              }}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const VideoManager = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  const videos = ((record?.videos as EventVideo[]) ?? []).filter(
    (v) => !deletedIds.has(v.id),
  );

  const handleDelete = async (v: EventVideo) => {
    try {
      await apiClient.delete(`/events/${record!.id}/videos/${v.id}`);
      setDeletedIds((prev) => new Set(prev).add(v.id));
    } catch {
      notify('Не удалось удалить видео', { type: 'error' });
    }
  };

  if (videos.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>Текущие видео</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {videos.map((v) => (
          <div key={v.id} style={{ position: 'relative' }}>
            <video
              src={`/${v.video_path}`}
              controls
              style={{ width: 240, height: 'auto', borderRadius: 4, background: '#000' }}
            />
            <button
              type="button"
              onClick={() => handleDelete(v)}
              style={{
                position: 'absolute', top: 4, right: 4,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                padding: '2px 6px', fontSize: 12,
              }}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const CurrentMainImage = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [deleted, setDeleted] = useState(false);
  const imagePath = record?.image_path as string | null | undefined;

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/events/${record!.id}/image`);
      setDeleted(true);
    } catch {
      notify('Не удалось удалить изображение', { type: 'error' });
    }
  };

  if (!imagePath || deleted) {
    return (
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8, fontWeight: 600 }}>Основное изображение не задано</p>
        <p style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
          На сайте показывается заглушка. Загрузите фото ниже, чтобы заменить её.
        </p>
        <img src="/default.jpg" alt="" style={{ width: 200, height: 'auto', borderRadius: 4, opacity: 0.6 }} />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>Текущее основное изображение</p>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={`/${imagePath}`}
          alt=""
          style={{ width: 200, height: 'auto', borderRadius: 4, display: 'block' }}
        />
        <button
          type="button"
          onClick={handleDelete}
          style={{
            position: 'absolute', top: 4, right: 4,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer',
            padding: '2px 6px', fontSize: 12,
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
};

export const EventCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="title" label="Название" validate={required()} />
      <TextInput source="description" label="Описание" multiline fullWidth />
      <RuDateInput source="eventDate" label="Дата мероприятия" validate={required()} />
      <ImageInput
        source="image"
        label="Изображение (необязательно — без него на сайте будет заглушка)"
        accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
      >
        <ImageField source="src" title="title" />
      </ImageInput>
      <ImageInput
        source="additionalImages"
        label="Дополнительные фотографии"
        accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
        multiple
      >
        <ImageField source="src" title="title" />
      </ImageInput>
      <FileInput
        source="additionalVideos"
        label="Видео"
        accept={{ 'video/*': ['.mp4', '.webm', '.mov'] }}
        multiple
      >
        <FileField source="src" title="title" />
      </FileInput>
    </SimpleForm>
  </Create>
);

export const EventEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="title" label="Название" validate={required()} />
      <TextInput source="description" label="Описание" multiline fullWidth />
      <RuDateInput source="eventDate" label="Дата мероприятия" validate={required()} />
      <CurrentMainImage />
      <ImageInput
        source="image"
        label="Новое изображение (пусто = не менять)"
        accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
      >
        <ImageField source="src" title="title" />
      </ImageInput>
      <GalleryManager />
      <ImageInput
        source="additionalImages"
        label="Добавить фотографии"
        accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
        multiple
      >
        <ImageField source="src" title="title" />
      </ImageInput>
      <VideoManager />
      <FileInput
        source="additionalVideos"
        label="Добавить видео"
        accept={{ 'video/*': ['.mp4', '.webm', '.mov'] }}
        multiple
      >
        <FileField source="src" title="title" />
      </FileInput>
    </SimpleForm>
  </Edit>
);
