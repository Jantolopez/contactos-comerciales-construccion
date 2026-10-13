/* Contactos Comerciales Construcción — funciona sin conexión: guarda en el móvil la app y el lector de texto. */
var VERSION = "ccc-v1";
var SHELL = ["./", "index.html", "app.js", "parse.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
var HEAVY = ["vendor/tesseract.min.js", "vendor/worker.min.js", "vendor/core/tesseract-core-simd-lstm.wasm.js", "vendor/core/tesseract-core-lstm.wasm.js", "lang/spa.traineddata.gz"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(SHELL).then(function () { return c.addAll(HEAVY).catch(function () {}); });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  var isShell = req.mode === "navigate" || /\.(html|js|webmanifest)$/.test(new URL(req.url).pathname) && !/vendor\//.test(req.url);
  if (isShell) {
    // La app: primero la red (para recibir mejoras), si no hay conexión, la copia guardada.
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); }); }));
  } else {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); return res; });
    }));
  }
});
