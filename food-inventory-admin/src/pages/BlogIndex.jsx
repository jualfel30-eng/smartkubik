import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sanityClient } from '@/lib/sanity';

const BlogIndex = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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
          publishedAt
        }`;
        const result = await sanityClient.fetch(query);
        setPosts(result);
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return <div>Loading posts...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8">Blog de SmartKubik</h1>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link to={`/blog/${post.slug.current}`} key={post._id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
            {post.mainImage && (
              <img src={post.mainImage.asset.url} alt={post.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              <p className="text-sm text-gray-500">By {post.authorName}</p>
              <p className="text-sm text-gray-500">{new Date(post.publishedAt).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BlogIndex;