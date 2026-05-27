import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Home } from "lucide-react";
import SEO from "@/components/SEO";

/**
 * Rismon-themed 404 page.
 *
 * Adapted from the "page-not-found" stick-figure animation:
 *  - Background: black (matches site theme)
 *  - Font: inherits Inter from index.css (no override)
 *  - Stick figures: original SVGs are black, we invert them via CSS filter
 *    so they read as white on the dark background.
 *  - Accent: orange (#f97316) for the 404 numerals + primary CTA.
 *  - Circles: white particle burst on canvas.
 */
const STICK_BASE =
  "https://raw.githubusercontent.com/RicardoYare/imagenes/9ef29f5bbe075b1d1230a996d87bca313b9b6a63/sticks";

type StickFigure = {
  top?: string;
  bottom?: string;
  src: string;
  transform?: string;
  speedX: number;
  speedRotation?: number;
};

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      <SEO
        title="Page not found | Rismon.ai"
        description="That page doesn't exist on Rismon.ai. Head back to the home page or jump to your dashboard."
        noindex
      />
      {/* Background animations */}
      <CircleAnimation />
      <CharactersAnimation />
      {/* Foreground message */}
      <MessageDisplay />
    </div>
  );
};

export default NotFound;

/* -------------------------------------------------------------------------- */
/* Message                                                                     */
/* -------------------------------------------------------------------------- */

function MessageDisplay() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div
        className={`transition-all duration-700 ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Page not found
        </p>

        <h1
          className="mt-3 font-bold leading-none tracking-tight text-orange-500"
          style={{ fontSize: "clamp(96px, 18vw, 200px)" }}
        >
          404
        </h1>

        <p className="mx-auto mt-4 max-w-[420px] text-sm leading-relaxed text-muted-foreground sm:text-base">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="group flex h-auto items-center gap-2 rounded-md border border-white/20 bg-transparent px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 ease-in-out hover:scale-[1.03] hover:border-white hover:bg-white hover:text-black"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Go Back
          </button>
          <button
            onClick={() => navigate("/")}
            className="group flex h-auto items-center gap-2 rounded-md bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 ease-in-out hover:scale-[1.03] hover:bg-orange-600"
          >
            <Home className="h-4 w-4" />
            Go Home
          </button>
        </div>

        <p className="mt-10 text-xs text-zinc-600">
          Got here from a real link? Reply to{" "}
          <a
            href="mailto:hello@rismon.ai"
            className="text-orange-500 hover:underline"
          >
            hello@rismon.ai
          </a>{" "}
          and tell us what broke.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stick figure animation                                                      */
/* -------------------------------------------------------------------------- */

function CharactersAnimation() {
  const charactersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stickFigures: StickFigure[] = [
      { top: "0%", src: `${STICK_BASE}/stick0.svg`, transform: "rotateZ(-90deg)", speedX: 1500 },
      { top: "10%", src: `${STICK_BASE}/stick1.svg`, speedX: 3000, speedRotation: 2000 },
      { top: "20%", src: `${STICK_BASE}/stick2.svg`, speedX: 5000, speedRotation: 1000 },
      { top: "25%", src: `${STICK_BASE}/stick0.svg`, speedX: 2500, speedRotation: 1500 },
      { top: "35%", src: `${STICK_BASE}/stick0.svg`, speedX: 2000, speedRotation: 300 },
      { bottom: "5%", src: `${STICK_BASE}/stick3.svg`, speedX: 0 },
    ];

    const container = charactersRef.current;
    if (!container) return;
    container.innerHTML = "";

    stickFigures.forEach((figure, index) => {
      const stick = document.createElement("img");
      stick.alt = "";
      stick.style.position = "absolute";
      stick.style.width = "18%";
      stick.style.height = "18%";
      // Invert black SVGs to white so they read on the dark theme.
      stick.style.filter = "invert(1) brightness(1.2)";
      stick.style.opacity = "0.85";

      if (figure.top) stick.style.top = figure.top;
      if (figure.bottom) stick.style.bottom = figure.bottom;
      stick.src = figure.src;
      if (figure.transform) stick.style.transform = figure.transform;

      container.appendChild(stick);

      if (index === 5) return; // last one stays put

      stick.animate(
        [{ left: "100%" }, { left: "-20%" }],
        { duration: figure.speedX, easing: "linear", fill: "forwards" }
      );

      if (index === 0) return; // first one doesn't rotate

      if (figure.speedRotation) {
        stick.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }],
          { duration: figure.speedRotation, iterations: Infinity, easing: "linear" }
        );
      }
    });

    return () => {
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={charactersRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 select-none"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Circle particle animation                                                   */
/* -------------------------------------------------------------------------- */

interface Circulo {
  x: number;
  y: number;
  size: number;
}

function CircleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestIdRef = useRef<number | undefined>(undefined);
  const timerRef = useRef(0);
  const circulosRef = useRef<Circulo[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initArr = () => {
      circulosRef.current = [];
      for (let i = 0; i < 300; i++) {
        const randomX =
          Math.floor(Math.random() * (canvas.width * 3 - canvas.width * 1.2 + 1)) +
          canvas.width * 1.2;
        const randomY =
          Math.floor(Math.random() * (canvas.height - canvas.height * -0.2 + 1)) +
          canvas.height * -0.2;
        const size = canvas.width / 1000;
        circulosRef.current.push({ x: randomX, y: randomY, size });
      }
    };

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      timerRef.current++;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const distanceX = canvas.width / 80;
      const growthRate = canvas.width / 1000;

      ctx.fillStyle = "white";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      circulosRef.current.forEach((c) => {
        ctx.beginPath();
        if (timerRef.current < 65) {
          c.x = c.x - distanceX;
          c.size = c.size + growthRate;
        }
        if (timerRef.current > 65 && timerRef.current < 500) {
          c.x = c.x - distanceX * 0.02;
          c.size = c.size + growthRate * 0.2;
        }
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (timerRef.current > 500) {
        if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current);
        return;
      }
      requestIdRef.current = requestAnimationFrame(draw);
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    timerRef.current = 0;
    initArr();
    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      timerRef.current = 0;
      if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current);
      initArr();
      draw();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-30"
    />
  );
}
