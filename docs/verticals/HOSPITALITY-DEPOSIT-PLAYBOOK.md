# 📒 Playbook – Cobros Manuales de Depósitos (Hospitality)

> **Contexto:** Venezuela permanece bloqueada del sistema financiero global, por lo que todos los cobros se gestionan manualmente a través de WhatsApp, transferencias bancarias locales, Zelle o efectivo. Este playbook estandariza el proceso operativo para evitar errores y acelerar la validación.

---

## 1. Flujo Operativo Resumido

1. **Solicitud del huésped:** el portal público muestra CTA “Escríbenos por WhatsApp” junto a la instrucción del depósito requerido.
2. **Registro inicial:** al crear la cita, el sistema genera una tarea de cobro y deja el depósito en estado `submitted`.
3. **Recepción del comprobante:** el agente solicita la evidencia (captura o PDF) y lo registra en el administrador (monto, método, referencia, adjunto).
4. **Validación:** se revisa contra los estados de cuenta internos utilizando la checklist (sección 3).
5. **Confirmación:** al validar, se marca el depósito como confirmado, lo que genera movimiento bancario + asiento contable (`Anticipos de Clientes`).
6. **Seguimiento:** los depósitos pendientes se monitorean desde `Hospitality ▸ Depósitos` en el administrador.

---

## 2. Plantillas de Mensajes (WhatsApp)

### 2.1 Solicitud inicial (depósito nacional VES)
```
Hola {{nombre_huesped}} 👋

Gracias por reservar {{servicio}} el {{fecha}} a las {{hora}}.

🧾 Depósito requerido: {{monto_ves}} VES
🏦 Banco: {{banco}}
👤 Titular: {{titular}}
📄 Cédula / RIF: {{documento}}
💳 Cuenta: {{numero_cuenta}}

Envía por favor la captura del comprobante a este chat cuando la tengas. 
Con gusto la validaremos y confirmaremos tu cita ✅.
```

### 2.2 Solicitud alternativa (Zelle / USD)
```
Hola {{nombre_huesped}}, para confirmar tu {{servicio}} necesitamos un depósito de {{monto_usd}} USD vía Zelle.

Cuenta Zelle:
• Correo: {{correo_zelle}}
• Titular: {{titular_zelle}}

Por favor comparte el comprobante en este chat. Apenas lo validemos, recibirás la confirmación 👍.
```

### 2.3 Recordatorio de evidencia pendiente
```
Hola {{nombre_huesped}}, te recordamos que aún no hemos recibido el comprobante del depósito para {{servicio}} el {{fecha}}.

Si ya lo enviaste, por favor confírmanos; de lo contrario, envíanos una foto o PDF del comprobante para finalizar la reserva. ¡Gracias!
```

### 2.4 Confirmación post-validación
```
¡Listo {{nombre_huesped}}! 🎉

Validamos tu depósito de {{monto}} {{moneda}} para {{servicio}} el {{fecha}}.

Tu reserva queda confirmada ✅. 
Si necesitas reprogramar o cancelar, escríbenos con al menos {{horas_cancelacion}} horas de anticipación.
```

---

## 3. Checklist de Validación

1. **Coincidencia de monto** (en VES o USD) con el registro en el administrador.
2. **Referencia legible** y consistente con el banco/emisor declarado.
3. **Banco emisor permitido:** ver lista de bancos aceptados por la organización.
4. **Fecha y hora** del depósito dentro de la ventana aceptada (sincronizada con cut-off diario).
5. **Datos del titular** coinciden con registros previos o no activan alertas de fraude.
6. **Saldo reflejado** en el estado de cuenta / banca en línea.
7. Registrar cualquier discrepancia en el campo “Notas de resolución”.

> **Tip:** usa el dashboard de depósitos pendientes para trabajar de izquierda a derecha y cerrar primero los depósitos más antiguos.

---

## 4. Gestión desde el Dashboard de Depósitos

1. Ingresar al administrador → menú `Hospitality ▸ Depósitos`.
2. Revisar los cards de resumen:
   - Depósitos pendientes por moneda.
   - Total de solicitudes abiertas y antigüedad promedio.
3. Filtrar u ordenar la tabla por fecha de creación o servicio.
4. Usar los botones de acción:
   - `Copiar mensaje`: genera automáticamente la solicitud personalizada para pegar en WhatsApp.
   - `Ver en citas`: abre la agenda en la cita correspondiente para capturar detalles adicionales.
5. Una vez validado el depósito, confirmar directamente en la pantalla de citas para disparar el movimiento bancario y el asiento contable.

---

## 5. Buenas Prácticas

- **Guardar plantillas** en WhatsApp Business como respuestas rápidas para evitar errores al escribir.
- **Rotar agentes** encargados de validar para cubrir fines de semana y feriados.
- **Documentar discrepancias** en “Notas de resolución” para futuros seguimientos o auditorías.
- **Exportar semanalmente** el dashboard a CSV (pendiente en Fase 5) y compartir con Finanzas y Operaciones.

---

## 6. Referencias Relacionadas

- `DOC-FLUJO-PAGOS-COMPRAS-CONTABILIDAD-CUENTAS-BANCARIAS.md` – sección 6.
- `AppointmentsManagement.jsx` – confirmar depósitos y revisar historial.
- `HospitalityDepositsDashboard.jsx` – monitoreo operativo.
