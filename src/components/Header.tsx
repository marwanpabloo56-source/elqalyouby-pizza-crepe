import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { BRAND_LOGO } from '../data/menuData';

interface HeaderProps {
  restaurantName: string;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
}

export function Header({
  restaurantName,
  cartCount,
  onOpenCart,
  onOpenAdmin,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 h-14 md:h-16 bg-[#090909]/92 backdrop-blur-md border-b border-[#D4AF37]/20">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 md:gap-8">
        {/* Brand Lockup with Original Circular Logo */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('hero');
          }}
          className="inline-flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg"
        >
          <img
            src={BRAND_LOGO}
            alt={`شعار ${restaurantName}`}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full object-contain ring-1 ring-[#D4AF37]/60 bg-[#171717] shrink-0"
          />
          <span className="font-display text-base sm:text-lg md:text-xl font-bold text-[#F8F5EF] tracking-tight whitespace-nowrap shrink-0">
            {restaurantName}
          </span>
        </a>

        {/* Single-Line Navigation */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A8A29E]"
        >
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('hero');
            }}
            className="hover:text-[#F8F5EF] transition-colors py-1 border-b border-transparent hover:border-[#D4AF37] whitespace-nowrap shrink-0"
          >
            الرئيسية
          </a>
          <a
            href="#featured"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('featured');
            }}
            className="hover:text-[#F8F5EF] transition-colors py-1 border-b border-transparent hover:border-[#D4AF37] whitespace-nowrap shrink-0"
          >
            المختارات
          </a>
          <a
            href="#menu"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('menu');
            }}
            className="hover:text-[#F8F5EF] transition-colors py-1 border-b border-transparent hover:border-[#D4AF37] whitespace-nowrap shrink-0"
          >
            المنيو
          </a>
          <a
            href="#branches"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('branches');
            }}
            className="hover:text-[#F8F5EF] transition-colors py-1 border-b border-transparent hover:border-[#D4AF37] whitespace-nowrap shrink-0"
          >
            الفروع
          </a>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="hover:text-[#D4AF37] transition-colors py-1 border-b border-transparent hover:border-[#D4AF37] whitespace-nowrap shrink-0 cursor-pointer"
          >
            لوحة الإدارة
          </button>
        </nav>

        {/* Cart CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="فتح سلة الطلبات"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>سلة الطلبات</span>
            {cartCount > 0 && (
              <span className="tabular-nums font-bold text-[#F8F5EF] bg-black/35 px-1.5 py-0.5 rounded text-xs">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            className="md:hidden p-2 rounded-lg text-[#F8F5EF] hover:bg-white/[0.06] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#171717] border-b border-[#D4AF37]/25 px-4 py-4 space-y-2 shadow-2xl">
          <div className="flex items-center gap-3 pb-3 mb-2 border-b border-white/[0.08]">
            <img
              src={BRAND_LOGO}
              alt={`شعار ${restaurantName}`}
              className="w-11 h-11 rounded-full object-contain ring-1 ring-[#D4AF37]/60 bg-[#090909]"
            />
            <div>
              <p className="font-display text-sm font-bold text-[#F8F5EF]">
                {restaurantName}
              </p>
              <p className="text-xs text-[#D4AF37]">أحفاد أبو سريع</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollToSection('hero')}
            className="w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F5EF] hover:bg-white/[0.05] block cursor-pointer"
          >
            الرئيسية
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('featured')}
            className="w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F5EF] hover:bg-white/[0.05] block cursor-pointer"
          >
            مختارات القليوبي
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('menu')}
            className="w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F5EF] hover:bg-white/[0.05] block cursor-pointer"
          >
            المنيو الكامل
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('branches')}
            className="w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium text-[#F8F5EF] hover:bg-white/[0.05] block cursor-pointer"
          >
            الفروع وأرقام الطلب
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenAdmin();
            }}
            className="w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium text-[#D4AF37] hover:bg-white/[0.05] block cursor-pointer"
          >
            لوحة الإدارة
          </button>
        </div>
      )}
    </header>
  );
}
