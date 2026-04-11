'use client';

import { Category } from '@/types';
import { motion } from 'framer-motion';

interface Props {
    categories: Category[];
    activeCategoryId: number | null;
    onSelectCategory: (id: number | null) => void;
}

export default function CategoryFilter({ categories, activeCategoryId, onSelectCategory }: Props) {
    return (
        <div className="relative w-full overflow-hidden bg-background mb-8 sticky top-20 z-40 border-b border-white/5 pb-2">
            {/* Horizontal scroll container */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-4 px-4 container mx-auto">
                <button
                    onClick={() => onSelectCategory(null)}
                    className={`relative px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategoryId === null ? 'text-white' : 'text-muted hover:text-foreground'
                        }`}
                >
                    Todos
                    {activeCategoryId === null && (
                        <motion.div
                            layoutId="category-pill-active"
                            className="absolute inset-0 bg-accent rounded-full -z-10"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                </button>

                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onSelectCategory(category.id)}
                        className={`relative px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategoryId === category.id ? 'text-white' : 'text-muted hover:text-foreground'
                            }`}
                    >
                        {category.name}
                        {activeCategoryId === category.id && (
                            <motion.div
                                layoutId="category-pill-active"
                                className="absolute inset-0 bg-accent rounded-full -z-10"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Edge gradient overlays for indicating horizontal scroll on smaller screens */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none md:hidden" />
        </div>
    );
}
