import { NextRequest, NextResponse } from "next/server";
import {
  createPost,
  deletePost,
  getAllPosts,
  togglePostStatus,
  updatePost,
} from "@/lib/blog/blog-store";
import type { BlogPostInput, BlogPostStatus } from "@/lib/blog/blog-types";
import { verifyToken } from "@/lib/jwt";

const statuses: BlogPostStatus[] = ["draft", "published"];

function isStatus(value: unknown): value is BlogPostStatus {
  return typeof value === "string" && statuses.includes(value as BlogPostStatus);
}

function sanitizePayload(payload: Record<string, unknown>): BlogPostInput {
  const status = isStatus(payload.status) ? payload.status : "draft";

  return {
    titleAr: String(payload.titleAr || "").trim(),
    titleEn: String(payload.titleEn || "").trim(),
    slug: String(payload.slug || "").trim(),
    excerptAr: String(payload.excerptAr || "").trim(),
    excerptEn: String(payload.excerptEn || "").trim(),
    contentAr: String(payload.contentAr || "").trim(),
    contentEn: String(payload.contentEn || "").trim(),
    categoryAr: String(payload.categoryAr || "").trim(),
    categoryEn: String(payload.categoryEn || "").trim(),
    coverImage: String(payload.coverImage || "/hotel-image-placeholder.jpg").trim(),
    authorName: String(payload.authorName || "Hotleno Team").trim(),
    status,
  };
}

function validatePostInput(input: BlogPostInput) {
  const required: Array<keyof BlogPostInput> = [
    "titleAr",
    "titleEn",
    "slug",
    "excerptAr",
    "excerptEn",
    "contentAr",
    "contentEn",
    "categoryAr",
    "categoryEn",
    "coverImage",
    "authorName",
  ];

  const missing = required.filter((key) => !input[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new Error("Admin token is required");
  }

  const decoded = verifyToken(token);

  if (decoded.role !== "admin") {
    throw new Error("Admin access required");
  }
}

export async function GET() {
  try {
    const posts = await getAllPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load posts" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const payload = (await req.json()) as Record<string, unknown>;
    const input = sanitizePayload(payload);
    validatePostInput(input);
    const post = await createPost(input);

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create post" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAdmin(req);
    const payload = (await req.json()) as Record<string, unknown>;
    const id = String(payload.id || "");
    const action = String(payload.action || "update");

    if (!id) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    const post =
      action === "toggle_status"
        ? await togglePostStatus(id)
        : await updatePost(id, sanitizePayload(payload));

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update post" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Post id is required" }, { status: 400 });
    }

    await deletePost(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete post" },
      { status: 400 },
    );
  }
}
