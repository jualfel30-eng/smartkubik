'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, AlignLeft } from 'lucide-react';
import { Dish, CartCustomization } from '@/types';
import { useCartStore } from '@/lib/cart-store';

interface Props {
    dish: Dish;
    isOpen: boolean;
    onClose: () => void;
}

export default function DishCustomizer({ dish, isOpen, onClose }: Props) {
    const addItem = useCartStore(state => state.addItem);

    // Local state for customizations before adding to cart
    const [removedIngredients, setRemovedIngredients] = useState<Set<number>>(new Set());
    const [addedExtras, setAddedExtras] = useState<Record<number, number>>({});
    const [quantity, setQuantity] = useState(1);

    // Reset state when opened with a new dish
    useEffect(() => {
        if (isOpen) {
            setRemovedIngredients(new Set());
            setAddedExtras({});
            setQuantity(1);
        }
    }, [isOpen, dish]);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleToggleRemove = (id: number) => {
        setRemovedIngredients(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleUpdateExtra = (id: number, delta: number, max: number = 1) => {
        setAddedExtras(prev => {
            const current = prev[id] || 0;
            const next = Math.max(0, Math.min(current + delta, max));
            const newState = { ...prev };
            if (next === 0) delete newState[id];
            else newState[id] = next;
            return newState;
        });
    };

    // Calculate dynamic price
    const extrasTotal = Object.entries(addedExtras).reduce((acc, [idString, qty]) => {
        const extraInfo = dish.available_extras.find(e => e.id === parseInt(idString, 10));
        return acc + (extraInfo ? Number(extraInfo.extra_price) * qty : 0);
    }, 0);

    const unitPrice = Number(dish.price) + extrasTotal;
    const totalPrice = unitPrice * quantity;

    const handleAddToCart = () => {
        const customizations: CartCustomization[] = [];

        removedIngredients.forEach(id => {
            const ing = dish.base_ingredients.find(i => i.id === id);
            if (ing) customizations.push({ ingredient_id: id, name: ing.name, action: 'remove', price_delta: 0, quantity: 1 });
        });

        Object.entries(addedExtras).forEach(([idString, qty]) => {
            const id = parseInt(idString, 10);
            const ing = dish.available_extras.find(i => i.id === id);
            if (ing) customizations.push({ ingredient_id: id, name: ing.name, action: 'add', price_delta: Number(ing.extra_price), quantity: qty });
        });

        addItem(dish, quantity, customizations);
        onClose();
        window.dispatchEvent(new CustomEvent('open-cart'));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full md:w-[500px] max-h-[90vh] bg-surface rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-white/10"
                    >
                        {/* Header Image */}
                        <div className="relative w-full h-48 sm:h-56 bg-[#1a1a1a] shrink-0">
                            {dish.image_url && (
                                <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 backdrop-blur rounded-full text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-2 no-scrollbar">
                            <div className="-mt-12 relative z-10 mb-6">
                                <h2 className="font-display font-black text-3xl text-white mb-1 leading-tight">{dish.name}</h2>
                                <p className="font-sans text-xl text-accent font-bold">${Number(dish.price).toFixed(2)}</p>
                            </div>

                            {dish.description && (
                                <p className="text-muted text-sm mb-8 flex gap-2 items-start">
                                    <AlignLeft className="w-4 h-4 mt-0.5 shrink-0" />
                                    {dish.description}
                                </p>
                            )}

                            {/* Base Ingredients (Removals) */}
                            {dish.base_ingredients.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-white/20" />
                                        Ingredientes Base
                                    </h3>
                                    <div className="space-y-3">
                                        {dish.base_ingredients.map(ing => (
                                            <div key={ing.id} className="flex items-center justify-between">
                                                <span className={`text-sm transition-colors ${removedIngredients.has(ing.id) ? 'text-muted line-through' : 'text-foreground'}`}>
                                                    {ing.name}
                                                </span>
                                                {ing.is_removable && (
                                                    <button
                                                        onClick={() => handleToggleRemove(ing.id)}
                                                        className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${removedIngredients.has(ing.id) ? 'bg-white/10' : 'bg-accent'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`w-4 h-4 rounded-full bg-white transition-transform ${removedIngredients.has(ing.id) ? 'translate-x-0' : 'translate-x-6'
                                                                }`}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extras (Additions) */}
                            {dish.available_extras.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-accent text-accent shadow-[0_0_10px_rgba(255,69,0,0.5)]" />
                                        Añadir Extras
                                    </h3>
                                    <div className="space-y-4">
                                        {dish.available_extras.map(ing => {
                                            const currentQty = addedExtras[ing.id] || 0;
                                            return (
                                                <div key={ing.id} className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-foreground">{ing.name}</span>
                                                        <span className="text-xs text-accent font-semibold">+${Number(ing.extra_price).toFixed(2)}</span>
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-white/5 rounded-full p-1 border border-white/10">
                                                        <button
                                                            onClick={() => handleUpdateExtra(ing.id, -1, ing.max_quantity)}
                                                            className={`p-1.5 rounded-full transition-colors ${currentQty > 0 ? 'text-white hover:bg-white/10' : 'text-white/20'}`}
                                                            disabled={currentQty === 0}
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="w-4 text-center text-sm font-semibold">{currentQty}</span>
                                                        <button
                                                            onClick={() => handleUpdateExtra(ing.id, 1, ing.max_quantity)}
                                                            className={`p-1.5 rounded-full transition-colors ${currentQty < (ing.max_quantity || 1) ? 'text-white hover:bg-white/10' : 'text-white/20'}`}
                                                            disabled={currentQty >= (ing.max_quantity || 1)}
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer / Add to Cart */}
                        <div className="p-6 bg-surface border-t border-white/10 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-muted text-sm">Cantidad</span>
                                <div className="flex items-center gap-4 bg-white/5 rounded-full p-1 border border-white/10">
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-6 text-center font-bold">{quantity}</span>
                                    <button onClick={() => setQuantity(quantity + 1)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="w-full py-4 rounded-full bg-accent text-white font-bold flex items-center justify-between px-6 transition-all hover:scale-[1.02] shadow-[0_0_30px_-10px_rgba(255,69,0,0.5)]"
                            >
                                <span>Añadir Pedido</span>
                                <span>${totalPrice.toFixed(2)}</span>
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
