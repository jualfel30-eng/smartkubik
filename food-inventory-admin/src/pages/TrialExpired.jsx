import { Link } from 'react-router-dom';
import { Lock, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import smartkubikLogo from '@/assets/logo-smartkubik.png';

export default function TrialExpired() {
  const whatsappUrl =
    'https://wa.me/584124000000?text=Hola%2C%20mi%20prueba%20de%20SmartKubik%20terminó%20y%20quiero%20saber%20más';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 px-4 py-10">
      <img src={smartkubikLogo} alt="SmartKubik" className="h-12 w-auto mb-8" />
      <Card className="w-full max-w-lg shadow-lg border border-muted-foreground/10">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">
              Tu prueba terminó, pero tus datos están seguros
            </h1>
            <p className="text-muted-foreground text-sm">
              Tu período de prueba gratuita de 14 días ha finalizado. No te preocupes
              — toda tu información está guardada. Cuando actives un plan, todo
              estará exactamente como lo dejaste.
            </p>
          </div>

          <div className="space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link to="/fundadores">
                Unirme como Cliente Fundador — Hasta 51% OFF
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Hablar con nosotros por WhatsApp
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ¿Necesitas más tiempo? Escríbenos por WhatsApp y evaluamos extender tu prueba.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
