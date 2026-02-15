# Doc - Flujo Integrado Productos, Inventario y Compras

> **Version cubierta:** v1.03  
> **Objetivo:** describir como se conectan los modulos `Productos`, `Inventario` y `Compras` para soportar el ciclo completo de abastecimiento y venta.

## 1. Resumen del flujo
```
Definir producto (catalogo) 
    ↓ crea SKU, reglas de stock, unidades, impuestos
Ingresar inventario inicial (manual o compra) 
    ↓ registra lotes, costo promedio, alertas
Reponer mediante ordenes de compra
    ↓ alimenta inventario + payables + contabilidad
Vender (Orders Management)
    ↓ descuenta stock segun reglas FEFO y unidades
Monitorear alertas (stock, vencimiento) 
    ↓ activa nueva orden de compra o ajuste
```

## 2. Dependencias entre modulos

| Información base | Se define en | Consumido por | Uso |
|------------------|-------------|---------------|-----|
| SKU, nombre, categoria, unidad base, perecible | Productos | Inventario, Compras, Ventas, Storefront | Identificación consistente y conversiones de unidades |
| Configuracion de inventario (min/max, reorden, FEFO) | Productos | Inventario, Compras | Calcula alertas, propuestas de compra y reservas |
| Unidades de venta multiples | Productos | Ventas, Compras | Define precios, conversiones y unidades disponibles |
| Costos promedio e historico de lotes | Inventario | Compras, Contabilidad | Calcula margenes, IGTF, COGS |
| Alertas de stock/vencimiento | Inventario | Compras | Genera recomendaciones de reorden |
| Ordenes de compra y recepciones | Compras | Inventario, Payables, Contabilidad | Ingresan stock, crean cuentas por pagar y asientos contables |

## 3. Escenario A: Alta de producto nuevo
1. **Crear producto** en `Productos`: definir SKU, categoria, impuestos, configuracion FEFO y unidades de venta.  
2. **Registrar inventario inicial**:  
   - Opcion rapida: `Compras > Crear Producto + Compra Inicial`.  
   - Opcion manual: `Inventario > Agregar Inventario` usando el producto recien creado.  
3. **Verificar stock** en `Inventario` (revisar badges y lotes).  
4. **Habilitar para ventas** en `Orders Management` (units y precios se alimentan automaticamente).  
5. **Publicar en storefront** si el tenant utiliza la tienda. Controlar imagenes y descripcion desde Productos.

## 4. Escenario B: Reposicion por stock critico
1. **Detectar alerta**: en `Compras` revisar tarjetas de `Stock Critico` o `Proximo a Vencer`. Tambien disponible en export de inventario.  
2. **Generar orden de compra**:  
   - Click en `Reordenar` o `Añadir Inventario`.  
   - Seleccionar proveedor (existente o nuevo) y ajustar cantidades/costos.  
   - Definir condiciones de pago (credito, anticipo, metodos).  
   - Guardar; el sistema crea la orden, ingresa inventario y genera el Payable.  
3. **Confirmar recepcion**: los items aumentan stock disponible en `Inventario`, actualizando costo promedio y lotes.  
4. **Liquidar cuentas**: Finanza usa `Cuentas por Pagar` para registrar pagos segun las condiciones definidas.  
5. **Auditar**: verificar en `Inventario` y `Contabilidad` que los movimientos cuadren (reportes Accounts Payable y Cash Flow).

## 5. Escenario C: Ajuste por conteo fisico
1. **Exportar inventario** desde el modulo de Inventario (Excel/CSV).  
2. **Realizar conteo** fisico externo.  
3. **Importar ajustes** en `Inventario` usando la plantilla (`SKU`, `NuevaCantidad`).  
4. **Registrar razon** del ajuste masivo (obligatoria).  
5. **Revisar impactos**:  
   - `Accounting > Libro Diario` para ver asiento de ajuste.  
   - `Compras` para evaluar si se requieren reordenes adicionales.  
   - `Productos` si algun SKU necesita ajustar puntos de reorden.

## 6. Recomendaciones para configuracion inicial del tenant
- Configurar primero el plan de cuentas y metodos de pago para que las compras caigan en cuentas correctas.  
- Definir categorias y subcategorias en Productos antes de importar masivamente.  
- Establecer unidades base coherentes (ej: siempre kg para carnes) y usar unidades de venta con factores de conversion claros.  
- Activar `trackLots` y `trackExpiration` solo cuando el proceso operativo pueda mantener esos datos; de lo contrario deshabilitarlos para evitar friccion.

## 7. Puntos de soporte comunes
- **Stock no disminuye al vender:** revisar que el producto tenga `hasMultipleSellingUnits` configurado correctamente y que el inventario tenga unidades disponibles en la unidad base.  
- **Alertas vacias:** confirmar que `inventoryConfig.minimumStock` y `reorderPoint` no sean cero; ejecutar `Actualizar` en Inventario para refrescar datos.  
- **Orden de compra sin proveedor:** el formulario exige `supplierName`, `supplierRif` y `contactName`. Validar formato del RIF y que el módulo de CRM tenga el proveedor con `customerType = supplier`.  
- **Doble entrada de stock:** si se usa `Crear Producto + Compra Inicial` y luego se registra la misma compra manualmente, se duplicara. Recomendar elegir solo un camino o ajustar inventario posteriormente.  
- **Precios inconsistentes:** la orden de compra solo actualiza el costo; los precios de venta deben gestionarse en Productos (unidades) o desde el motor de precios (Orders Management).

## 8. Referencias adicionales
- Documentos: `DOC-MODULO-PRODUCTOS.md`, `DOC-MODULO-INVENTARIO.md`, `DOC-MODULO-COMPRAS.md`.  
- API: revisar `products.controller.ts`, `inventory.controller.ts`, `purchases.controller.ts` para conocer validaciones y payloads.  
- Scripts: `scripts/seed-restaurant.ts` y `scripts/seed-database.ts` incluyen ejemplos de datos iniciales (util para pruebas QA).  
- Reportes: `AccountingManagement`, `AccountsPayableReport`, `Dashboard` para monitorear impacto financiero de las operaciones de inventario.

