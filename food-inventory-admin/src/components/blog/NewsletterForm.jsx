import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/api';

const NewsletterForm = ({ source = 'blog_post' }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al suscribirse');
      }
      toast.success('¡Suscripción exitosa!', {
        description: data.message,
      });
      setEmail('');
    } catch (err) {
      toast.error(err.message || 'Error al suscribirse. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suscríbete a nuestro boletín</CardTitle>
        <CardDescription>Recibe consejos, guías y novedades sobre gestión retail en tu correo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Tu email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@smartkubik.com"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Suscribiendo...' : 'Suscribirse'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewsletterForm;
