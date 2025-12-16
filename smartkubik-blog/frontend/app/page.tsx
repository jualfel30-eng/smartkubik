import Link from 'next/link'
import { sanityFetch } from '@/sanity/lib/live'
import imageUrlBuilder from '@sanity/image-url'
import { client } from '@/sanity/lib/client'
import BlogNavbar from '@/components/blog/BlogNavbar'
import BlogCategoryNav from '@/components/blog/BlogCategoryNav'
import BlogSidebar from '@/components/blog/BlogSidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const builder = imageUrlBuilder(client)

function urlFor(source: any) {
  return builder.image(source)
}

export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string, category?: string }> }) {
  const { search, category } = await searchParams

  // Fetch posts from Sanity - matching BlogIndex.jsx query exactly
  const query = `*[_type == "post"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    mainImage{
      asset->{
        _id,
        url
      }
    },
    "authorName": author->name,
    publishedAt,
    body,
    "categories": categories[]->{_id, title, description}
  }`

  const { data: allPosts } = await sanityFetch({ query })

  // Process posts (calculate reading time and excerpt) - matching BlogIndex.jsx logic
  const posts = allPosts.map((post: any) => {
    const text = post.body?.map((block: any) => {
      if (block._type === 'block' && block.children) {
        return block.children.map((child: any) => child.text).join('')
      }
      return ''
    }).join(' ') || '';

    const words = text.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.round(words / 200));
    const excerpt = text.substring(0, 480) + (text.length > 480 ? '...' : '');

    return { ...post, readingTime, excerpt };
  });

  // Filter posts based on search and category
  const filteredPosts = posts.filter((post: any) => {
    const matchesSearch = !search ||
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      (post.authorName && post.authorName.toLowerCase().includes(search.toLowerCase())) ||
      (post.categories && post.categories.some((cat: any) => cat.title.toLowerCase().includes(search.toLowerCase())));

    const matchesCategory = !category ||
      (post.categories && post.categories.some((cat: any) => cat._id === category || cat.title === category)); // Handle both ID and Title matches

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <BlogNavbar />
      <BlogCategoryNav />

      {/* Matching BlogIndex.jsx layout classes exactly */}
      <div className="max-w-[1600px] mx-auto py-12 mt-32 px-6 ml-6">
        <h1 className="text-4xl font-bold mb-8 text-center">Blog de SmartKubik</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
          {/* Posts Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts && filteredPosts.length > 0 ? (
              filteredPosts.map((post: any) => (
                <Card key={post._id} className="h-[500px] overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col p-0 text-left">
                  <Link href={`/posts/${post.slug.current}`} className="flex flex-col h-full w-full">
                    {post.mainImage && (
                      <img
                        src={urlFor(post.mainImage).url()}
                        alt={post.title}
                        className="w-full h-48 object-cover flex-shrink-0"
                      />
                    )}
                    <CardHeader className="pt-4 pb-3">
                      <CardTitle className="text-base font-semibold line-clamp-2 mb-2 leading-tight">{post.title}</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {post.authorName} • {new Date(post.publishedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pt-0 pb-4">
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-5">{post.excerpt}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {post.categories && post.categories.slice(0, 2).map((category: any) => (
                          <Badge key={category._id} variant="secondary" className="text-xs py-0 px-2">
                            {category.title}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-auto self-end mb-2 border border-primary text-primary rounded-none px-4"
                        asChild
                      >
                        <span className="inline-flex items-center justify-center gap-2">Seguir leyendo</span>
                      </Button>
                    </CardContent>
                  </Link>
                </Card>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground">No se encontraron posts.</p>
            )}
          </div>

          {/* Sidebar */}
          <BlogSidebar />
        </div>
      </div>
    </>
  )
}
