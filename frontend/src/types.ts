export type Post = {
  id: number;
  title: string;
  content: string;
  image_key?: string | null;
};

export type PostCreate = {
  title: string;
  content: string;
  image_key?: string | null;
};

export type PostUpdate = {
  title?: string;
  content?: string;
  image_key?: string | null;
};
