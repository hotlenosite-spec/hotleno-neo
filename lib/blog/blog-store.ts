import { promises as fs } from "fs";
import path from "path";
import type { BlogPost, BlogPostInput, BlogPostUpdateInput } from "./blog-types";

const blogDataPath = path.join(process.cwd(), "data", "blog-posts.json");

async function ensureBlogFile() {
  await fs.mkdir(path.dirname(blogDataPath), { recursive: true });

  try {
    await fs.access(blogDataPath);
  } catch {
    await fs.writeFile(blogDataPath, "[]", "utf8");
  }
}

async function readPosts(): Promise<BlogPost[]> {
  await ensureBlogFile();
  const raw = await fs.readFile(blogDataPath, "utf8");
  const posts = JSON.parse(raw) as BlogPost[];

  return posts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function writePosts(posts: BlogPost[]) {
  await ensureBlogFile();
  await fs.writeFile(blogDataPath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
}

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createId() {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getAllPosts() {
  return readPosts();
}

export async function getPublishedPosts() {
  const posts = await readPosts();
  return posts.filter((post) => post.status === "published");
}

export async function getPostBySlug(slug: string) {
  const posts = await readPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function createPost(input: BlogPostInput) {
  const posts = await readPosts();
  const now = new Date().toISOString();
  const slug = normalizeSlug(input.slug || input.titleEn);

  if (!slug) {
    throw new Error("Slug is required");
  }

  if (posts.some((post) => post.slug === slug)) {
    throw new Error("Slug already exists");
  }

  const post: BlogPost = {
    ...input,
    id: createId(),
    slug,
    createdAt: now,
    updatedAt: now,
  };

  await writePosts([post, ...posts]);
  return post;
}

export async function updatePost(id: string, input: BlogPostUpdateInput) {
  const posts = await readPosts();
  const index = posts.findIndex((post) => post.id === id);

  if (index === -1) {
    throw new Error("Post not found");
  }

  const nextSlug =
    typeof input.slug === "string" ? normalizeSlug(input.slug) : posts[index].slug;

  if (!nextSlug) {
    throw new Error("Slug is required");
  }

  if (posts.some((post) => post.id !== id && post.slug === nextSlug)) {
    throw new Error("Slug already exists");
  }

  const updated: BlogPost = {
    ...posts[index],
    ...input,
    slug: nextSlug,
    updatedAt: new Date().toISOString(),
  };

  posts[index] = updated;
  await writePosts(posts);
  return updated;
}

export async function deletePost(id: string) {
  const posts = await readPosts();
  const nextPosts = posts.filter((post) => post.id !== id);

  if (nextPosts.length === posts.length) {
    throw new Error("Post not found");
  }

  await writePosts(nextPosts);
  return { success: true };
}

export async function togglePostStatus(id: string) {
  const posts = await readPosts();
  const post = posts.find((item) => item.id === id);

  if (!post) {
    throw new Error("Post not found");
  }

  return updatePost(id, {
    status: post.status === "published" ? "draft" : "published",
  });
}
