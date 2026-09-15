export default {
    name: 'post',
    title: 'Post',
    type: 'document',
    fields: [
        {
            name: 'title',
            title: 'Title',
            type: 'string',
        },
        {
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: {
                source: 'title',
                maxLength: 96,
            },
            validation: (Rule) =>
                Rule.required().custom((slug) => {
                    if (!slug || !slug.current) return 'Slug is required';
                    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.current)
                        ? true
                        : 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. "my-post-title") — no spaces or special characters.';
                }),
        },
        {
            name: 'author',
            title: 'Author',
            type: 'reference',
            to: { type: 'author' },
        },
        {
            name: 'mainImage',
            title: 'Main image',
            type: 'image',
            options: { hotspot: true },
            fields: [
              {
                name: 'alt',
                title: 'Alt text',
                type: 'string',
                description: 'Describe the image for accessibility and SEO.',
                validation: (Rule) => Rule.required().min(8).warning('Alt text should be descriptive.'),
              },
                {
                  name: 'caption',
                  title: 'Caption',
                  type: 'string',
                },
                {
                  name: 'credit',
                  title: 'Image credit',
                  type: 'string',
                },
          ],
          validation: (Rule) => Rule.required(),
        },
        {
            name: 'categories',
            title: 'Categories',
            type: 'array',
            of: [{ type: 'reference', to: { type: 'category' } }],
        },
        {
            name: 'publishedAt',
            title: 'Published at',
            type: 'datetime',
        },
        {
            name: 'excerpt',
            title: 'Excerpt',
            type: 'text',
            rows: 3,
        },
        {
            name: 'body',
            title: 'Body',
            type: 'blockContent',
        },
    ],

    preview: {
        select: {
            title: 'title',
            author: 'author.name',
            media: 'mainImage',
        },
        prepare(selection) {
            const { author } = selection
            return Object.assign({}, selection, {
                subtitle: author && `by ${author}`,
            })
        },
    },
}
