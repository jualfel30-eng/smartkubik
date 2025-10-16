# CHECKLIST FASE 1: Rendimiento de Empleados

## Prerrequisitos
- [ ] Backend corriendo en http://localhost:3000
- [ ] Frontend corriendo en http://localhost:5173
- [ ] Base de datos con órdenes y usuarios con turnos activos
- [ ] Feature flag activado: `ENABLE_EMPLOYEE_PERFORMANCE=true`

## Escenario 1: Asignación automática con turno activo
- [ ] Iniciar sesión con usuario que tenga turno activo
- [ ] Crear una orden desde el frontend
- [ ] Verificar en MongoDB que la orden guarda `assignedTo` con el ID del usuario
- [ ] Confirmar que la orden aparece en el reporte de rendimiento del empleado

## Escenario 2: Usuario sin turno activo
- [ ] Iniciar sesión con usuario sin turno activo
- [ ] Crear una orden
- [ ] Validar que la orden no tiene `assignedTo`
- [ ] Confirmar que se registró una advertencia en los logs (no debe fallar la creación)

## Escenario 3: Visualización en UI
- [ ] Ir a Órdenes > Gestión de Órdenes V2
- [ ] Ver columna “Atendido Por” con el nombre del empleado asignado
- [ ] Confirmar que órdenes sin asignación muestran guion o estado vacío

## Escenario 4: Tests automatizados
- [ ] Ejecutar `npm test -- orders.service` y asegurar que los nuevos casos pasan
- [ ] Revisar cobertura (mínimo mantener porcentaje previo)

## Regresión (que NO se rompió nada)
- [ ] Creación de órdenes sin flag activa sigue funcionando
- [ ] Reportes existentes calculan totales correctamente
- [ ] Tiempo de respuesta promedio < 2s

## Problemas encontrados
- [ ] Documentar cualquier incidencia

## Notas
- [ ] Registrar screenshots o evidencias relevantes
