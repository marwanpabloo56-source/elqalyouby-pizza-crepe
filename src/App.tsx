import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingBag, CheckCircle2, Home, UtensilsCrossed, MapPin } from 'lucide-react';
import {
  BRAND_LOGO,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_SETTINGS,
  SIZE_LABELS,
  VERIFIED_BRANCHES,
} from './data/menuData';
import {
  BranchInfo,
  CartItem,
  CategoryId,
  CategoryInfo,
  ExtraOption,
  MenuItem,
  RestaurantSettings,
  SizeKey,
} from './types/menu';
import {
  formatPrice,
  getCartItemTotal,
  isSizePending,
} from './utils/menuHelpers';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FeaturedShowcase } from './components/FeaturedShowcase';
import { MenuSection } from './components/MenuSection';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { BranchesSection } from './components/BranchesSection';
import { LogoIntro } from './components/LogoIntro';
import { AdminDashboardPage } from './components/AdminDashboardPage';

const CART_STORAGE_KEY = 'elqalyouby_cart_v3';
const INTRO_SEEN_KEY = 'elqalyouby_intro_seen_v2';

function readCartStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

interface PublicCatalogPayload {
  categories: CategoryInfo[];
  items: MenuItem[];
  branches: BranchInfo[];
  settings: RestaurantSettings;
  updatedAt: string;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');

