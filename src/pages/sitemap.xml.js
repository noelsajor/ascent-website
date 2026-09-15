import { getAllPosts } from '../lib/sanity';

const site = 'https://ascentmgnt.com';

// Escapes a value for safe interpolation into XML text content. Defense in
// depth alongside the slug schema validation — CMS-controlled slugs could
// otherwise inject XML-significant characters into the sitemap.
function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function GET() {
    const posts = await getAllPosts().catch(() => []);

    const staticPages = [
        '',
        '/about',
        '/work',
        '/packages',
        '/product',
        '/contact',
        '/privacy',
        '/blog'
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticPages.map(page => `
        <url>
          <loc>${site}${page}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>${page === '' ? '1.0' : '0.8'}</priority>
        </url>
      `).join('')}
      ${posts.map(post => `
        <url>
          <loc>${site}/blog/${escapeXml(encodeURIComponent(post.slug.current))}</loc>
          <lastmod>${new Date(post.publishedAt || Date.now()).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>
      `).join('')}
    </urlset>`.replace(/>\s+</g, '><').trim();

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml'
        }
    });
}
