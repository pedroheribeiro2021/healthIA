// Service worker mínimo — só o necessário para o app ser instalável.
// Estratégia de cache offline fica para quando um módulo realmente precisar
// (ADR-001: "resiliente a offline", não "offline first").
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // network passthrough; sem cache por enquanto.
});
