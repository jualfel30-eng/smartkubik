'use client';

import type { ColorScheme } from '../BeautyStorefront';
import type { GooglePlacesData, GoogleReview } from '@/lib/beautyApi';

interface BeautyLocationProps {
  config: {
    name: string;
    contactInfo: {
      email: string;
      phone: string;
      whatsapp?: string;
      address: string;
      city?: string;
      country?: string;
      socialMedia?: {
        instagram?: string;
        facebook?: string;
      };
    };
    beautyConfig?: {
      businessHours: Array<{ day: number; dayName: string; isOpen: boolean; open: string; close: string }>;
      paymentMethods: Array<{ name: string; isActive: boolean; details?: string }>;
    };
  };
  primaryColor: string;
  colors: ColorScheme;
  googlePlaceId?: string;
  googlePlacesData?: GooglePlacesData | null;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const px = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={px} fill={rating >= star ? '#FBBF24' : '#D1D5DB'} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function BeautyLocation({
  config,
  primaryColor,
  colors,
  googlePlaceId,
  googlePlacesData,
}: BeautyLocationProps) {
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const reviewUrl = googlePlaceId
    ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
    : null;

  const googleMapsUrl = googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`
    : null;

  return (
    <div className="space-y-10">
      {/* Top row: contact info + hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {/* Address */}
          <div className={`${colors.card} rounded-xl p-6 shadow-lg mb-6`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${primaryColor}20` }}>
                <svg className="w-6 h-6" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold mb-1 ${colors.text}`}>Dirección</h4>
                <p className={colors.textMuted}>{config.contactInfo.address}</p>
                {config.contactInfo.city && (
                  <p className={colors.textMuted}>{config.contactInfo.city}, {config.contactInfo.country}</p>
                )}
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    Ver en Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Phone / WhatsApp */}
          <div className={`${colors.card} rounded-xl p-6 shadow-lg mb-6`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${primaryColor}20` }}>
                <svg className="w-6 h-6" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${colors.text}`}>Teléfono</h4>
                <a href={`tel:${config.contactInfo.phone}`} className={`${colors.textMuted} hover:underline`}>
                  {config.contactInfo.phone}
                </a>
                {config.contactInfo.whatsapp && (
                  <div className="mt-2">
                    <a
                      href={`https://wa.me/${config.contactInfo.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Business hours */}
          {config.beautyConfig?.businessHours && (
            <div className={`${colors.card} rounded-xl p-6 shadow-lg`}>
              <h4 className={`font-semibold mb-4 flex items-center gap-2 ${colors.text}`}>
                <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Horario de Atención
              </h4>
              <div className="space-y-2">
                {config.beautyConfig.businessHours.sort((a, b) => a.day - b.day).map((hours) => (
                  <div key={hours.day} className="flex justify-between text-sm">
                    <span className={`font-medium ${colors.text}`}>{daysOfWeek[hours.day]}</span>
                    <span className={colors.textMuted}>{hours.isOpen ? `${hours.open} - ${hours.close}` : 'Cerrado'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {/* Google Maps embed */}
          {googlePlaceId && mapsApiKey ? (
            <div className="rounded-xl overflow-hidden shadow-lg mb-6" style={{ height: '320px' }}>
              <iframe
                title="Ubicación en Google Maps"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=place_id:${googlePlaceId}&language=es`}
              />
            </div>
          ) : (
            // Fallback: text-based address card
            <div className={`${colors.card} rounded-xl p-6 shadow-lg mb-6 flex items-center justify-center`} style={{ height: '320px' }}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${primaryColor}20` }}>
                  <svg className="w-8 h-8" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className={`font-medium ${colors.text}`}>{config.contactInfo.address}</p>
                {config.contactInfo.city && (
                  <p className={colors.textMuted}>{config.contactInfo.city}</p>
                )}
              </div>
            </div>
          )}

          {/* Payment methods */}
          <h3 className={`text-xl font-bold mb-4 ${colors.text}`}>Métodos de Pago</h3>
          {config.beautyConfig?.paymentMethods?.filter((pm) => pm.isActive).map((method, i) => (
            <div key={i} className={`${colors.card} rounded-xl p-5 shadow-lg mb-3`}>
              <h4 className={`font-semibold mb-1 flex items-center gap-2 ${colors.text}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${primaryColor}20` }}>
                  <svg className="w-4 h-4" style={{ color: primaryColor }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                </div>
                {method.name}
              </h4>
              {method.details && <p className={`text-sm ${colors.textMuted}`}>{method.details}</p>}
            </div>
          ))}

          {/* Social media */}
          {config.contactInfo.socialMedia && (
            <div className={`${colors.card} rounded-xl p-6 shadow-lg mt-4`}>
              <h4 className={`font-semibold mb-4 ${colors.text}`}>Síguenos</h4>
              <div className="flex gap-4">
                {config.contactInfo.socialMedia.instagram && (
                  <a href={`https://instagram.com/${config.contactInfo.socialMedia.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition" style={{ background: `${primaryColor}20`, color: primaryColor }}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </a>
                )}
                {config.contactInfo.socialMedia.facebook && (
                  <a href={`https://facebook.com/${config.contactInfo.socialMedia.facebook}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition" style={{ background: `${primaryColor}20`, color: primaryColor }}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Reviews section */}
      {googlePlacesData && (googlePlacesData.reviews?.length ?? 0) > 0 && (
        <div>
          {/* Header with overall rating */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className={`text-lg font-bold ${colors.text}`}>Reseñas de Google</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                  {googlePlacesData.rating?.toFixed(1)}
                </span>
                <div>
                  <StarRating rating={Math.round(googlePlacesData.rating ?? 0)} size="md" />
                  {googlePlacesData.user_ratings_total && (
                    <p className={`text-xs mt-0.5 ${colors.textLight}`}>
                      {googlePlacesData.user_ratings_total.toLocaleString()} reseñas
                    </p>
                  )}
                </div>
              </div>
            </div>

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
          </div>

          {/* Review cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(googlePlacesData.reviews ?? []).slice(0, 5).map((review: GoogleReview, i: number) => (
              <div key={i} className={`${colors.card} rounded-xl p-5 shadow-lg`}>
                <div className="flex items-center gap-3 mb-3">
                  {review.profile_photo_url ? (
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
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
                <StarRating rating={review.rating} />
                {review.text && (
                  <p className={`mt-3 text-sm leading-relaxed line-clamp-4 ${colors.textMuted}`}>
                    {review.text}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Link to all reviews */}
          {googlePlacesData.url && (
            <div className="text-center mt-6">
              <a
                href={googlePlacesData.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-medium hover:underline ${colors.textMuted}`}
              >
                Ver todas las reseñas en Google →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
