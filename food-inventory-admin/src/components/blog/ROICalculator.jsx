import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ROICalculator = () => {
  const [capital, setCapital] = useState('');
  const [merma, setMerma] = useState('');
  const [ahorro, setAhorro] = useState(null);

  const calcular = () => {
    const cap = parseFloat(capital);
    const m = parseFloat(merma);
    if (!isNaN(cap) && !isNaN(m) && cap >= 0 && m >= 0) {
      // Suponemos que se puede reducir un 25% de la merma actual
      const ahorroProyectado = cap * (m / 100) * 0.25;
      setAhorro(ahorroProyectado.toFixed(2));
    } else {
      setAhorro(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora de Ahorro de Inventario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="capital">Capital inmovilizado (USD)</Label>
          <Input
            id="capital"
            type="number"
            value={capital}
            onChange={e => setCapital(e.target.value)}
            placeholder="Ej. 50000"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="merma">Merma actual (%)</Label>
          <Input
            id="merma"
            type="number"
            value={merma}
            onChange={e => setMerma(e.target.value)}
            placeholder="Ej. 5"
            min="0"
            max="100"
          />
        </div>
        <Button onClick={calcular} className="w-full">Calcular Ahorro</Button>
        {ahorro !== null && (
          <p className="text-center text-lg font-semibold">
            Podrías ahorrar aproximadamente <span className="text-primary">${ahorro}</span> al año.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ROICalculator;
