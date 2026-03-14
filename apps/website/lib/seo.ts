import type { Metadata } from "next";
import { getSeoMeta } from "@/lib/sanity/queries";

const BASE_URL = "https://kontafy.com";

// ---------- Metadata helper ----------

interface MetadataFallback {
  title: string;
  description: string;
  ogImage?: string;
  noIndex?: boolean;
}

/**
 * Generates page metadata by first attempting to fetch overrides from Sanity CMS,
 * then falling back to the provided defaults.
 */
export async function generatePageMetadata(
  slug: string,
  fallback: MetadataFallback,
): Promise<Metadata> {
  let seo: Awaited<ReturnType<typeof getSeoMeta>> = null;

  try {
    seo = await getSeoMeta(slug);
  } catch {
    // Sanity may not be configured — use fallback silently
  }

  const title = seo?.metaTitle || fallback.title;
  const description = seo?.metaDescription || fallback.description;
  const ogImageUrl = seo?.ogImage?.asset?.url || fallback.ogImage || `${BASE_URL}/og-default.png`;
  const canonical = seo?.canonical || `${BASE_URL}/${slug === "homepage" ? "" : slug}`;
  const noIndex = seo?.noIndex ?? fallback.noIndex ?? false;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Kontafy",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

// ---------- JSON-LD helpers ----------

type JsonLdType = "Organization" | "Product" | "FAQ" | "Article" | "BreadcrumbList";

interface OrganizationData {
  name: string;
  url: string;
  logo: string;
  sameAs?: string[];
}

interface ProductData {
  name: string;
  description: string;
  image: string;
  brand: string;
  offers?: {
    price: string;
    priceCurrency: string;
    availability?: string;
  };
}

interface FAQData {
  questions: { question: string; answer: string }[];
}

interface ArticleData {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  url: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbData {
  items: BreadcrumbItem[];
}

type JsonLdDataMap = {
  Organization: OrganizationData;
  Product: ProductData;
  FAQ: FAQData;
  Article: ArticleData;
  BreadcrumbList: BreadcrumbData;
};

/**
 * Factory function that generates appropriate JSON-LD structured data based on the type.
 */
export function generateJsonLd<T extends JsonLdType>(
  type: T,
  data: JsonLdDataMap[T],
): Record<string, unknown> {
  switch (type) {
    case "Organization": {
      const d = data as OrganizationData;
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: d.name,
        url: d.url,
        logo: d.logo,
        ...(d.sameAs ? { sameAs: d.sameAs } : {}),
      };
    }

    case "Product": {
      const d = data as ProductData;
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: d.name,
        description: d.description,
        image: d.image,
        brand: {
          "@type": "Brand",
          name: d.brand,
        },
        ...(d.offers
          ? {
              offers: {
                "@type": "Offer",
                price: d.offers.price,
                priceCurrency: d.offers.priceCurrency,
                availability: d.offers.availability || "https://schema.org/InStock",
              },
            }
          : {}),
      };
    }

    case "FAQ": {
      const d = data as FAQData;
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: d.questions.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      };
    }

    case "Article": {
      const d = data as ArticleData;
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: d.title,
        description: d.description,
        image: d.image,
        datePublished: d.datePublished,
        dateModified: d.dateModified || d.datePublished,
        author: {
          "@type": "Person",
          name: d.authorName,
        },
        publisher: {
          "@type": "Organization",
          name: "Kontafy",
          logo: {
            "@type": "ImageObject",
            url: `${BASE_URL}/logo.png`,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": d.url,
        },
      };
    }

    case "BreadcrumbList": {
      const d = data as BreadcrumbData;
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: d.items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      };
    }

    default:
      return {};
  }
}
