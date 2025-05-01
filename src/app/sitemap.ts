import { MetadataRoute } from 'next'
 
// TODO: Replace with your actual domain
const BASE_URL = 'https://www.plate.mcvcllmhgb.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly', // Or 'weekly'/'daily' depending on update frequency
      priority: 1,
    },
    // Add other static or dynamic routes here if your app expands
  ]
}