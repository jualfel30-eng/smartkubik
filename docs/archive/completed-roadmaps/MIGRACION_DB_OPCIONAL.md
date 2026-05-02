# Migración de Base de Datos (Opcional)

## ⚠️ Nota Importante

Los cambios al schema son **backwards compatible**. Las transferencias existentes seguirán funcionando sin necesidad de migración.

Sin embargo, si quieres asegurar consistencia total, puedes ejecutar esta migración para agregar los campos nuevos con valores por defecto a los documentos existentes.

---

## 🔄 Script de Migración MongoDB

```javascript
// Conectar a tu base de datos MongoDB
use test  // o el nombre de tu base de datos en producción

// Actualizar todas las transferencias existentes
db.transferorders.updateMany(
  { type: { $exists: false } },  // Solo documentos sin el campo type
  {
    $set: {
      // Campo type por defecto: push (mantiene comportamiento actual)
      type: "push",

      // Campos de discrepancias
      hasDiscrepancies: false,
      discrepancies: [],

      // Campos opcionales (null por defecto está bien)
      approvalReviewedBy: null,
      approvalReviewedAt: null,
      approvalDecision: null,
      approvalNotes: null,
      inPreparationBy: null,
      inPreparationAt: null,
      trackingNumber: null,
      carrier: null,
      estimatedArrival: null,
      receiptNotes: null
    }
  }
)

// Migrar estados antiguos a estados nuevos
db.transferorders.updateMany(
  { status: "requested", type: "push" },
  { $set: { status: "push_requested" } }
)

db.transferorders.updateMany(
  { status: "approved", type: "push" },
  { $set: { status: "push_approved" } }
)

// Verificar migración
db.transferorders.count({ type: { $exists: false } })
// Debe retornar: 0

db.transferorders.count({ type: "push" })
// Debe retornar: número de transferencias existentes

// Ver ejemplo de documento migrado
db.transferorders.findOne()
```

---

## 📊 Verificación Post-Migración

### 1. Verificar que todas tienen `type`:
```javascript
db.transferorders.count({ type: { $exists: false } })
// Esperado: 0
```

### 2. Verificar estados:
```javascript
// No debe haber estados antiguos
db.transferorders.count({ status: "requested" })
db.transferorders.count({ status: "approved" })
// Esperado: 0 para ambos

// Deben existir estados nuevos
db.transferorders.count({ status: "push_requested" })
db.transferorders.count({ status: "push_approved" })
```

### 3. Verificar índices:
```javascript
db.transferorders.getIndexes()
// Debe incluir: { tenantId: 1, type: 1, status: 1 }
```

---

## 🚨 Rollback (Si algo sale mal)

```javascript
// Revertir estados
db.transferorders.updateMany(
  { status: "push_requested" },
  { $set: { status: "requested" } }
)

db.transferorders.updateMany(
  { status: "push_approved" },
  { $set: { status: "approved" } }
)

// Eliminar campos nuevos
db.transferorders.updateMany(
  {},
  {
    $unset: {
      type: "",
      hasDiscrepancies: "",
      discrepancies: "",
      approvalReviewedBy: "",
      approvalReviewedAt: "",
      approvalDecision: "",
      approvalNotes: "",
      inPreparationBy: "",
      inPreparationAt: "",
      trackingNumber: "",
      carrier: "",
      estimatedArrival: "",
      receiptNotes: ""
    }
  }
)
```

---

## ✅ ¿Es Necesaria Esta Migración?

### NO necesitas migrar si:
- ✅ Tu sistema está en desarrollo/staging
- ✅ No tienes transferencias antiguas en la DB
- ✅ Estás OK con que las transferencias antiguas no tengan el campo `type` (funcionarán igual)

### SÍ deberías migrar si:
- ⚠️ Estás en producción con muchas transferencias existentes
- ⚠️ Quieres que todas las transferencias tengan consistencia de schema
- ⚠️ Planeas usar reportes/analytics que dependen del campo `type`
- ⚠️ Quieres evitar warnings de validación en logs

---

## 🎯 Recomendación

**Para desarrollo:** No es necesario migrar, el código maneja ambos casos.

**Para producción:** Ejecuta la migración en una ventana de mantenimiento para asegurar consistencia total.
