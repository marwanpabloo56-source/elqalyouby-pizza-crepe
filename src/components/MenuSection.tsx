import { useMemo, useState } from 'react';
import { Search, X, UtensilsCrossed } from 'lucide-react';
import { COMPLIMENTARY_PIZZA_FETEER_TOPPINGS } from '../data/menuData';
import { CategoryId, CategoryInfo, ExtraOption, MenuItem, SizeKey } from '../types/menu';
import { ProductCard } from './ProductCard';

interface MenuSectionProps {
  categories: CategoryInfo[];
  items: MenuItem[];
  activeCategory: CategoryId | 'all';
  onSelectCategory: (catId: CategoryId | 'all') => void;
  onOpenDetail: (item: MenuItem, initialSize: SizeKey) => void;
  onQuickAdd: (payload: {
    item: MenuItem;
    selectedSize: SizeKey;
    selectedExtras: ExtraOption[];
    quantity: number;
    isSiyami: boolean;
  }) => void;
}

function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

export function MenuSection({
  categories,
  items,
  activeCategory,
  onSelectCategory,
  onOpenDetail,
  onQuickAdd,
}: MenuSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlySiyami, setOnlySiyami] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleCategoryChange = (catId: CategoryId | 'all') => {
    if (catId === activeCategory && !searchQuery) return;
    setIsTransitioning(true);
    setSearchQuery('');
    onSelectCategory(catId);
    window.setTimeout(() => setIsTransitioning(false), 110);
  };

  const categoryMap = useMemo(() => {
    const map = new Map<CategoryId, CategoryInfo>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeArabic(searchQuery);
    return items.filter((item) => {
      if (onlySiyami && !item.supportsSiyamiOption) return false;
      if (normalizedQuery) {
        const matchName = normalizeArabic(item.name).includes(normalizedQuery);
        const matchSub = item.subGroup
          ? normalizeArabic(item.subGroup).includes(normalizedQuery)
          : false;
        const catName = categoryMap.get(item.categoryId)?.name ?? '';
        const matchCat = normalizeArabic(catName).includes(normalizedQuery);
        return matchName || matchSub || matchCat;
      }
      if (activeCategory === 'all') return true;
      return item.categoryId === activeCategory;
    });
  }, [items, activeCategory, searchQuery, onlySiyami, categoryMap]);

  // Keep every category separate and display ALL products inside each category as identical cards in one grid
  const groupedCategorySections = useMemo(() => {
    const sections: { category: CategoryInfo; items: MenuItem[] }[] = [];
    categories.forEach((cat) => {
      const catItems = filteredItems.filter((item) => item.categoryId === cat.id);
      if (catItems.length > 0) {
        sections.push({ category: cat, items: catItems });
      }
    });
    return sections;
  }, [categories, filteredItems]);

  const currentCatInfo =
    activeCategory !== 'all' ? categoryMap.get(activeCategory) : undefined;

  return (
    <section
      id="menu"
      className="py-12 md:py-16 bg-[#090909] text-[#F8F5EF] border-b border-[#D4AF37]/15"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-[#D4AF37] mb-1.5">
              القائمة الكاملة · جميع الأصناف والأسعار المعتمدة
            </p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#F8F5EF] text-balance">
              منيو بيتزا وكريب القليوبي
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOnlySiyami((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer min-h-[42px] ${
                onlySiyami
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-[#090909]'
                  : 'bg-[#171717] border-white/[0.08] text-[#A8A29E] hover:text-[#F8F5EF] hover:border-[#D4AF37]/40'
              }`}
            >
              <span>يوجد فطير صيامي</span>
            </button>
          </div>
        </div>

        {/* Sticky Search & Category Tabs Bar */}
        <div className="md:sticky md:top-16 z-20 bg-[#090909]/95 backdrop-blur-md py-3 -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-y border-white/[0.08] mb-8 space-y-3">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-[#A8A29E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن بيتزا، فطيرة، كريب، صاروخ، أو إضافة..."
              aria-label="ابحث في المنيو"
              className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-[#171717] border border-white/[0.1] text-sm text-[#F8F5EF] placeholder:text-[#A8A29E]/65 focus:outline-none focus:border-[#D4AF37]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="مسح البحث"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A8A29E] hover:text-[#F8F5EF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="أقسام المنيو"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all' && !searchQuery}
              onClick={() => handleCategoryChange('all')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                activeCategory === 'all' && !searchQuery
                  ? 'bg-[#B91C1C] text-white'
                  : 'bg-[#171717] text-[#A8A29E] hover:text-[#F8F5EF] border border-white/[0.08]'
              }`}
            >
              عرض الكل ({items.length})
            </button>

            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                    isSelected
                      ? 'bg-[#B91C1C] text-white'
                      : 'bg-[#171717] text-[#A8A29E] hover:text-[#F8F5EF] border border-white/[0.08]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Results Summary */}
        {searchQuery.trim() && (
          <div className="mb-6 flex items-center justify-between text-sm text-[#A8A29E]">
            <span>
              نتائج البحث عن &quot;{searchQuery}&quot;:{' '}
              <strong className="text-[#F8F5EF] tabular-nums">{filteredItems.length}</strong> صنف
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#D4AF37] hover:underline cursor-pointer"
            >
              إلغاء البحث
            </button>
          </div>
        )}

        {/* Active Single-Category Banner */}
        {!searchQuery && currentCatInfo && groupedCategorySections.length === 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7 pb-4 border-b border-white/[0.08]">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-extrabold text-[#F8F5EF]">
                {currentCatInfo.name}
              </h3>
              <p className="text-sm text-[#A8A29E] mt-0.5">{currentCatInfo.subtitle}</p>
            </div>
            {(activeCategory === 'italian-pizza' ||
              activeCategory === 'oriental-pizza' ||
              activeCategory === 'stuffed-feteer') && (
              <p className="text-xs font-semibold text-[#D4AF37] bg-[#171717] border border-[#D4AF37]/30 px-3.5 py-2 rounded-xl">
                يضاف مجاناً حسب المنيو: {COMPLIMENTARY_PIZZA_FETEER_TOPPINGS.join(' - ')}
              </p>
            )}
          </div>
        )}

        {isTransitioning ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#171717] border border-white/[0.07] rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#202020]" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-20 bg-[#262626] rounded" />
                  <div className="h-5 w-32 bg-[#2C2C2C] rounded" />
                  <div className="h-9 w-full bg-[#202020] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-[#171717] border border-white/[0.08] rounded-2xl px-4">
            <UtensilsCrossed className="w-8 h-8 text-[#D4AF37] mx-auto mb-3" />
            <p className="font-display text-lg font-bold text-[#F8F5EF] mb-1">
              لا توجد أصناف مطابقة لبحثك
            </p>
            <p className="text-sm text-[#A8A29E] mb-5">
              جرّب البحث بكلمة أخرى أو تصفح أقسام المنيو.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setOnlySiyami(false);
                onSelectCategory('all');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#B91C1C] text-white text-sm font-semibold cursor-pointer"
            >
              عرض كل المنيو
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedCategorySections.map(({ category, items: categoryItems }) => {
              const showCatHeading =
                activeCategory === 'all' || Boolean(searchQuery.trim());
              const hasComplimentaryNote =
                category.id === 'italian-pizza' ||
                category.id === 'oriental-pizza' ||
                category.id === 'stuffed-feteer';

              return (
                <div key={category.id} className="space-y-5">
                  {showCatHeading && (
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-white/[0.08]">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-display text-xl sm:text-2xl font-extrabold text-[#F8F5EF]">
                            {category.name}
                          </h3>
                          <span className="text-xs font-bold text-[#D4AF37] tabular-nums">
                            ({categoryItems.length})
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#A8A29E] mt-0.5">
                          {category.subtitle}
                        </p>
                      </div>

                      {hasComplimentaryNote && (
                        <p className="text-[11px] sm:text-xs font-semibold text-[#D4AF37]">
                          يضاف مجاناً: {COMPLIMENTARY_PIZZA_FETEER_TOPPINGS.join(' - ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* One Unified Grid Per Category: 2 Columns Mobile, 3 Columns Desktop */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
                    {categoryItems.map((item) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        categoryName={category.name}
                        onOpenDetail={onOpenDetail}
                        onQuickAdd={onQuickAdd}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
