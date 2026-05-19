---
name: wiki-sync
description: Hook PostToolUse que tras commits que tocan food-inventory-saas/src/modules/** identifica el módulo, lee system-map.md y propone diff para mantener sincronizado el wiki. Extiende el wiki-change-detector.sh actual (que solo detecta) para que además sugiera el cambio.
trigger: hook PostToolUse Bash (git commit)
---

# wiki-sync

## Cuándo se invoca

Hook automático del harness, NO manualmente. Se dispara tras `git commit` exitoso.

Cadena de hooks (orden importa):

1. `scripts/wiki-change-detector.sh` (Capa 1, bash, sin IA): mapea archivos modificados → módulos wiki, escribe entrada base en `docs/wiki/.pending-reviews.md`.
2. `node .claude/skills/wiki-sync/sync.js` (Capa 2, Node, sin IA): si el commit toca controllers/services/DTOs/schemas backend, **enriquece** la entrada con findings concretos extraídos del diff.

## v2 (actual) — qué hace `sync.js`

1. Lista archivos del último commit: `git show --stat --name-only HEAD`.
2. Filtra los relevantes:
   - `food-inventory-saas/src/modules/<X>/.../*.{controller,service,schema,dto}.ts`
   - `food-inventory-saas/src/{dto,schemas}/*.{dto,schema,entity}.ts` (carpetas globales — el módulo se infiere por nombre vía `SINGULAR_TO_MODULE`).
3. Por cada módulo afectado, parsea el diff con regex (no AST):
   - **Controllers**: endpoints `@Get/@Post/@Put/@Patch/@Delete('/path')` añadidos vs eliminados.
   - **Services**: métodos públicos nuevos (firmas `+  async methodName(`, excluye `private`).
   - **DTOs**: count de `@ApiProperty` / `@ApiPropertyOptional` añadidos/eliminados.
   - **Schemas**: count de `@Prop()` añadidos/eliminados.
4. Anexa al final de `docs/wiki/.pending-reviews.md` un bloque markdown delimitado por `<!-- wiki-sync:enrichment commit=... -->` con:
   - Findings agrupados por módulo (con emojis para escaneo rápido).
   - Lista de docs sugeridos a actualizar (checkboxes), basada en el tipo de cambio.

**No hace**: modificar archivos del wiki, commitear, pedir confirmación al usuario, llamar a un LLM. Es 100% determinístico, costo cero, <1s.

## Output ejemplo

Tras el commit `bb76281ce` (`feat(products,inventory): auto-create Inventory when creating a Product`), el bloque enriquecido es:

```markdown
<!-- wiki-sync:enrichment commit=bb76281ce -->
### 🤖 wiki-sync v2 — análisis de `bb76281ce`

> feat(products,inventory): auto-create Inventory when creating a Product

**Módulo `products`**

- 🆕 Métodos service nuevos: `bulkCreate()`
- 📝 DTO `product.dto.ts`: campos +2 (revisar @ApiProperty)

  **Docs sugeridos a actualizar**:
  - [ ] `docs/wiki/modules/products/functions.md`
  - [ ] `docs/wiki/modules/products/api-reference.md` (request body)
  - [ ] `docs/wiki/system-map.md` §1.x (contrato del módulo)

**Módulo `inventory`**

- 🆕 Métodos service nuevos: `createInitialInventoriesForProductInGroup()`

  **Docs sugeridos a actualizar**:
  - [ ] `docs/wiki/modules/inventory/functions.md`

<!-- /wiki-sync:enrichment -->
```

El usuario (o un agente "Bibliotecario" futuro) revisa los checkboxes en `.pending-reviews.md`, edita los docs, y borra el bloque al cerrar la review.

## Limitaciones conocidas

- **Heurística regex, no AST**: si la firma de un método se escribe en varias líneas o un endpoint usa `@Controller` con base path, puede haber falsos positivos/negativos. v3 podría usar `ts-morph`.
- **Mapa `SINGULAR_TO_MODULE` hardcoded**: si se añade un nuevo schema global cuyo singular no está mapeado, se reportará bajo el nombre del archivo (revisable). Mantener actualizado a mano.
- **Métodos con firma cambiada cuentan como "nuevos"**: el regex no distingue entre método nuevo y método cuyo signature cambió. Esto es OK como señal de "revisar" pero sobrecuenta.
- **No detecta cambios al Schema TypeScript fuera de `@Prop`**: indices nuevos, virtuals, hooks pre/post-save — todo invisible al detector.

## Configuración (en `.claude/settings.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "if": "Bash(git commit *)", "command": "zsh scripts/wiki-change-detector.sh", "timeout": 10 },
          { "type": "command", "if": "Bash(git commit *)", "command": "node .claude/skills/wiki-sync/sync.js", "timeout": 30 }
        ]
      }
    ]
  }
}
```

## Verificación

Tras un commit que toca un módulo backend:

```bash
git log -1 --stat                              # ver archivos modificados
tail -40 docs/wiki/.pending-reviews.md         # ver entrada base + bloque enriquecido
grep "wiki-sync:enrichment" docs/wiki/.pending-reviews.md  # contar bloques pendientes
```

Smoke-test manual contra un commit histórico (no modifica archivos reales):

```bash
# Copia y parchea (aquí usamos bb76281ce como ejemplo):
cp .claude/skills/wiki-sync/sync.js /tmp/test.js
sed -i '' "s|--pretty=format: HEAD|--pretty=format: bb76281ce|" /tmp/test.js
sed -i '' "s|rev-parse --short HEAD|rev-parse --short bb76281ce|" /tmp/test.js
sed -i '' "s|log -1 --pretty=format:%s'|log -1 --pretty=format:%s bb76281ce'|" /tmp/test.js
sed -i '' "s|show HEAD --|show bb76281ce --|" /tmp/test.js
sed -i '' "s|docs/wiki/.pending-reviews.md|.pending-test.md|" /tmp/test.js
node /tmp/test.js && cat .pending-test.md && rm -f .pending-test.md
```

## Rationale del diseño

- **Cero IA por hook**: cada commit dispara el hook, así que el costo debe ser cero. Análisis con LLM se delega a un agente "Bibliotecario" que el usuario invoca explícitamente cuando quiere procesar el inbox.
- **No tocar el wiki automáticamente**: cualquier escritura a `modules/<X>/*.md` o `system-map.md` requiere revisión humana — el wiki es la fuente de verdad para nuevos contributors y un cambio mal sugerido contamina el contexto futuro.
- **Append-only en `.pending-reviews.md`**: el detector y el sync son fire-and-forget. La curaduría (mover a "Procesado", descartar) es manual o vía agente con contexto.
