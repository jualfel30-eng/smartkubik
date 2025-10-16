import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: 'ji21yoem',
  dataset: 'production',
  useCdn: true, // `false` if you want to ensure fresh data
  apiVersion: '2024-10-16', // use a UTC date in YYYY-MM-DD format
});