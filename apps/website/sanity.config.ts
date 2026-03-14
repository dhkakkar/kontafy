import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemas } from "@/lib/sanity/schemas";

export default defineConfig({
  name: "kontafy",
  title: "Kontafy CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  plugins: [structureTool()],
  schema: { types: schemas },
});
