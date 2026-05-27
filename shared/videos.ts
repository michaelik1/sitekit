export type CounterSpec = number | string | undefined;

export type RawVideo = {
  id: string | number;
  title: string;
  description: string;
  category?: string;
  author?: string;
  date?: string;
  duration?: string;
  tags?: string[];
  likes?: CounterSpec;
  views?: CounterSpec;
  comments?: CounterSpec;
  poster?: string;
  filename?: string;
  quality?: string;
  status?: string;
};

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  date: string;
  duration: string;
  tags: string[];
  likes: number;
  views: number;
  comments: number;
  poster: string;
  src: string;
  filename: string;
  quality: string;
  status: string;
};
