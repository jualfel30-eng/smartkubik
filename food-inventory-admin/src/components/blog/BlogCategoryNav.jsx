import React, { useState } from 'react';
import { Search, Package, ShoppingCart, CreditCard, Truck, Users, BarChart3, Mail, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BlogCategoryNav = ({ onCategoryChange, onSearch, activeCategory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);

  const categories = [
    {
      id: 'Compras, Inventarios y Costeo',
      name: 'Compras, Inventarios y Costeo',
      icon: <Package className="w-4 h-4" />,
      color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400'
    },
    {
      id: 'Ventas y Órdenes',
      name: 'Ventas y Órdenes',
      icon: <ShoppingCart className="w-4 h-4" />,
      color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'
    },
    {
      id: 'Finanzas y Contabilidad',
      name: 'Finanzas y Contabilidad',
      icon: <CreditCard className="w-4 h-4" />,
      color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:text-purple-400'
    },
    {
      id: 'Operaciones y logística',
      name: 'Operaciones y logística',
      icon: <Truck className="w-4 h-4" />,
      color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400'
    },
    {
      id: 'CRM y posventa',
      name: 'CRM y posventa',
      icon: <Users className="w-4 h-4" />,
      color: 'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 dark:text-pink-400'
    },
    {
      id: 'Analítica y Reportes',
      name: 'Analítica y Reportes',
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-400'
    },
    {
      id: 'RRHH, Nómina y Productividad',
      name: 'RRHH, Nómina y Productividad',
      icon: <Briefcase className="w-4 h-4" />,
      color: 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 dark:text-teal-400'
    }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    console.log('Newsletter subscription:', newsletterEmail);
    toast.success('¡Suscripción exitosa!', {
      description: `Gracias por suscribirte, ${newsletterEmail}. Revisa tu bandeja de entrada.`,
    });
    setNewsletterEmail('');
    setIsNewsletterOpen(false);
  };

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Category Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              size="sm"
              onClick={() => onCategoryChange && onCategoryChange(category.id)}
              className={`${category.color} transition-all duration-200 ${
                activeCategory === category.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              {category.icon}
              <span className="ml-2 text-xs font-medium hidden sm:inline">{category.name}</span>
              <span className="ml-2 text-xs font-medium sm:hidden">
                {category.name.split(' ')[0]}
              </span>
            </Button>
          ))}

          {/* Newsletter Button with Dialog */}
          <Dialog open={isNewsletterOpen} onOpenChange={setIsNewsletterOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Mail className="w-4 h-4" />
                <span className="ml-2 text-xs font-medium">Suscríbete</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suscríbete a nuestro boletín</DialogTitle>
                <DialogDescription>
                  Recibe consejos, guías y novedades sobre gestión retail en tu correo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewsletterSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="newsletter-email">Tu email</Label>
                  <Input
                    id="newsletter-email"
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="ejemplo@smartkubik.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Suscribirse
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar artículos en el blog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 w-full"
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default BlogCategoryNav;
