import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://jearn.site",
      lastModified: new Date(),
    },
  ];
}