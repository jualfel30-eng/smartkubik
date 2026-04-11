'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Dish } from '@/types';
import DishCustomizer from './DishCustomizer';
import { useCartStore } from '@/lib/cart-store';

interface Props {
    dish: Dish;
}

export default function DishCard({ dish }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const addItem = useCartStore(state => state.addItem);

    const handleQuickAdd = () => {
        if (dish.allowsCustomization) {
            setIsModalOpen(true);
        } else {
            // Directly add to cart with base items (no active customizations)
            addItem(dish, 1, []);
            // Optional: trigger cart open
            window.dispatchEvent(new CustomEvent('open-cart'));
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                whileHover={{ y: -5 }}
                className="group relative bg-surface border border-white/5 rounded-3xl overflow-hidden flex flex-col h-full transition-shadow hover:shadow-[0_10px_40px_-15px_rgba(255,69,0,0.15)]"
            >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] bg-[#1a1a1a] overflow-hidden">
                    {dish.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted/30">
                            <span className="font-display text-4xl font-bold">{dish.name[0]}</span>
                        </div>
                    )}

                    {/* Customization Badge */}
                    {dish.allowsCustomization && (
                        <div className="absolute top-4 left-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-background/80 backdrop-blur text-white border border-white/10">
                            Personalizable
                        </div>
                    )}
                </div>

                {/* Content Details */}
                <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className="font-display font-bold text-xl text-foreground leading-tight">{dish.name}</h3>
                        <span className="font-sans font-semibold text-lg text-accent whitespace-nowrap">
                            ${Number(dish.price).toFixed(2)}
                        </span>
                    </div>

                    <p className="text-sm text-muted line-clamp-2 mt-1 mb-6 flex-grow">
                        {dish.description || 'Delicioso, fresco y hecho a la medida.'}
                    </p>

                    <button
                        onClick={handleQuickAdd}
                        className="w-full py-3.5 rounded-full bg-white/5 hover:bg-white/10 text-foreground font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10"
                    >
                        {dish.allowsCustomization ? 'Personalizar y Añadir' : 'Añadir al Carrito'}
                        <Plus className="w-5 h-5 text-accent" />
                    </button>
                </div>
            </motion.div>

            {/* The customization modal */}
            {dish.allowsCustomization && (
                <DishCustomizer
                    dish={dish}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
}
