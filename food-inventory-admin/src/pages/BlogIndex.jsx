import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { sanityClient } from '@/lib/sanity';
import { urlFor } from '@/lib/sanity'; // Assuming urlFor utility exists for image URLs

// Import blog navigation components
import BlogNavbar from '@/components/blog/BlogNavbar';
import BlogCategoryNav from '@/components/blog/BlogCategoryNav';
import BlogSidebar from '@/components/blog/BlogSidebar';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BlogIndex = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || null);
  const [filteredPosts, setFilteredPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
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
          body, // Fetch body to calculate excerpt and reading time
          "tags": tags[]->{_id, title}
        }`;
        const result = await sanityClient.fetch(query);
        const postsWithDetails = result.map(post => {
          const text = post.body.map(block => {
            if (block._type === 'block' && block.children) {
              return block.children.map(child => child.text).join('');
            }
            return '';
          }).join(' ');
          const words = text.trim().split(/\s+/).length;
          const readingTime = Math.max(1, Math.round(words / 200));
          const excerpt = text.substring(0, 250) + (text.length > 250 ? '...' : '');
          return { ...post, readingTime, excerpt };
        });
        setPosts(postsWithDetails);
        setFilteredPosts(postsWithDetails);
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    setSearchParams({ category: categoryId });
  };

  const handleSearch = (query) => {
    setSearchTerm(query);
    setSearchParams({ search: query });
  };

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    let results = posts;

    // Filter by search term
    if (searchTerm) {
      results = results.filter(post =>
        post.title.toLowerCase().includes(lowercasedSearchTerm) ||
        post.excerpt.toLowerCase().includes(lowercasedSearchTerm) ||
        post.authorName.toLowerCase().includes(lowercasedSearchTerm) ||
        post.tags.some(tag => tag.title.toLowerCase().includes(lowercasedSearchTerm))
      );
    }

    // Filter by category (if implemented in tags)
    if (activeCategory) {
      results = results.filter(post =>
        post.tags.some(tag => tag.title.toLowerCase().includes(activeCategory))
      );
    }

    setFilteredPosts(results);
  }, [searchTerm, activeCategory, posts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando posts...</p>
      </div>
    );
  }

  return (
    <>
      <BlogNavbar />
      <BlogCategoryNav
        onCategoryChange={handleCategoryChange}
        onSearch={handleSearch}
        activeCategory={activeCategory}
      />
      <div className="max-w-[1600px] mx-auto py-12 mt-32 px-6 ml-6">
        <h1 className="text-4xl font-bold mb-8 text-center">Blog de SmartKubik</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
          {/* Posts Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <Card key={post._id} className="h-[500px] overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col">
              <Link to={`/blog/${post.slug.current}`} className="flex flex-col h-full">
                {post.mainImage && (
                  <img src={urlFor(post.mainImage).url()} alt={post.title} className="w-full h-48 object-cover" />
                )}
                <CardHeader className="pt-4 pb-3">
                  <CardTitle className="text-base font-semibold line-clamp-2 mb-2">{post.title}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {post.authorName} • {new Date(post.publishedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3 flex-1">{post.excerpt}</p>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {post.tags && post.tags.slice(0, 2).map(tag => (
                      <Badge key={tag._id} variant="secondary" className="text-xs py-0 px-2">{tag.title}</Badge>
                    ))}
                  </div>
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
  );
};

export default BlogIndex;
