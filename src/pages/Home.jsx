import { useEffect, useRef, useState } from "react";
import logo from "../assets/icon-192.png";
import '../index.css'

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export default function Home() {
  const [times, setTimes] = useState(null);
  const [countdown, setCountdown] = useState("Loading...");
  const [location, setLocation] = useState("Detecting location…");
  const [enabled, setEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef(new Audio("/adhan.mp3"));
  const lastNotified = useRef("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  // Initialize audio volume
  useEffect(() => {
    audioRef.current.volume = volume;
  }, []);

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
    if (!isMuted) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log(err);
      });
    }
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

      setCountdown(`${next.name} in ${h}h ${m}m ${s}s`);

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
  }, [times, enabled, isMuted]);

  const enableNotifications = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setEnabled(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    audioRef.current.muted = !isMuted;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
    }
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
        <div style={styles.headerContent}>
          <img width={60} src={logo} alt="logo" style={styles.logo} />
          <div>
            <h1 style={styles.title}>Solat Times</h1>
            <div style={styles.location}>📍 {location}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={styles.leftColumn}>
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
                📲 Install App for Better Experience
              </button>
            )}

            {!installPrompt && /iphone|ipad/i.test(navigator.userAgent) && (
              <div style={styles.iosTip}>
                💡 Tip: Tap Share → "Add to Home Screen" for app-like experience
              </div>
            )}

            <button 
              onClick={enableNotifications} 
              disabled={enabled}
              style={enabled ? styles.notifButtonEnabled : styles.notifButton}
            >
              {enabled ? "🔔 Notifications Enabled" : "🔕 Enable Prayer Notifications"}
            </button>

            <div style={styles.volumeControl}>
              <div style={styles.volumeHeader}>
                <span style={styles.volumeLabel}>Adhan Volume</span>
                <button 
                  onClick={toggleMute}
                  style={styles.muteButton}
                >
                  {isMuted ? '🔇 Muted' : '🔊 Sound On'}
                </button>
              </div>
              
              <div className="volume-slider-control" style={styles.volumeSliderContainer}>
                <span style={styles.volumeIcon}>🔈</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  style={styles.volumeSlider}
                />
                <span style={styles.volumeIcon}>🔊</span>
                <span style={styles.volumeValue}>{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.prayerTimesContainer}>
            <h2 style={styles.prayerTitle}>
              <span style={styles.prayerTitleIcon}>🕌</span>
              Prayer Times Today
            </h2>
            <ul style={styles.prayerList}>
              {PRAYERS.map((prayer, index) => (
                <li className="prayer-item" key={index} style={styles.prayerItem}>
                  <div style={styles.prayerInfo}>
                    <div style={styles.prayerIconContainer}>
                      <span style={styles.prayerIcon}>
                        {index === 0 ? "🌙" : 
                         index === 1 ? "☀️" : 
                         index === 2 ? "⛅" : 
                         index === 3 ? "🌅" : "🌃"}
                      </span>
                    </div>
                    <div>
                      <span style={styles.prayerName}>{prayer}</span>
                      <div style={styles.prayerArabic}>
                        {prayer === "Fajr" ? "الفجر" : 
                         prayer === "Dhuhr" ? "الظهر" : 
                         prayer === "Asr" ? "العصر" : 
                         prayer === "Maghrib" ? "المغرب" : "العشاء"}
                      </div>
                    </div>
                  </div>
                  <div className="prayer-time" style={styles.prayerTime}>
                    <span style={styles.timeText}>{times[prayer]}</span>
                    <div style={styles.timeBadge}>
                      <span style={styles.timeZone}>24h</span>
                      {enabled && (
                        <span style={styles.notificationBadge}>🔔</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          May your prayers be accepted 🤲
        </p>
        <div style={styles.footerInfo}>
          <span style={styles.footerInfoItem}>🕋 Prayer Method: Islamic Society of North America (ISNA)</span>
          <span style={styles.footerInfoItem}>📍 Location-based calculation</span>
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
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
    width: '60px',
    height: '60px',
    border: `4px solid rgba(255, 255, 255, 0.3)`,
    borderTop: `4px solid #fff`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  },
  loadingText: {
    marginTop: '20px',
    color: 'white',
    fontSize: '18px',
    fontWeight: '500'
  },
  header: {
    marginBottom: '30px',
    padding: '15px 25px',
    background: 'rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 107, 92, 0.2)'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  logo: {
    borderRadius: '15px',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'white',
    margin: '0 0 5px 0',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
  },
  location: {
    fontSize: '1.1rem',
    color: '#ddd3d1',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

//   card: {
//     background: 'white',
//     borderRadius: '28px',
//     padding: '35px',
//     boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
//     maxWidth: '1200px',
//     margin: '0 auto',
//     display: 'flex',
//     gap: "35px",
//     position: 'relative',
//     overflow: 'hidden'
//   },
  leftColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    width: '100%' ,
  },
  rightColumn: {
    width: "100%"
  },
  countdownContainer: {
    background: 'linear-gradient(135deg, #00b4a3, #006b5c)',
    borderRadius: '20px',
    padding: '30px',
    textAlign: 'center',
    color: 'white',
    boxShadow: '0 15px 30px rgba(0, 180, 163, 0.3)',
    position: 'relative',
    overflow: 'hidden'
  },
  countdown: {
    fontSize: '1.6rem',
    fontWeight: '800',
    marginBottom: '12px',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    letterSpacing: '1px',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
  },
  countdownLabel: {
    fontSize: '0.95rem',
    opacity: '0.95',
    fontWeight: '500',
    letterSpacing: '0.5px'
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  installButton: {
    background: 'linear-gradient(135deg, #006b5c, #00b4a3)',
    color: 'white',
    border: 'none',
    padding: '18px 25px',
    borderRadius: '15px',
    fontSize: '1.05rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(0, 107, 92, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 25px rgba(0, 107, 92, 0.4)'
    }
  },
  notifButton: {
    background: '#ddd3d1',
    color: '#333',
    border: 'none',
    padding: '18px 25px',
    borderRadius: '15px',
    fontSize: '1.05rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    '&:hover': {
      background: '#d0c4c2',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)'
    }
  },
  notifButtonEnabled: {
    background: 'linear-gradient(135deg, #00b4a3, #006b5c)',
    color: 'white',
    border: 'none',
    padding: '18px 25px',
    borderRadius: '15px',
    fontSize: '1.05rem',
    fontWeight: '600',
    cursor: 'default',
    boxShadow: '0 8px 20px rgba(0, 180, 163, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  iosTip: {
    fontSize: '0.9rem',
    textAlign: 'center',
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '12px',
    border: '1px solid #eee',
    lineHeight: '1.5'
  },
  volumeControl: {
    backgroundColor: '#f8f9fa',
    padding: '25px',
    borderRadius: '18px',
    border: '1px solid #eee'
  },
  volumeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  volumeLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#555'
  },
  muteButton: {
    background: isMuted => isMuted ? '#ddd3d1' : 'linear-gradient(135deg, #00b4a3, #006b5c)',
    color: isMuted => isMuted ? '#333' : 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  volumeSliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  volumeIcon: {
    fontSize: '1.2rem',
    color: '#666'
  },
  volumeSlider: {
    flex: 1,
    height: '10px',
    borderRadius: '5px',
    background: 'linear-gradient(to right, #ddd3d1, #00b4a3)',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
    '&::-webkit-slider-thumb': {
      WebkitAppearance: 'none',
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      background: '#006b5c',
      cursor: 'pointer',
      border: '3px solid white',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
    }
  },
  volumeValue: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#006b5c',
    minWidth: '45px',
    textAlign: 'center'
  },
  prayerTimesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: '22px',
    padding: '15px',
    border: '1px solid #eee',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  prayerTitle: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#006b5c',
    margin: '0 0 25px 0',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  prayerTitleIcon: {
    fontSize: '1.8rem'
  },
  prayerList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  prayerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    backgroundColor: 'white',
    borderRadius: '16px',
    borderLeft: '6px solid #00b4a3',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateX(5px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
    }
  },
  prayerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px'
  },
  prayerIconContainer: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00b4a3, #006b5c)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  prayerIcon: {
    fontSize: '1.8rem'
  },
  prayerName: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#333',
    display: 'block',
    marginBottom: '4px'
  },
  prayerArabic: {
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: '500',
    direction: 'rtl',
    fontFamily: "'Noto Naskh Arabic', serif"
  },
  prayerTime: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  },
  timeText: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#006b5c',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace"
  },
  timeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  timeZone: {
    fontSize: '0.8rem',
    color: '#888',
    backgroundColor: '#f0f0f0',
    padding: '4px 12px',
    borderRadius: '12px',
    fontWeight: '600'
  },
  notificationBadge: {
    fontSize: '1rem',
    animation: 'pulse 2s infinite'
  },
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 }
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  footerText: {
    fontSize: '1.1rem',
    color: 'white',
    margin: '0 0 15px 0',
    fontWeight: '500'
  },
  footerInfo: {
    display: 'flex',
    justifyContent: 'center',
    gap: '25px',
    flexWrap: 'wrap'
  },
  footerInfoItem: {
    fontSize: '0.85rem',
    color: '#ddd3d1',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};