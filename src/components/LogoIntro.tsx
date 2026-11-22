import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BRAND_LOGO } from '../data/menuData';

interface LogoIntroProps {
  restaurantName: string;
  onComplete: () => void;
}

const INTRO_TOTAL_MS = 2500;
const INTRO_FADE_START_MS = 2050;
const REDUCED_TOTAL_MS = 950;
const REDUCED_FADE_START_MS = 700;

export function LogoIntro({ restaurantName, onComplete }: LogoIntroProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const completedRef = useRef(false);

  const finishIntro = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const fadeDelay = prefersReducedMotion ? REDUCED_FADE_START_MS : INTRO_FADE_START_MS;
    const endDelay = prefersReducedMotion ? REDUCED_TOTAL_MS : INTRO_TOTAL_MS;

    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true);
    }, fadeDelay);

    const endTimer = window.setTimeout(() => {
      finishIntro();
    }, endDelay);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        setIsFadingOut(true);
        window.setTimeout(finishIntro, 220);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(fadeTimer);
      window.clearTimeout(endTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [prefersReducedMotion]);

  const handleSkip = () => {
    setIsFadingOut(true);
    window.setTimeout(finishIntro, prefersReducedMotion ? 50 : 260);
  };

  return (
    <motion.div
      role="presentation"
      aria-label={`شاشة الترحيب - ${restaurantName}`}
      initial={{ opacity: 1 }}
      animate={{
        opacity: isFadingOut ? 0 : 1,
        scale: isFadingOut && !prefersReducedMotion ? 1.02 : 1,
      }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed inset-0 z-[100] bg-[#080808] flex flex-col items-center justify-center px-6 overflow-hidden select-none"
    >
      {/* Gentle Red & Gold Cinematic Ambient Lighting Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 44%, rgba(212, 175, 55, 0.14) 0%, rgba(185, 28, 28, 0.08) 34%, rgba(8, 8, 8, 0) 68%)',
        }}
      />
      <motion.div
        aria-hidden="true"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.7 }}
        animate={
          prefersReducedMotion
            ? { opacity: 0.7 }
            : { opacity: [0.15, 0.55, 0.4], scale: [0.85, 1.12, 1.05] }
        }
        transition={{
          duration: 2.1,
          ease: 'easeOut',
        }}
        className="pointer-events-none absolute w-80 h-80 sm:w-[440px] sm:h-[440px] rounded-full bg-[#B91C1C]/18 blur-[95px] -translate-y-6"
      />

      {/* Center Stage: Isolated Circular Logo + Golden Glow + Arabic Brand Title */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Subtle Golden Halo Behind Circular Logo */}
        <div className="relative flex items-center justify-center">
          <motion.div
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.75 }}
            animate={
              prefersReducedMotion
                ? { opacity: 0.55 }
                : { opacity: [0, 0.75, 0.55], scale: [0.78, 1.08, 1.02] }
            }
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 rounded-full bg-[#D4AF37]/30 blur-2xl scale-110"
          />

          {/* Thin Subtle Metallic Gold Outer Ring Accent */}
          <motion.div
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.82 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -inset-3 rounded-full border border-[#D4AF37]/30"
          />
          <motion.div
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 0.3, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -inset-6 rounded-full border border-[#B91C1C]/25"
          />

          {/* Isolated Original Circular Logo with Smooth Cinematic Zoom-In */}
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.72 }
            }
            animate={{ opacity: 1, scale: prefersReducedMotion ? 1 : 1.02 }}
            transition={{
              opacity: { duration: 0.75, ease: 'easeOut' },
              scale: { duration: 2.1, ease: [0.22, 1, 0.36, 1] },
            }}
            className="relative w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64 rounded-full overflow-hidden ring-2 ring-[#D4AF37]/75 shadow-[0_0_65px_rgba(212,175,55,0.34)] bg-[#080808]"
          >
            {!logoFailed ? (
              <img
                src={BRAND_LOGO}
                alt={`شعار ${restaurantName}`}
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-contain rounded-full scale-[1.03]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#141414] text-[#D4AF37] p-4">
                <span className="font-display text-2xl font-black text-[#F8F5EF]">
                  القليوبي
                </span>
                <span className="text-xs text-[#D4AF37] mt-1">أحفاد أبو سريع</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Arabic Brand Identity Reveal Underneath */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: prefersReducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-7 flex flex-col items-center"
        >
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-[#F8F5EF] tracking-tight">
            بيتزا وكريب القليوبي
          </h1>

          <motion.div
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: prefersReducedMotion ? 0 : 0.55, ease: 'easeOut' }}
            className="mt-3 mb-2.5 h-[1.5px] w-28 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
          />

          <p className="text-xs sm:text-sm font-medium text-[#D4AF37]/90">
            أحفاد أبو سريع
          </p>
        </motion.div>
      </div>

      {/* Subtle Unobtrusive Skip Entry for Immediate Control */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs text-[#A8A29E]/75 hover:text-[#F8F5EF] transition-colors cursor-pointer"
      >
        تخطي
      </button>
    </motion.div>
  );
}
