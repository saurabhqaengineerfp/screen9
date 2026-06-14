import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Screen9',
    short_name: 'Screen9',
    description: 'Premium Movie Streaming Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#FF7A00',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
