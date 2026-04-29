#!/bin/zsh
# =============================================================================
# SmartKubik Wiki Change Detector (Capa 1)
#
# Corre después de cada commit. NO usa IA. Costo: cero.
# Detecta qué archivos cambiaron, los mapea a módulos documentados en la wiki,
# y registra los cambios pendientes en docs/wiki/.pending-reviews.md
#
# Tiempo de ejecución: <1 segundo
# Compatible con macOS (zsh)
# =============================================================================

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  exit 0
fi

PENDING_FILE="$REPO_ROOT/docs/wiki/.pending-reviews.md"
WIKI_DIR="$REPO_ROOT/docs/wiki"

# Si no existe la wiki, no hay nada que detectar
if [ ! -d "$WIKI_DIR" ]; then
  exit 0
fi

# Obtener archivos del último commit
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)
if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

# Obtener metadata del commit
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null)
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null)
COMMIT_DATE=$(date "+%Y-%m-%d %H:%M")
COMMIT_AUTHOR=$(git log -1 --pretty=format:"%an" 2>/dev/null)

# ─────────────────────────────────────────────────────────────
# Mapeo: ruta de archivo fuente → módulo documentado en la wiki
# ─────────────────────────────────────────────────────────────
map_file_to_module() {
  local file="$1"

  # ── Backend modules ──
  case "$file" in
    food-inventory-saas/src/modules/inventory/*|food-inventory-saas/src/modules/inventory-movements/*)
      echo "inventory"; return ;;
    food-inventory-saas/src/modules/products/*|food-inventory-saas/src/modules/product-dedup/*|food-inventory-saas/src/modules/price-lists/*|food-inventory-saas/src/modules/price-history/*)
      echo "products"; return ;;
    food-inventory-saas/src/modules/purchases/*|food-inventory-saas/src/modules/suppliers/*)
      echo "purchases"; return ;;
    food-inventory-saas/src/modules/orders/*|food-inventory-saas/src/modules/cash-register/*)
      echo "orders"; return ;;
    food-inventory-saas/src/modules/transfer-orders/*|food-inventory-saas/src/modules/warehouses/*)
      echo "transfers"; return ;;
    food-inventory-saas/src/modules/customers/*|food-inventory-saas/src/modules/opportunities/*|food-inventory-saas/src/modules/opportunity-stages/*|food-inventory-saas/src/modules/opportunity-ingest/*)
      echo "customers-crm"; return ;;
    food-inventory-saas/src/modules/accounting/*)
      echo "accounting"; return ;;
    food-inventory-saas/src/modules/billing/*)
      echo "billing"; return ;;
    food-inventory-saas/src/modules/payments/*|food-inventory-saas/src/modules/binance-pay/*|food-inventory-saas/src/modules/tenant-payment-config/*)
      echo "payments"; return ;;
    food-inventory-saas/src/modules/bank-accounts/*|food-inventory-saas/src/modules/bank-reconciliation/*)
      echo "bank-accounts"; return ;;
    food-inventory-saas/src/modules/payables/*|food-inventory-saas/src/modules/recurring-payables/*)
      echo "payables"; return ;;
    food-inventory-saas/src/modules/payroll*|food-inventory-saas/src/modules/shifts/*)
      echo "payroll"; return ;;
    food-inventory-saas/src/modules/beauty/*|food-inventory-saas/src/modules/appointments/*|food-inventory-saas/src/modules/services/*|food-inventory-saas/src/modules/service-packages/*)
      echo "beauty"; return ;;
    food-inventory-saas/src/modules/tables/*|food-inventory-saas/src/modules/reservations/*|food-inventory-saas/src/modules/kitchen-display/*|food-inventory-saas/src/modules/menu-engineering/*|food-inventory-saas/src/modules/modifier-groups/*|food-inventory-saas/src/modules/waste/*)
      echo "restaurant"; return ;;
    food-inventory-saas/src/modules/production/*|food-inventory-saas/src/modules/consumables/*|food-inventory-saas/src/modules/supplies/*)
      echo "production"; return ;;
    food-inventory-saas/src/modules/marketing/*|food-inventory-saas/src/modules/promotions/*|food-inventory-saas/src/modules/coupons/*|food-inventory-saas/src/modules/loyalty/*|food-inventory-saas/src/modules/newsletter/*)
      echo "marketing"; return ;;
    food-inventory-saas/src/auth/*|food-inventory-saas/src/modules/users/*|food-inventory-saas/src/modules/roles/*|food-inventory-saas/src/modules/permissions/*|food-inventory-saas/src/guards/*)
      echo "auth-users-roles"; return ;;
    food-inventory-saas/src/modules/storefront/*|food-inventory-saas/src/modules/storefront-config/*|food-inventory-saas/src/modules/restaurant-storefront/*)
      echo "storefront-docs"; return ;;
    food-inventory-saas/src/modules/commissions/*|food-inventory-saas/src/modules/tips/*|food-inventory-saas/src/modules/delivery/*|food-inventory-saas/src/modules/analytics/*|food-inventory-saas/src/modules/reports/*|food-inventory-saas/src/modules/data-import/*|food-inventory-saas/src/modules/whapi/*|food-inventory-saas/src/modules/mail/*|food-inventory-saas/src/modules/notification-center/*)
      echo "complementary"; return ;;
  esac

  # ── Frontend components ──
  case "$file" in
    food-inventory-admin/src/components/inventory/*)
      echo "inventory"; return ;;
    food-inventory-admin/src/components/compras/*|food-inventory-admin/src/components/suppliers/*)
      echo "purchases"; return ;;
    food-inventory-admin/src/components/orders/*)
      echo "orders"; return ;;
    food-inventory-admin/src/components/crm/*)
      echo "customers-crm"; return ;;
    food-inventory-admin/src/components/accounting/*)
      echo "accounting"; return ;;
    food-inventory-admin/src/components/billing/*)
      echo "billing"; return ;;
    food-inventory-admin/src/components/payroll/*)
      echo "payroll"; return ;;
    food-inventory-admin/src/components/beauty/*|food-inventory-admin/src/components/appointments/*)
      echo "beauty"; return ;;
    food-inventory-admin/src/components/restaurant/*|food-inventory-admin/src/components/reservations/*|food-inventory-admin/src/components/tables/*)
      echo "restaurant"; return ;;
    food-inventory-admin/src/components/production/*)
      echo "production"; return ;;
    food-inventory-admin/src/components/marketing/*)
      echo "marketing"; return ;;
    food-inventory-admin/src/components/cash-register/*)
      echo "orders"; return ;;
    food-inventory-admin/src/components/commission/*|food-inventory-admin/src/components/fulfillment/*|food-inventory-admin/src/components/data-import/*)
      echo "complementary"; return ;;
  esac

  # ── Frontend pages / Management ──
  case "$file" in
    *ProductsManagement*|*ProductsManagementWithTabs*)
      echo "products"; return ;;
    *ComprasManagement*|*SuppliersManagement*|*PurchaseOrdersPage*)
      echo "purchases"; return ;;
    *OrdersManagement*|*CashRegister*)
      echo "orders"; return ;;
    *AccountingManagement*)
      echo "accounting"; return ;;
    *CRMManagement*)
      echo "customers-crm"; return ;;
    *WarehouseManagement*)
      echo "transfers"; return ;;
    *PayablesManagement*)
      echo "payables"; return ;;
    *BankAccountsManagement*)
      echo "bank-accounts"; return ;;
    *AppointmentsManagement*|*ServicesManagement*)
      echo "beauty"; return ;;
    *RolesManagement*|*UserManagement*)
      echo "auth-users-roles"; return ;;
    *ShiftManagement*)
      echo "payroll"; return ;;
    *ReservationsPage*|*TablesPage*|*MenuEngineeringPage*|*RecipesPage*|*WasteManagementPage*)
      echo "restaurant"; return ;;
    *MarketingPage*)
      echo "marketing"; return ;;
    *RestaurantStorefrontPage*)
      echo "storefront-docs"; return ;;
    *CommissionsPage*|*TipsPage*|*ReportsPage*)
      echo "complementary"; return ;;
  esac

  # ── Storefront ──
  case "$file" in
    food-inventory-storefront/*)
      echo "storefront-docs"; return ;;
  esac

  # ── Core architecture ──
  case "$file" in
    food-inventory-admin/src/App.jsx|food-inventory-admin/src/layouts/*|food-inventory-admin/src/lib/api.*|food-inventory-admin/src/hooks/*)
      echo "frontend"; return ;;
    food-inventory-saas/src/app.module.ts|food-inventory-saas/src/common/*)
      echo "architecture"; return ;;
  esac

  # No match
  echo ""
}

# ─────────────────────────────────────────────────────────────
# Clasificar tipo de cambio
# ─────────────────────────────────────────────────────────────
classify_change() {
  local file="$1"
  case "$file" in
    *.schema.ts|*.entity.ts)    echo "schema" ;;
    *.controller.ts)            echo "endpoint" ;;
    *.service.ts)               echo "logic" ;;
    *.dto.ts)                   echo "validation" ;;
    *.module.ts)                echo "module-config" ;;
    *Management*.jsx|*View*.jsx|*Page*.jsx)  echo "ui-view" ;;
    *.jsx|*.tsx)                echo "ui-component" ;;
    *)                         echo "other" ;;
  esac
}

# ─────────────────────────────────────────────────────────────
# Procesar cambios — usar archivos temporales (compatible zsh/bash 3)
# ─────────────────────────────────────────────────────────────

TMPDIR_WORK=$(mktemp -d)
trap "rm -rf $TMPDIR_WORK" EXIT

# Recolectar módulos afectados
while IFS= read -r file; do
  module=$(map_file_to_module "$file")
  if [ -n "$module" ]; then
    # Marcar módulo como afectado
    touch "$TMPDIR_WORK/$module.module"

    # Acumular archivos
    echo "$file" >> "$TMPDIR_WORK/$module.files"

    # Acumular tipos de cambio (sin duplicados)
    change_type=$(classify_change "$file")
    if ! grep -q "^${change_type}$" "$TMPDIR_WORK/$module.types" 2>/dev/null; then
      echo "$change_type" >> "$TMPDIR_WORK/$module.types"
    fi
  fi
done <<< "$CHANGED_FILES"

# Contar módulos afectados
setopt nullglob 2>/dev/null  # zsh: no error on empty glob
MODULE_COUNT=$(ls "$TMPDIR_WORK"/*.module 2>/dev/null | wc -l | tr -d ' ')

# Si no hay módulos afectados, salir silenciosamente
if [ "$MODULE_COUNT" -eq 0 ]; then
  exit 0
fi

# ─────────────────────────────────────────────────────────────
# Escribir al inbox de pendientes
# ─────────────────────────────────────────────────────────────

# Crear el archivo si no existe
if [ ! -f "$PENDING_FILE" ]; then
  cat > "$PENDING_FILE" << 'HEADER'
# Wiki — Cambios Pendientes de Revision

> Este archivo es generado automaticamente por el detector de cambios.
> Cada entrada representa un commit que modifico archivos de un modulo documentado.
> El agente Bibliotecario debe procesar estas entradas y limpiarlas al terminar.

---

HEADER
fi

# Construir la entrada
{
  echo "## $COMMIT_DATE — \`$COMMIT_HASH\` — $COMMIT_AUTHOR"
  echo "**Commit:** $COMMIT_MSG"
  echo ""
  echo "| Modulo wiki | Tipo de cambio | Archivos afectados |"
  echo "|-------------|---------------|-------------------|"

  setopt nullglob 2>/dev/null
  for module_file in "$TMPDIR_WORK"/*.module; do
    module=$(basename "$module_file" .module)

    # Leer tipos de cambio
    types=$(tr '\n' ', ' < "$TMPDIR_WORK/$module.types" | sed 's/, $//')

    # Leer archivos (limitar a 5 para no desbordar la tabla)
    file_count=$(wc -l < "$TMPDIR_WORK/$module.files" | tr -d ' ')
    if [ "$file_count" -le 5 ]; then
      files=$(tr '\n' ', ' < "$TMPDIR_WORK/$module.files" | sed 's/, $//')
    else
      files=$(head -3 "$TMPDIR_WORK/$module.files" | tr '\n' ', ' | sed 's/, $//')
      files="$files ... (+$((file_count - 3)) mas)"
    fi

    echo "| \`$module\` | $types | $files |"
  done

  echo ""
  echo "---"
  echo ""
} >> "$PENDING_FILE"

# Contar entradas pendientes totales
PENDING_COUNT=$(grep -c "^## " "$PENDING_FILE" 2>/dev/null || echo "0")

# Feedback silencioso (solo si hay acumulacion significativa)
if [ "$PENDING_COUNT" -ge 10 ]; then
  echo "Wiki: $PENDING_COUNT commits pendientes de revision en docs/wiki/.pending-reviews.md"
fi

exit 0
