/**
 * Beauty API Client
 * Functions to interact with the Beauty Module backend
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api/v1';

// Types
export interface BeautyService {
  _id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  price: { amount: number; currency: string };
  images?: string[];
  addons?: Array<{
    name: string;
    price: number;
    duration?: number;
    isActive: boolean;
  }>;
  professionals: string[];
  requiresDeposit?: boolean;
  depositAmount?: number;
}

export interface Professional {
  _id: string;
  name: string;
  role: string;
  avatar?: string;
  bio?: string;
  specialties: string[];
  instagram?: string;
  schedule: Array<{
    day: number;
    start: string;
    end: string;
    breakStart?: string;
    breakEnd?: string;
    isWorking: boolean;
  }>;
}

export interface GalleryItem {
  _id: string;
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
  isPinned: boolean;
}

export interface Review {
  _id: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: string;
}

export interface AvailabilitySlot {
  time: string;
  endTime: string;
  availableProfessional?: string;
}

export interface BookingData {
  tenantId: string;
  client: {
    name: string;
    phone: string;
  };
  services: Array<{
    service: string;
    addonNames?: string[];
  }>;
  date: string;
  startTime: string;
  professionalId?: string;
  locationId?: string;
  notes?: string;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  client: {
    name: string;
    phone: string;
  };
  professional?: string;
  professionalName?: string;
  services: Array<{
    service: string;
    name: string;
    duration: number;
    price: number;
    addons: Array<{
      name: string;
      price: number;
      duration: number;
    }>;
  }>;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  totalDuration: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  whatsappNotifications: Array<{
    type: string;
    sentAt: string;
    status: string;
  }>;
}

/**
 * Get all active beauty services for a tenant
 */
export async function getBeautyServices(tenantId: string): Promise<BeautyService[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/public/beauty-services/${tenantId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching beauty services:', error);
    throw error;
  }
}

/**
 * Get all active professionals for a tenant
 */
export async function getProfessionals(tenantId: string): Promise<Professional[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/public/professionals/${tenantId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch professionals: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching professionals:', error);
    throw error;
  }
}

/**
 * Get available time slots for booking
 */
export async function getAvailability(data: {
  tenantId: string;
  date: string;
  serviceIds: string[];
  professionalId?: string;
  locationId?: string;
}): Promise<{ slots: AvailabilitySlot[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/beauty-bookings/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch availability: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching availability:', error);
    throw error;
  }
}

/**
 * Create a new beauty booking
 */
export async function createBeautyBooking(data: BookingData): Promise<Booking> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/beauty-bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create booking: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

/**
 * Get gallery items for a tenant
 */
export async function getBeautyGallery(tenantId: string): Promise<GalleryItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/public/beauty-gallery/${tenantId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch gallery: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching gallery:', error);
    throw error;
  }
}

/**
 * Get approved reviews for a tenant
 */
export async function getBeautyReviews(tenantId: string): Promise<Review[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/public/beauty-reviews/${tenantId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
}

/**
 * Get booking by booking number (public access)
 */
export async function getBookingByNumber(bookingNumber: string): Promise<Booking> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/public/beauty-bookings/booking-number/${bookingNumber}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch booking: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching booking:', error);
    throw error;
  }
}

/**
 * Submit a review for a booking
 */
export async function submitReview(data: {
  tenantId: string;
  bookingId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/beauty-reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit review: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
}
