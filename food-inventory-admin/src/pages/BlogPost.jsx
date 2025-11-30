import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sanityClient } from '@/lib/sanity';
import { PortableText } from '@portabletext/react';
import { urlFor } from '@/lib/sanity'; // Assuming urlFor utility exists for image URLs

import { generateHeadingId } from '@/lib/utils';

// Import new blog components
import BlogNavbar from '@/components/blog/BlogNavbar';
import BlogCategoryNav from '@/components/blog/BlogCategoryNav';
import BlogBreadcrumb from '@/components/blog/BlogBreadcrumb';
import TableOfContents from '@/components/blog/TableOfContents';
import ProgressBar from '@/components/blog/ProgressBar';
import CtaBox from '@/components/blog/CtaBox';
import ROICalculator from '@/components/blog/ROICalculator';
import NewsletterForm from '@/components/blog/NewsletterForm';
import AuthorBox from '@/components/blog/AuthorBox';
import RelatedPosts from '@/components/blog/RelatedPosts';

// Custom PortableText components to add IDs to headings
const PortableTextComponents = {
  block: {
    h2: ({ value, children }) => {
      const id = generateHeadingId(value);
      return <h2 id={id} className="mt-8 mb-4 text-3xl font-bold tracking-tight">{children}</h2>;
    },
    h3: ({ value, children }) => {
      const id = generateHeadingId(value);
      return <h3 id={id} className="mt-6 mb-3 text-2xl font-semibold tracking-tight">{children}</h3>;
    },
    normal: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
  },
  // Add other custom components for images, lists, etc., if needed
  types: {
    image: ({ value }) => (
      <img
        src={urlFor(value).url()}
        alt={value.alt || 'Blog Image'}
        className="my-8 rounded-lg object-cover w-full"
      />
    ),
  },
};

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const contentRef = useRef(null); // Ref for the main content area to calculate reading time

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    // Navigate to blog index with category filter
    navigate(`/blog?category=${categoryId}`);
  };

  const handleSearch = (query) => {
    // Navigate to blog index with search query
    navigate(`/blog?search=${query}`);
  };

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
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
          "authorImage": author->image.asset->url,
          "authorBio": author->bio, // Fetch author bio
          publishedAt,
          body,
          "tags": tags[]->{_id, title} // Fetch tags for related posts
        }`;
        const result = await sanityClient.fetch(query, { slug });
        setPost(result);
      } catch (error) {
        console.error("Error fetching blog post:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  // Calculate reading time
  const readingTime = React.useMemo(() => {
    if (!post || !post.body) return 0;
    const text = post.body.map(block => {
      if (block._type === 'block' && block.children) {
        return block.children.map(child => child.text).join('');
      }
      return '';
    }).join(' ');
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200)); // Average reading speed: 200 words per minute
  }, [post]);

  // Determine category and primary tag from post tags
  const categoryMapping = React.useMemo(() => ({
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
  }), []);

  const postCategory = React.useMemo(() => {
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
  }, [post, categoryMapping]);

  const primaryTag = post?.tags?.[0]?.title || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Post no encontrado.</p>
      </div>
    );
  }

  // Determine CTA positions (simplified for now, can be made dynamic based on content length)
  const cta25Percent = post.body.length > 4; // If more than 4 blocks, show first CTA
  const cta50Percent = post.body.length > 8; // If more than 8 blocks, show second CTA

  return (
    <>
      <BlogNavbar />
      <BlogCategoryNav
        onCategoryChange={handleCategoryChange}
        onSearch={handleSearch}
        activeCategory={activeCategory}
      />
      <ProgressBar />
      <div className="container py-8 mt-32">
        {/* Breadcrumb Navigation */}
        <BlogBreadcrumb
          category={postCategory}
          tag={primaryTag}
          postTitle={post.title}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[375px_1fr_300px] gap-8 mt-6">
          {/* Left Sidebar / Table of Contents */}
          <aside className="hidden lg:block sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
            <TableOfContents content={post.body} />
          </aside>

        {/* Main Content Area */}
        <article className="col-span-1 lg:col-span-1" ref={contentRef}>
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{post.title}</h1>
            <div className="flex items-center gap-4 mb-6">
              {post.authorImage && (
                <img src={urlFor(post.authorImage).width(60).height(60).url()} alt={post.authorName} className="w-12 h-12 rounded-full object-cover" />
              )}
              <div>
                <p className="font-semibold text-lg">{post.authorName}</p>
                <p className="text-sm text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString()} • {readingTime} min de lectura</p>
              </div>
            </div>
            {post.mainImage && (
              <img src={urlFor(post.mainImage).url()} alt={post.title} className="w-full h-auto max-h-[400px] object-cover rounded-lg mb-8" />
            )}
          </div>

          <div className="prose dark:prose-invert max-w-none">
            {post.body.map((block, index) => (
              <React.Fragment key={block._key || index}>
                <PortableText value={[block]} components={PortableTextComponents} />
                {/* In-line CTAs */}
                {cta25Percent && index === Math.floor(post.body.length * 0.25) && (
                  <div className="my-8">
                    <CtaBox
                      title="Checklist: Organiza tu inventario en 30 días"
                      description="Descarga gratis nuestra checklist para auditar, clasificar y reordenar tus SKUs como un profesional."
                      buttonText="Descargar ahora"
                      href="#"
                    />
                  </div>
                )}
                {cta50Percent && index === Math.floor(post.body.length * 0.5) && (
                  <div className="my-8">
                    <CtaBox
                      title="Mira Smartkubik en acción"
                      description="Explora el módulo de inventario con un recorrido de 3 minutos y descubre cómo automatizar tu reposición."
                      buttonText="Ver demo"
                      href="#"
                    />
                  </div>
                )}
              </React.Fragment>
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
              authorImage={post.authorImage ? urlFor(post.authorImage).url() : null}
              authorBio={post.authorBio}
            />
          </div>

          {/* FAQ Section (if available in post.body, needs custom PortableText rendering or separate data) */}
          {/* For now, assuming FAQ is part of the body and PortableTextComponents handles it */}
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
  );
};

export default BlogPost;
