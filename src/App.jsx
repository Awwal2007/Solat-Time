import { useEffect, useRef, useState } from "react";
import logo from "./assets/icon-192.png";


const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export default function App() {
  const [times, setTimes] = useState(null);
  const [countdown, setCountdown] = useState("Loading...");
  const [location, setLocation] = useState("Detecting location…");
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef(new Audio("/adhan.mp3"));
  const lastNotified = useRef("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation("Location not supported");
      loadCachedTimes();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        fetch(
          `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`
        )
          .then(res => res.json())
          .then(data => {
            setTimes(data.data.timings);

            const city =
              data.data.meta?.timezone?.replace("_", " ") || "Your location";

            setLocation(city);

            localStorage.setItem(
              "times",
              JSON.stringify(data.data.timings)
            );
            localStorage.setItem("location", city);
          })
          .catch(loadCachedTimes);
      },
      () => {
        setLocation("Location denied");
        loadCachedTimes();
      }
    );
  }, []);

  const loadCachedTimes = () => {
    const cachedTimes = localStorage.getItem("times");
    const cachedLocation = localStorage.getItem("location");

    if (cachedTimes) setTimes(JSON.parse(cachedTimes));
    if (cachedLocation) setLocation(cachedLocation);
  };

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    await installPrompt.userChoice;

    setInstallPrompt(null);
  };

  const notify = prayer => {
    if (Notification.permission === "granted") {
      new Notification("🕌 Prayer Time", {
        body: `It's time for ${prayer}`,
        icon: "/icon-192.png"
      });
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  };

  useEffect(() => {
    if (!times) return;

    const interval = setInterval(() => {
      const now = new Date();
      let next = null;

      for (const p of PRAYERS) {
        const [h, m] = times[p].split(":");
        const t = new Date();
        t.setHours(h, m, 0, 0);
        if (now < t) {
          next = { name: p, time: t };
          break;
        }
      }

      if (!next) {
        const [h, m] = times.Fajr.split(":");
        const t = new Date();
        t.setDate(t.getDate() + 1);
        t.setHours(h, m, 0, 0);
        next = { name: "Fajr", time: t };
      }

      const diff = next.time - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setCountdown(`Next: ${next.name} in ${h}h ${m}m ${s}s`);

      PRAYERS.forEach(p => {
        const [ph, pm] = times[p].split(":");
        const pt = new Date();
        pt.setHours(ph, pm, 0, 0);

        if (
          enabled &&
          Math.abs(pt - now) < 1000 &&
          lastNotified.current !== p
        ) {
          lastNotified.current = p;
          notify(p);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [times, enabled]);

  const enableNotifications = async () => {
    await Notification.requestPermission();
    audioRef.current.play().catch(() => {});
    setEnabled(true);
  };

  if (!times) return (
    <div style={styles.loadingContainer}>
      <div style={styles.loadingSpinner}></div>
      <p style={styles.loadingText}>Loading prayer times…</p>
    </div>
  );

  return (
    <div className="app" style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.title}><img width={50} src={logo} alt="logo" /> Solat Times</h1>
        <div style={styles.location}>📍 {location}</div>
      </div>

      <div className="card" style={styles.card}>

        <div>
          <div style={styles.countdownContainer}>
            <div style={styles.countdown}>{countdown}</div>
            <div style={styles.countdownLabel}>Countdown to Next Prayer</div>
          </div>

          <div style={styles.controls}>
            {installPrompt && !installed && (
              <button
                onClick={installApp}
                style={styles.installButton}
              >
                📲 Install App
              </button>
            )}

            {!installPrompt && /iphone|ipad/i.test(navigator.userAgent) && (
              <div style={styles.iosTip}>
                On iPhone/iPad: Tap Share → Add to Home Screen
              </div>
            )}

            <button 
              onClick={enableNotifications} 
              disabled={enabled}
              style={enabled ? styles.notifButtonEnabled : styles.notifButton}
            >
              {enabled ? "🔔 Notifications Enabled" : "🔕 Enable Adhan & Notifications"}
            </button>

            <div style={styles.volumeControl}>
              <span style={styles.volumeLabel}>Adhan Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.0001"
                value={audioRef.current.volume}
                onChange={e => (audioRef.current.volume = e.target.value)}
                style={styles.volumeSlider}
              />
              <button onClick={audioRef.current.muted ? audioRef.current.play : audioRef.current.pause} style={{
                background: audioRef.current.muted ? 'linear-gradient(135deg, #00b4a3, #006b5c)' : 'linear-gradient(135deg, #006b5c 0%, #00b4a3 100%)',
                color: 'white',
                border: 'none',
                padding: '15px 25px',
                borderRadius: "12px",
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 5px 15px rgba(0, 107, 92, 0.3)',
                }}>

                {audioRef.current.muted ? '🔊' : '🔇'}

              </button>
            </div>
          </div>
        </div>

        <div style={styles.prayerTimesContainer}>
          <h2 style={styles.prayerTitle}>Prayer Times</h2>
          <ul style={styles.prayerList}>
            {PRAYERS.map((p, index) => (
              <li key={index} style={styles.prayerItem}>
                <div style={styles.prayerInfo}>
                  <span style={styles.prayerIcon}>🕌</span>
                  <span style={styles.prayerName}>{p}</span>
                </div>
                <div style={styles.prayerTime}>
                  <span style={styles.timeText}>{times[p]}</span>
                  <span style={styles.timeZone}>24h</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #006b5c 0%, #00b4a3 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#333'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #006b5c 0%, #00b4a3 100%)',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: `5px solid #ddd3d1`,
    borderTop: `5px solid #00b4a3`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '20px',
    color: 'white',
    fontSize: '18px',
    fontWeight: '500'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    padding: '20px 0',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 10px 0',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  location: {
    fontSize: '1.2rem',
    color: '#ddd3d1',
    fontWeight: '500'
  },
  card: {
    background: 'white',
    borderRadius: '25px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    gap: "20px"
  },
  countdownContainer: {
    background: 'linear-gradient(135deg, #00b4a3, #006b5c)',
    borderRadius: '15px',
    padding: '25px',
    textAlign: 'center',
    marginBottom: '30px',
    color: 'white',
    boxShadow: '0 10px 20px rgba(0, 180, 163, 0.3)'
  },
  countdown: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '10px',
    fontFamily: "'Courier New', monospace",
    letterSpacing: '1px'
  },
  countdownLabel: {
    fontSize: '0.9rem',
    opacity: '0.9',
    fontWeight: '500'
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '30px'
  },
  installButton: {
    background: 'linear-gradient(135deg, #006b5c, #00b4a3)',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 5px 15px rgba(0, 107, 92, 0.3)'
  },
  notifButton: {
    background: '#ddd3d1',
    color: '#333',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  notifButtonEnabled: {
    background: 'linear-gradient(135deg, #00b4a3, #006b5c)',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'default',
    boxShadow: '0 5px 15px rgba(0, 180, 163, 0.3)'
  },
  iosTip: {
    fontSize: '0.85rem',
    textAlign: 'center',
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #eee'
  },
  volumeControl: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '15px',
    border: '1px solid #eee'
  },
  volumeLabel: {
    display: 'block',
    marginBottom: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#555'
  },
  volumeSlider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: 'linear-gradient(to right, #ddd3d1, #00b4a3)',
    outline: 'none',
    WebkitAppearance: 'none',
    marginButton: "30px",
    cursor: 'pointer'
  },
  prayerTimesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: '20px',
    padding: '25px',
    border: '1px solid #eee',
    width: '100%'
  },
  prayerTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#006b5c',
    margin: '0 0 20px 0',
    textAlign: 'center'
  },
  prayerList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  prayerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 20px',
    marginBottom: '12px',
    backgroundColor: 'white',
    borderRadius: '12px',
    borderLeft: '5px solid #00b4a3',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s ease',
    ':hover': {
      transform: 'translateX(5px)'
    }
  },
  prayerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  prayerIcon: {
    fontSize: '1.2rem'
  },
  prayerName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#333'
  },
  prayerTime: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '5px'
  },
  timeText: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#006b5c'
  },
  timeZone: {
    fontSize: '0.75rem',
    color: '#888',
    backgroundColor: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '10px'
  }
};