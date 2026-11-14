const CACHE='watch-tracker-shell-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'])));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('watch-tracker-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Never cache account responses, library data, credentials, or third-party images.
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('chatgpt')||url.pathname==='/callback')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(async()=>new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>Watch Tracker · Offline</title><body style="background:#0e0b19;color:#eee;font:18px system-ui;padding:12vh 8vw"><h1>You’re offline</h1><p>Connect to the internet to open your private cloud library. The desktop app supports offline tracking.</p><button onclick="location.reload()">Try again</button></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
  }else if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/icons/')||url.pathname==='/manifest.webmanifest'){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response})));
  }
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const url=new URL('/#/upcoming',self.location.origin).href;const client=clients[0];if(client){await client.navigate(url);return client.focus()}return self.clients.openWindow(url)}))});
