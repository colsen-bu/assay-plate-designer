import fs from 'fs';
import path from 'path';

// TODO: Replace with your actual domain if different
const BASE_URL = 'https://www.plate.mcvcllmhgb.com';
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

function generateSitemap() {
  // Add your site's pages here. Start with the homepage.
  const pages = [
    {
      url: BASE_URL,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    // Add other static pages if you have them:
    // { url: `${BASE_URL}/about`, lastModified: ..., changeFrequency: ..., priority: ... },
  ];

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page) => `
    <url>
      <loc>${page.url}</loc>
      <lastmod>${page.lastModified}</lastmod>
      <changefreq>${page.changeFrequency}</changefreq>
      <priority>${page.priority}</priority>
    </url>
  `
    )
    .join('')}
</urlset>
`;

  // Ensure public directory exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR);
  }

  // Write the sitemap file
  fs.writeFileSync(SITEMAP_PATH, sitemapContent.trim());
  console.log(`Generated sitemap.xml at ${SITEMAP_PATH}`);
}

generateSitemap();
