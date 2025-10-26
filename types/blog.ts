export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  articles: Article[];
  _count?: {
    articles: number;
  };
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  imageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string;
  category: Category;
  comments: Comment[];
}

export interface Comment {
  id: string;
  name: string;
  email: string;
  content: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  articleId: string;
  article: Article;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
}

export interface RelatedArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  readTime: string;
}
