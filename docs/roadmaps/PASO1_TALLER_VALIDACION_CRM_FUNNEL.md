# PASO 1 – Taller de validación de embudo y gobernanza CRM

## Objetivo (2h)
Validar y aprobar embudos activos (nuevo negocio, expansión), etapas/probabilidades, campos obligatorios, catálogo `reasonLost`, SLA/alertas, y reglas de ownership/visibilidad para levantar backlog técnico.

## Participantes
- Sales lead / Manager de pipeline
- Marketing lead (MQL/SQL, campañas)
- RevOps / Owner CRM
- CS/Onboarding (solo si participan en expansion/upsell)

## Agenda detallada
1) Contexto y objetivo (10m)  
   - CRM como sistema de verdad; Marketing como consumidor/enriquecedor.
2) Embudos y etapas (30m)  
   - Embudos activos: nuevo negocio, expansión/upsell (¿partners?).  
   - Etapas propuestas y probabilidades; ajustes y definiciones finales.
3) Campos obligatorios por etapa (30m)  
   - Validar campos por etapa (Calificado, Demo, Propuesta, Negociación, Perdido).  
   - Next step/Next step due obligatorio y límites (≤14 días).
4) Catálogo de razones de pérdida (15m)  
   - Lista corta y estándar; definir campo competidor opcional.
5) SLA y alertas (15m)  
   - Respuesta MQL (propuesta ≤24h); aging por etapa (alertas 7/14/21); caducidad de next step.
6) Ownership, territorios y visibilidad (15m)  
   - Territorios/equipos/colas; visibilidad (owner/team/territory); excepciones.
7) Cierre y entregables (5m)  
   - Aprobar tabla final; asignar responsables de datos y migraciones.

## Insumos previos (preparar antes de la reunión)
- Export de pipeline histórico (últimos 3-6 meses): etapas actuales, conversiones, aging, razones de pérdida capturadas.
- Acuerdos MQL→SQL vigentes y definición de MQL/SQL.
- Lista de territorios/equipos y owners actuales; leads sin owner.
- Catálogo actual de razones de pérdida y campos obligatorios existentes.

## Decisiones esperadas (salida)
- Tabla final de embudos/etapas/probabilidades + campos obligatorios por etapa.
- Catálogo `reasonLost` aprobado y cuándo capturarlo.
- SLA finales: respuesta MQL, caducidad `nextStepDue`, aging por etapa y umbrales de alerta.
- Matriz de territorios→equipos→owners y reglas de visibilidad/compartición.
- Aprobación de reglas de dedupe/merge y quién aprueba merges.

## Backlog a generar después del taller
- Schemas/validaciones: `StageHistory`, obligatoriedad por etapa, `nextStep/nextStepDue`, catálogos `reasonLost`, territorios/equipos.
- Reglas de dedupe: normalización email/phone, merges con auditoría; alertas de posibles duplicados.
- Migraciones: normalizar email/phone existentes, backfill territorios/owners, poblar `reasonLost`, crear colas para leads sin owner.
- Configuración/flags: embudos múltiples, catálogo de probabilidades editable, alertas aging/SLA.
