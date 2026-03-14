import type { MetadataRoute } from "next";
import { getAllPosts, getSitePages } from "@/lib/sanity/queries";

const BASE_URL = "https://kontafy.com";

// Static routes with their change frequencies and priorities
const staticRoutes: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/features", changeFrequency: "weekly", priority: 0.9 },
  { path: "/features/books", changeFrequency: "monthly", priority: 0.8 },
  { path: "/features/invoicing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/features/expenses", changeFrequency: "monthly", priority: 0.8 },
  { path: "/features/reports", changeFrequency: "monthly", priority: 0.8 },
  { path: "/features/gst", changeFrequency: "monthly", priority: 0.8 },
  { path: "/features/inventory", changeFrequency: "monthly", priority: 0.8 },
  { path: "/industries/freelancers", changeFrequency: "monthly", priority: 0.7 },
  { path: "/industries/small-business", changeFrequency: "monthly", priority: 0.7 },
  { path: "/industries/ecommerce", changeFrequency: "monthly", priority: 0.7 },
  { path: "/industries/retail", changeFrequency: "monthly", priority: 0.7 },
  { path: "/industries/services", changeFrequency: "monthly", priority: 0.7 },
  { path: "/compare/tally", changeFrequency: "monthly", priority: 0.6 },
  { path: "/compare/zoho-books", changeFrequency: "monthly", priority: 0.6 },
  { path: "/compare/quickbooks", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static entries
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Blog post entries from Sanity
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await getAllPosts();
    postEntries = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug.current}`,
      lastModified: post._updatedAt ? new Date(post._updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // Sanity might not be configured yet — silently skip dynamic posts
  }

  // CMS-managed page entries from Sanity
  let pageEntries: MetadataRoute.Sitemap = [];
  try {
    const pages = await getSitePages();
    pageEntries = pages
      .filter((page) => !page.seo?.noIndex)
      .map((page) => ({
        url: `${BASE_URL}/${page.slug.current}`,
        lastModified: page._updatedAt ? new Date(page._updatedAt) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
  } catch {
    // Sanity might not be configured yet — silently skip dynamic pages
  }

  return [...staticEntries, ...postEntries, ...pageEntries];
}
