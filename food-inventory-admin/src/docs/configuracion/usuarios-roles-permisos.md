---
title: "Cómo Gestionar Usuarios, Roles y Permisos"
description: "Aprende a crear usuarios, asignar roles con permisos específicos, habilitar 2FA, y cambiar entre organizaciones."
category: "configuracion"
slug: "usuarios-roles-permisos"
keywords: ["usuarios", "roles", "permisos", "seguridad", "2FA", "organización", "login"]
author: "Equipo SmartKubik"
date: "2026-04-28"
readTime: "8 min"
industry: "Todas"
problem: "Necesitas controlar quién tiene acceso al sistema y qué puede hacer cada persona."
solution: "SmartKubik usa un sistema de roles y permisos granulares donde cada usuario tiene un rol que define exactamente qué puede ver y hacer."
quickAnswer: |
  1. Ve a Configuración → Usuarios
  2. Haz clic en "Nuevo Usuario"
  3. Asigna un rol (Administrador, Vendedor, etc.)
  4. Los permisos se configuran por rol en Configuración → Roles
---

# Cómo Gestionar Usuarios, Roles y Permisos

## ¿Dónde se configura?

**Menú lateral:** Configuración (ícono ⚙️) → pestaña **Usuarios** o **Roles**

**Ruta directa:** `/settings?tab=users` o `/settings?tab=roles`

---

## Crear un usuario

1. Ve a **Configuración → Usuarios**
2. Haz clic en **"Invitar Usuario"**
3. Ingresa: nombre, email, y selecciona un **rol**
4. El usuario recibe un email de invitación
5. Al aceptar, crea su contraseña y puede acceder

> Cada usuario tiene UN rol por organización. Si pertenece a varias organizaciones, puede tener roles diferentes en cada una.

---

## Gestionar roles

Un **rol** es un conjunto de permisos. Ejemplos comunes:

| Rol | Permisos típicos |
|-----|-------------------|
| **Administrador** | Todo |
| **Vendedor** | Ver/crear órdenes, ver inventario, ver clientes |
| **Almacenero** | Ver/editar inventario, ver productos |
| **Cajero** | Crear órdenes, abrir/cerrar caja |
| **Contador** | Ver contabilidad, reportes, facturación |

### Crear un rol personalizado

1. Ve a **Configuración → Roles**
2. Haz clic en **"Crear Rol"**
3. Dale un nombre y descripción
4. Marca los permisos que quieres asignar (agrupados por módulo)
5. Guarda

Los permisos están organizados por módulo: Inventario, Órdenes, Clientes, Contabilidad, etc. Cada módulo tiene: crear, leer, actualizar, eliminar.

---

## Seguridad de la cuenta

### Cambiar contraseña
**Configuración → Seguridad → Cambiar Contraseña**

### Autenticación de dos factores (2FA)
Para mayor seguridad, puedes activar 2FA:
1. Descarga una app de autenticación (Google Authenticator, Authy)
2. Escanea el código QR
3. Ingresa el código de verificación
4. Guarda los **códigos de respaldo** (úsalos si pierdes acceso a la app)

> Con 2FA activo, cada login pedirá el código de 6 dígitos además de la contraseña.

---

## Cambiar entre organizaciones

Si administras más de un negocio:
1. Haz clic en el **nombre de la organización** en la parte superior del sidebar
2. Selecciona otra organización
3. El sistema recarga con los datos de la nueva organización
4. Puedes marcar una como **predeterminada** para que se abra automáticamente al iniciar sesión

---

## Problemas comunes

### "Un usuario no puede ver el módulo de Inventario"

**Causa:** Su rol no tiene los permisos `inventory_read`, `inventory_create`, etc.

**Solución:** Ve a **Configuración → Roles** → edita el rol del usuario → marca los permisos de Inventario.

**Pero también verifica:** Que el módulo esté **habilitado** para tu organización. Algunos módulos dependen del plan de suscripción.

### "Olvidé mi contraseña"

En la pantalla de login, haz clic en **"¿Olvidaste tu contraseña?"** → ingresa tu email → recibirás un enlace para resetear.

### "Perdí acceso al 2FA"

Usa uno de los **códigos de respaldo** que guardaste al activar 2FA. Cada código es de un solo uso. Si no tienes códigos, contacta al administrador del sistema.

### "¿Cómo sé qué permisos tiene un usuario?"

Ve a **Configuración → Roles** → busca el rol asignado al usuario → verás todos los permisos marcados.

### "Quiero que un usuario solo pueda ver órdenes, no crearlas"

Crea un rol personalizado que solo tenga `orders_read` (sin `orders_create`, `orders_update`, `orders_delete`).

---

*¿No encontraste lo que buscabas? Usa el Asistente IA (✨) dentro de la plataforma.*
