import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sanityClient } from '@/lib/sanity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RelatedPosts = ({ currentPostId, tags = [] }) => {
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      setLoading(true);
      try {
        // For simplicity, fetch latest 3 posts excluding the current one.
        // In a real scenario, you'd use tags/categories to find truly related posts.
        const query = `*[_type == "post" && _id != $currentPostId] | order(publishedAt desc) [0...3] {
          _id,
          title,
          slug,
          mainImage{
            asset->{
              _id,
              url
            }
          }
        }`;
        const result = await sanityClient.fetch(query, { currentPostId });
        setRelatedPosts(result);
      } catch (error) {
        console.error("Error fetching related posts:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentPostId) {
      fetchRelatedPosts();
    }
  }, [currentPostId, tags]); // Re-fetch if currentPostId or tags change

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Artículos Relacionados</CardTitle></CardHeader>
        <CardContent>Cargando...</CardContent>
      </Card>
    );
  }

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artículos Relacionados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {relatedPosts.map((post) => (
          <Link to={`/blog/${post.slug.current}`} key={post._id} className="flex items-center gap-3 hover:text-primary transition-colors">
            {post.mainImage && (
              <img src={post.mainImage.asset.url} alt={post.title} className="w-16 h-16 object-cover rounded-md" />
            )}
            <p className="text-sm font-medium">{post.title}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

export default RelatedPosts;
