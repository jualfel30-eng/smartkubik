'use client';

interface Service {
  _id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  price: { amount: number; currency: string };
  images?: string[];
  addons?: Array<{
    name: string;
    price: number;
    duration?: number;
  }>;
}

interface BeautyServicesProps {
  services: Service[];
  primaryColor: string;
  domain?: string;
}

export default function BeautyServices({
  services,
  primaryColor,
  domain,
}: BeautyServicesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <div
          key={service._id}
          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-1 group"
        >
          {/* Service Image */}
          <div
            className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden"
            style={{
              background: service.images?.[0]
                ? `url(${service.images[0]}) center/cover`
                : `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}40)`,
            }}
          >
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
            <div
              className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-lg"
              style={{ color: primaryColor }}
            >
              <span className="font-bold text-lg">
                ${service.price.amount}
              </span>
            </div>
          </div>

          {/* Service Info */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold mb-1">{service.name}</h3>
                <span
                  className="text-sm font-medium px-3 py-1 rounded-full"
                  style={{
                    background: `${primaryColor}15`,
                    color: primaryColor,
                  }}
                >
                  {service.category}
                </span>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {service.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{service.duration} min</span>
              </div>
            </div>

            {/* Addons */}
            {service.addons && service.addons.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Complementos disponibles:</p>
                <div className="flex flex-wrap gap-1">
                  {service.addons.slice(0, 2).map((addon, i) => (
                    <span
                      key={i}
                      className="text-xs bg-gray-100 px-2 py-1 rounded"
                    >
                      {addon.name} (+${addon.price})
                    </span>
                  ))}
                  {service.addons.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{service.addons.length - 2} más
                    </span>
                  )}
                </div>
              </div>
            )}

            <a
              href={`/${domain}/beauty/reservar?serviceId=${service._id}`}
              className="w-full block text-center px-4 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition"
              style={{ background: primaryColor }}
            >
              Reservar
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
