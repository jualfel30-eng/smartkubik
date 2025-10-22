import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, TrendingUp, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sanityClient } from '@/lib/sanity';

const BlogSidebar = () => {
  const [email, setEmail] = useState('');
  const [topPosts, setTopPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [archive, setArchive] = useState([]);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        // Fetch top posts (most recent)
        const postsQuery = `*[_type == "post"] | order(publishedAt desc)[0...5] {
          _id,
          title,
          slug,
          publishedAt
        }`;
        const posts = await sanityClient.fetch(postsQuery);
        setTopPosts(posts);

        // Fetch all tags
        const tagsQuery = `*[_type == "tag"] | order(title asc) {
          _id,
          title
        }`;
        const allTags = await sanityClient.fetch(tagsQuery);
        setTags(allTags);

        // Create archive by month/year
        if (posts.length > 0) {
          const archiveMap = {};
          posts.forEach(post => {
            const date = new Date(post.publishedAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });

            if (!archiveMap[key]) {
              archiveMap[key] = { key, label, count: 0 };
            }
            archiveMap[key].count++;
          });
          setArchive(Object.values(archiveMap));
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      }
    };

    fetchSidebarData();
  }, []);

  // Define categories manually (matching BlogCategoryNav)
  const categoryList = [
    { id: 'purchases-inventory', name: 'Compras e Inventario' },
    { id: 'sales-orders', name: 'Ventas y Órdenes' },
    { id: 'finance-accounting', name: 'Finanzas' },
    { id: 'operations-logistics', name: 'Operaciones' },
    { id: 'crm-postsale', name: 'CRM' },
    { id: 'analytics-reports', name: 'Analítica' }
  ];

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    console.log('Newsletter subscription:', email);
    toast.success('¡Suscripción exitosa!', {
      description: `Gracias por suscribirte, ${email}. Revisa tu bandeja de entrada.`,
    });
    setEmail('');
  };

  return (
    <aside className="space-y-6 sticky top-36 h-fit">
      {/* Newsletter Form */}
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
          <form onSubmit={handleNewsletterSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sidebar-email" className="sr-only">Email</Label>
              <Input
                id="sidebar-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Suscribirse
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Top Posts */}
      {topPosts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>Posts Recientes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPosts.map((post) => (
                <Link
                  key={post._id}
                  to={`/blog/${post.slug.current}`}
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
                to={`/blog?category=${category.id}`}
              >
                <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                  {category.name}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      {tags.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              <CardTitle>Etiquetas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 15).map((tag) => (
                <Link
                  key={tag._id}
                  to={`/blog?search=${encodeURIComponent(tag.title)}`}
                >
                  <Badge variant="outline" className="hover:bg-secondary transition-colors">
                    {tag.title}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archive */}
      {archive.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle>Archivo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {archive.map((item) => (
                <Link
                  key={item.key}
                  to={`/blog?archive=${item.key}`}
                  className="flex items-center justify-between text-sm hover:text-primary transition-colors"
                >
                  <span className="capitalize">{item.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {item.count}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </aside>
  );
};

export default BlogSidebar;
