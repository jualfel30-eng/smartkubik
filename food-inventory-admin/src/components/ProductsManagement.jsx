import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Tag, 
  Building, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';

// Datos de ejemplo basados en el schema de producto del backend
const sampleProductsData = [
  {
    id: 1,
    sku: 'ARR-DIANA-1KG',
    name: 'Arroz Blanco Diana',
    category: 'Granos',
    brand: 'Diana',
    description: 'Arroz de grano largo tipo 1',
    variants: [
      { sku: 'ARR-DIANA-1KG-V1', name: '1kg', price: 2.50, stock: 150 },
    ],
    isActive: true,
  },
  {
    id: 2,
    sku: 'HAR-PAN-1KG',
    name: 'Harina de Maíz P.A.N.',
    category: 'Harinas',
    brand: 'P.A.N.',
    description: 'Harina precocida de maíz blanco',
    variants: [
      { sku: 'HAR-PAN-1KG-V1', name: '1kg', price: 1.85, stock: 250 },
    ],
    isActive: true,
  },
  {
    id: 3,
    sku: 'ACE-MAZEITE-1L',
    name: 'Aceite Vegetal Mazeite',
    category: 'Aceites',
    brand: 'Mazeite',
    description: 'Aceite de soya para cocinar',
    variants: [
      { sku: 'ACE-MAZEITE-1L-V1', name: '1L', price: 4.75, stock: 80 },
    ],
    isActive: false, // Ejemplo de producto inactivo
  },
];

function ProductsManagement() {
  const [products, setProducts] = useState(sampleProductsData);
  const [filteredProducts, setFilteredProducts] = useState(sampleProductsData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: '',
    brand: '',
    description: '',
    variantName: '',
    variantSku: '',
    variantPrice: 0,
  });

  useEffect(() => {
    let filtered = products;
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }
    setFilteredProducts(filtered);
  }, [searchTerm, filterCategory, products]);

  const categories = [...new Set(products.map(p => p.category))];
  const brands = [...new Set(products.map(p => p.brand))];

  const handleAddProduct = () => {
    const productToAdd = {
      id: Math.max(...products.map(p => p.id)) + 1,
      sku: newProduct.sku,
      name: newProduct.name,
      category: newProduct.category,
      brand: newProduct.brand,
      description: newProduct.description,
      variants: [
        {
          sku: newProduct.variantSku,
          name: newProduct.variantName,
          price: parseFloat(newProduct.variantPrice),
          stock: 0, // Stock inicial se maneja en inventario
        },
      ],
      isActive: true,
    };
    setProducts([...products, productToAdd]);
    setIsAddDialogOpen(false);
    // Reset form
    setNewProduct({ name: '', sku: '', category: '', brand: '', description: '', variantName: '', variantSku: '', variantPrice: 0 });
  };

  const handleDeleteProduct = (id) => {
    // Soft delete: set isActive to false
    setProducts(products.map(p => p.id === id ? { ...p, isActive: false } : p));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestión de Productos</CardTitle>
              <CardDescription>Administra el catálogo de productos y sus variantes.</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Agregar Producto</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                  <DialogDescription>Completa la información para crear un nuevo producto en el catálogo.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej: Arroz Blanco" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU Principal</Label>
                    <Input id="sku" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} placeholder="EJ: ARR-BLANCO" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Input id="category" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} placeholder="Ej: Granos" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} placeholder="Ej: Diana" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} placeholder="Descripción corta del producto..." />
                  </div>
                  <div className="col-span-2 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Variante Inicial</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="variantName">Nombre Variante</Label>
                        <Input id="variantName" value={newProduct.variantName} onChange={(e) => setNewProduct({...newProduct, variantName: e.target.value})} placeholder="Ej: 1kg" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="variantSku">SKU Variante</Label>
                        <Input id="variantSku" value={newProduct.variantSku} onChange={(e) => setNewProduct({...newProduct, variantSku: e.target.value})} placeholder="Ej: ARR-BLANCO-1KG" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="variantPrice">Precio Base ($)</Label>
                        <Input id="variantPrice" type="number" value={newProduct.variantPrice} onChange={(e) => setNewProduct({...newProduct, variantPrice: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddProduct}>Crear Producto</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, SKU o marca..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Variantes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">{product.brand}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                    <TableCell>{product.variants.length}</TableCell>
                    <TableCell>
                      {product.isActive ? 
                        <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/>Activo</Badge> : 
                        <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1"/>Inactivo</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductsManagement;
