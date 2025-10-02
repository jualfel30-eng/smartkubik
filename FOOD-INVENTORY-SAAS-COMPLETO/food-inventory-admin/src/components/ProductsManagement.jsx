import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { fetchApi } from '../lib/api';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  CheckCircle, 
  XCircle,
  Download,
  Upload
} from 'lucide-react';

const initialNewProductState = {
  sku: '',
  name: '',
  category: '',
  subcategory: '',
  brand: '',
  description: '',
  ingredients: '',
  isPerishable: false,
  shelfLifeDays: 0,
  storageTemperature: 'ambiente',
  ivaApplicable: true,
  taxCategory: 'general',
  isSoldByWeight: false,
  unitOfMeasure: 'unidad',
  hasMultipleSellingUnits: false,
  sellingUnits: [],
  inventoryConfig: {
    minimumStock: 10,
    maximumStock: 100,
    reorderPoint: 20,
    reorderQuantity: 50,
    trackLots: true,
    trackExpiration: true,
    fefoEnabled: true,
  },
  variant: {
    name: 'Estándar',
    sku: '',
    barcode: '',
    unit: 'unidad',
    unitSize: 1,
    basePrice: 0,
    costPrice: 0,
    images: []
  }
};

function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState(initialNewProductState);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const dragImageIndex = useRef(null);

  // Estados para importación masiva
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  const handleDragStart = (index) => {
    dragImageIndex.current = index;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex) => {
    if (dragImageIndex.current === null || dragImageIndex.current === targetIndex) {
      dragImageIndex.current = null;
      return;
    }

    const draggedIndex = dragImageIndex.current;
    const images = [...newProduct.variant.images];
    const selectedImage = images[selectedImageIndex];

    const [draggedItem] = images.splice(draggedIndex, 1);
    images.splice(targetIndex, 0, draggedItem);

    const newSelectedIndex = images.findIndex(img => img === selectedImage);

    setNewProduct({
      ...newProduct,
      variant: {
        ...newProduct.variant,
        images: images
      }
    });
    setSelectedImageIndex(newSelectedIndex >= 0 ? newSelectedIndex : 0);

    dragImageIndex.current = null;
  };

  useEffect(() => {
    if (isAddDialogOpen) {
      setNewProduct(initialNewProductState);
      setSelectedImageIndex(0);
    }
  }, [isAddDialogOpen]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi('/products');
      setProducts(data.data || []);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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

  const handleAddProduct = async () => {
    const payload = {
      ...newProduct,
      variants: [{
        ...newProduct.variant,
        sku: `${newProduct.sku}-VAR1`,
      }],
      pricingRules: { cashDiscount: 0, cardSurcharge: 0, minimumMargin: 0.2, maximumDiscount: 0.5 },
      igtfExempt: false,
      hasMultipleSellingUnits: newProduct.hasMultipleSellingUnits,
      sellingUnits: newProduct.hasMultipleSellingUnits ? newProduct.sellingUnits : [],
    };
    if (!payload.isPerishable) {
      delete payload.shelfLifeDays;
      delete payload.storageTemperature;
    }
    delete payload.variant;

    try {
      await fetchApi('/products', { method: 'POST', body: JSON.stringify(payload) });
      document.dispatchEvent(new CustomEvent('product-form-success'));
      setIsAddDialogOpen(false);
      loadProducts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    const payload = {
      name: editingProduct.name,
      category: editingProduct.category,
      subcategory: editingProduct.subcategory,
      brand: editingProduct.brand,
      description: editingProduct.description,
      ingredients: editingProduct.ingredients,
      inventoryConfig: editingProduct.inventoryConfig,
      isSoldByWeight: editingProduct.isSoldByWeight,
      unitOfMeasure: editingProduct.unitOfMeasure,
      hasMultipleSellingUnits: editingProduct.hasMultipleSellingUnits,
      sellingUnits: editingProduct.hasMultipleSellingUnits ? editingProduct.sellingUnits : [],
      ivaApplicable: editingProduct.ivaApplicable,
      variants: editingProduct.variants,
    };

    try {
      await fetchApi(`/products/${editingProduct._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      alert(`Error al actualizar el producto: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      try {
        await fetchApi(`/products/${productId}`, { method: 'DELETE' });
        loadProducts();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentImages = newProduct.variant.images || [];
    if (currentImages.length + files.length > 3) {
      alert("Puedes subir un máximo de 3 imágenes.");
      return;
    }
    const newImages = files.map(file => URL.createObjectURL(file));
    setNewProduct({
      ...newProduct,
      variant: {
        ...newProduct.variant,
        images: [...currentImages, ...newImages]
      }
    });
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...newProduct.variant.images];
    updatedImages.splice(index, 1);
    
    if (index === selectedImageIndex) {
      setSelectedImageIndex(0);
    } else if (index < selectedImageIndex) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }

    setNewProduct({
      ...newProduct,
      variant: {
        ...newProduct.variant,
        images: updatedImages
      }
    });
  };

  const handleEditImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentImages = editingProduct.variants[0].images || [];
    if (currentImages.length + files.length > 3) {
      alert("Puedes subir un máximo de 3 imágenes.");
      return;
    }
    const newImages = files.map(file => URL.createObjectURL(file));
    setEditingProduct({
      ...editingProduct,
      variants: [
        {
          ...editingProduct.variants[0],
          images: [...currentImages, ...newImages]
        },
        ...editingProduct.variants.slice(1)
      ]
    });
  };

  const handleEditRemoveImage = (index) => {
    const updatedImages = [...editingProduct.variants[0].images];
    updatedImages.splice(index, 1);
    setEditingProduct({
      ...editingProduct,
      variants: [
        {
          ...editingProduct.variants[0],
          images: updatedImages
        },
        ...editingProduct.variants.slice(1)
      ]
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ["sku", "name", "category", "subcategory", "brand", "unitOfMeasure", "isSoldByWeight", "description", "ingredients", "isPerishable", "shelfLifeDays", "storageTemperature", "ivaApplicable", "taxCategory", "minimumStock", "maximumStock", "reorderPoint", "reorderQuantity", "variantName", "variantSku", "variantBarcode", "variantUnit", "variantUnitSize", "variantBasePrice", "variantCostPrice", "image1", "image2", "image3"];
    const exampleData = [
      ["SKU-001", "Arroz Blanco 1kg", "Granos", "Arroz", "MarcaA", "unidad", false, "Arroz de grano largo", "Arroz", false, 365, "ambiente", true, "general", 10, 100, 20, 50, "Bolsa 1kg", "SKU-001-1KG", "7591234567890", "kg", 1, 1.50, 0.80, "https://example.com/arroz.jpg", "", ""],
      ["SKU-002", "Leche Entera 1L", "Lácteos", "Leche", "MarcaB", "unidad", false, "Leche pasteurizada", "Leche de vaca", true, 15, "refrigerado", true, "general", 20, 200, 30, 100, "Caja 1L", "SKU-002-1L", "7591234567891", "litro", 1, 2.20, 1.50, "https://example.com/leche.jpg", "", ""],
      ["SKU-003", "Pan de Molde", "Panadería", "Pan", "MarcaC", "unidad", false, "Pan blanco tajado", "Harina, agua, levadura, sal", true, 7, "ambiente", true, "general", 15, 150, 25, 75, "Paquete 500g", "SKU-003-500G", "7591234567892", "g", 500, 3.00, 1.80, "https://example.com/pan.jpg", "", ""],
      ["SKU-004", "Pollo Congelado", "Carnes", "Aves", "MarcaD", "kg", true, "Pollo entero congelado", "Pollo", true, 180, "congelado", false, "general", 5, 50, 10, 25, "Pollo Entero", "SKU-004-UN", "7591234567893", "kg", 1, 5.50, 3.50, "https://example.com/pollo.jpg", "", ""]
    ];
    const data = [headers, ...exampleData];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla de Productos");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'plantilla_productos.xlsx');
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("El archivo está vacío o no tiene datos.");
        }

        // Validar que las cabeceras existan
        const headers = Object.keys(json[0]);
        const requiredHeaders = ["sku", "name", "category", "variantName", "variantUnit", "variantUnitSize", "variantBasePrice", "variantCostPrice"];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          throw new Error(`El archivo no contiene las siguientes columnas obligatorias: ${missingHeaders.join(', ')}`);
        }

        setPreviewHeaders(headers);
        setPreviewData(json);
        setIsPreviewDialogOpen(true);

      } catch (err) {
        alert(`Error al procesar el archivo: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // Reset file input
  };

  const handleConfirmImport = async () => {
    const payload = {
      products: previewData,
    };

    try {
      await fetchApi('/products/bulk', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsPreviewDialogOpen(false);
      alert(`${payload.products.length} productos importados exitosamente.`);
      loadProducts(); // Recargar la lista de productos

    } catch (error) {
      alert(`Error al importar los productos: ${error.message}`);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredProducts.map(p => ({
      SKU: p.sku,
      Nombre: p.name,
      Categoría: p.category,
      Subcategoría: p.subcategory,
      Marca: p.brand,
      Descripción: p.description,
      'Vendible por Peso': p.isSoldByWeight ? 'Sí' : 'No',
      'Unidad de Medida': p.unitOfMeasure,
      'Variante Nombre': p.variants[0]?.name,
      'Variante Precio Costo': p.variants[0]?.costPrice,
      'Variante Precio Venta': p.variants[0]?.basePrice,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'productos.xlsx');
  };

  const handleExportCsv = () => {
    const dataToExport = filteredProducts.map(p => ({
      SKU: p.sku,
      Nombre: p.name,
      Categoría: p.category,
      Subcategoría: p.subcategory,
      Marca: p.brand,
      Descripción: p.description,
      'Vendible por Peso': p.isSoldByWeight ? 'Sí' : 'No',
      'Unidad de Medida': p.unitOfMeasure,
      'Variante Nombre': p.variants[0]?.name,
      'Variante Precio Costo': p.variants[0]?.costPrice,
      'Variante Precio Venta': p.variants[0]?.basePrice,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'productos.csv');
  };

  if (loading) return <div>Cargando productos...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-start items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Acciones en Lote</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleDownloadTemplate}>
                Descargar Plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => document.getElementById('bulk-upload-input').click()}>
                Importar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleExportExcel}>
                Exportar como Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportCsv}>
                Exportar como CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            id="bulk-upload-input"
            style={{ display: 'none' }}
            accept=".xlsx, .xls"
            onChange={handleBulkUpload}
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button id="add-product-button" size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white"><Plus className="h-5 w-5 mr-2" /> Agregar Producto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                <DialogDescription>Completa la información para crear un nuevo producto en el catálogo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4 px-6 overflow-y-auto flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                  <div className="md:col-span-1 space-y-2">
                    <Label>Imágenes (máx. 3)</Label>
                    <label htmlFor="images" className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted/50">
                      {newProduct.variant.images && newProduct.variant.images.length > 0 ? (
                         <img src={newProduct.variant.images[selectedImageIndex]} alt={`product-image-${selectedImageIndex}`} className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <div className="text-center">
                          <Package className="mx-auto h-8 w-8" />
                          <p className="mt-1 text-sm">Subir imágenes</p>
                        </div>
                      )}
                    </label>
                    <Input id="images" type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <div className="w-full border rounded-lg p-2 mt-2">
                        <div className="flex gap-2 justify-center">
                            {newProduct.variant.images && newProduct.variant.images.map((image, index) => (
                            <div 
                                key={image}
                                className="relative"
                                draggable="true"
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(index)}
                            >
                                {index === 0 && (
                                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" variant="secondary">
                                    Portada
                                </Badge>
                                )}
                                <img 
                                src={image} 
                                alt={`product-thumb-${index}`} 
                                className={`w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80 ${selectedImageIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                onClick={() => setSelectedImageIndex(index)}
                                />
                                <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full z-10" 
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                                >
                                <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                            ))}
                            {newProduct.variant.images && newProduct.variant.images.length > 0 && newProduct.variant.images.length < 3 && (
                            <label htmlFor="images" className="cursor-pointer flex items-center justify-center w-14 h-14 border-2 border-dashed rounded text-muted-foreground hover:bg-muted/50">
                                <Plus className="h-8 w-8" />
                            </label>
                            )}
                        </div>
                    </div>
                    {newProduct.variant.images.length >= 2 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            Arrastra para organizar la portada.
                        </p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Producto</Label>
                      <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej: Arroz Blanco" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Marca</Label>
                      <Input id="brand" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} placeholder="Ej: Diana" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU Principal</Label>
                      <Input id="sku" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} placeholder="EJ: ARR-BLANCO" />
                    </div>
                    <div class="space-y-2">
                      <Label htmlFor="barcode">Código de Barras (UPC)</Label>
                      <Input id="barcode" value={newProduct.variant.barcode} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, barcode: e.target.value}})} placeholder="Ej: 7591234567890" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Input id="category" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Ej: Bebidas" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Sub-categoría</Label>
                    <Input id="subcategory" value={newProduct.subcategory} onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })} placeholder="Ej: Gaseosas" />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} placeholder="Descripción detallada del producto" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="ingredients">Ingredientes</Label>
                    <Textarea id="ingredients" value={newProduct.ingredients} onChange={(e) => setNewProduct({...newProduct, ingredients: e.target.value})} placeholder="Lista de ingredientes" />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="isPerishable" checked={newProduct.isPerishable} onCheckedChange={(checked) => setNewProduct({...newProduct, isPerishable: checked})} />
                    <Label htmlFor="isPerishable">Es Perecedero</Label>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="isSoldByWeight" checked={newProduct.isSoldByWeight} onCheckedChange={(checked) => setNewProduct({...newProduct, isSoldByWeight: checked})} />
                    <Label htmlFor="isSoldByWeight">Vendido por Peso</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitOfMeasure">Unidad de Medida Base (Inventario)</Label>
                    <Select value={newProduct.unitOfMeasure} onValueChange={(value) => setNewProduct({...newProduct, unitOfMeasure: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidad">Unidad</SelectItem>
                        <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                        <SelectItem value="gramos">Gramos (g)</SelectItem>
                        <SelectItem value="lb">Libra (lb)</SelectItem>
                        <SelectItem value="litros">Litros (L)</SelectItem>
                        <SelectItem value="ml">Mililitros (ml)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Esta es la unidad en la que se guardará el inventario</p>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="ivaApplicable" checked={!newProduct.ivaApplicable} onCheckedChange={(checked) => setNewProduct({...newProduct, ivaApplicable: !checked})} />
                    <Label htmlFor="ivaApplicable">Exento de IVA</Label>
                  </div>
                  {newProduct.isPerishable && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="shelfLifeDays">Vida Útil (días)</Label>
                        <Input id="shelfLifeDays" type="number" value={newProduct.shelfLifeDays} onChange={(e) => setNewProduct({...newProduct, shelfLifeDays: parseInt(e.target.value) || 0})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storageTemperature">Temperatura de Almacenamiento</Label>
                        <Select value={newProduct.storageTemperature} onValueChange={(value) => setNewProduct({...newProduct, storageTemperature: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una temperatura" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ambiente">Ambiente</SelectItem>
                            <SelectItem value="refrigerado">Refrigerado</SelectItem>
                            <SelectItem value="congelado">Congelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                {newProduct.inventoryConfig && (
                  <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-lg font-medium mb-4">Configuración de Inventario</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minimumStock">Stock Mínimo</Label>
                        <Input id="minimumStock" type="number" value={newProduct.inventoryConfig.minimumStock} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, minimumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maximumStock">Stock Máximo</Label>
                        <Input id="maximumStock" type="number" value={newProduct.inventoryConfig.maximumStock} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, maximumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorderPoint">Punto de Reorden</Label>
                        <Input id="reorderPoint" type="number" value={newProduct.inventoryConfig.reorderPoint} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, reorderPoint: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorderQuantity">Cantidad de Reorden</Label>
                        <Input id="reorderQuantity" type="number" value={newProduct.inventoryConfig.reorderQuantity} onChange={(e) => setNewProduct({...newProduct, inventoryConfig: {...newProduct.inventoryConfig, reorderQuantity: parseInt(e.target.value) || 0}})} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-span-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium">Unidades de Venta Múltiples</h4>
                      <p className="text-sm text-muted-foreground">Configura diferentes unidades de venta (kg, g, lb, cajas, etc.)</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasMultipleSellingUnits"
                        checked={newProduct.hasMultipleSellingUnits}
                        onCheckedChange={(checked) => setNewProduct({...newProduct, hasMultipleSellingUnits: checked})}
                      />
                      <Label htmlFor="hasMultipleSellingUnits">Habilitar</Label>
                    </div>
                  </div>

                  {newProduct.hasMultipleSellingUnits && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">⚠️ IMPORTANTE - Unidad Base del Inventario:</p>
                      <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                        El inventario SIEMPRE se guarda en <span className="font-bold">"{newProduct.unitOfMeasure}"</span>.
                        El Factor de Conversión indica cuántas unidades base equivalen a 1 unidad de venta.
                      </p>
                      <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                        <p className="font-semibold">Ejemplos:</p>
                        <p>• Si la unidad base es "gramos" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1000</span> (1 kg = 1000 g)</p>
                        <p>• Si la unidad base es "gramos" y vendes en "g": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 g = 1 g)</p>
                        <p>• Si la unidad base es "kg" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 kg = 1 kg)</p>
                        <p>• Si la unidad base es "unidad" y vendes en "caja de 24": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">24</span> (1 caja = 24 unidades)</p>
                      </div>
                    </div>
                  )}

                  {newProduct.hasMultipleSellingUnits && (
                    <div className="space-y-4">
                      {newProduct.sellingUnits.map((unit, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">Unidad {index + 1}</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const units = [...newProduct.sellingUnits];
                                units.splice(index, 1);
                                setNewProduct({...newProduct, sellingUnits: units});
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label>Nombre</Label>
                              <Input
                                placeholder="Ej: Kilogramos"
                                value={unit.name || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].name = e.target.value;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Abreviación</Label>
                              <Input
                                placeholder="Ej: kg"
                                value={unit.abbreviation || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].abbreviation = e.target.value;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                Factor Conversión
                                <span className="text-xs text-muted-foreground">(Cuántos {newProduct.unitOfMeasure} = 1 {unit.abbreviation || 'unidad'})</span>
                              </Label>
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="Ej: 1000"
                                value={unit.conversionFactor || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].conversionFactor = parseFloat(e.target.value) || 0;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                1 {unit.abbreviation || 'unidad'} = {unit.conversionFactor || 0} {newProduct.unitOfMeasure}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Precio/Unidad ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ej: 20.00"
                                value={unit.pricePerUnit || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].pricePerUnit = parseFloat(e.target.value) || 0;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Costo/Unidad ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ej: 12.00"
                                value={unit.costPerUnit || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].costPerUnit = parseFloat(e.target.value) || 0;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Cant. Mínima</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ej: 0.5"
                                value={unit.minimumQuantity || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].minimumQuantity = parseFloat(e.target.value) || 0;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Incremento</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ej: 0.5"
                                value={unit.incrementStep || ''}
                                onChange={(e) => {
                                  const units = [...newProduct.sellingUnits];
                                  units[index].incrementStep = parseFloat(e.target.value) || 0;
                                  setNewProduct({...newProduct, sellingUnits: units});
                                }}
                              />
                            </div>
                            <div className="space-y-2 flex items-end">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`default-${index}`}
                                  checked={unit.isDefault || false}
                                  onCheckedChange={(checked) => {
                                    const units = newProduct.sellingUnits.map((u, i) => ({
                                      ...u,
                                      isDefault: i === index ? checked : false
                                    }));
                                    setNewProduct({...newProduct, sellingUnits: units});
                                  }}
                                />
                                <Label htmlFor={`default-${index}`}>Por defecto</Label>
                              </div>
                            </div>
                            <div className="space-y-2 flex items-end">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`active-${index}`}
                                  checked={unit.isActive !== false}
                                  onCheckedChange={(checked) => {
                                    const units = [...newProduct.sellingUnits];
                                    units[index].isActive = checked;
                                    setNewProduct({...newProduct, sellingUnits: units});
                                  }}
                                />
                                <Label htmlFor={`active-${index}`}>Activa</Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewProduct({
                            ...newProduct,
                            sellingUnits: [...newProduct.sellingUnits, {
                              name: '',
                              abbreviation: '',
                              conversionFactor: 1,
                              pricePerUnit: 0,
                              costPerUnit: 0,
                              isActive: true,
                              isDefault: newProduct.sellingUnits.length === 0,
                              minimumQuantity: 0,
                              incrementStep: 0
                            }]
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Unidad
                      </Button>
                    </div>
                  )}
                </div>

                <div className="col-span-2 border-t pt-4 mt-4">
                  <h4 className="text-lg font-medium mb-4">Variante Inicial (Requerida)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variantName">Nombre Variante</Label>
                      <Input id="variantName" value={newProduct.variant.name} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, name: e.target.value}})} placeholder="Ej: 1kg" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variantUnit">Unidad</Label>
                      <Input id="variantUnit" value={newProduct.variant.unit} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, unit: e.target.value}})} placeholder="Ej: kg, unidad" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variantUnitSize">Tamaño Unidad</Label>
                      <Input id="variantUnitSize" type="number" value={newProduct.variant.unitSize} onChange={(e) => setNewProduct({...newProduct, variant: {...newProduct.variant, unitSize: parseFloat(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variantCostPrice">Precio Costo ($)</Label>
                      <Input
                        id="variantCostPrice"
                        type="number"
                        value={newProduct.variant.costPrice}
                        onFocus={() => {
                          if (newProduct.variant.costPrice === 0) {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: ''}});
                          }
                        }}
                        onChange={(e) => {
                          setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: e.target.value }});
                        }}
                        onBlur={() => {
                          const price = parseFloat(newProduct.variant.costPrice);
                          if (isNaN(price) || newProduct.variant.costPrice === '') {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: 0}});
                          } else {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, costPrice: price}});
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variantBasePrice">Precio de Venta ($)</Label>
                      <Input
                        id="variantBasePrice"
                        type="number"
                        value={newProduct.variant.basePrice}
                        onFocus={() => {
                          if (newProduct.variant.basePrice === 0) {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: ''}});
                          }
                        }}
                        onChange={(e) => {
                          setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: e.target.value }});
                        }}
                        onBlur={() => {
                          const price = parseFloat(newProduct.variant.basePrice);
                          if (isNaN(price) || newProduct.variant.basePrice === '') {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: 0}});
                          } else {
                            setNewProduct({...newProduct, variant: {...newProduct.variant, basePrice: price}});
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 pb-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddProduct}>Crear Producto</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
      <Card>
        <CardHeader />
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
                  <TableRow key={product._id}>
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
                        <Button variant="outline" size="sm" onClick={() => {
                          const productToEdit = JSON.parse(JSON.stringify(product));
                          if (!productToEdit.variants || productToEdit.variants.length === 0) {
                            productToEdit.variants = [{ name: 'Estándar', basePrice: 0, costPrice: 0 }];
                          }
                          if (!productToEdit.inventoryConfig) { // Defensive check
                            productToEdit.inventoryConfig = { minimumStock: 10, maximumStock: 100, reorderPoint: 20, reorderQuantity: 50, trackLots: true, trackExpiration: true, fefoEnabled: true };
                          }
                          if (productToEdit.isSoldByWeight === undefined) {
                            productToEdit.isSoldByWeight = false;
                          }
                          if (productToEdit.unitOfMeasure === undefined) {
                            productToEdit.unitOfMeasure = 'unidad';
                          }
                          if (productToEdit.hasMultipleSellingUnits === undefined) {
                            productToEdit.hasMultipleSellingUnits = false;
                          }
                          if (!productToEdit.sellingUnits) {
                            productToEdit.sellingUnits = [];
                          }
                          setEditingProduct(productToEdit);
                          setIsEditDialogOpen(true);
                        }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteProduct(product._id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Editar Producto: {editingProduct.name}</DialogTitle>
              <DialogDescription>Modifica la información del producto y sus precios.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre del Producto</Label>
                <Input id="edit-name" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoría</Label>
                <Input id="edit-category" value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Marca</Label>
                <Input id="edit-brand" value={editingProduct.brand} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU</Label>
                <Input id="edit-sku" value={editingProduct.sku} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-barcode">Código de Barras (UPC)</Label>
                <Input id="edit-barcode" value={editingProduct.variants[0].barcode} onChange={(e) => {
                  const newVariants = [...editingProduct.variants];
                  newVariants[0].barcode = e.target.value;
                  setEditingProduct({...editingProduct, variants: newVariants});
                }} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea id="edit-description" value={editingProduct.description} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-ingredients">Ingredientes</Label>
                <Textarea id="edit-ingredients" value={editingProduct.ingredients} onChange={(e) => setEditingProduct({...editingProduct, ingredients: e.target.value})} />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="edit-isSoldByWeight" checked={editingProduct.isSoldByWeight} onCheckedChange={(checked) => setEditingProduct({...editingProduct, isSoldByWeight: checked})} />
                <Label htmlFor="edit-isSoldByWeight">Vendido por Peso</Label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="edit-ivaApplicable" checked={!editingProduct.ivaApplicable} onCheckedChange={(checked) => setEditingProduct({...editingProduct, ivaApplicable: !checked})} />
                <Label htmlFor="edit-ivaApplicable">Exento de IVA</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-unitOfMeasure">Unidad de Medida Base (Inventario)</Label>
                <Select value={editingProduct.unitOfMeasure} onValueChange={(value) => setEditingProduct({...editingProduct, unitOfMeasure: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                    <SelectItem value="gramos">Gramos (g)</SelectItem>
                    <SelectItem value="lb">Libra (lb)</SelectItem>
                    <SelectItem value="litros">Litros (L)</SelectItem>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Esta es la unidad en la que se guardará el inventario</p>
              </div>

              {editingProduct.inventoryConfig && (
                <div className="col-span-2 border-t pt-4 mt-4">
                    <h4 className="text-lg font-medium mb-4">Configuración de Inventario</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-minimumStock">Stock Mínimo</Label>
                        <Input id="edit-minimumStock" type="number" value={editingProduct.inventoryConfig.minimumStock} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, minimumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-maximumStock">Stock Máximo</Label>
                        <Input id="edit-maximumStock" type="number" value={editingProduct.inventoryConfig.maximumStock} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, maximumStock: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reorderPoint">Punto de Reorden</Label>
                        <Input id="edit-reorderPoint" type="number" value={editingProduct.inventoryConfig.reorderPoint} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, reorderPoint: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reorderQuantity">Cantidad de Reorden</Label>
                        <Input id="edit-reorderQuantity" type="number" value={editingProduct.inventoryConfig.reorderQuantity} onChange={(e) => setEditingProduct({...editingProduct, inventoryConfig: {...editingProduct.inventoryConfig, reorderQuantity: parseInt(e.target.value) || 0}})} />
                      </div>
                    </div>
                </div>
              )}

              <div className="col-span-2 border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium">Unidades de Venta Múltiples</h4>
                    <p className="text-sm text-muted-foreground">Configura diferentes unidades de venta (kg, g, lb, cajas, etc.)</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-hasMultipleSellingUnits"
                      checked={editingProduct.hasMultipleSellingUnits || false}
                      onCheckedChange={(checked) => {
                        setEditingProduct({
                          ...editingProduct,
                          hasMultipleSellingUnits: checked,
                          sellingUnits: checked ? (editingProduct.sellingUnits || []) : []
                        });
                      }}
                    />
                    <Label htmlFor="edit-hasMultipleSellingUnits">Habilitar</Label>
                  </div>
                </div>

                {editingProduct.hasMultipleSellingUnits && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">⚠️ IMPORTANTE - Unidad Base del Inventario:</p>
                    <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                      El inventario SIEMPRE se guarda en <span className="font-bold">"{editingProduct.unitOfMeasure}"</span>.
                      El Factor de Conversión indica cuántas unidades base equivalen a 1 unidad de venta.
                    </p>
                    <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                      <p className="font-semibold">Ejemplos:</p>
                      <p>• Si la unidad base es "gramos" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1000</span> (1 kg = 1000 g)</p>
                      <p>• Si la unidad base es "gramos" y vendes en "g": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 g = 1 g)</p>
                      <p>• Si la unidad base es "kg" y vendes en "kg": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">1</span> (1 kg = 1 kg)</p>
                      <p>• Si la unidad base es "unidad" y vendes en "caja de 24": Factor = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">24</span> (1 caja = 24 unidades)</p>
                    </div>
                  </div>
                )}

                {editingProduct.hasMultipleSellingUnits && (
                  <div className="space-y-4">
                    {(editingProduct.sellingUnits || []).map((unit, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">Unidad {index + 1}</h5>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const units = [...editingProduct.sellingUnits];
                              units.splice(index, 1);
                              setEditingProduct({...editingProduct, sellingUnits: units});
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input
                              placeholder="Ej: Kilogramos"
                              value={unit.name || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].name = e.target.value;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Abreviación</Label>
                            <Input
                              placeholder="Ej: kg"
                              value={unit.abbreviation || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].abbreviation = e.target.value;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              Factor Conversión
                              <span className="text-xs text-muted-foreground">(Cuántos {editingProduct.unitOfMeasure} = 1 {unit.abbreviation || 'unidad'})</span>
                            </Label>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="Ej: 1000"
                              value={unit.conversionFactor || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].conversionFactor = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              1 {unit.abbreviation || 'unidad'} = {unit.conversionFactor || 0} {editingProduct.unitOfMeasure}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Precio/Unidad ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ej: 20.00"
                              value={unit.pricePerUnit || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].pricePerUnit = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Costo/Unidad ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ej: 12.00"
                              value={unit.costPerUnit || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].costPerUnit = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cant. Mínima</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ej: 0.5"
                              value={unit.minimumQuantity || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].minimumQuantity = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Incremento</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ej: 0.5"
                              value={unit.incrementStep || ''}
                              onChange={(e) => {
                                const units = [...editingProduct.sellingUnits];
                                units[index].incrementStep = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, sellingUnits: units});
                              }}
                            />
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-default-${index}`}
                                checked={unit.isDefault || false}
                                onCheckedChange={(checked) => {
                                  const units = editingProduct.sellingUnits.map((u, i) => ({
                                    ...u,
                                    isDefault: i === index ? checked : false
                                  }));
                                  setEditingProduct({...editingProduct, sellingUnits: units});
                                }}
                              />
                              <Label htmlFor={`edit-default-${index}`}>Por defecto</Label>
                            </div>
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-active-${index}`}
                                checked={unit.isActive !== false}
                                onCheckedChange={(checked) => {
                                  const units = [...editingProduct.sellingUnits];
                                  units[index].isActive = checked;
                                  setEditingProduct({...editingProduct, sellingUnits: units});
                                }}
                              />
                              <Label htmlFor={`edit-active-${index}`}>Activa</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProduct({
                          ...editingProduct,
                          sellingUnits: [...(editingProduct.sellingUnits || []), {
                            name: '',
                            abbreviation: '',
                            conversionFactor: 1,
                            pricePerUnit: 0,
                            costPerUnit: 0,
                            isActive: true,
                            isDefault: (editingProduct.sellingUnits || []).length === 0,
                            minimumQuantity: 0,
                            incrementStep: 0
                          }]
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Unidad
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="col-span-2 border-t pt-4 mt-4">
                <h4 className="text-lg font-medium mb-4">Editar Precios de Variante Principal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-costPrice">Precio Costo ($)</Label>
                    <Input id="edit-costPrice" type="number" value={editingProduct.variants[0].costPrice} onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      setEditingProduct(prev => ({
                        ...prev,
                        variants: [
                          { ...prev.variants[0], costPrice: newPrice },
                          ...prev.variants.slice(1)
                        ]
                      }));
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-basePrice">Precio de Venta ($)</Label>
                    <Input id="edit-basePrice" type="number" value={editingProduct.variants[0].basePrice} onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      setEditingProduct(prev => ({
                        ...prev,
                        variants: [
                          { ...prev.variants[0], basePrice: newPrice },
                          ...prev.variants.slice(1)
                        ]
                      }));
                    }} />
                  </div>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-images">Imágenes (máx. 3)</Label>
                <Input id="edit-images" type="file" multiple accept="image/*" onChange={handleEditImageUpload} />
                <div className="flex space-x-2 mt-2">
                  {editingProduct.variants[0].images && editingProduct.variants[0].images.map((image, index) => (
                    <div key={index} className="relative">
                      <img src={image} alt={`product-image-${index}`} className="w-20 h-20 object-cover rounded" />
                      <Button variant="destructive" size="sm" className="absolute top-0 right-0" onClick={() => handleEditRemoveImage(index)}><XCircle className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateProduct}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de Previsualización de Importación */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Previsualización de Importación de Productos</DialogTitle>
            <DialogDescription>
              Se encontraron {previewData.length} productos para crear. Revisa los datos antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {previewHeaders.map(header => <TableCell key={`${rowIndex}-${header}`}>{String(row[header] || '')}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmImport}>Confirmar Importación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsManagement;