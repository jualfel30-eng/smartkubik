import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const NewsletterForm = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the email to your CRM or email service
    console.log('Subscribing email:', email);
    toast.success('¡Suscripción exitosa!', {
      description: `Gracias por suscribirte, ${email}. Revisa tu bandeja de entrada.`,
    });
    setEmail('');
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
            />
          </div>
          <Button type="submit" className="w-full">Suscribirse</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewsletterForm;
