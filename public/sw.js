const RENDER_PATHS = new Set(["", "/", "/APLamp/", "/APLamp/index.html"]);

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === "navigate";
  const isRenderPath = RENDER_PATHS.has(url.pathname);
  const isFavicon = url.pathname.endsWith("/favicon.svg");
  const isSelf = url.pathname.endsWith("/sw.js");

  if (isNavigation || isRenderPath || isFavicon || isSelf) return;

  event.respondWith(
    new Response("Forbidden. This site is not an API.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
});
