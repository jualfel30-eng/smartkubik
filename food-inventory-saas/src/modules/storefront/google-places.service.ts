import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GooglePlacesCache,
  GooglePlacesCacheDocument,
} from '../../schemas/google-places-cache.schema';

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly API_KEY =
    process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  constructor(
    @InjectModel(GooglePlacesCache.name)
    private readonly cacheModel: Model<GooglePlacesCacheDocument>,
  ) {}

  async getPlaceData(placeId: string): Promise<any> {
    // 1. Check cache first
    const cached = await this.cacheModel.findOne({ placeId }).lean();
    if (
      cached &&
      Date.now() - new Date(cached.fetchedAt).getTime() < this.CACHE_TTL_MS
    ) {
      this.logger.debug(`Cache hit for placeId: ${placeId}`);
      return cached.data;
    }

    // 2. No valid cache — fetch from Google Places API
    this.logger.log(`Fetching Google Places data for: ${placeId}`);

    if (!this.API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    const fields = [
      'name',
      'rating',
      'user_ratings_total',
      'reviews',
      'url',
      'formatted_address',
      'formatted_phone_number',
    ].join(',');

    const apiUrl =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}&fields=${fields}&language=es&key=${this.API_KEY}`;

    let data: any;
    try {
      const response = await fetch(apiUrl);
      const json = await response.json();

      if (json.status !== 'OK') {
        this.logger.error(
          `Google Places API error: ${json.status} — ${json.error_message || ''}`,
        );
        // Return stale cache rather than failing completely
        if (cached) return cached.data;
        throw new Error(`Google Places error: ${json.status}`);
      }

      data = json.result;
    } catch (err) {
      if (cached) return cached.data; // fallback to stale
      throw err;
    }

    // 3. Save/update cache
    await this.cacheModel.findOneAndUpdate(
      { placeId },
      { data, fetchedAt: new Date() },
      { upsert: true, new: true },
    );

    return data;
  }
}
