import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../hooks/use-auth';
import { fetchApi } from '../lib/api';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';

const businessVerticals = [
  {
    name: 'Servicios de Comida',
    value: 'FOOD_SERVICE',
    categories: ['Restaurante', 'Cafetería', 'Food Truck', 'Catering', 'Bar'],
  },
  {
    name: 'Minoristas / Distribución',
    value: 'RETAIL',
    categories: ['Supermercado', 'Tienda de Abarrotes', 'Distribuidor Mayorista', 'Mercado de Agricultores', 'Moda', 'Calzado', 'Juguetes', 'Herramientas', 'Deporte', 'Tecnología'],
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
];

// Step 1 Component
const Step1Form = ({ formData, setFormData, onNext }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (formData.vertical) {
      const vertical = businessVerticals.find(v => v.value === formData.vertical);
      if (vertical) {
        setCategories(vertical.categories);
      } else {
        setCategories([]);
      }
    }
  }, [formData.vertical]);

  const handleVerticalChange = (value) => {
    setFormData(prev => ({ ...prev, vertical: value, specificCategory: '' }));
  };

  const handleCategoryChange = (value) => {
    setFormData(prev => ({ ...prev, specificCategory: value }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Nombre del Negocio</Label>
        <Input
          id="businessName"
          placeholder="Ej: Restaurante El Buen Sabor"
          value={formData.businessName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Vertical de Negocio</Label>
        <Select onValueChange={handleVerticalChange} value={formData.vertical}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione una vertical" />
          </SelectTrigger>
          <SelectContent>
            {businessVerticals.map(v => (
              <SelectItem key={v.value} value={v.value}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {formData.vertical && (
        <div className="space-y-2">
          <Label>Categoría Específica</Label>
          <Select onValueChange={handleCategoryChange} value={formData.specificCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="numberOfUsers">Número de Usuarios</Label>
        <Input
          id="numberOfUsers"
          type="number"
          placeholder="Ej: 5"
          value={formData.numberOfUsers}
          onChange={handleChange}
          required
        />
      </div>
      <Button type="submit" className="w-full">Siguiente</Button>
    </form>
  );
};

// Step 2 Component
const Step2Form = ({ formData, setFormData, onNext, onBack }) => {
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({ ...prev, phone: value }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <PhoneInput
          id="phone"
          placeholder="4122346587"
          value={formData.phone}
          onChange={handlePhoneChange}
          defaultCountry="VE"
          required
          className="input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" value={formData.password} onChange={handleChange} required />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>Atrás</Button>
        <Button type="submit">Siguiente</Button>
      </div>
    </form>
  );
};

// Step 3 Component
const Step3Summary = ({ formData, onBack, onSubmit, loading, error }) => {
  const verticalName = businessVerticals.find(v => v.value === formData.vertical)?.name || formData.vertical;

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Resumen de Registro</h3>
      <div className="space-y-2 rounded-md border p-4">
        <p><strong>Negocio:</strong> {formData.businessName}</p>
        <p><strong>Vertical:</strong> {verticalName}</p>
        <p><strong>Categoría:</strong> {formData.specificCategory}</p>
        <p><strong>Usuarios:</strong> {formData.numberOfUsers}</p>
        <p><strong>Administrador:</strong> {formData.firstName} {formData.lastName}</p>
        <p><strong>Email:</strong> {formData.email}</p>
        <p><strong>Teléfono:</strong> {formData.phone}</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={loading}>Atrás</Button>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? 'Registrando...' : 'Confirmar y Registrar'}
        </Button>
      </div>
    </div>
  );
};

function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    numberOfUsers: '',
    vertical: '',
    specificCategory: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  
  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      businessType: formData.specificCategory,
      numberOfUsers: parseInt(formData.numberOfUsers, 10),
    };

    try {
      const response = await fetchApi('/onboarding/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        isPublic: true
      });
      
      const { accessToken, refreshToken } = response;
      await loginWithTokens(accessToken, refreshToken);
      navigate('/dashboard');

    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Registro de Nuevo Negocio</CardTitle>
          <CardDescription>Paso {step} de 3</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && <Step1Form formData={formData} setFormData={setFormData} onNext={handleNext} />}
          {step === 2 && <Step2Form formData={formData} setFormData={setFormData} onNext={handleNext} onBack={handleBack} />}
          {step === 3 && <Step3Summary formData={formData} onBack={handleBack} onSubmit={handleSubmit} loading={loading} error={error} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default Register;