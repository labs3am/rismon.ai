import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const funnyMessages = [
  "Even our AI could not find it.",
  "The AI built this page but then deleted it.",
  "We checked the code. This page was never asked for.",
  "Plot twist: the AI built a 404 page for the 404 page.",
  "Our intent match score for this page: 0%",
  "Looks like the AI went rogue again.",
  "This is exactly why we built Rismon.ai.",
];

const NotFound = () => {
  const location = useLocation();
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % funnyMessages.length);
        setFade(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <SEO
        title="Page not found | Rismon.ai"
        description="That page doesn't exist on Rismon.ai. Head back to the home page or jump to your dashboard."
        noindex
      />
      <Navbar />
      <div className="max-w-[560px] w-full mx-auto pt-[120px] px-6 pb-[60px] text-center">
        <div style={{ fontSize: 120, fontWeight: 700, lineHeight: 1, color: 'rgba(249,115,22,0.2)' }}>
          404
        </div>

        <div style={{ fontFamily: 'monospace', fontSize: 32, color: '#888888', marginTop: 8 }}>
          ¯\_(ツ)_/¯
        </div>

        <h1 style={{ color: '#ffffff', fontSize: 26, fontWeight: 600, marginTop: 24, letterSpacing: '-0.02em' }}>
          This page does not exist.
        </h1>

        <p
          style={{ color: '#888888', fontSize: 16, marginTop: 12, minHeight: 48, transition: 'opacity 0.4s', opacity: fade ? 1 : 0 }}
        >
          {funnyMessages[msgIndex]}
        </p>

        <div className="inline-block mt-8 text-left" style={{ background: '#0a0a0a', border: '1px solid #ffffff14', borderRadius: 12, padding: 20 }}>
          <p style={{ color: '#888888', fontSize: 13, marginBottom: 12 }}>
            Lost? Here are some real pages:
          </p>
          <Link to="/" style={{ color: '#f97316', fontSize: 14, display: 'block', marginBottom: 8 }} className="hover:underline">
            → Go home
          </Link>
          <Link to="/dashboard" style={{ color: '#f97316', fontSize: 14, display: 'block', marginBottom: 8 }} className="hover:underline">
            → Dashboard
          </Link>
          <Link to="/connect" style={{ color: '#f97316', fontSize: 14, display: 'block' }} className="hover:underline">
            → Connect an app
          </Link>
        </div>

        <p style={{ color: '#555555', fontSize: 12, marginTop: 24, lineHeight: 1.6 }}>
          If you got here from a real link<br />
          please reply to hello@rismon.ai<br />
          and tell us what broke.
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
