/**
 * Helper to dynamically optimize image URLs.
 * If the image is hosted on Cloudinary, it inserts 'f_auto,q_auto' to serve next-gen formats and compression.
 */
export function getOptimizedImageUrl(url: string | null | undefined): string {
  if (!url) return '/images/logo-512.png';
  
  if (url.includes('res.cloudinary.com')) {
    // Standard Cloudinary URL looks like: https://res.cloudinary.com/cloud_name/image/upload/v12345/image_id.jpg
    // We want to insert 'f_auto,q_auto' right after '/upload/'
    return url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
  }
  
  return url;
}
