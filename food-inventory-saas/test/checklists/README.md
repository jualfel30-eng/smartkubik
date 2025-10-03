# Testing Checklists

Este directorio contiene los checklists de testing manual para cada fase.

## Estructura:

```
checklists/
├── README.md (este archivo)
├── fase-1-employee-performance.md
├── fase-2.1-bank-movements.md
├── fase-2.2-bank-reconciliation.md
├── fase-2.3-bank-transfers.md
├── fase-3-dashboard-charts.md
└── ...
```

## Cómo usar:

1. **Antes de empezar una fase**: Leer el checklist correspondiente
2. **Durante el desarrollo**: Ir marcando tareas completadas
3. **Al terminar**: Asegurarse de que todas las casillas están marcadas
4. **Documentar problemas**: Anotar cualquier issue encontrado

## Template de Checklist:

```markdown
# CHECKLIST FASE X.Y: [Nombre]

## Prerequisitos
- [ ] Backend corriendo en http://localhost:3000
- [ ] Frontend corriendo en http://localhost:5173
- [ ] Base de datos con datos de prueba
- [ ] Feature flag activado: `ENABLE_XXX=true`

## Escenario 1: [Descripción]
- [ ] Paso 1
- [ ] Paso 2
- [ ] Verificación 1
- [ ] Verificación 2

## Escenario 2: [Descripción]
...

## Regresión (Que NO se rompió nada)
- [ ] Feature X sigue funcionando
- [ ] Feature Y sigue funcionando
- [ ] Performance similar (< Xs respuesta)

## Problemas Encontrados:
- [Dejar en blanco o documentar issues]

## Notas:
- [Cualquier observación importante]
```

## Convenciones:

- ✅ = Completado y funciona correctamente
- ❌ = Fallo o bug encontrado
- ⚠️ = Funciona pero con advertencias
- 🔄 = Requiere re-testing
