# Sanity CMS Architecture & Best Practices

Sanity (v3) provides the decoupled backend database and editorial interface. Follow these principles when editing the schemas in `/studio/schemas/` or interacting with Portable Text.

## 1. Schema Design Principles

### Modular Document Types
When adding new types of content (e.g., Services, Testimonials), create a new schema file and register it inside `/studio/schemas/index.js`. 
- **Naming Conventions**: Use singular nouns for schema names (`post`, not `posts`).
- **Validation**: Strict validation rules save the frontend from fatal errors. If an Astro component relies on a title and slug, define them as `.required()` in the schema.

```javascript
defineField({
  name: 'slug',
  title: 'Slug',
  type: 'slug',
  options: { source: 'title', maxLength: 96 },
  validation: (Rule) => Rule.required(), // Prevents null routing errors
})
```

## 2. Portable Text & Rich Content

The body of blog posts relies on Sanity's `.blockContent.js`. This creates PortableText (JSON array representation of rich text).
- **Frontend Mapping**: When rendering PortableText in Astro, use `@portabletext/react` (or the equivalent Svelte/Solid/Astro renderer) and pass a mapping object for custom blocks.
- **Images in Rich Text**: When defining custom blocks, always ensure images include fields for `alt` text. The frontend cannot pass accessibility audits if authors skip image descriptions.

## 3. Managing Images & Crop Hotspots

Sanity handles image CDNs incredibly efficiently.
- Enable `options: { hotspot: true }` in all image schemas. This allows editors to select the focal point of an image.
- **Frontend consumption**: Utilize the `@sanity/image-url` builder on the Astro frontend to respect those hotspot coordinates while applying compression formatting (e.g. `builder.image(source).auto('format').fit('crop')`).

## 4. Development Workflow (Local Studio)

- Ensure you run `cd studio && pnpm run dev` to start the local Sanity workspace. It operates independently of the Astro server.
- The Studio points to the dataset defined in your `.env` (usually `production` or `development`). If you are making breaking schema changes, branch out to a `development` dataset using the Sanity CLI before launching them directly into the live production editor.

## 5. Security & Role Management

By default, data in Sanity's production dataset API might be publicly readable if configured that way.
- **Never store highly sensitive API keys (Stripe, external auth tokens) inside public schemas.** Use Sanity Secrets or environment variables in Astro server endpoints if needed.
- If content editors need custom dashboard access, do not invite them to Vercel. Only invite them to the deployed Sanity Studio interface.
