# Análisis Forense y Plan de Recuperación del Sistema

Este documento detalla el análisis técnico del estado actual del sistema tras el incidente de pérdida de datos y la recuperación parcial. El objetivo es identificar qué adaptaciones son necesarias para que el código actual funcione con los datos recuperados.

## 1. Integridad del Esquema de Datos

Hemos revisado los esquemas críticos (`Customer`, `Opportunity`, `Role`, `User`) comparándolos con la lógica actual de la aplicación.

### Hállazgos Clave:
*   **Permisos (CRÍTICO)**: El sistema actual espera permisos granulares (`opportunities_view_all`, etc.) que **no existen** en la base de datos recuperada, ya que esta data es anterior a esa implementación.
    *   *Impacto*: Los usuarios (incluso Administradores) verán errores de "No autorizado" o pantallas en blanco en el módulo de Oportunidades.
    *   *Solución*: El script de parche (`patch-permissions.ts`) es INDISPENSABLE para inyectar estos permisos sin borrar nada.
*   **Compatibilidad de Roles**: El código de autenticación (`JwtStrategy`) es robusto y acepta tanto permisos nuevos (texto plano) como antiguos (objetos referenciados). **No se requiere migración compleja**, solo la inyección de los nuevos valores.
*   **Integridad de Tenants**:
    *   El campo `tenantId` es obligatorio en casi todas las colecciones.
    *   **Riesgo**: Si la recuperación parcial trajo datos sin `tenantId` (o con IDs de tenants que ya no existen), esos datos serán "invisibles" en la aplicación.
*   **Cuentas Contables**: El conflicto original de "llave duplicada" está en el código de *seeding*. Como **NO** vamos a correr el seed (para proteger los datos), este conflicto es irrelevante para la operación actual.

## 2. Diagnóstico de "Data Faltante"

El usuario reporta que "falta la mitad de la data". Basado en la arquitectura, esto puede deberse a:
1.  **Pérdida real**: Los snapshots de MongoDB no capturaron transacciones recientes. (Irrecuperable técnicamente sin backups externos).
2.  **Orfandad de Datos**: Existen registros en la base de datos pero el `tenantId` no coincide con el usuario actual logueado, haciéndolos invisibles.

## 3. Plan de Acción Recomendado

Para estabilizar el sistema sin arriesgar ni un bit de información adicional:

### Paso 1: Restaurar Acceso (Seguridad)
Ejecutar el script **no destructivo** `patch-permissions.ts`.
*   **Qué hace**: Agrega los permisos faltantes (`opportunities_*`) a los roles existentes.
*   **Riesgo**: Nulo. Solo agrega, no borra ni modifica datos existentes.
*   **Resultado**: Los usuarios podrán volver a entrar al módulo de CRM y ver la data que *sí* existe.

### Paso 2: Análisis de Orfandad (Diagnóstico)
Crear y ejecutar un script de lectura (`diagnose-orphans.ts`) que cuente:
*   Cuántos Clientes/Oportunidades existen en total en la BD.
*   Cuántos tienen `tenantId` válido vs inválido.
*   Esto nos dirá si la data "perdida" está realmente borrada o solo desconectada.

## Conclusión
El código actual es compatible con la estructura de datos anterior, salvo por la falta de permisos nuevos. **No se requieren migraciones de esquema destructivas.**

Se solicita autorización para proceder con el **Paso 1 (Patch Permissions)** para restaurar la funcionalidad del CRM.
