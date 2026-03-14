import { groq } from "next-sanity";
import { client } from "./client";

// ---------- Types ----------

export interface SeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: {
    asset: {
      _ref: string;
      url: string;
    };
  };
  canonical?: string;
  noIndex?: boolean;
}

export interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  author?: {
    _id: string;
    name: string;
    image?: { asset: { url: string } };
  };
  category?: {
    _id: string;
    title: string;
    slug: { current: string };
  };
  mainImage?: {
    asset: { url: string };
    alt?: string;
  };
  body?: unknown[];
  publishedAt?: string;
  scheduledPublishAt?: string;
  seo?: SeoMeta;
  tags?: string[];
  _updatedAt?: string;
}

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
}

export interface SitePage {
  _id: string;
  title: string;
  slug: { current: string };
  seo?: SeoMeta;
  _updatedAt?: string;
}

// ---------- Queries ----------

const seoFields = groq`
  seo {
    metaTitle,
    metaDescription,
    ogImage { asset-> { _ref, url } },
    canonical,
    noIndex
  }
`;

const postFields = groq`
  _id,
  title,
  slug,
  excerpt,
  author-> { _id, name, image { asset-> { url } } },
  category-> { _id, title, slug },
  mainImage { asset-> { url }, alt },
  publishedAt,
  tags,
  _updatedAt,
  ${seoFields}
`;

// Fetch SEO meta for a page by slug
export async function getSeoMeta(slug: string): Promise<SeoMeta | null> {
  const query = groq`
    *[_type == "page" && slug.current == $slug][0] {
      ${seoFields}
    }
  `;
  const result = await client.fetch<{ seo?: SeoMeta } | null>(query, { slug }, { next: { tags: ["pages"] } });
  return result?.seo ?? null;
}

// Fetch all published blog posts, ordered by date desc
export async function getAllPosts(): Promise<Post[]> {
  const query = groq`
    *[_type == "post" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) {
      ${postFields}
    }
  `;
  return client.fetch<Post[]>(query, {}, { next: { tags: ["posts"] } });
}

// Fetch a single post by slug
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const query = groq`
    *[_type == "post" && slug.current == $slug][0] {
      ${postFields},
      body
    }
  `;
  return client.fetch<Post | null>(query, { slug }, { next: { tags: ["posts"] } });
}

// Fetch scheduled (future) posts — for admin dashboard
export async function getScheduledPosts(): Promise<Post[]> {
  const query = groq`
    *[_type == "post" && defined(scheduledPublishAt) && scheduledPublishAt > now()] | order(scheduledPublishAt asc) {
      ${postFields},
      scheduledPublishAt
    }
  `;
  return client.fetch<Post[]>(query, {});
}

// Fetch all categories
export async function getAllCategories(): Promise<Category[]> {
  const query = groq`
    *[_type == "category"] | order(title asc) {
      _id,
      title,
      slug,
      description
    }
  `;
  return client.fetch<Category[]>(query, {}, { next: { tags: ["categories"] } });
}

// Fetch all pages that have SEO meta — used for sitemap generation
export async function getSitePages(): Promise<SitePage[]> {
  const query = groq`
    *[_type == "page" && defined(seo)] {
      _id,
      title,
      slug,
      _updatedAt,
      ${seoFields}
    }
  `;
  return client.fetch<SitePage[]>(query, {}, { next: { tags: ["pages"] } });
}
