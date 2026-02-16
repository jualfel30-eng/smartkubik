import type { Metadata, ResolvingMetadata } from 'next'
import React, { Fragment } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PortableText, PortableTextBlock } from '@portabletext/react'
import { sanityFetch } from '@/sanity/lib/live'
import imageUrlBuilder from '@sanity/image-url'
import { client } from '@/sanity/lib/client'
import { generateHeadingId } from '@/lib/utils'

// Components
import BlogNavbar from '@/components/blog/BlogNavbar'
import BlogBreadcrumb from '@/components/blog/BlogBreadcrumb'
import TableOfContents from '@/components/blog/TableOfContents'
import ProgressBar from '@/components/blog/ProgressBar'
import CtaBox from '@/components/blog/CtaBox'
import ROICalculator from '@/components/blog/ROICalculator'
import NewsletterForm from '@/components/blog/NewsletterForm'
import AuthorBox from '@/components/blog/AuthorBox'
import RelatedPosts from '@/components/blog/RelatedPosts'
import BlogCategoryNav from '@/components/blog/BlogCategoryNav'

const builder = imageUrlBuilder(client)

function urlFor(source: any) {
  return builder.image(source)
}

type Props = {
  params: Promise<{ slug: string }>
}

// Custom PortableText components
const PortableTextComponents = {
  block: {
    h2: ({ value, children }: any) => {
      const id = generateHeadingId(value.children);
      return <h2 id={id} className="mt-8 mb-4 text-3xl font-bold tracking-tight">{children}</h2>;
    },
    h3: ({ value, children }: any) => {
      const id = generateHeadingId(value.children);
      return <h3 id={id} className="mt-6 mb-3 text-2xl font-semibold tracking-tight">{children}</h3>;
    },
    normal: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
  },
  types: {
    image: ({ value }: any) => (
      <img
        src={urlFor(value).url()}
        alt={value.alt || 'Blog Image'}
        className="my-8 rounded-lg object-cover w-full"
      />
    ),
  },
};

const categoryMapping: Record<string, string> = {
  'compras': 'purchases-inventory',
  'inventario': 'purchases-inventory',
  'costeo': 'purchases-inventory',
  'ventas': 'sales-orders',
  'órdenes': 'sales-orders',
  'finanzas': 'finance-accounting',
  'contabilidad': 'finance-accounting',
  'operaciones': 'operations-logistics',
  'logística': 'operations-logistics',
  'crm': 'crm-postsale',
  'posventa': 'crm-postsale',
  'analítica': 'analytics-reports',
  'reportes': 'analytics-reports'
};

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params

  const query = `*[_type == "post" && slug.current == $slug][0] {
    title,
    mainImage{
      asset->{
        url
      }
    },
    "authorName": author->name,
    body
  }`

  const { data: post } = await sanityFetch({
    query,
    params,
    stega: false,
  })

  const previousImages = (await parent).openGraph?.images || []
  const ogImage = post?.mainImage?.asset?.url ? post.mainImage.asset.url : null

  return {
    authors: post?.authorName ? [{ name: post.authorName }] : [],
    title: post?.title,
    description: post?.body?.[0]?.children?.[0]?.text?.substring(0, 160),
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
}

