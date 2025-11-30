
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useVenezuela } from '@/hooks/useVenezuela.js';
import { Mail, MessageSquare } from "lucide-react";

const businessVerticals = [
  {
    name: 'Servicios de Comida',
    value: 'FOOD_SERVICE',
    categories: ['Restaurante', 'Cafetería', 'Food Truck', 'Catering', 'Bar'],
  },
  {
    name: 'Minoristas / Distribución',
    value: 'RETAIL',
    categories: [
      'Supermercado',
      'Tienda de Abarrotes',
      'Distribuidor Mayorista',
      'Mercado de Agricultores',
      'Moda',
      'Calzado',
      'Juguetes',
      'Herramientas',
      'Deporte',
      'Tecnología',
    ],
  },
  {
    name: 'Servicios',
    value: 'SERVICES',
    categories: ['Hotel', 'Hospital', 'Escuela', 'Oficina Corporativa'],
  },
  {
    name: 'Logística',
    value: 'LOGISTICS',
    categories: ['Almacén', 'Centro de Distribución', 'Transporte Refrigerado'],
  },
  {
    name: 'Mixta (Multi-vertical)',
    value: 'HYBRID',
    categories: [
      'Hotel con Restaurante',
      'Hotel con Tienda Boutique',
      'Restaurante + Tienda',
      'Resort Todo Incluido',
      'Centro Comercial Gastronómico',
    ],
  },
];

function SalesContactModal({ isOpen, onOpenChange }) {
  const [activeTab, setActiveTab] = useState('email');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    state: '',
    city: '',
    vertical: '',
    specificCategory: '',
    message: '',
  });
  const [categories, setCategories] = useState([]);
  const { states, cities, loading: venezuelaLoading, error: venezuelaError, getCitiesByState } = useVenezuela();

  useEffect(() => {
    if (formData.vertical) {
      const vertical = businessVerticals.find((v) => v.value === formData.vertical);
      setCategories(vertical ? vertical.categories : []);
    }
  }, [formData.vertical]);

  const handleWhatsAppClick = useCallback(() => {
    window.open('https://wa.me/584244263922', '_blank');
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (formData.state) {
      getCitiesByState(formData.state);
    }
  }, [formData.state, getCitiesByState]);

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      handleWhatsAppClick();
    }
  }, [activeTab, handleWhatsAppClick]);

  const handleSendEmail = (e) => {
    e.preventDefault();
    // Here you would typically handle the email sending logic
    console.log('Email data:', formData);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  }

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  const handleStateChange = (value) => {
    setFormData((prev) => ({ ...prev, state: value, city: '' }));
  };

  const handleCityChange = (value) => {
    setFormData((prev) => ({ ...prev, city: value }));
  };

  const handleVerticalChange = (value) => {
    setFormData((prev) => ({ ...prev, vertical: value, specificCategory: '' }));
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({ ...prev, specificCategory: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1190px] min-h-[700px] overflow-y-auto px-32 py-24">
        <DialogHeader>
          <DialogTitle>Contactar con el equipo de ventas</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="email" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" />Enviar un correo</TabsTrigger>
            <TabsTrigger value="whatsapp" onClick={handleWhatsAppClick}><MessageSquare className="mr-2 h-4 w-4" />Contactar por Whatsapp</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <form onSubmit={handleSendEmail} className="mt-16">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Nombre de la empresa</Label>
                    <Input id="companyName" value={formData.companyName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Celular</Label>
                    <PhoneInput
                      id="phone"
                      placeholder="4122346587"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      defaultCountry="VE"
                      required
                    />
                  </div>
                </div>
                {venezuelaError && <p className="text-sm text-red-400 col-span-2">Error: {venezuelaError}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select onValueChange={handleStateChange} value={formData.state}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.name} value={state.name}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Select onValueChange={handleCityChange} value={formData.city} disabled={!formData.state || venezuelaLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una ciudad" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vertical">Tipo de negocio</Label>
                    <Select onValueChange={handleVerticalChange} value={formData.vertical}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una vertical" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessVerticals.map((vertical) => (
                          <SelectItem key={vertical.value} value={vertical.value}>
                            {vertical.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.vertical && (
                    <div className="grid gap-2">
                      <Label htmlFor="specificCategory">Categoría</Label>
                      <Select onValueChange={handleCategoryChange} value={formData.specificCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea id="message" value={formData.message} onChange={handleChange} required style={{ height: '140px' }} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Enviar Correo</Button>
                </div>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="whatsapp">
            <div className="mt-16">
              <p>Redirigiendo a WhatsApp...</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SalesContactModal;
