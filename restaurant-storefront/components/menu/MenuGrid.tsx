'use client';

import { useState } from 'react';
import { Dish, Category } from '@/types';
import CategoryFilter from './CategoryFilter';
import DishCard from './DishCard';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    initialDishes: Dish[];
    initialCategories: Category[];
}

export default function MenuGrid({ initialDishes, initialCategories }: Props) {
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

    const filteredDishes = activeCategoryId
        ? initialDishes.filter(dish => {
            const catId = typeof dish.categoryId === 'object' && dish.categoryId !== null
                ? (dish.categoryId as Category)._id
                : dish.categoryId as string;
            return catId === activeCategoryId;
        })
        : initialDishes;

    return (
        <section className="min-h-screen pb-24">
            <CategoryFilter
                categories={initialCategories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={setActiveCategoryId}
            />

            <div className="container mx-auto px-4 md:px-6">
                <AnimatePresence mode="popLayout">
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
                    >
                        {filteredDishes.map(dish => (
                            <DishCard key={dish._id} dish={dish} />
                        ))}
                    </motion.div>
                </AnimatePresence>

                {filteredDishes.length === 0 && (
                    <div className="w-full py-32 flex flex-col items-center justify-center text-center text-muted">
                        <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <span className="text-2xl">🍽️</span>
                        </div>
                        <h3 className="font-display font-bold text-xl mb-2 text-foreground">Sin platillos</h3>
                        <p>No hay platillos disponibles en esta categoría en este momento.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
