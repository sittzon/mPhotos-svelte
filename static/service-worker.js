const CACHE_NAME = 'mPhotos-cache-v1';
const MAX_FILE_SIZE = 1000 * 1024; // 1000kB

// Install event: Cache assets during the installation phase
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      // Pre-cache can be added here if needed
      return cache;
    })
  );
});

// Activate event: Clean up old caches if necessary
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event: Intercept network requests
self.addEventListener('fetch', event => {
  const request = event.request;

  // Check if the request is for an image
//   if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        // Return the cached image if available, else fetch from the network
        return cachedResponse || fetch(request).then(networkResponse => {

            // Check the Content-Length header to get the file size
            const contentLength = networkResponse.headers.get('Content-Length');
            const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

            // Only cache the file if it's smaller than the MAX_FILE_SIZE
            if (fileSize && fileSize <= MAX_FILE_SIZE) {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                });
            } else {
                // If file is too large or size is unknown, don't cache it
                console.warn(`File too large to cache: ${request.url} (${fileSize} bytes)`);
                return networkResponse;
            }

          // return caches.open(CACHE_NAME).then(cache => {
          //   // Cache the fetched image
          //   cache.put(request, networkResponse.clone());
          //   return networkResponse;
          // });
        });
      })
    );
//   }
});
