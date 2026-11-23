import { ArrowLeft, Plus } from 'lucide-react';
import { CategoryId, CategoryInfo, ExtraOption, MenuItem, SizeKey } from '../types/menu';
import { formatPrice, getFirstSelectableSize, getItemSizes } from '../utils/menuHelpers';
import { FoodImage } from './FoodImage';

interface FeaturedShowcaseProps {
  categories: CategoryInfo[];
  items: MenuItem[];
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

export function FeaturedShowcase({
  categories,
  items,
  onSelectCategory,
  onOpenDetail,
  onQuickAdd,
}: FeaturedShowcaseProps) {
  const featuredItems = items.filter((item) => item.isFeatured && item.image).slice(0, 8);
  const photographedCategories = categories.filter((cat) => Boolean(cat.image));
  const textOnlyCategories = categories.filter((cat) => !cat.image);

  return (
    <section
      id="featured"
      className="py-12 md:py-16 bg-[#0E0E0E] text-[#F8F5EF] border-b border-[#D4AF37]/15"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Featured Signature Dishes (Every Card has Real Food Photography) */}
        {featuredItems.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[#D4AF37] mb-1">
                  مختارات مطبخ القليوبي
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8F5EF] text-balance">
                  أشهر أطباق البيتزا والفطائر والكريب
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#D4AF37] hover:text-[#F3E5AB] transition-colors cursor-pointer shrink-0"
              >
                <span>تصفح المنيو الكامل ({items.length} صنف)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredItems.map((item) => {
                const defaultSize = getFirstSelectableSize(item) ?? 'single';
                const sizes = getItemSizes(item);
                const price = item.prices[defaultSize];
                const catName =
                  categories.find((c) => c.id === item.categoryId)?.name ?? '';

                return (
                  <article
                    key={item.id}
                    className="group bg-[#171717] border border-white/[0.08] hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 shadow-xl shadow-black/40"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDetail(item, defaultSize)}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-[#101010] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                    >
                      <FoodImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </button>

                    <div className="p-4 flex flex-col flex-1">
                      <span className="text-xs text-[#D4AF37] font-medium mb-1">
                        {catName}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(item, defaultSize)}
                        className="text-right cursor-pointer mb-3"
                      >
                        <h3 className="font-display text-base font-bold text-[#F8F5EF] group-hover:text-[#D4AF37] transition-colors leading-snug">
                          {item.name}
                        </h3>
                      </button>

                      <div className="mt-auto pt-3 border-t border-white/[0.07] flex items-center justify-between gap-2">
                        <div>
                          {price != null && (
                            <div className="font-display text-base font-bold text-[#D4AF37] tabular-nums">
                              {sizes.length > 1 ? `يبدأ من ${formatPrice(price)}` : formatPrice(price)}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onQuickAdd({
                              item,
                              selectedSize: defaultSize,
                              selectedExtras: [],
                              quantity: 1,
                              isSiyami: false,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold transition-colors cursor-pointer min-h-[38px]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>أضف</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* Professional Dark Category Cards */}
        <div>
          <div className="mb-6">
            <p className="text-xs sm:text-sm font-semibold text-[#D4AF37] mb-1">
              أقسام المنيو
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8F5EF]">
              تصفح أقسام مطبخ القليوبي
            </h2>
          </div>

          {/* Photographed Categories Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5 mb-3.5">
            {photographedCategories.map((cat) => {
              const count = items.filter((i) => i.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#171717] border border-white/[0.08] hover:border-[#D4AF37]/70 text-right transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-lg"
                >
                  <FoodImage
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#090909]/95 via-[#090909]/40 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute bottom-2.5 right-3 left-3">
                    <span className="font-display block text-sm font-bold text-[#F8F5EF] group-hover:text-[#D4AF37] transition-colors leading-tight">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-[#D4AF37]/90 tabular-nums">
                      {count} صنف
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Remaining 3 Categories (Clean Dark Architectural Cards without fake icons) */}
          {textOnlyCategories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {textOnlyCategories.map((cat) => {
                const count = items.filter((i) => i.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className="group bg-[#171717] hover:bg-[#1E1E1E] border border-white/[0.08] hover:border-[#D4AF37]/60 rounded-xl px-4 py-3.5 text-right flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-display block text-sm sm:text-base font-bold text-[#F8F5EF] group-hover:text-[#D4AF37] transition-colors">
                        {cat.name}
                      </span>
                      <span className="block text-xs text-[#A8A29E] truncate mt-0.5">
                        {cat.subtitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] shrink-0">
                      <span className="tabular-nums">{count} صنف</span>
                      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
