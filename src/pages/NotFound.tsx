import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";

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
    <div className="min-h-screen bg-background relative flex justify-center items-start font-sans">
      <ParticleBackground />
      <div className="relative z-10 max-w-[560px] w-full pt-[120px] px-6 pb-[60px] text-center">
        <div className="text-[120px] font-bold leading-none text-primary/15">
          404
        </div>

        <div className="font-mono text-[32px] text-muted-foreground mt-2">
          ¯\_(ツ)_/¯
        </div>

        <h1 className="text-foreground text-[26px] font-semibold mt-6">
          This page does not exist.
        </h1>

        <p
          className="text-muted-foreground text-base mt-3 min-h-[48px] transition-opacity duration-400"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {funnyMessages[msgIndex]}
        </p>

        <div className="inline-block glass-card p-5 mt-8 text-left">
          <p className="text-muted-foreground text-[13px] mb-3">
            Lost? Here are some real pages:
          </p>
          <Link to="/" className="text-primary text-sm block mb-2 hover:underline">
            → Go home
          </Link>
          <Link to="/dashboard" className="text-primary text-sm block mb-2 hover:underline">
            → Dashboard
          </Link>
          <Link to="/connect" className="text-primary text-sm block hover:underline">
            → Connect an app
          </Link>
        </div>

        <p className="text-muted-foreground/60 text-xs mt-6 leading-relaxed">
          If you got here from a real link<br />
          please reply to hello@rismon.ai<br />
          and tell us what broke.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
