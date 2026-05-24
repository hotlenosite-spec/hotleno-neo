export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  titleAr: string;
  titleEn: string;
  slug: string;
  excerptAr: string;
  excerptEn: string;
  contentAr: string;
  contentEn: string;
  categoryAr: string;
  categoryEn: string;
  coverImage: string;
  authorName: string;
  status: BlogPostStatus;
  createdAt: string;
  updatedAt: string;
}

export type BlogPostInput = Omit<BlogPost, "id" | "createdAt" | "updatedAt">;

export type BlogPostUpdateInput = Partial<BlogPostInput>;
