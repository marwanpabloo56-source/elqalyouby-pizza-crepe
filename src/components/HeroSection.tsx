import { useEffect, useState } from 'react';
import { ArrowDownLeft, BookOpen } from 'lucide-react';
import { BRAND_LOGO, DISH_IMAGES, HERO_IMAGE } from '../data/menuData';
import { CategoryId } from '../types/menu';

interface HeroSectionProps {
  restaurantName: string;
  tagline: string;
  onOrderNow: () => void;
  onExploreMenu: () => void;
  onSelectCategory: (catId: CategoryId) => void;
}

const HERO_QUICK_CATEGORIES: {
  id: CategoryId;
  label: string;
  sub: string;
  image: string;
}[] = [
  {
    id: 'italian-pizza',
    label: 'بيتزا إيطالي',
    sub: 'عجينة مخبوزة طازجة',
    image: DISH_IMAGES.pizzaMargherita,
  },
  {
    id: 'oriental-pizza',
    label: 'بيتزا شرقي',
    sub: 'حشوات مصرية أصيلة',
    image: DISH_IMAGES.pizzaOrientalSupreme,
  },
  {
    id: 'stuffed-feteer',
    label: 'فطائر محشوة',
    sub: 'طبقات مقرمشة بحشو غني',
    image: DISH_IMAGES.feteerChicken,
  },
  {
    id: 'meat-chicken-crepe',
    label: 'كريب وصاروخ',
    sub: 'شاورما واستربس وسجق',
    image: DISH_IMAGES.crepeChickenShawarma,
  },
];

export function HeroSection({
  restaurantName,
  tagline,
  onOrderNow,
  onExploreMenu,
  onSelectCategory,
}: HeroSectionProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      setScrollY(Math.min(window.scrollY, 380));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[#090909] border-b border-[#D4AF37]/20"
    >
      {/* Full-Bleed Dark Cinematic Hero Stage */}
      <div className="relative min-h-[76vh] md:min-h-[82vh] flex items-center">
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(0, ${scrollY * 0.12}px, 0) scale(${1 + scrollY * 0.00014})`,
          }}
        >
          <img
            src={HERO_IMAGE}
            alt={restaurantName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Rich Charcoal Directional Contrast Scrims */}
        <div
          className="absolute inset-0 bg-gradient-to-l from-[#090909]/95 via-[#090909]/72 to-[#090909]/25"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-[#090909]/45"
          aria-hidden="true"
        />

        {/* Subtle Ambient Warm Ember Glow */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#B91C1C]/15 blur-3xl"
          aria-hidden="true"
        />

        {/* Hero Foreground */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:py-20">
          <div className="max-w-2xl">
            {/* Prominent Original Circular Brand Logo Medallion */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-1 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#B91C1C]/70 to-transparent shadow-2xl shrink-0">
                <img
                  src={BRAND_LOGO}
                  alt={`شعار ${restaurantName}`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-contain bg-[#171717]"
                />
              </div>
              <div>
                <p className="font-display text-base sm:text-lg font-bold text-[#F8F5EF]">
                  {restaurantName}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-[#D4AF37]">
                  {tagline} · بيتزا إيطالي وشرقي · فطائر وكريب
                </p>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="font-display font-black text-[#F8F5EF] text-balance leading-[1.15] tracking-tight mb-4 text-[clamp(2.15rem,5vw,4rem)]">
              القليوبي...{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#F3E5AB] via-[#D4AF37] to-[#B38E44]">
                الطعم اللي ملوش منافس
              </span>
            </h1>

            {/* Supporting Line */}
            <p className="text-[#E7E1D6] text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mb-8">
              بيتزا سخنة، كريب متظبط، وفطائر على أصولها.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                type="button"
                onClick={onOrderNow}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-base transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] min-h-[52px] shadow-xl shadow-[#B91C1C]/30"
              >
                <span>اطلب أكلك دلوقتي</span>
                <ArrowDownLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onExploreMenu}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#171717]/90 hover:bg-[#222222] text-[#F8F5EF] border border-[#D4AF37]/55 hover:border-[#D4AF37] font-semibold text-base transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] min-h-[52px]"
              >
                <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                <span>اكتشف المنيو</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Immediate Culinary Visual Showcase Strip */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {HERO_QUICK_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectCategory(item.id)}
              className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-[#171717] border border-[#D4AF37]/25 hover:border-[#D4AF37] text-right transition-all duration-200 hover:-translate-y-1 cursor-pointer shadow-xl"
            >
              <img
                src={item.image}
                alt={item.label}
                loading="eager"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#090909]/92 via-[#090909]/35 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute bottom-2.5 right-3 left-3">
                <p className="font-display text-sm sm:text-base font-bold text-[#F8F5EF] group-hover:text-[#D4AF37] transition-colors">
                  {item.label}
                </p>
                <p className="text-[11px] sm:text-xs text-[#D4AF37]/90 truncate">
                  {item.sub}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
