export interface EventImage {
  id: number;
  event_id: number;
  image_path: string;
  created_at: string;
}

export interface EventVideo {
  id: number;
  event_id: number;
  video_path: string;
  created_at: string;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  image_path: string | null;
  event_date: string | null;
  created_at: string;
  images?: EventImage[];
  videos?: EventVideo[];
}

export interface WorkPlanItem {
  id: number;
  title: string;
  year: number | null;
  month?: number | null;
  original_name?: string | null;
}

export interface Document {
  id: number;
  title: string;
  original_name?: string | null;
}

export interface Reminder {
  id: number;
  title: string;
  image_path: string | null;
  created_at?: string;
}

export interface Club {
  id: number;
  name: string;
  leader: string | null;
}

export interface ApiList<T> {
  data: T[];
  total: number;
}

export interface ApiSingle<T> {
  data: T;
}