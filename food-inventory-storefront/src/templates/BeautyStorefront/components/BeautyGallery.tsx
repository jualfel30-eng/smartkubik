'use client';

import { useState } from 'react';
import BeforeAfterSlider from './BeforeAfterSlider';
import type { ColorScheme } from '../BeautyStorefront';

interface GalleryItem {
  _id: string;
  image: string;
  beforeImage?: string;
  caption?: string;
  category?: string;
  tags: string[];
}

interface BeautyGalleryProps {
  gallery: GalleryItem[];
  colors: ColorScheme;
}

export default function BeautyGallery({ gallery, colors }: BeautyGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(gallery.map((i) => i.category).filter(Boolean) as string[]))];

  const filtered = activeCategory === 'all'
    ? gallery
    : gallery.filter((i) => i.category === activeCategory);

  return (
    <>
      {/* Category pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'text-white shadow-md scale-105'
                  : `${colors.cardBg} ${colors.secondaryText} hover:scale-105`
              }`}
              style={activeCategory === cat ? { background: 'var(--primary-color, #D946EF)' } : undefined}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <button
            key={item._id}
            onClick={() => setSelectedItem(item)}
            className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={item.caption ?? (item.beforeImage ? 'Ver comparación antes/después' : 'Ver foto')}
          >
            {item.beforeImage ? (
              /* Thumbnail for B&A: split preview */
              <div className="w-full h-full relative">
                {/* Left half: before */}
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <img
                    src={item.beforeImage}
                    alt="Antes"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={{ width: '200%' }}
                  />
                </div>
                {/* Right half: after */}
                <div className="absolute inset-0 overflow-hidden" style={{ left: '50%', width: '50%' }}>
                  <img
                    src={item.image}
                    alt="Después"
                    className="absolute top-0 right-0 h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={{ width: '200%', right: 0, left: 'auto' }}
                  />
                </div>
                {/* Divider */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/80 -translate-x-1/2 pointer-events-none" />
                {/* B&A label */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                  <span className="bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full shadow">
                    Ver slider ↔
                  </span>
                </div>
              </div>
            ) : (
              /* Regular photo */
              <>
                <div
                  className={`w-full h-full ${colors.addonBg} filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500`}
                  style={{ background: `url(${item.image}) center/cover` }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-end p-4">
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-all duration-300 text-left">
                    {item.caption && <p className="font-semibold text-sm leading-tight">{item.caption}</p>}
                    {item.category && <p className="text-xs text-white/80 mt-0.5">{item.category}</p>}
                  </div>
                </div>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox / Slider modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 transition w-10 h-10 rounded-full flex items-center justify-center text-lg"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div
            className="max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.beforeImage ? (
              <BeforeAfterSlider
                beforeImage={selectedItem.beforeImage}
                afterImage={selectedItem.image}
                alt={selectedItem.caption}
              />
            ) : (
              <img
                src={selectedItem.image}
                alt={selectedItem.caption ?? 'Foto'}
                className="w-full rounded-xl shadow-2xl"
              />
            )}

            {(selectedItem.caption || selectedItem.category || selectedItem.tags?.length > 0) && (
              <div className="text-white text-center mt-4 space-y-1">
                {selectedItem.caption && (
                  <p className="text-lg font-semibold">{selectedItem.caption}</p>
                )}
                {selectedItem.category && (
                  <p className="text-sm text-white/70">{selectedItem.category}</p>
                )}
                {selectedItem.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                    {selectedItem.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-white/10 text-white/80 px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