export default async function PostPage(props: Props) {
  const params = await props.params

  const query = `*[_type == "post" && slug.current == $slug][0] {
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
    "authorImage": author->image,
    "authorBio": author->bio,
    publishedAt,
    body,
    "tags": tags[]->{_id, title}
  }`

  const { data: post } = await sanityFetch({ query, params })

  if (!post?._id) {
    return notFound()
  }

  // Calculate reading time
  const readingTime = (() => {
    if (!post || !post.body) return 0;
    const text = post.body.map((block: any) => {
      if (block._type === 'block' && block.children) {
        return block.children.map((child: any) => child.text).join('');
      }
      return '';
    }).join(' ');
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  })();

  // Determine category
  const postCategory = (() => {
    if (!post || !post.tags || post.tags.length === 0) return null;

    for (const tag of post.tags) {
      const tagLower = tag.title.toLowerCase();
      for (const [keyword, category] of Object.entries(categoryMapping)) {
        if (tagLower.includes(keyword)) {
          return category;
        }
      }
    }
    return null;
  })();

  const primaryTag = post?.tags?.[0]?.title || null;

  // Filter out AI Metadata blocks (Range Filtering)
  let isAiMetadata = false;
  const filteredBody = post.body?.filter((block: any) => {
    if (block._type === 'block' && block.children) {
      const text = block.children.map((child: any) => child.text).join('').toUpperCase();

      // Start of metadata block
      if (text.includes('AI METADATA') && !text.includes('END AI METADATA')) {
        console.log('Filtering AI Metadata Start:', text);
        isAiMetadata = true;
        return false;
      }

      // End of metadata block
      if (text.includes('END AI METADATA')) {
        console.log('Filtering AI Metadata End:', text);
        isAiMetadata = false;
        return false;
      }
    }

    // If we are currently inside an AI metadata block, filter it out
    if (isAiMetadata) {
      // Optional: Log hidden content? Too verbose.
      return false;
    }
    return true;
  }) || [];

  // CTA positioning logic
  const cta25Percent = filteredBody.length > 4;
  const cta50Percent = filteredBody.length > 8;

  return (
    <>
      <BlogNavbar />
      {/* BlogCategoryNav is client-side only - removed for now as it handles state/nav which is global
          Actually, BlogPost.jsx includes it. We should include it too.
          But it manages URL state. In Next.js, that's done via router/params.
          We will include it but we need to check if it parses params correctly. 
          Assuming BlogCategoryNav is ported correctly.
      */}
      {/* <BlogCategoryNav ... /> We can add this if we make it work, but for strict replication let's focus on the content first
          Actually the original has:
          <BlogCategoryNav
            onCategoryChange={handleCategoryChange}
            onSearch={handleSearch}
            activeCategory={activeCategory}
          />
          This is complex to replicate 1:1 because of the state lifting.
          However, for the post page, it might just be the nav bar.
          Let's verify BlogCategoryNav implementation later.
      */}

      <ProgressBar />
      <div className="container py-8 mt-32">
        <BlogBreadcrumb
          category={postCategory}
          tag={primaryTag}
          postTitle={post.title}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[375px_1fr_300px] gap-8 mt-6">
          {/* Left Sidebar / Table of Contents */}
          <aside className="hidden lg:block sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
            <TableOfContents content={filteredBody} />
          </aside>

          {/* Main Content Area */}
          <article className="col-span-1 lg:col-span-1">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{post.title}</h1>
              <div className="flex items-center gap-4 mb-6">
                {post.authorImage && (
                  <img
                    src={urlFor(post.authorImage).width(60).height(60).url()}
                    alt={post.authorName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-lg">{post.authorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString()} • {readingTime} min de lectura
                  </p>
                </div>
              </div>
              {post.mainImage && (
                <img src={urlFor(post.mainImage).url()} alt={post.title} className="w-full h-auto max-h-[400px] object-cover rounded-lg mb-8" />
              )}
            </div>

            <div className="prose dark:prose-invert max-w-none">
              {filteredBody.map((block: any, index: number) => (
                <Fragment key={block._key || index}>
                  <PortableText value={[block]} components={PortableTextComponents} />
                  {/* In-line CTAs */}
                  {cta25Percent && index === Math.floor(filteredBody.length * 0.25) && (
                    <div className="my-8">
                      <CtaBox
                        title="Checklist: Organiza tu inventario en 30 días"
                        description="Descarga gratis nuestra checklist para auditar, clasificar y reordenar tus SKUs como un profesional."
                        buttonText="Descargar ahora"
                        href="#"
                      />
                    </div>
                  )}
                  {cta50Percent && index === Math.floor(filteredBody.length * 0.5) && (
                    <div className="my-8">
                      <CtaBox
                        title="Mira Smartkubik en acción"
                        description="Explora el módulo de inventario con un recorrido de 3 minutos y descubre cómo automatizar tu reposición."
                        buttonText="Ver demo"
                        href="#"
                      />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>

            {/* Final CTA */}
            <div className="my-12">
              <CtaBox
                title="Agenda tu demo de Smartkubik"
                description="¿Listo para dejar de apagar incendios? Programa una demo personalizada o empieza tu prueba de 14 días."
                buttonText="Solicitar demo"
                href="#"
              />
            </div>

            {/* Author Box */}
            <div className="my-12">
              <AuthorBox
                authorName={post.authorName}
                authorImage={post.authorImage ? urlFor(post.authorImage).url() : ''}
                authorBio={post.authorBio}
              />
            </div>
          </article>

          {/* Right Sidebar */}
          <aside className="col-span-1 lg:col-span-1 space-y-8 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
            <NewsletterForm />
            <ROICalculator />
            <RelatedPosts currentPostId={post._id} tags={post.tags} />
          </aside>
        </div>
      </div>
    </>
  )
}
