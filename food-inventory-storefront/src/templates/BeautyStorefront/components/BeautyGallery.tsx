'use client';

import { useState } from 'react';
import type { ColorScheme } from '../BeautyStorefront';

interface GalleryItem {
  _id: string;
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
}

interface BeautyGalleryProps {
  gallery: GalleryItem[];
  colors: ColorScheme;
}

export default function BeautyGallery({ gallery, colors }: BeautyGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map((item) => (
          <button
            key={item._id}
            onClick={() => setSelectedImage(item)}
            className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
          >
            <div
              className={`w-full h-full ${colors.addonBg} filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500`}
              style={{ background: `url(${item.imageUrl}) center/cover` }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-end p-4">
              <div className="text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs">{item.category}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 transition w-10 h-10 rounded-full flex items-center justify-center">
            ✕
          </button>
          <div className="max-w-4xl w-full">
            <img src={selectedImage.imageUrl} alt={selectedImage.title} className="w-full rounded-lg shadow-2xl" />
            <div className="text-white text-center mt-4">
              <h3 className="text-2xl font-bold">{selectedImage.title}</h3>
              <p className="text-gray-300">{selectedImage.category}</p>
              {selectedImage.description && <p className="mt-2 text-gray-400">{selectedImage.description}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
