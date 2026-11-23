import { useEffect, useState } from 'react';
import {
  Plus,
  Minus,
  SlidersHorizontal,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { PAID_EXTRAS, SIZE_LABELS } from '../data/menuData';
import { ExtraOption, MenuItem, SizeKey } from '../types/menu';
import {
  formatPrice,
  getFirstSelectableSize,
  getItemSizes,
  isSizePending,
} from '../utils/menuHelpers';
import { FoodImage } from './FoodImage';

interface ProductCardProps {
  item: MenuItem;
  categoryName: string;
  onOpenDetail: (item: MenuItem, initialSize: SizeKey) => void;
  onQuickAdd: (payload: {
    item: MenuItem;
    selectedSize: SizeKey;
    selectedExtras: ExtraOption[];
    quantity: number;
    isSiyami: boolean;
  }) => void;
}

export function ProductCard({
  item,
  categoryName,
  onOpenDetail,
  onQuickAdd,
}: ProductCardProps) {
  const sizes = getItemSizes(item);
  const defaultSize = getFirstSelectableSize(item) ?? sizes[0] ?? 'single';
  const [selectedSize, setSelectedSize] = useState<SizeKey>(defaultSize);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [isSiyami, setIsSiyami] = useState(false);
  const [extrasExpanded, setExtrasExpanded] = useState(false);

  useEffect(() => {
    setSelectedSize(getFirstSelectableSize(item) ?? sizes[0] ?? 'single');
    setQuantity(1);
    setSelectedExtras([]);
    setIsSiyami(false);
    setExtrasExpanded(false);
  }, [item.id, item.isPricePending]);

  const currentPending = isSizePending(item, selectedSize);
  const basePrice = item.prices[selectedSize] ?? 0;
  const extrasTotal = selectedExtras.reduce((sum, ex) => sum + ex.price, 0);
  const lineTotal = (basePrice + extrasTotal) * quantity;

  const toggleExtra = (extra: ExtraOption) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  return (
    <article className="group flex flex-col bg-[#171717] border border-white/[0.08] hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 shadow-xl shadow-black/40">
      {/* Large Food Photograph Area (identical aspect ratio for every product) */}
      <button
        type="button"
        onClick={() => onOpenDetail(item, selectedSize)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#101010] border-b border-white/[0.06] cursor-pointer text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
      >
        <FoodImage
          src={item.image}
          alt={item.name}
          className="w-full h-full object-contain"
        />
      </button>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 lg:p-5">
        {/* Category / SubGroup / Siyami Metadata */}
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#A8A29E] mb-1 min-h-[16px]">
          <span className="truncate font-medium">{item.subGroup || categoryName}</span>
          {item.supportsSiyamiOption && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#D4AF37] font-semibold whitespace-nowrap">متاح صيامي</span>
            </>
          )}
          {item.isNew && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#B91C1C] font-bold whitespace-nowrap">جديد</span>
            </>
          )}
        </div>

        {/* Arabic Product Name */}
        <button
          type="button"
          onClick={() => onOpenDetail(item, selectedSize)}
          className="text-right cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded"
        >
          <h3 className="font-display text-sm sm:text-base lg:text-[17px] font-bold text-[#F8F5EF] group-hover:text-[#D4AF37] transition-colors leading-snug mb-2.5 line-clamp-2 min-h-[2.5em]">
            {item.name}
          </h3>
        </button>

        {/* Size Options & Prices */}
        {sizes.length > 1 ? (
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0E0E0E] border border-white/[0.07] rounded-xl mb-2.5">
            {sizes.map((size) => {
              const pending = isSizePending(item, size);
              const price = item.prices[size];
              const active = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer min-h-[42px] ${
                    active
                      ? 'bg-[#262626] text-[#F8F5EF] border border-[#D4AF37]/65'
                      : 'text-[#A8A29E] hover:text-[#F8F5EF] border border-transparent'
                  } ${pending ? 'opacity-65' : ''}`}
                >
                  <span className="text-[10px] sm:text-xs font-semibold leading-tight">
                    {SIZE_LABELS[size]}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#D4AF37] tabular-nums leading-tight mt-0.5">
                    {pending || price == null ? 'مراجعة' : `${price} ج.م`}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mb-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0E0E0E] border border-white/[0.06] text-[11px] sm:text-xs text-[#A8A29E]">
            <span>{item.categoryId === 'extras' ? 'إضافة جانبية' : 'حجم موحد'}</span>
            <span className="font-bold text-[#D4AF37] tabular-nums">
              {currentPending || item.prices[selectedSize] == null
                ? 'قيد المراجعة'
                : formatPrice(item.prices[selectedSize]!)}
            </span>
          </div>
        )}

        {/* Extras & Siyami Option */}
        {(item.supportsPaidExtras || item.supportsSiyamiOption) && (
          <div className="mb-2.5 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              {item.supportsPaidExtras && (
                <button
                  type="button"
                  onClick={() => setExtrasExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#D4AF37] hover:text-[#F3E5AB] transition-colors cursor-pointer py-0.5"
                >
                  <span>
                    {selectedExtras.length > 0
                      ? `إضافات (${selectedExtras.length})`
                      : 'إضافات اختيارية'}
                  </span>
                  {extrasExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              )}

              {item.supportsSiyamiOption && (
                <label className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-[#F8F5EF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSiyami}
                    onChange={(e) => setIsSiyami(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#D4AF37] rounded cursor-pointer"
                  />
                  <span>صيامي</span>
                </label>
              )}
            </div>

            {extrasExpanded && item.supportsPaidExtras && (
              <div className="bg-[#0F0F0F] border border-white/[0.08] rounded-xl p-1.5 grid grid-cols-1 gap-1 max-h-36 overflow-y-auto">
                {PAID_EXTRAS.map((extra) => {
                  const checked = selectedExtras.some((e) => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => toggleExtra(extra)}
                      className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] sm:text-xs border transition-colors cursor-pointer ${
                        checked
                          ? 'bg-[#222222] border-[#D4AF37]/70 text-[#F8F5EF] font-semibold'
                          : 'bg-transparent border-transparent text-[#A8A29E] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                            checked
                              ? 'bg-[#D4AF37] border-[#D4AF37] text-[#090909]'
                              : 'border-white/25'
                          }`}
                        >
                          {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span className="truncate">{extra.name}</span>
                      </span>
                      <span className="tabular-nums text-[#D4AF37] font-bold shrink-0">
                        +{extra.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Price + Quantity + Add to Cart */}
        <div className="mt-auto pt-2.5 border-t border-white/[0.07] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div>
              {currentPending || item.prices[selectedSize] == null ? (
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[#D4AF37]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>السعر قيد المراجعة</span>
                </span>
              ) : (
                <div className="font-display text-sm sm:text-base lg:text-lg font-extrabold text-[#D4AF37] tabular-nums">
                  {formatPrice(lineTotal)}
                </div>
              )}
            </div>

            {!currentPending && (
              <div className="inline-flex items-center bg-[#0E0E0E] border border-white/[0.08] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="تقليل الكمية"
                  className="p-1 rounded text-[#F8F5EF] hover:bg-white/[0.07] cursor-pointer min-w-[26px] min-h-[26px] sm:min-w-[30px] sm:min-h-[30px] flex items-center justify-center"
                >
                  <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <span className="w-6 sm:w-7 text-center text-xs font-bold tabular-nums text-[#F8F5EF]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="زيادة الكمية"
                  className="p-1 rounded text-[#F8F5EF] hover:bg-white/[0.07] cursor-pointer min-w-[26px] min-h-[26px] sm:min-w-[30px] sm:min-h-[30px] flex items-center justify-center"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={currentPending}
              onClick={() =>
                onQuickAdd({
                  item,
                  selectedSize,
                  selectedExtras,
                  quantity,
                  isSiyami,
                })
              }
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-colors whitespace-nowrap min-h-[38px] sm:min-h-[42px] ${
                currentPending
                  ? 'bg-[#222222] text-[#A8A29E]/60 border border-white/[0.06] cursor-not-allowed'
                  : 'bg-[#B91C1C] hover:bg-[#991B1B] text-white cursor-pointer'
              }`}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{currentPending ? 'قيد المراجعة' : 'أضف للسلة'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDetail(item, selectedSize)}
              aria-label={`التفاصيل والملاحظات لصنف ${item.name}`}
              title="التفاصيل والملاحظات"
              className="p-2 rounded-xl bg-[#222222] hover:bg-[#2C2C2C] text-[#F8F5EF] border border-white/[0.08] transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
