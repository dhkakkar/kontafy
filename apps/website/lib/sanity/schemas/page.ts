import { defineField, defineType } from "sanity";

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  description: "Manage SEO metadata for static pages (homepage, pricing, about, etc.).",
  fields: [
    defineField({
      name: "title",
      title: "Page Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
      description: "URL-friendly identifier (e.g. 'pricing', 'about', 'homepage').",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seoMeta",
    }),
  ],
  preview: {
    select: {
      title: "title",
      slug: "slug.current",
    },
    prepare({ title, slug }) {
      return {
        title: title || "Untitled Page",
        subtitle: slug ? `/${slug}` : "",
      };
    },
  },
});
