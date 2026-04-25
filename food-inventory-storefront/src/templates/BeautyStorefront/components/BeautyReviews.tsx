'use client';

import { useState } from 'react';
import Image from 'next/image';
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

interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  text: string;
  relative_time_description: string;
  time: number;
}

interface GooglePlacesData {
  name: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GoogleReview[];
  url?: string;
}

interface BeautyReviewsProps {
  reviews: Review[];
  colors: ColorScheme;
  primaryColor: string;
  googlePlacesData?: GooglePlacesData | null;
  googlePlaceId?: string;
}

function StarRating({ rating, fillColor = '#F59E0B', emptyColor }: { rating: number; fillColor?: string; emptyColor: string }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-4 h-4" fill={i < rating ? fillColor : emptyColor} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function BeautyReviews({ reviews, colors, primaryColor, googlePlacesData, googlePlaceId }: BeautyReviewsProps) {
  const hasInApp = reviews.length > 0;
  const hasGoogle = googlePlacesData && (googlePlacesData.reviews?.length ?? 0) > 0;
  const tabs = [] as Array<'inapp' | 'google'>;
  if (hasInApp) tabs.push('inapp');
  if (hasGoogle) tabs.push('google');

  const [activeTab, setActiveTab] = useState<'inapp' | 'google'>(tabs[0] || 'inapp');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Combined rating header
  const inAppAvg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const googleAvg = googlePlacesData?.rating ?? 0;
  const googleCount = googlePlacesData?.user_ratings_total ?? 0;
  const totalCount = reviews.length + googleCount;
  const combinedAvg = totalCount > 0
    ? (inAppAvg * reviews.length + googleAvg * googleCount) / totalCount
    : 0;

  const reviewUrl = googlePlaceId
    ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
    : null;

  if (tabs.length === 0) return null;

  return (
    <div>
      {/* Combined rating header */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-5xl font-bold" style={{ color: primaryColor }}>{combinedAvg.toFixed(1)}</span>
        <div>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-6 h-6" fill={i < Math.round(combinedAvg) ? '#F59E0B' : colors.emptyStar} viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className={`text-sm mt-0.5 ${colors.textMuted}`}>
            Basado en {totalCount.toLocaleString()} reseña{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs — only show if both sources exist */}
      {tabs.length > 1 && (
        <div className="flex justify-center gap-2 mt-6 mb-8">
          {hasInApp && (
            <button
              onClick={() => setActiveTab('inapp')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'inapp' ? 'text-white shadow-lg' : `${colors.card} ${colors.textMuted} border ${colors.border}`
              }`}
              style={activeTab === 'inapp' ? { background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` } : {}}
            >
              Nuestros clientes ({reviews.length})
            </button>
          )}
          {hasGoogle && (
            <button
              onClick={() => setActiveTab('google')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'google' ? 'text-white shadow-lg' : `${colors.card} ${colors.textMuted} border ${colors.border}`
              }`}
              style={activeTab === 'google' ? { background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` } : {}}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill={activeTab === 'google' ? '#fff' : '#4285F4'} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill={activeTab === 'google' ? '#fff' : '#34A853'} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill={activeTab === 'google' ? '#fff' : '#FBBC05'} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill={activeTab === 'google' ? '#fff' : '#EA4335'} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google ({googleCount.toLocaleString()})
            </button>
          )}
        </div>
      )}

      {/* In-app reviews tab */}
      {activeTab === 'inapp' && hasInApp && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <SectionReveal key={review._id} delay={index * 0.1}>
              <div className={`${colors.card} rounded-xl p-6 shadow-lg hover:shadow-premium transition-all duration-300`}>
                <div className="flex mb-3">
                  <StarRating rating={review.rating} emptyColor={colors.emptyStar} />
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
      )}

      {/* Google reviews tab */}
      {activeTab === 'google' && hasGoogle && googlePlacesData && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(googlePlacesData.reviews ?? []).map((review, i) => (
              <SectionReveal key={i} delay={i * 0.1}>
                <div className={`${colors.card} rounded-xl p-5 shadow-lg`}>
                  <div className="flex items-center gap-3 mb-3">
                    {review.profile_photo_url ? (
                      <Image
                        src={review.profile_photo_url}
                        alt={review.author_name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {review.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${colors.text}`}>{review.author_name}</p>
                      <p className={`text-xs ${colors.textLight}`}>{review.relative_time_description}</p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} emptyColor={colors.emptyStar} />
                  {review.text && (
                    <p className={`mt-3 text-sm leading-relaxed line-clamp-4 ${colors.textMuted}`}>
                      {review.text}
                    </p>
                  )}
                </div>
              </SectionReveal>
            ))}
          </div>

          {/* Google footer links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            {reviewUrl && (
              <a
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white transition hover:shadow-lg hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Dejar reseña en Google
              </a>
            )}
            {googlePlacesData.url && (
              <a
                href={googlePlacesData.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-medium hover:underline ${colors.textMuted}`}
              >
                Ver todas en Google →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
