import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";

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
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#080808",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      fontFamily: "-apple-system, Inter, sans-serif",
    }}>
      <div style={{
        maxWidth: 560,
        width: "100%",
        paddingTop: 120,
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 60,
        textAlign: "center",
      }}>
        {/* Big 404 */}
        <div style={{
          fontSize: 120,
          fontWeight: 700,
          color: "rgba(99,102,241,0.15)",
          lineHeight: 1,
          margin: 0,
        }}>
          404
        </div>

        {/* Shrug */}
        <div style={{
          fontFamily: "monospace",
          fontSize: 32,
          color: "#3f3f46",
          marginTop: 8,
        }}>
          ¯\_(ツ)_/¯
        </div>

        {/* Heading */}
        <h1 style={{
          color: "#ffffff",
          fontSize: 26,
          fontWeight: 600,
          marginTop: 24,
          marginBottom: 0,
        }}>
          This page does not exist.
        </h1>

        {/* Rotating message */}
        <p style={{
          color: "#71717a",
          fontSize: 16,
          marginTop: 12,
          minHeight: 48,
          transition: "opacity 0.4s ease",
          opacity: fade ? 1 : 0,
        }}>
          {funnyMessages[msgIndex]}
        </p>

        {/* Links card */}
        <div style={{
          display: "inline-block",
          backgroundColor: "#111111",
          border: "1px solid #1e1e1e",
          borderRadius: 12,
          padding: "20px 24px",
          marginTop: 32,
          textAlign: "left",
        }}>
          <p style={{
            color: "#52525b",
            fontSize: 13,
            marginTop: 0,
            marginBottom: 12,
          }}>
            Lost? Here are some real pages:
          </p>
          <Link to="/" style={{
            color: "#6366f1",
            fontSize: 14,
            display: "block",
            marginBottom: 8,
            textDecoration: "none",
          }}>
            → Go home
          </Link>
          <Link to="/dashboard" style={{
            color: "#6366f1",
            fontSize: 14,
            display: "block",
            marginBottom: 8,
            textDecoration: "none",
          }}>
            → Dashboard
          </Link>
          <Link to="/connect" style={{
            color: "#6366f1",
            fontSize: 14,
            display: "block",
            textDecoration: "none",
          }}>
            → Connect an app
          </Link>
        </div>

        {/* Bottom text */}
        <p style={{
          color: "#3f3f46",
          fontSize: 12,
          marginTop: 24,
          lineHeight: 1.5,
        }}>
          If you got here from a real link<br />
          please reply to hello@rismon.ai<br />
          and tell us what broke.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
