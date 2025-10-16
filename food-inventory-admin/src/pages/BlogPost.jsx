import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sanityClient } from '@/lib/sanity';
import { PortableText } from '@portabletext/react';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

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
          publishedAt,
          body
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

  if (loading) {
    return <div>Loading post...</div>;
  }

  if (!post) {
    return <div>Post not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <article>
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex items-center mb-8">
          {post.authorImage && (
            <img src={post.authorImage} alt={post.authorName} className="w-12 h-12 rounded-full mr-4" />
          )}
          <div>
            <p className="font-semibold">{post.authorName}</p>
            <p className="text-sm text-gray-500">{new Date(post.publishedAt).toLocaleDateString()}</p>
          </div>
        </div>
        {post.mainImage && (
          <img src={post.mainImage.asset.url} alt={post.title} className="w-full h-auto rounded-lg mb-8" />
        )}
        <div className="prose lg:prose-xl max-w-none">
          <PortableText value={post.body} />
        </div>
      </article>
    </div>
  );
};

export default BlogPost;