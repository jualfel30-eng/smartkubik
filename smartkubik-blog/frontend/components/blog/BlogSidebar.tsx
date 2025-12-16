import React from 'react'
import Link from 'next/link'
import { Calendar, Tag, TrendingUp, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { sanityFetch } from '@/sanity/lib/live'

async function BlogSidebar() {
    // Fetch recent posts
    const postsQuery = `*[_type == "post"] | order(publishedAt desc)[0...5] {
    _id,
    title,
    slug,
    publishedAt
  }`
    const { data: topPosts } = await sanityFetch({ query: postsQuery })

    // Static categories matching BlogCategoryNav
    const categoryList = [
        { id: 'purchases-inventory', name: 'Compras e Inventario' },
        { id: 'sales-orders', name: 'Ventas y Órdenes' },
        { id: 'finance-accounting', name: 'Finanzas' },
        { id: 'operations-logistics', name: 'Operaciones' },
        { id: 'crm-postsale', name: 'CRM' },
        { id: 'analytics-reports', name: 'Analítica' }
    ]

    return (
        <aside className="space-y-6 sticky top-36 h-fit">
            {/* Newsletter Form - This will be a Client Component */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        <CardTitle>Suscríbete</CardTitle>
                    </div>
                    <CardDescription>
                        Recibe contenido exclusivo en tu correo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Usa el botón &quot;Suscríbete&quot; en la barra de categorías para unirte a nuestro boletín.
                    </p>
                </CardContent>
            </Card>

            {/* Top Posts */}
            {topPosts && topPosts.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <CardTitle>Posts Recientes</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topPosts.map((post: any) => (
                                <Link
                                    key={post._id}
                                    href={`/posts/${post.slug.current}`}
                                    className="block group"
                                >
                                    <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                                        {post.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(post.publishedAt).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Categories */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        <CardTitle>Categorías</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {categoryList.map((category) => (
                            <Link
                                key={category.id}
                                href={`/?category=${category.id}`}
                            >
                                <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                                    {category.name}
                                </Badge>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </aside>
    )
}

export default BlogSidebar
