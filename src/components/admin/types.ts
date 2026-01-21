export type Course = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean | null;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  order: number;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  content_type: string | null;
  order: number;
};
