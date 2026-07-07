const CACHE_NAME = 'mpa-piaui-v1';
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/images/logo.png',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap'
];

// Instalação do Service Worker - Cacha recursos estáticos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-carregando recursos iniciais');
      return cache.addAll(STATIC_RESOURCES);
    }).then(() => self.skipWaiting())
  );
});

// Ativação - Limpa caches antigos se houver
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepção de requisições - Estratégia de Rede-Primeiro com Fallback de Cache
// Isso garante que se houver internet o app use a versão mais recente, e se estiver offline carregue do cache de forma transparente.
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET ou que sejam para o Supabase (API / DB externo)
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a resposta for válida, guarda no cache para uso offline posterior
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se falhar (offline), busca no cache local
        console.log('[Service Worker] Dispositivo offline detectado. Carregando do cache:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Caso específico: se for uma navegação e não achou a página exata, retorna a casca SPA principal (index.html)
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
