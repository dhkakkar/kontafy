import { defineField, defineType } from "sanity";

export const seoMeta = defineType({
  name: "seoMeta",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
      description: "Override the default page title for search engines (max 60 chars recommended).",
      validation: (rule) => rule.max(70).warning("Keep under 60–70 characters for best results."),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      rows: 3,
      description: "Short description shown in search results (max 160 chars recommended).",
      validation: (rule) => rule.max(160).warning("Keep under 160 characters for best results."),
    }),
    defineField({
      name: "ogImage",
      title: "Open Graph Image",
      type: "image",
      description: "Image displayed when the page is shared on social media (1200x630 recommended).",
      options: { hotspot: true },
    }),
    defineField({
      name: "canonical",
      title: "Canonical URL",
      type: "url",
      description: "Set a canonical URL if this content exists at another primary address.",
    }),
    defineField({
      name: "noIndex",
      title: "No Index",
      type: "boolean",
      description: "If enabled, search engines will not index this page.",
      initialValue: false,
    }),
  ],
});
