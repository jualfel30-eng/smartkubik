# Roadmap - Módulo Contable (Accounting ERP)

## Estado Actual del Proyecto

### ✅ Completado - Unificación Estética

Todos los componentes del módulo de contabilidad han sido migrados de Material-UI a shadcn/ui para mantener consistencia visual con el resto del sistema:

- **AccountingPeriods.jsx** - Períodos contables
- **TrialBalance.jsx** - Balance de comprobación
- **GeneralLedger.jsx** - Libro mayor
- **RecurringEntries.jsx** - Asientos recurrentes
- **ElectronicInvoicesManager.jsx** - Facturas electrónicas SENIAT
- **IslrWithholdingList.jsx** - Lista de retenciones ISLR
- **IslrWithholdingForm.jsx** - Formulario de retenciones ISLR

### ⚠️ Componentes con Material-UI que Requieren Migración

Los siguientes componentes aún usan Material-UI y deben migrarse a shadcn/ui:

1. **IvaWithholdingList.jsx** - Lista de retenciones IVA
2. **IvaWithholdingForm.jsx** - Formulario de retenciones IVA
3. **SeniatValidation.jsx** (si existe) - Validación SENIAT

---

## 🚧 Módulo de Billing (Facturación Electrónica)

### Problema Actual

El módulo de `BillingModule` está **desactivado** en [app.module.ts](../food-inventory-saas/src/app.module.ts) debido a errores de TypeScript:

```typescript
// Error: Property 'xml' does not exist on type 'BillingEvidence'
// Líneas 469 y 484 de billing.service.ts
```

### Tareas Pendientes

#### 1. Completar Schema de BillingEvidence

**Archivo:** `food-inventory-saas/src/schemas/billing-evidence.schema.ts`

**Problema:** Falta la propiedad `xml` en el esquema

**Solución:**
```typescript
@Schema({ timestamps: true })
export class BillingEvidence {
  // ... propiedades existentes ...

  @Prop({ type: String, required: false })
  xml?: string; // XML SENIAT generado

  @Prop({ type: String, required: false })
  xmlHash?: string; // Hash del XML para validación
}
```

#### 2. Implementar Servicio de Evidencias

**Archivos Relacionados:**
- `food-inventory-saas/src/modules/billing/billing-evidences.service.ts`
- `food-inventory-saas/src/modules/billing/billing-evidences.controller.ts`

**Tareas:**
- [ ] Validar que el servicio de evidencias guarde correctamente el XML
- [ ] Implementar generación de hash para integridad del XML
- [ ] Agregar validación de estructura del XML según normas SENIAT

#### 3. Completar Integración SENIAT

**Archivos Relacionados:**
- `food-inventory-saas/src/modules/billing/billing.service.ts` (líneas 400-602)
- `food-inventory-saas/src/modules/billing/billing.controller.ts` (líneas 107-189)

**Endpoints que ya existen (pero módulo desactivado):**
- `POST /billing/documents/:id/validate-seniat` - Validar documento
- `POST /billing/documents/:id/generate-xml` - Generar XML
- `GET /billing/documents/:id/seniat-xml` - Descargar XML
- `GET /billing/stats/electronic-invoices` - Estadísticas ✅ (implementado)

**Tareas:**
- [ ] Validar formato XML según especificaciones SENIAT 2025
- [ ] Implementar generación de código QR con datos del documento
- [ ] Crear certificado digital para firma electrónica
- [ ] Implementar envío a portal SENIAT
- [ ] Manejar respuestas y estados de timbre fiscal

#### 4. Testing y Validación

**Tareas:**
- [ ] Crear suite de tests para validación XML
- [ ] Probar generación de documentos fiscales
- [ ] Validar cálculos de impuestos (IVA, IGTF, etc.)
- [ ] Test de integración con módulo de contabilidad

---

## 📋 Componentes Adicionales del Módulo Contable

### Retenciones IVA

**Archivos:**
- `food-inventory-admin/src/components/accounting/IvaWithholdingList.jsx`
- `food-inventory-admin/src/components/accounting/IvaWithholdingForm.jsx`

**Estado:** Usan Material-UI

**Tareas:**
- [ ] Migrar `IvaWithholdingList.jsx` a shadcn/ui
- [ ] Migrar `IvaWithholdingForm.jsx` a shadcn/ui
- [ ] Verificar integración con backend
- [ ] Probar flujo completo de retenciones IVA

### Reportes Fiscales

**Tareas Pendientes:**
- [ ] Libro de Compras (Purchase Book)
- [ ] Libro de Ventas (Sales Book) - Ya existe endpoint básico
- [ ] Reporte de Retenciones ISLR por período
- [ ] Reporte de Retenciones IVA por período
- [ ] Declaración de IVA (Formulario 30)
- [ ] Relación de Facturas Emitidas
- [ ] Relación de Comprobantes de Retención

### Cierre Contable

**Tareas Pendientes:**
- [ ] Proceso de cierre mensual
- [ ] Proceso de cierre anual
- [ ] Asientos de ajuste automáticos
- [ ] Cálculo de depreciación
- [ ] Estados financieros (Balance General, Estado de Resultados)

---

## 🔧 Mejoras Técnicas

### Performance

- [ ] Optimizar queries de libro mayor (agregar índices)
- [ ] Implementar cache para reportes frecuentes
- [ ] Lazy loading de asientos contables en grids grandes

### UX/UI

- [ ] Agregar tooltips explicativos en formularios complejos
- [ ] Implementar wizard para configuración inicial
- [ ] Mejorar feedback visual en procesos largos (cierre contable, generación de reportes)
- [ ] Agregar preview antes de contabilizar

### Validaciones

- [ ] Validar que períodos no se traslapen
- [ ] Prevenir modificación de períodos cerrados
- [ ] Validar balance de asientos (débito = crédito)
- [ ] Validar existencia de catálogo de cuentas antes de operaciones

---

## 📅 Prioridades

### Alta Prioridad (Crítico para operación)
1. ✅ Migrar componentes ISLR a shadcn/ui
2. 🔴 Migrar componentes IVA a shadcn/ui
3. 🔴 Completar schema de BillingEvidence
4. 🔴 Activar y probar módulo de Billing

### Media Prioridad (Importantes para cumplimiento fiscal)
1. Implementar Libro de Compras
2. Implementar reportes de retenciones
3. Proceso de cierre mensual
4. Declaración de IVA

### Baja Prioridad (Nice to have)
1. Optimizaciones de performance
2. Estados financieros avanzados
3. Análisis predictivo
4. Integración con software contable externo

---

## 📚 Documentación Relacionada

- [Normativa SENIAT - Facturación Electrónica](https://www.seniat.gob.ve)
- [Material-UI Migration Guide](../MARKETING_MIGRATION_GUIDE.md)
- [Integración Contable](../DOC-MODULO-CONTABILIDAD.md)
- [Flujo de Pagos y Contabilidad](../DOC-FLUJO-PAGOS-COMPRAS-CONTABILIDAD-CUENTAS-BANCARIAS.md)

---

## 🎯 Meta Final

Tener un módulo de contabilidad completamente funcional que:
- ✅ Cumpla con todas las normativas fiscales venezolanas
- ✅ Integre perfectamente con otros módulos (ventas, compras, pagos)
- ✅ Genere todos los reportes fiscales requeridos
- ✅ Permita facturación electrónica según SENIAT
- ✅ Facilite procesos de auditoría y revisión

---

**Última actualización:** 10 de diciembre, 2025
**Responsable:** Equipo de Desarrollo SmartKubik
