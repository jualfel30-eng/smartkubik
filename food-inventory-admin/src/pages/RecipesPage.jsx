import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, List, DollarSign, Plus, ChefHat } from 'lucide-react';

const RecipesPage = () => {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
          <p className="text-gray-600 mt-2">
            Gestiona las recetas y costos de los platillos
          </p>
        </div>
        <Button>
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
              <CardTitle>Listado de Recetas</CardTitle>
              <CardDescription>
                Todas las recetas registradas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay recetas registradas</p>
                <p className="text-sm mt-2">
                  Crea tu primera receta para empezar a gestionar costos
                </p>
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Receta
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costing" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Costo Total Inventario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor total del inventario
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margen de ganancia promedio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Food Cost %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Porcentaje de costo de alimentos
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Análisis de Costos por Receta</CardTitle>
              <CardDescription>
                Desglose detallado de costos de ingredientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay datos de costeo disponibles</p>
                <p className="text-sm mt-2">
                  Crea recetas y registra precios de ingredientes para ver el análisis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Categorías de Recetas</CardTitle>
              <CardDescription>
                Organiza tus recetas por categorías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Entradas</h3>
                      <p className="text-sm text-muted-foreground">0 recetas</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Platos Principales</h3>
                      <p className="text-sm text-muted-foreground">0 recetas</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Postres</h3>
                      <p className="text-sm text-muted-foreground">0 recetas</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Bebidas</h3>
                      <p className="text-sm text-muted-foreground">0 recetas</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecipesPage;
