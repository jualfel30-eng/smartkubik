import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItemType, CartCustomization } from '@/types';

interface CartState {
    items: CartItemType[];
    subtotal: number;
    total: number;
    addItem: (
        dish: { id: number; name: string; price: number },
        quantity: number,
        customizations: CartCustomization[]
    ) => void;
    removeItem: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, newQuantity: number) => void;
    clearCart: () => void;
}

// Helper to generate a unique footprint for identical item collapsing
const generateCartItemId = (dishId: number, customizations: CartCustomization[]) => {
    const sortedMods = [...customizations].sort((a, b) =>
        a.ingredient_id === b.ingredient_id
            ? a.action.localeCompare(b.action)
            : a.ingredient_id - b.ingredient_id
    );
    return `${dishId}-${JSON.stringify(sortedMods)}`;
};

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            subtotal: 0,
            total: 0,

            addItem: (dish, quantity, customizations) => {
                const cartItemId = generateCartItemId(dish.id, customizations);

                // Calculate the per-item final price based on additions
                const modsDelta = customizations.reduce((acc, mod) => acc + (mod.price_delta * mod.quantity), 0);
                const finalPrice = Number(dish.price) + modsDelta;

                set((state) => {
                    const existingItemIndex = state.items.findIndex(i => i.cart_item_id === cartItemId);
                    const newItems = [...state.items];

                    if (existingItemIndex > -1) {
                        // If identical dish+mods exists, just bump the quantity
                        newItems[existingItemIndex].quantity += quantity;
                    } else {
                        // Add new line item
                        newItems.push({
                            cart_item_id: cartItemId,
                            dish_id: dish.id,
                            name: dish.name,
                            base_price: Number(dish.price),
                            final_price: finalPrice,
                            quantity,
                            customizations
                        });
                    }

                    const newTotal = newItems.reduce((acc, item) => acc + (item.final_price * item.quantity), 0);

                    return {
                        items: newItems,
                        subtotal: newTotal,
                        total: newTotal // Same for now, can add tax/delivery later
                    };
                });
            },

            removeItem: (cartItemId) => {
                set((state) => {
                    const newItems = state.items.filter(i => i.cart_item_id !== cartItemId);
                    const newTotal = newItems.reduce((acc, item) => acc + (item.final_price * item.quantity), 0);
                    return { items: newItems, subtotal: newTotal, total: newTotal };
                });
            },

            updateQuantity: (cartItemId, newQuantity) => {
                if (newQuantity <= 0) {
                    get().removeItem(cartItemId);
                    return;
                }

                set((state) => {
                    const newItems = state.items.map(item =>
                        item.cart_item_id === cartItemId ? { ...item, quantity: newQuantity } : item
                    );
                    const newTotal = newItems.reduce((acc, item) => acc + (item.final_price * item.quantity), 0);
                    return { items: newItems, subtotal: newTotal, total: newTotal };
                });
            },

            clearCart: () => set({ items: [], subtotal: 0, total: 0 }),
        }),
        {
            name: 'restaurant-cart-storage',
        }
    )
);
