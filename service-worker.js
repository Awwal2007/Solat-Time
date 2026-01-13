const CACHE = "solat-cache-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/adhan.mp3",
  "/icon-192.png",
  "/icon-512.png"
];

// --------------------
// IndexedDB helpers
// --------------------
const DB_NAME = "solat-db";
const STORE = "alarms";

let midnightTimeout = null;

const scheduleMidnightRefresh = () => {
  if (midnightTimeout) clearTimeout(midnightTimeout);

  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 5, 0); // 5 seconds after midnight

  const delay = midnight - now;

  midnightTimeout = setTimeout(() => {
    notifyClientsRefresh();
    scheduleMidnightRefresh(); // schedule next day
  }, delay);
};

const notifyClientsRefresh = async () => {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of clients) {
    client.postMessage({ type: "REFRESH_PRAYER_TIMES" });
  }
};





const openDB = () =>
  new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
  });

const saveAlarms = async (alarms) => {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(alarms, "prayers");
};

const loadAlarms = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE);
  return tx.objectStore(STORE).get("prayers");
};

// --------------------
// In-memory alarms
// --------------------
const prayerAlarms = {};

// --------------------
// Install
// --------------------
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// --------------------
// Activate
// --------------------
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const stored = await loadAlarms();
      if (stored) Object.assign(prayerAlarms, stored);

      scheduleMidnightRefresh();
      await self.clients.claim();
    })()
  );
});


// --------------------
// Fetch (offline)
// --------------------
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

// --------------------
// Receive alarms from app
// --------------------
self.addEventListener("message", async (event) => {
  if (event.data?.type === "SET_PRAYER_ALARMS") {
    event.data.alarms.forEach(({ name, time }) => {
      prayerAlarms[name] = time;
    });
    
    await saveAlarms(prayerAlarms);
  }
});

// --------------------
// Background heartbeat
// --------------------
setInterval(() => {
  const now = Date.now();

  Object.entries(prayerAlarms).forEach(([name, time]) => {
    if (Math.abs(now - time) < 60000) {
      self.registration.showNotification("🕌 Prayer Time", {
        body: `It's time for ${name}`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: name,
        renotify: false
      });

      delete prayerAlarms[name];
      saveAlarms(prayerAlarms);
    }
  });
}, 30000);
