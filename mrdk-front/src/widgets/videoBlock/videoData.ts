export interface VideoItem {
  src: string;
  poster?: string;
}

export const videos: VideoItem[] = [
  { src: '/video/kuzbass.mp4', poster: '/video/kuzbass.png' },
  { src: '/video/za_pobedu.mp4', poster: '/video/za_pobedu.png' },
];