const CACHE='predeployment-local-v15-pd-supply-card';
const files=['./','./index.html','./overlay.html','./app.js','./shared.js','./storage.js','./obs-sync.js','./overlay.js','./styles.css','./logo.png','./type-model.js','./image-assets.js','./type-editor.js','./type-renderer.js','./drops-layout.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(files.map(file=>{const url=new URL(file,self.registration.scope);url.searchParams.set('release',CACHE);return new Request(url,{cache:'reload'});}))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('predeployment-local-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!files.some(file=>new URL(file,self.registration.scope).pathname===url.pathname))return;event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||fetch(event.request)));});

