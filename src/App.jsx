import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import logo from "./assets/icon-192.png";
import Home from "./pages/Home";

export default function App() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for app installation
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log("App installed successfully!");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    try {
      const result = await installPrompt.prompt();
      console.log("Install prompt result:", result);
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Navigate to Home page after installation
        window.location.href = '/Home';
      }
    } catch (error) {
      console.error("Error installing app:", error);
    }
  };

  // If app is installed, automatically show Home page
  if (isInstalled) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/Home" replace />} />
          <Route path="/Home" element={<Home />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage installPrompt={installPrompt} installApp={installApp} />} />
        <Route path="/Home" element={<Home />} />
      </Routes>
    </Router>
  );
}

// Landing Page Component
function LandingPage({ installPrompt, installApp }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    
    // Detect Android devices
    const android = /android/i.test(navigator.userAgent);
    setIsAndroid(android);
  }, []);

  const handleManualRedirect = () => {
    window.location.href = '/Home';
  };

  return (
    <div style={styles.landingPage}>
      <div style={styles.header}>
        <div style={styles.logoContainer}>
          <img width={80} src={logo} alt="Solat Times Logo" style={styles.logo} />
        </div>
        <h1 style={styles.title}>Solat Times</h1>
        <p style={styles.subtitle}>Your Personal Prayer Companion</p>
      </div>

      <div style={styles.features}>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>🕋</div>
          <h3 style={styles.featureTitle}>Accurate Times</h3>
          <p style={styles.featureText}>Get precise prayer times based on your location</p>
        </div>

        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>🔔</div>
          <h3 style={styles.featureTitle}>Adhan Notifications</h3>
          <p style={styles.featureText}>Gentle reminders for each prayer time</p>
        </div>

        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>📱</div>
          <h3 style={styles.featureTitle}>Offline Access</h3>
          <p style={styles.featureText}>Works without internet connection</p>
        </div>
      </div>

      <div style={styles.installSection}>
        {installPrompt && (
          <>
            <button
              onClick={installApp}
              style={styles.installButton}
            >
              📲 Install App for Best Experience
            </button>
            <p style={styles.installHint}>Get app-like experience with notifications</p>
          </>
        )}

        {!installPrompt && isIOS && (
          <div style={styles.manualInstall}>
            <h3 style={styles.manualTitle}>Install on iOS</h3>
            <ol style={styles.instructions}>
              <li>Tap the Share button <span style={styles.iosIcon}>⎋</span></li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" in the top right</li>
            </ol>
            <button
              onClick={handleManualRedirect}
              style={styles.continueButton}
            >
              Continue to App
            </button>
          </div>
        )}

        {!installPrompt && isAndroid && (
          <div style={styles.manualInstall}>
            <h3 style={styles.manualTitle}>Install on Android</h3>
            <ol style={styles.instructions}>
              <li>Tap the menu (three dots) in Chrome</li>
              <li>Tap "Install app" or "Add to Home screen"</li>
              <li>Follow the prompts to install</li>
            </ol>
            <button
              onClick={handleManualRedirect}
              style={styles.continueButton}
            >
              Continue to App
            </button>
          </div>
        )}

        {!installPrompt && !isIOS && !isAndroid && (
          <div style={styles.manualInstall}>
            <button
              onClick={handleManualRedirect}
              style={styles.continueButton}
            >
              Launch Web App
            </button>
            <p style={styles.browserHint}>
              For best experience, use Chrome or Safari and install the app when prompted
            </p>
          </div>
        )}
      </div>
      {/* <div style={styles.footer}>
        <p style={styles.footerText}>
          Enjoy ad-free, accurate prayer times with beautiful Adhan notifications
        </p>
        <button
          onClick={handleManualRedirect}
          style={styles.skipButton}
        >
          Skip & Use Web Version
        </button>
      </div> */}
    </div>
  );
}

const styles = {
  landingPage: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #006b5c 0%, #00b4a3 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    padding: '30px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '25px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%',
    maxWidth: '600px'
  },
  logoContainer: {
    marginBottom: '20px'
  },
  logo: {
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  },
  title: {
    fontSize: '3rem',
    fontWeight: '800',
    margin: '0 0 10px 0',
    textShadow: '2px 2px 8px rgba(0, 0, 0, 0.3)',
    background: 'linear-gradient(45deg, white, #ddd3d1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#ddd3d1',
    fontWeight: '400',
    margin: '0'
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    maxWidth: '600px',
    marginBottom: '40px'
  },
  featureCard: {
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    padding: '25px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'transform 0.3s ease, background 0.3s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      background: 'rgba(255, 255, 255, 0.2)'
    }
  },
  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: '15px'
  },
  featureTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 10px 0',
    color: 'white'
  },
  featureText: {
    fontSize: '1rem',
    color: '#ddd3d1',
    margin: '0',
    lineHeight: '1.5'
  },
  installSection: {
    width: '100%',
    maxWidth: '600px',
    textAlign: 'center',
    marginBottom: '40px'
  },
  installButton: {
    background: 'linear-gradient(135deg, #00b4a3, #006b5c)',
    color: 'white',
    border: 'none',
    padding: '20px 30px',
    borderRadius: '15px',
    fontSize: '1.2rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(0, 107, 92, 0.4)',
    width: '100%',
    marginBottom: '15px',
    ':hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 15px 30px rgba(0, 107, 92, 0.6)'
    },
    ':active': {
      transform: 'scale(0.98)'
    }
  },
  installHint: {
    fontSize: '0.9rem',
    color: '#ddd3d1',
    margin: '0'
  },
  manualInstall: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '25px',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  manualTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 20px 0',
    color: 'white'
  },
  instructions: {
    textAlign: 'left',
    fontSize: '1.1rem',
    lineHeight: '1.8',
    color: '#ddd3d1',
    paddingLeft: '20px',
    marginBottom: '25px'
  },
  iosIcon: {
    display: 'inline-block',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '2px 8px',
    borderRadius: '6px',
    margin: '0 5px'
  },
  continueButton: {
    background: '#ddd3d1',
    color: '#006b5c',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    ':hover': {
      background: 'white',
      transform: 'scale(1.02)'
    }
  },
  browserHint: {
    fontSize: '0.9rem',
    color: '#ddd3d1',
    margin: '15px 0 0 0',
    fontStyle: 'italic'
  },
  footer: {
    textAlign: 'center',
    width: '100%',
    maxWidth: '600px'
  },
  footerText: {
    fontSize: '1rem',
    color: '#ddd3d1',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  skipButton: {
    background: 'transparent',
    color: '#ddd3d1',
    border: '2px solid #ddd3d1',
    padding: '12px 25px',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      background: 'rgba(221, 211, 209, 0.1)',
      color: 'white'
    }
  }
};