import React from 'react';
import Link from 'next/link';
import { sanityFetch } from '@/sanity/lib/live'; // Using server fetch
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Note: This needs to be a server component or fetch data differently in Next.js
// Since it's imported in a server page, we can make it async and fetch data directly
// OR we can pass data to it. The local version fetches on client.
// To be strict 1:1 visually, we should fetch data. 
// Since Next.js is SSR, we can fetch here if it's a Server Component, but it might be imported inside Client Components?
// BlogPost.jsx is a client component in React, but in Next.js page.tsx is a Server Component. 
// We will make this an async Server Component.

const RelatedPosts = async ({ currentPostId, tags = [] }: { currentPostId: string, tags: any[] }) => {

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

    // We cannot use hooks here if it's a server component. 
    // If we want to strictly follow React pattern with hooks, we need 'use client'.
    // BUT user wants improved SEO and SSR. So Server Component is better.

    const { data: relatedPosts } = await sanityFetch({ query, params: { currentPostId } });

    if (!relatedPosts || relatedPosts.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Artículos Relacionados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {relatedPosts.map((post: any) => (
                    <Link href={`/posts/${post.slug.current}`} key={post._id} className="flex items-center gap-3 hover:text-primary transition-colors">
                        {post.mainImage && post.mainImage.asset && (
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
