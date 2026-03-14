import { type SchemaTypeDefinition } from "sanity";
import { post } from "./post";
import { author } from "./author";
import { category } from "./category";
import { page } from "./page";
import { seoMeta } from "./seoMeta";

export const schemas: SchemaTypeDefinition[] = [
  post,
  author,
  category,
  page,
  seoMeta,
];
