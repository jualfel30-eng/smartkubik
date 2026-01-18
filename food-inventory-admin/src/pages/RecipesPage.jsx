import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, List, DollarSign, Plus, ChefHat, Search, Loader2, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateRecipeDialog } from '@/components/recipes/CreateRecipeDialog';
import { RecipeDetailDialog } from '@/components/recipes/RecipeDetailDialog';
import { useBillOfMaterials } from '@/hooks/useBillOfMaterials';
import { toast } from 'sonner';

const RecipesPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDetailCosts, setShowDetailCosts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { boms, loadBoms, createBom, updateBom, getBom, loading } = useBillOfMaterials();

  useEffect(() => {
    loadBoms();
  }, [loadBoms]);

  const handleCreateOrUpdateRecipe = async (recipeData) => {
    try {
      if (editingRecipe) {
        await updateBom(editingRecipe._id, recipeData);
        toast.success("Receta actualizada exitosamente");
      } else {
        await createBom(recipeData);
        toast.success("Receta creada exitosamente");
      }
      setIsCreateDialogOpen(false);
      setEditingRecipe(null);
      loadBoms(); // Explicitly reload to refresh list
    } catch (error) {
      console.error("Failed to save recipe:", error);
      toast.error("Error al guardar la receta: " + error.message);
    }
  };

  const handleEditRecipe = async (id) => {
    try {
      const fullRecipe = await getBom(id);
      setEditingRecipe(fullRecipe);
      setIsCreateDialogOpen(true);
    } catch (error) {
      toast.error("No se pudo cargar la receta para editar");
    }
  };

  const handleNewRecipe = () => {
    setEditingRecipe(null);
    setIsCreateDialogOpen(true);
  };

  const handleViewDetail = (id, hideCosts = false) => {
    setSelectedRecipeId(id);
    setShowDetailCosts(!hideCosts);
    setIsDetailDialogOpen(true);
  };

  const filteredRecipes = boms.filter(bom =>
    bom.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las recetas y costos de los platillos (Bill of Materials)
          </p>
        </div>
        <Button onClick={handleNewRecipe}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Recetas
          </TabsTrigger>
          <TabsTrigger value="costing">
            <DollarSign className="h-4 w-4 mr-2" />
            Costeo
          </TabsTrigger>
          <TabsTrigger value="categories">
            <ChefHat className="h-4 w-4 mr-2" />
            Categorías
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Listado de Recetas</CardTitle>
                  <CardDescription>
                    Todas las recetas registradas en el sistema
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar receta..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && boms.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron recetas</p>
                  <Button variant="outline" className="mt-4" onClick={handleNewRecipe}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Receta
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Producto Base</TableHead>
                      <TableHead>Cant. Producción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.map((bom) => (
                      <TableRow key={bom._id}>
                        <TableCell className="font-medium">{bom.code}</TableCell>
                        <TableCell>{bom.name}</TableCell>
                        <TableCell>{bom.productId?.name || 'N/A'}</TableCell>
                        <TableCell>{bom.productionQuantity} {bom.productionUnit}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${bom.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {bom.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditRecipe(bom._id)} title="Editar Receta">
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(bom._id)}>Ver Detalle</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Costos</CardTitle>
              <CardDescription>
                Visualiza los costos estimados vs reales de tus recetas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && boms.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron recetas para costear</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receta</TableHead>
                      <TableHead>Producto Base</TableHead>
                      <TableHead>Unidad Producción</TableHead>
                      <TableHead className="text-right">Costo Total</TableHead>
                      <TableHead className="text-right">Costo Unitario</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.map((bom) => (
                      <TableRow key={bom._id}>
                        <TableCell className="font-medium">{bom.name} ({bom.code})</TableCell>
                        <TableCell>{bom.productId?.name || 'N/A'}</TableCell>
                        <TableCell>{bom.productionQuantity} {bom.productionUnit}</TableCell>
                        <TableCell className="text-right font-medium">
                          {/* We might need to fetch cost async or assume it's included. 
                              For now, showing 'Ver Detalle' for calculation due to potential performance hit of calculating all at once.
                           */}
                          <span className="text-muted-foreground text-xs">Ver detalle</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-muted-foreground text-xs">Ver detalle</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(bom._id)}>Analizar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(
              boms.reduce((acc, bom) => {
                const cat = bom.productionCategory || 'General';
                if (!acc[cat]) acc[cat] = 0;
                acc[cat]++;
                return acc;
              }, {})
            ).map(([category, count]) => (
              <Card
                key={category}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === category ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {category}
                  </CardTitle>
                  <ChefHat className={`h-4 w-4 ${selectedCategory === category ? 'text-primary' : 'text-muted-foreground'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    {count === 1 ? 'Receta activa' : 'Recetas activas'}
                  </p>
                </CardContent>
              </Card>
            ))}

            {boms.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>No hay recetas para categorizar.</p>
              </div>
            )}
          </div>

          {/* Drilled-down List */}
          {selectedCategory && (
            <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recetas de {selectedCategory}</CardTitle>
                    <CardDescription>Gestión de recetas para esta estación de producción</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                    Ver Todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Producto Base</TableHead>
                      <TableHead>Cant. Producción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes
                      .filter(bom => (bom.productionCategory || 'General') === selectedCategory)
                      .map((bom) => (
                        <TableRow key={bom._id}>
                          <TableCell className="font-medium">{bom.code}</TableCell>
                          <TableCell>{bom.name}</TableCell>
                          <TableCell>{bom.productId?.name || 'N/A'}</TableCell>
                          <TableCell>{bom.productionQuantity} {bom.productionUnit}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditRecipe(bom._id)} title="Editar Receta">
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(bom._id, true)}>Ver Detalle</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateRecipeDialog
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setEditingRecipe(null);
        }}
        onSave={handleCreateOrUpdateRecipe}
        initialData={editingRecipe}
      />

      <RecipeDetailDialog
        open={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        recipeId={selectedRecipeId}
        hideCosts={!showDetailCosts}
      />
    </div>
  );
};

export default RecipesPage;
