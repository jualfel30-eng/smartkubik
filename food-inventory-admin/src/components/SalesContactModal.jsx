
import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
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
import { useToast } from "@/hooks/use-toast";

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

function SalesContactModal({ isOpen, onOpenChange, contactType = "sales" }) {
  const [activeTab, setActiveTab] = useState('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const { toast } = useToast();

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetchApi('/public/contact', {
        method: 'POST',
        isPublic: true,
        body: JSON.stringify({
          ...formData,
          type: contactType
        })
      });

      toast({
        title: contactType === 'sales' ? "Solicitud Recibida" : "Mensaje Enviado",
        description: contactType === 'sales'
          ? "Un especialista de ventas te contactará pronto para tu demo."
          : "Gracias por escribirnos. Te responderemos a la brevedad.",
        className: "bg-emerald-500 text-white border-none",
      });

      onOpenChange(false);
      // Reset form (optional, but good UX)
      setFormData({
        name: '', email: '', phone: '', companyName: '',
        state: '', city: '', vertical: '', specificCategory: '', message: ''
      });
    } catch (error) {
      console.error('Failed to send contact email:', error);
      toast({
        title: "Error al enviar",
        description: "Hubo un problema al enviar tu mensaje. Por favor intenta por WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
      <DialogContent className="sm:max-w-[1190px] min-h-[700px] overflow-y-auto px-32 py-24 bg-[#0A0F1C] border border-white/10 text-slate-200 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-display font-bold text-white mb-2">
            {contactType === 'sales' ? 'Agendar Demo Personalizada' : 'Contáctanos'}
          </DialogTitle>
          <p className="text-gray-400">
            {contactType === 'sales'
              ? 'Completa tus datos y un experto te mostrará cómo SmartKubik transforma tu negocio.'
              : 'Déjanos tu mensaje y te responderemos lo antes posible.'}
          </p>
        </DialogHeader>
        <Tabs defaultValue="email" className="w-full mt-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/5">
            <TabsTrigger value="email" className="data-[state=active]:bg-[#06B6D4]/20 data-[state=active]:text-cyan-400 text-gray-400"><Mail className="mr-2 h-4 w-4" />Enviar un correo</TabsTrigger>
            <TabsTrigger value="whatsapp" onClick={handleWhatsAppClick} className="data-[state=active]:bg-[#25D366]/20 data-[state=active]:text-[#25D366] text-gray-400 hover:text-[#25D366]"><MessageSquare className="mr-2 h-4 w-4" />Contactar por Whatsapp</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <form onSubmit={handleSendEmail} className="mt-12 space-y-6">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-gray-400">Nombre</Label>
                    <Input id="name" value={formData.name} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="companyName" className="text-gray-400">Nombre de la empresa</Label>
                    <Input id="companyName" value={formData.companyName} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-gray-400">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-gray-400">Celular</Label>
                    <div className="phone-input-dark">
                      <PhoneInput
                        id="phone"
                        placeholder="4122346587"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        defaultCountry="VE"
                        required
                        className="bg-white/5 border border-white/10 rounded-md text-white px-3 py-2 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20"
                      />
                    </div>
                    {/* Inline style hack for phone input text color if needed, but class above should help container */}
                    <style>{`
                        .phone-input-dark .PhoneInputInput {
                            background: transparent;
                            color: white;
                            border: none;
                            outline: none;
                        }
                        .phone-input-dark .PhoneInputCountrySelect {
                            background: #0A0F1C;
                            color: white;
                        }
                    `}</style>
                  </div>
                </div>
                {venezuelaError && <p className="text-sm text-red-400 col-span-2">Error: {venezuelaError}</p>}
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="state" className="text-gray-400">Estado</Label>
                    <Select onValueChange={handleStateChange} value={formData.state}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0F1C] border border-white/10 text-white">
                        {states.map((state) => (
                          <SelectItem key={state.name} value={state.name} className="focus:bg-white/10 focus:text-cyan-400">
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city" className="text-gray-400">Ciudad</Label>
                    <Select onValueChange={handleCityChange} value={formData.city} disabled={!formData.state || venezuelaLoading}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white disabled:opacity-50">
                        <SelectValue placeholder="Seleccione una ciudad" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0F1C] border border-white/10 text-white">
                        {cities.map((city) => (
                          <SelectItem key={city} value={city} className="focus:bg-white/10 focus:text-cyan-400">
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="vertical" className="text-gray-400">Tipo de negocio</Label>
                    <Select onValueChange={handleVerticalChange} value={formData.vertical}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Seleccione una vertical" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0F1C] border border-white/10 text-white">
                        {businessVerticals.map((vertical) => (
                          <SelectItem key={vertical.value} value={vertical.value} className="focus:bg-white/10 focus:text-cyan-400">
                            {vertical.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.vertical && (
                    <div className="grid gap-2">
                      <Label htmlFor="specificCategory" className="text-gray-400">Categoría</Label>
                      <Select onValueChange={handleCategoryChange} value={formData.specificCategory}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Seleccione una categoría" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A0F1C] border border-white/10 text-white">
                          {categories.map((category) => (
                            <SelectItem key={category} value={category} className="focus:bg-white/10 focus:text-cyan-400">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message" className="text-gray-400">Mensaje</Label>
                  <Textarea id="message" value={formData.message} onChange={handleChange} required className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 min-h-[140px]" />
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold px-8 py-6 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isSubmitting ? 'Enviando...' : (contactType === 'sales' ? 'Solicitar Demo' : 'Enviar Mensaje')}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="whatsapp">
            <div className="mt-16 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-[#25D366]/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <MessageSquare className="w-8 h-8 text-[#25D366]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Redirigiendo a WhatsApp...</h3>
              <p className="text-gray-400">Si no se abre automáticamente, haz clic en el botón flotante.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SalesContactModal;
