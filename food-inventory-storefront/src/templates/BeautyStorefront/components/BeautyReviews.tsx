'use client';

import SectionReveal from './premium/SectionReveal';
import type { ColorScheme } from '../BeautyStorefront';

interface Review {
  _id: string;
  client?: { name: string; phone?: string };
  clientName?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface BeautyReviewsProps {
  reviews: Review[];
  colors: ColorScheme;
}

export default function BeautyReviews({ reviews, colors }: BeautyReviewsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reviews.map((review, index) => (
        <SectionReveal key={review._id} delay={index * 0.1}>
          <div className={`${colors.card} rounded-xl p-6 shadow-lg hover:shadow-premium transition-all duration-300`}>
          <div className="flex mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-5 h-5" fill={i < review.rating ? '#F59E0B' : colors.emptyStar} viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className={`${colors.textMuted} mb-4 italic`}>&quot;{review.comment}&quot;</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {(review.client?.name || review.clientName || '?').charAt(0)}
            </div>
            <div>
              <p className={`font-semibold ${colors.text}`}>{review.client?.name || review.clientName}</p>
              <p className={`text-sm ${colors.textLight}`}>{formatDate(review.createdAt)}</p>
            </div>
          </div>
          </div>
        </SectionReveal>
      ))}
    </div>
  );
}
