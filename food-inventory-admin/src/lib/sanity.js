import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url'; // Import the builder

export const sanityClient = createClient({
  projectId: 'ji21yoem',
  dataset: 'production',
  useCdn: true, // `false` if you want to ensure fresh data
  apiVersion: '2024-10-16', // use a UTC date in YYYY-MM-DD format
});

// Get a pre-configured url-builder from your sanity client
const builder = imageUrlBuilder(sanityClient);

// Then we like this to be a simple function that returns an
// image URL for a given source (e.g. a Sanity image object).
export function urlFor(source) {
  return builder.image(source);
}
