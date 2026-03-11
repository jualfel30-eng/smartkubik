import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Slider } from '@/components/ui/slider.jsx';
import { Search, Loader2 } from 'lucide-react';

const STRATEGIES = [
  { value: 'barcode_exact', label: 'Código de barras exacto', description: 'Confianza ~98%' },
  { value: 'sku_exact', label: 'SKU similar', description: 'Confianza ~90%' },
  { value: 'name_brand_size', label: 'Nombre + Marca + Tamaño', description: 'Confianza 70-90%' },
  { value: 'name_fuzzy', label: 'Nombre similar (fuzzy)', description: 'Confianza 50-70%' },
];

export default function ScanConfig({ onScan, loading }) {
  const [strategies, setStrategies] = useState(STRATEGIES.map((s) => s.value));
  const [minConfidence, setMinConfidence] = useState(50);

  const toggleStrategy = (value) => {
    setStrategies((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  const handleScan = () => {
    onScan({ strategies, minConfidence });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuración de Escaneo</CardTitle>
        <CardDescription>Selecciona las estrategias de detección y la confianza mínima</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Estrategias de detección</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STRATEGIES.map((s) => (
              <label
                key={s.value}
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={strategies.includes(s.value)}
                  onCheckedChange={() => toggleStrategy(s.value)}
                />
                <div>
                  <p className="text-sm font-medium leading-none">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Confianza mínima</Label>
            <span className="text-sm font-semibold">{minConfidence}%</span>
          </div>
          <Slider
            value={[minConfidence]}
            onValueChange={([v]) => setMinConfidence(v)}
            min={0}
            max={100}
            step={5}
          />
          <p className="text-xs text-muted-foreground">
            Solo se mostrarán grupos con confianza igual o superior a este valor
          </p>
        </div>

        <Button onClick={handleScan} disabled={loading || strategies.length === 0} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Escaneando...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Iniciar Escaneo
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
