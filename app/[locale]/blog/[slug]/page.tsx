import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPublishedPosts } from "@/lib/blog/blog-store";

export const dynamic = "force-dynamic";

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isAr = locale === "ar";
  const post = await getPostBySlug(slug);

  if (!post || post.status !== "published") {
    notFound();
  }

  const recentPosts = (await getPublishedPosts())
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);

  const copy = {
    back: isAr ? "العودة للمدونة" : "Back to blog",
    latest: isAr ? "أحدث المقالات" : "Latest posts",
    read: isAr ? "قراءة المقال" : "Read article",
  };

  const content = isAr ? post.contentAr : post.contentEn;

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="bg-[#F8FAFC] text-[#0F172A]">
      <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/blog`}
          className="mb-6 inline-flex rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-black text-[#0F172A] transition hover:bg-orange-50 hover:text-[#F97316]"
        >
          {copy.back}
        </Link>

        <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white shadow-sm">
          <div className="relative h-[320px] sm:h-[420px]">
            <Image
              src={post.coverImage}
              alt={isAr ? post.titleAr : post.titleEn}
              fill
              priority
              sizes="(min-width: 1024px) 960px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-0 p-6 text-white sm:p-8">
              <span className="rounded-full bg-[#F97316] px-3 py-1 text-xs font-black">
                {isAr ? post.categoryAr : post.categoryEn}
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                {isAr ? post.titleAr : post.titleEn}
              </h1>
              <p className="mt-4 text-sm font-bold text-white/85">
                {post.authorName} · {formatDate(post.createdAt, locale)}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-9">
            <div className="space-y-5 text-base leading-9 text-slate-700">
              {content.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </article>

      {recentPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-2xl font-black text-[#0F172A]">
            {copy.latest}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {recentPosts.map((item) => (
              <Link
                key={item.id}
                href={`/${locale}/blog/${item.slug}`}
                className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/5"
              >
                <div className="relative h-36">
                  <Image
                    src={item.coverImage}
                    alt={isAr ? item.titleAr : item.titleEn}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-black text-[#F97316]">
                    {copy.read}
                  </p>
                  <h3 className="mt-2 text-base font-black text-[#0F172A]">
                    {isAr ? item.titleAr : item.titleEn}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
