"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  BlogPost,
  BlogPostInput,
  BlogPostStatus,
} from "@/lib/blog/blog-types";

const emptyForm: BlogPostInput = {
  titleAr: "",
  titleEn: "",
  slug: "",
  excerptAr: "",
  excerptEn: "",
  contentAr: "",
  contentEn: "",
  categoryAr: "",
  categoryEn: "",
  coverImage: "/hotel-image-placeholder.jpg",
  authorName: "Hotleno Team",
  status: "draft",
};

function toForm(post: BlogPost): BlogPostInput {
  return {
    titleAr: post.titleAr,
    titleEn: post.titleEn,
    slug: post.slug,
    excerptAr: post.excerptAr,
    excerptEn: post.excerptEn,
    contentAr: post.contentAr,
    contentEn: post.contentEn,
    categoryAr: post.categoryAr,
    categoryEn: post.categoryEn,
    coverImage: post.coverImage,
    authorName: post.authorName,
    status: post.status,
  };
}

export default function AdminBlogPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>(emptyForm);

  const c = useMemo(
    () => ({
      eyebrow: isAr ? "إدارة المحتوى" : "Content management",
      title: isAr ? "إدارة المدونة" : "Blog Management",
      description: isAr
        ? "أضف وعدّل مقالات Hotleno مؤقتًا بدون قاعدة بيانات."
        : "Create and edit Hotleno posts temporarily without a database.",
      add: isAr ? "إضافة مقال جديد" : "Add new post",
      table: isAr ? "قائمة المقالات" : "Blog posts",
      edit: isAr ? "تعديل" : "Edit",
      delete: isAr ? "حذف" : "Delete",
      publish: isAr ? "نشر" : "Publish",
      hide: isAr ? "إخفاء" : "Hide",
      save: isAr ? "حفظ المقال" : "Save post",
      update: isAr ? "تحديث المقال" : "Update post",
      cancel: isAr ? "إلغاء" : "Cancel",
      noPosts: isAr ? "لا توجد مقالات بعد" : "No posts yet",
      published: isAr ? "منشور" : "Published",
      draft: isAr ? "مسودة" : "Draft",
      titleAr: isAr ? "العنوان العربي" : "Arabic title",
      titleEn: isAr ? "العنوان الإنجليزي" : "English title",
      slug: isAr ? "الرابط المختصر" : "Slug",
      excerptAr: isAr ? "الوصف المختصر بالعربية" : "Arabic excerpt",
      excerptEn: isAr ? "الوصف المختصر بالإنجليزية" : "English excerpt",
      contentAr: isAr ? "المحتوى العربي" : "Arabic content",
      contentEn: isAr ? "المحتوى الإنجليزي" : "English content",
      categoryAr: isAr ? "التصنيف العربي" : "Arabic category",
      categoryEn: isAr ? "التصنيف الإنجليزي" : "English category",
      coverImage: isAr ? "صورة الغلاف" : "Cover image",
      authorName: isAr ? "اسم الكاتب" : "Author name",
      status: isAr ? "الحالة" : "Status",
      actions: isAr ? "الإجراءات" : "Actions",
      loading: isAr ? "جاري التحميل..." : "Loading...",
      saved: isAr ? "تم حفظ المقال" : "Post saved",
      deleted: isAr ? "تم حذف المقال" : "Post deleted",
      localOnly: isAr
        ? "التخزين الحالي محلي داخل ملف JSON ويمكن لاحقًا استبداله بـ MongoDB من blog-store.ts فقط."
        : "Current storage is local JSON and can later be replaced with MongoDB from blog-store.ts.",
    }),
    [isAr],
  );

  async function fetchPosts() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/blog");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load posts");
      }

      setPosts(data.posts || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  function updateField<K extends keyof BlogPostInput>(
    key: K,
    value: BlogPostInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateForm() {
    setEditingPost(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEditForm(post: BlogPost) {
    setEditingPost(post);
    setForm(toForm(post));
    setIsFormOpen(true);
  }

  async function savePost() {
    try {
      const token = localStorage.getItem("token") || "";
      const response = await fetch("/api/admin/blog", {
        method: editingPost ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingPost ? { id: editingPost.id, ...form } : form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save post");
      }

      toast.success(c.saved);
      setIsFormOpen(false);
      setEditingPost(null);
      setForm(emptyForm);
      fetchPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save post");
    }
  }

  async function removePost(id: string) {
    try {
      const token = localStorage.getItem("token") || "";
      const response = await fetch(`/api/admin/blog?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete post");
      }

      toast.success(c.deleted);
      fetchPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    }
  }

  async function toggleStatus(id: string) {
    try {
      const token = localStorage.getItem("token") || "";
      const response = await fetch("/api/admin/blog", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, action: "toggle_status" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update post");
      }

      fetchPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update post");
    }
  }

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(135deg,#0F172A,#F97316)] p-6 text-white shadow-xl shadow-orange-500/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-[#fed7aa]">
              {c.eyebrow}
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {c.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-orange-50">
              {c.description}
            </p>
          </div>
          <Button
            onClick={openCreateForm}
            className="h-12 rounded-2xl bg-white px-6 font-black text-[#F97316] hover:bg-orange-50"
          >
            {c.add}
          </Button>
        </div>
      </section>

      <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4 text-sm font-bold text-orange-800">
        {c.localOnly}
      </div>

      {isFormOpen && (
        <Card className="rounded-[2rem] border-[#E5E7EB] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black text-[#0F172A]">
              {editingPost ? c.update : c.add}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <Field label={c.titleAr}>
              <Input
                value={form.titleAr}
                onChange={(event) => updateField("titleAr", event.target.value)}
              />
            </Field>
            <Field label={c.titleEn}>
              <Input
                value={form.titleEn}
                onChange={(event) => updateField("titleEn", event.target.value)}
              />
            </Field>
            <Field label={c.slug}>
              <Input
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
              />
            </Field>
            <Field label={c.coverImage}>
              <Input
                value={form.coverImage}
                onChange={(event) => updateField("coverImage", event.target.value)}
              />
            </Field>
            <Field label={c.categoryAr}>
              <Input
                value={form.categoryAr}
                onChange={(event) => updateField("categoryAr", event.target.value)}
              />
            </Field>
            <Field label={c.categoryEn}>
              <Input
                value={form.categoryEn}
                onChange={(event) => updateField("categoryEn", event.target.value)}
              />
            </Field>
            <Field label={c.authorName}>
              <Input
                value={form.authorName}
                onChange={(event) => updateField("authorName", event.target.value)}
              />
            </Field>
            <Field label={c.status}>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as BlogPostStatus)
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">{c.draft}</option>
                <option value="published">{c.published}</option>
              </select>
            </Field>
            <Field label={c.excerptAr}>
              <Textarea
                value={form.excerptAr}
                onChange={(event) => updateField("excerptAr", event.target.value)}
              />
            </Field>
            <Field label={c.excerptEn}>
              <Textarea
                value={form.excerptEn}
                onChange={(event) => updateField("excerptEn", event.target.value)}
              />
            </Field>
            <Field label={c.contentAr} className="lg:col-span-2">
              <Textarea
                rows={7}
                value={form.contentAr}
                onChange={(event) => updateField("contentAr", event.target.value)}
              />
            </Field>
            <Field label={c.contentEn} className="lg:col-span-2">
              <Textarea
                rows={7}
                value={form.contentEn}
                onChange={(event) => updateField("contentEn", event.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <Button
                onClick={savePost}
                className="rounded-xl bg-[#F97316] font-black text-white hover:bg-[#ea580c]"
              >
                {editingPost ? c.update : c.save}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingPost(null);
                }}
                className="rounded-xl"
              >
                {c.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-[2rem] border-[#E5E7EB] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black text-[#0F172A]">
            {c.table}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-10 text-center text-sm font-bold text-slate-500">
              {c.loading}
            </p>
          ) : posts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] py-10 text-center text-sm font-bold text-slate-500">
              {c.noPosts}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-slate-500">
                    <th className="px-4 py-3 text-start">{c.titleAr}</th>
                    <th className="px-4 py-3 text-start">{c.slug}</th>
                    <th className="px-4 py-3 text-start">{c.categoryAr}</th>
                    <th className="px-4 py-3 text-start">{c.status}</th>
                    <th className="px-4 py-3 text-start">{c.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-[#E5E7EB] last:border-0"
                    >
                      <td className="px-4 py-4 font-black text-[#0F172A]">
                        {isAr ? post.titleAr : post.titleEn}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-500">
                        {post.slug}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-500">
                        {isAr ? post.categoryAr : post.categoryEn}
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          className={
                            post.status === "published"
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50"
                              : "rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50"
                          }
                        >
                          {post.status === "published" ? c.published : c.draft}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditForm(post)}
                            className="rounded-xl"
                          >
                            {c.edit}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleStatus(post.id)}
                            className="rounded-xl"
                          >
                            {post.status === "published" ? c.hide : c.publish}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removePost(post.id)}
                            className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                          >
                            {c.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