  const [categories, setCategories] = useState<CategoryInfo[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [branches, setBranches] = useState<BranchInfo[]>(VERIFIED_BRANCHES);
  const [settings, setSettings] = useState<RestaurantSettings>(INITIAL_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>(readCartStorage);

  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');
  const [detailState, setDetailState] = useState<{
    item: MenuItem;
    initialSize: SizeKey;
  } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    const path = window.location.pathname;
    if (path === '/admin' || path.startsWith('/admin/')) return false;
    try {
      return window.sessionStorage.getItem(INTRO_SEEN_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const navigateTo = useCallback((targetPath: string) => {
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPath(targetPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshPublicCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/public/catalog', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as PublicCatalogPayload;
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.items)) setMenuItems(data.items);
      if (Array.isArray(data.branches)) setBranches(data.branches);
      if (data.settings) setSettings(data.settings);
    } catch {
      // Keep canonical catalog fallback cleanly if offline
    }
  }, []);

  useEffect(() => {
    refreshPublicCatalog();
  }, [refreshPublicCatalog]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Ignore storage failures
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore
    }
  }, [cart]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getCartItemTotal(item), 0),
    [cart]
  );

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => !item.isHidden),
    [menuItems]
  );

  const addItemToCart = (payload: {
    item: MenuItem;
    selectedSize: SizeKey;
    selectedExtras: ExtraOption[];
    quantity: number;
    isSiyami: boolean;
    notes: string;
  }) => {
    const { item, selectedSize, selectedExtras, quantity, isSiyami, notes } = payload;
    if (isSizePending(item, selectedSize)) {
      showToast('السعر قيد المراجعة — لا يمكن إضافة هذا الصنف حالياً');
      return;
    }
    const unitPrice = item.prices[selectedSize];
    if (unitPrice == null) return;

    const sortedExtraIds = [...selectedExtras]
      .map((e) => e.id)
      .sort()
      .join(',');
    const signature = `${item.id}__${selectedSize}__${sortedExtraIds}__${isSiyami ? '1' : '0'}__${notes.trim()}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.cartItemId === signature);
      if (existing) {
        return prev.map((c) =>
          c.cartItemId === signature ? { ...c, quantity: c.quantity + quantity } : c
        );
      }
      return [
        ...prev,
        {
          cartItemId: signature,
          menuItemId: item.id,
          name: item.name,
          categoryId: item.categoryId,
          image: item.image,
          selectedSize,
          unitPrice,
          quantity,
          selectedExtras,
          isSiyami,
          notes: notes.trim() || undefined,
        },
      ];
    });

    const sizeTxt = selectedSize !== 'single' ? ` (${SIZE_LABELS[selectedSize]})` : '';
    showToast(`تمت إضافة ${item.name}${sizeTxt} إلى السلة`);
  };

  const handleQuickAdd = (payload: {
    item: MenuItem;
    selectedSize: SizeKey;
    selectedExtras: ExtraOption[];
    quantity: number;
    isSiyami: boolean;
  }) => {
    addItemToCart({
      ...payload,
      notes: '',
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleUpdateCartSize = (
    cartItemId: string,
    newSize: SizeKey,
    newPrice: number
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, selectedSize: newSize, unitPrice: newPrice }
          : item
      )
    );
  };

  const handleToggleCartExtra = (cartItemId: string, extra: ExtraOption) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const exists = item.selectedExtras.some((e) => e.id === extra.id);
        return {
          ...item,
          selectedExtras: exists
            ? item.selectedExtras.filter((e) => e.id !== extra.id)
            : [...item.selectedExtras, extra],
        };
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const scrollToMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleJumpToCategory = (catId: CategoryId | 'all') => {
    setActiveCategory(catId);
    scrollToMenu();
  };

  const activeDetailCategoryName = detailState
    ? categories.find((c) => c.id === detailState.item.categoryId)?.name ?? ''
    : '';

  if (isAdminRoute) {
    return (
      <AdminDashboardPage
        onNavigateHome={() => {
          navigateTo('/');
          refreshPublicCatalog();
        }}
        onCatalogMutated={refreshPublicCatalog}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090909] text-[#F8F5EF] flex flex-col pb-14 md:pb-0">
      {showIntro && (
        <LogoIntro
          restaurantName={settings.restaurantName}
          onComplete={handleIntroComplete}
        />
      )}

      <Header
        restaurantName={settings.restaurantName}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => navigateTo('/admin')}
      />

      <main className="flex-1">
        <HeroSection
          restaurantName={settings.restaurantName}
          tagline={settings.tagline}
          onOrderNow={scrollToMenu}
          onExploreMenu={scrollToMenu}
          onSelectCategory={handleJumpToCategory}
        />

        <FeaturedShowcase
          categories={categories}
          items={visibleMenuItems}
          onSelectCategory={handleJumpToCategory}
          onOpenDetail={(item, initialSize) =>
            setDetailState({ item, initialSize })
          }
          onQuickAdd={handleQuickAdd}
        />

        <MenuSection
          categories={categories}
          items={visibleMenuItems}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onOpenDetail={(item, initialSize) =>
            setDetailState({ item, initialSize })
          }
          onQuickAdd={handleQuickAdd}
        />

        <BranchesSection branches={branches} />
      </main>

      {/* Luxury Dark Footer with Original Extracted Logo */}
      <footer className="bg-[#060606] border-t border-[#D4AF37]/20 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={BRAND_LOGO}
              alt={`شعار ${settings.restaurantName}`}
              className="w-14 h-14 rounded-full object-contain ring-1 ring-[#D4AF37]/60 bg-[#171717] shrink-0"
            />
            <div>
              <p className="font-display text-lg font-bold text-[#F8F5EF]">
                {settings.restaurantName}
              </p>
              <p className="text-xs text-[#A8A29E] mt-1">
                {settings.tagline} · جميع الحقوق محفوظة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-[#A8A29E]">
            <a href="#hero" className="hover:text-[#F8F5EF] transition-colors">
              الرئيسية
            </a>
            <a href="#featured" className="hover:text-[#F8F5EF] transition-colors">
              المختارات
            </a>
            <a href="#menu" className="hover:text-[#F8F5EF] transition-colors">
              المنيو
            </a>
            <a href="#branches" className="hover:text-[#F8F5EF] transition-colors">
              الفروع
            </a>
            <button
              type="button"
              onClick={() => navigateTo('/admin')}
              className="hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              لوحة الإدارة
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 h-[52px] bg-[#111111]/95 backdrop-blur-md border-t border-[#D4AF37]/20 px-3 flex items-center justify-between gap-2">
        {cartCount > 0 ? (
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full h-9 px-4 rounded-xl bg-[#B91C1C] text-white flex items-center justify-between text-xs font-semibold cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>عرض السلة</span>
              <span className="tabular-nums bg-black/25 px-1.5 py-0.5 rounded">
                {cartCount}
              </span>
            </span>
            <span className="tabular-nums font-bold">
              {formatPrice(cartSubtotal)}
            </span>
          </button>
        ) : (
          <nav aria-label="تنقل الجوال السريع" className="w-full flex items-center justify-around text-[11px] text-[#A8A29E]">
            <a href="#hero" className="flex items-center gap-1.5 py-1.5 px-2 text-[#F8F5EF]">
              <Home className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>الرئيسية</span>
            </a>
            <a href="#menu" className="flex items-center gap-1.5 py-1.5 px-2 text-[#F8F5EF]">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>المنيو</span>
            </a>
            <a href="#branches" className="flex items-center gap-1.5 py-1.5 px-2 text-[#F8F5EF]">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>الفروع</span>
            </a>
          </nav>
        )}
      </div>

      {/* Modals & Drawers */}
      <ProductModal
        item={detailState?.item ?? null}
        categoryName={activeDetailCategoryName}
        initialSize={detailState?.initialSize ?? 'single'}
        onClose={() => setDetailState(null)}
        onAddToCart={addItemToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        menuItems={visibleMenuItems}
        settings={settings}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onUpdateSize={handleUpdateCartSize}
        onToggleExtra={handleToggleCartExtra}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        items={cart}
        branches={branches}
        settings={settings}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSimulated={() => {
          setCart([]);
          showToast('تم تجهيز الطلب بنجاح');
        }}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#171717] border border-[#D4AF37]/60 text-[#F8F5EF] text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xl transition-opacity duration-200 whitespace-nowrap"
        >
          <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
