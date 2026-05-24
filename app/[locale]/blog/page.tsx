import Image from "next/image";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog/blog-store";

export const dynamic = "force-dynamic";

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const posts = await getPublishedPosts();

  const copy = {
    eyebrow: isAr ? "مدونة Hotleno" : "Hotleno Blog",
    title: isAr ? "نصائح وأفكار لسفر أسهل" : "Travel ideas for easier bookings",
    description: isAr
      ? "مقالات مختصرة تساعدك على التخطيط، اختيار الفندق المناسب، وحجز رحلتك بثقة."
      : "Short guides to help you plan, choose better stays, and book with confidence.",
    readMore: isAr ? "قراءة المزيد" : "Read more",
    empty: isAr ? "لا توجد مقالات منشورة حاليًا" : "No published posts yet",
  };

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="bg-[#F8FAFC] text-[#0F172A]">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F97316]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {copy.description}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#E5E7EB] bg-white p-12 text-center text-sm font-bold text-slate-500">
            {copy.empty}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/5"
              >
                <div className="relative h-52">
                  <Image
                    src={post.coverImage}
                    alt={isAr ? post.titleAr : post.titleEn}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-black">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-[#F97316]">
                      {isAr ? post.categoryAr : post.categoryEn}
                    </span>
                    <span className="text-slate-400">
                      {formatDate(post.createdAt, locale)}
                    </span>
                  </div>
                  <h2 className="text-xl font-black leading-tight text-[#0F172A]">
                    {isAr ? post.titleAr : post.titleEn}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">
                    {isAr ? post.excerptAr : post.excerptEn}
                  </p>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-slate-500">
                      {post.authorName}
                    </span>
                    <Link
                      href={`/${locale}/blog/${post.slug}`}
                      className="rounded-xl bg-[#F97316] px-4 py-2 text-sm font-black text-white transition hover:bg-[#ea580c]"
                    >
                      {copy.readMore}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
