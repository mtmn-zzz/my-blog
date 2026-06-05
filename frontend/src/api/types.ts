export type ArticleListItem = {
  id: number;
  title: string;
  summary: string;
  content: string;
  created_at: string;
  updated_at: string;
  read_time: number;
  like_count: number;
};

export type ArticleDetail = ArticleListItem;
