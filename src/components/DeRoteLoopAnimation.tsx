import React, { useEffect, useRef, useState } from 'react';
import blueHeroSculpture from '../assets/images/derote_blue_hero_sculpture_1791725693793.jpg';

interface DeRoteBlueAnimationProps {
  className?: string;
}

export const DeRoteBlueAnimation: React.FC<DeRoteBlueAnimationProps> = ({
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // 6.0 second seamless loop period
  const LOOP_DURATION = 6000;

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime: number | null = null;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Floating micro-particles in royal blue, electric azure, and crystal white
    const particleCount = 16;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      baseX: 0.15 + (i * 0.72) / particleCount,
      baseY: 0.25 + ((i * 1.618) % 0.55),
      radius: 1.5 + (i % 3) * 0.9,
      speedPhase: (i * Math.PI * 2) / particleCount,
      color:
        i % 3 === 0
          ? 'rgba(8, 102, 198, 0.4)' // Royal blue #0866C6
          : i % 3 === 1
          ? 'rgba(22, 143, 229, 0.5)' // Electric azure #168FE5
          : 'rgba(232, 243, 255, 0.7)', // Ice blue #E8F3FF
    }));

    const render = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Perfectly normalized loop progress from 0.0 to 1.0 (exact 6-second cycle)
      const progress = (elapsed % LOOP_DURATION) / LOOP_DURATION;
      const theta = progress * Math.PI * 2;

      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, width, height);

      if (!isReducedMotion) {
        // LAYER 1: Flowing Electric-Azure & White Daylight Caustic Light Sweep
        const sweepX = width * 0.5 + Math.sin(theta) * (width * 0.35);
        const sweepY = height * 0.45 + Math.cos(theta) * (height * 0.2);
        const sweepRadius = width * 0.65;

        const lightGrad = ctx.createRadialGradient(
          sweepX,
          sweepY,
          0,
          sweepX,
          sweepY,
          sweepRadius
        );
        const causticIntensity = 0.2 + Math.sin(theta) * 0.08;
        lightGrad.addColorStop(0, `rgba(255, 255, 255, ${causticIntensity})`);
        lightGrad.addColorStop(0.35, `rgba(22, 143, 229, ${causticIntensity * 0.45})`);
        lightGrad.addColorStop(0.7, `rgba(232, 243, 255, ${causticIntensity * 0.2})`);
        lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // LAYER 2: Glass Arch & Curve Refraction Glints (Sinusoidal Specular Shimmer)
        const glint1Alpha = Math.max(0, Math.sin(theta)) * 0.7;
        if (glint1Alpha > 0.02) {
          const g1X = width * 0.68;
          const g1Y = height * 0.28;
          const flare = ctx.createRadialGradient(g1X, g1Y, 0, g1X, g1Y, 18);
          flare.addColorStop(0, `rgba(255, 255, 255, ${glint1Alpha})`);
          flare.addColorStop(0.4, `rgba(22, 143, 229, ${glint1Alpha * 0.5})`);
          flare.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = flare;
          ctx.beginPath();
          ctx.arc(g1X, g1Y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        const glint2Alpha = Math.max(0, Math.sin(theta + Math.PI)) * 0.6;
        if (glint2Alpha > 0.02) {
          const g2X = width * 0.38;
          const g2Y = height * 0.42;
          const flare2 = ctx.createRadialGradient(g2X, g2Y, 0, g2X, g2Y, 15);
          flare2.addColorStop(0, `rgba(255, 255, 255, ${glint2Alpha})`);
          flare2.addColorStop(0.4, `rgba(8, 102, 198, ${glint2Alpha * 0.45})`);
          flare2.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = flare2;
          ctx.beginPath();
          ctx.arc(g2X, g2Y, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // LAYER 3: Ambient Floating Micro-Motes in 6s Closed Orbits
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        particles.forEach((p) => {
          const pAngle = theta + p.speedPhase;
          const px = width * p.baseX + Math.sin(pAngle) * 15;
          const py = height * p.baseY + Math.cos(pAngle) * 20;
          const pOpacity = 0.25 + Math.sin(pAngle) * 0.2;

          const pGrad = ctx.createRadialGradient(px, py, 0, px, py, p.radius * 2.2);
          pGrad.addColorStop(0, p.color.replace(/0\.\d+/, `${pOpacity}`));
          pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(px, py, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isReducedMotion]);

  // Subtle interactive parallax response
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReducedMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 6, y: y * 6 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-white shadow-xl shadow-[#062B50]/6 border border-[#E8F3FF] select-none group ${className}`}
      aria-label="DeRote abstract blue sculptural ribbon and glass arch composition"
    >
      {/* BASE LAYER: 3D Glossy Blue Sculptural Artwork */}
      <div
        className="absolute inset-0 w-full h-full transform transition-transform duration-300 ease-out"
        style={{
          transform: isReducedMotion
            ? 'none'
            : `perspective(1000px) rotateX(${-tilt.y}deg) rotateY(${tilt.x}deg) scale(1.02)`,
        }}
      >
        <img
          src={blueHeroSculpture}
          alt="DeRote sculptural deep navy and royal blue ribbons with crystal glass arches on crisp white"
          className={`w-full h-full object-cover transition-opacity duration-700 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="eager"
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
        />
      </div>

      {/* LIGHTWEIGHT SINE-BREATHING GLOSS SHEEN OVERLAY (6s cycle) */}
      {!isReducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-soft-light"
          style={{
            background:
              'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.5) 0%, rgba(22,143,229,0.18) 45%, transparent 75%)',
            animation: 'deroteBlueBreathing 6s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
      )}

      {/* REAL-TIME 60FPS COMPOSITOR CANVAS (Seamless 6-second light sweep) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        aria-hidden="true"
      />

      {/* SUBTLE POLISHED HIGHLIGHT RING */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-[#0866C6]/15"
        aria-hidden="true"
      />

      <style>{`
        @keyframes deroteBlueBreathing {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1.0) translateY(0px);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.02) translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
};
