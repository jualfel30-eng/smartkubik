import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../hooks/use-auth';
import { fetchApi } from '../lib/api';
import { businessCategories } from '../lib/business-data';

// Step 1 Component
const Step1Form = ({ formData, setFormData, onNext }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    if (formData.category) {
      const category = businessCategories.find(c => c.name === formData.category);
      if (category) {
        setSelectedCategory(category);
        setSubcategories(category.subcategories);
      } else {
        setSelectedCategory(null);
        setSubcategories([]);
      }
    }
  }, [formData.category]);

  const handleCategoryChange = (value) => {
    setFormData(prev => ({ ...prev, category: value, subcategory: '', otherCategory: '', otherSubcategory: '' }));
  };

  const handleSubcategoryChange = (value) => {
    setFormData(prev => ({ ...prev, subcategory: value, otherSubcategory: '' }));
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
        <Label htmlFor="businessType">Tipo de Negocio</Label>
        <Input
          id="businessType"
          placeholder="Ej: restaurante, panadería, etc."
          value={formData.businessType}
          onChange={handleChange}
          required
        />
      </div>
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
      <div className="space-y-2">
        <Label>Categoría del Negocio</Label>
        <Select onValueChange={handleCategoryChange} value={formData.category}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione una categoría" />
          </SelectTrigger>
          <SelectContent>
            {businessCategories.map(cat => (
              <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.category === 'Otro' && (
          <Input
            id="otherCategory"
            placeholder="Especifique otra categoría"
            value={formData.otherCategory}
            onChange={handleChange}
            className="mt-2"
          />
        )}
      </div>
      {formData.category && formData.category !== 'Otro' && subcategories.length > 0 && (
        <div className="space-y-2">
          <Label>Subcategoría</Label>
          <Select onValueChange={handleSubcategoryChange} value={formData.subcategory}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione una subcategoría" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map(sub => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
               <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
          {formData.subcategory === 'Otro' && (
            <Input
              id="otherSubcategory"
              placeholder="Especifique otra subcategoría"
              value={formData.otherSubcategory}
              onChange={handleChange}
              className="mt-2"
            />
          )}
        </div>
      )}
       {formData.category === 'Otro' && (
        <div className="space-y-2">
          <Label>Subcategoría</Label>
            <Input
              id="otherSubcategory"
              placeholder="Especifique otra subcategoría"
              value={formData.otherSubcategory}
              onChange={handleChange}
              className="mt-2"
            />
        </div>
      )}
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
        <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required />
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
  const category = formData.category === 'Otro' ? formData.otherCategory : formData.category;
  const subcategory = formData.subcategory === 'Otro' ? formData.otherSubcategory : formData.subcategory;

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Resumen de Registro</h3>
      <div className="space-y-2 rounded-md border p-4">
        <p><strong>Negocio:</strong> {formData.businessName}</p>
        <p><strong>Tipo:</strong> {formData.businessType}</p>
        <p><strong>Usuarios:</strong> {formData.numberOfUsers}</p>
        <p><strong>Categoría:</strong> {category}</p>
        <p><strong>Subcategoría:</strong> {subcategory}</p>
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
    businessType: '',
    numberOfUsers: '',
    category: '',
    subcategory: '',
    otherCategory: '',
    otherSubcategory: '',
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
      numberOfUsers: parseInt(formData.numberOfUsers, 10),
      categories: formData.category === 'Otro' ? formData.otherCategory : formData.category,
      subcategories: formData.subcategory === 'Otro' ? formData.otherSubcategory : formData.subcategory,
    };

    try {
      const response = await fetchApi('/onboarding/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        isPublic: true
      });
      
      const { accessToken, refreshToken } = response;
      loginWithTokens(accessToken, refreshToken);
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