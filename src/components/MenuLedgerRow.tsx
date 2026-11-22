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

interface MenuLedgerRowProps {
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

export function MenuLedgerRow({
  item,
  categoryName,
  onOpenDetail,
  onQuickAdd,
}: MenuLedgerRowProps) {
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
    <article className="bg-[#171717] border border-white/[0.08] hover:border-[#D4AF37]/45 rounded-xl p-4 sm:p-5 transition-colors flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#A8A29E] mb-1">
            <span>{item.subGroup || categoryName}</span>
            {item.supportsSiyamiOption && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#D4AF37] font-medium">متاح صيامي</span>
              </>
            )}
            {item.isNew && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#B91C1C] font-bold">جديد</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenDetail(item, selectedSize)}
            className="text-right cursor-pointer hover:text-[#D4AF37] transition-colors"
          >
            <h3 className="font-display text-base font-bold text-[#F8F5EF] leading-snug">
              {item.name}
            </h3>
          </button>
        </div>

        {/* Size Selector Pills (exact prices shown) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {sizes.map((size) => {
            const pending = isSizePending(item, size);
            const active = selectedSize === size;
            const sizePrice = item.prices[size];
            return (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer min-h-[34px] ${
                  active
                    ? 'bg-[#262626] border-[#D4AF37] text-[#F8F5EF]'
                    : 'bg-[#0F0F0F] border-white/[0.07] text-[#A8A29E] hover:text-[#F8F5EF]'
                } ${pending ? 'opacity-65' : ''}`}
              >
                {sizes.length > 1 && <span>{SIZE_LABELS[size]}:</span>}
                <span className="tabular-nums text-[#D4AF37] font-bold">
                  {pending || sizePrice == null ? 'قيد المراجعة' : formatPrice(sizePrice)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Bar: Extras, Siyami, Quantity, Price & Add */}
      <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {item.supportsPaidExtras && (
            <button
              type="button"
              onClick={() => setExtrasExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4AF37] hover:text-[#F3E5AB] cursor-pointer"
            >
              <span>
                {selectedExtras.length > 0
                  ? `إضافات (${selectedExtras.length})`
                  : 'إضافات اختيارية'}
              </span>
              {extrasExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {item.supportsSiyamiOption && (
            <label className="inline-flex items-center gap-1.5 text-xs text-[#F8F5EF] cursor-pointer">
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

        <div className="flex items-center gap-2 mr-auto">
          {currentPending || item.prices[selectedSize] == null ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D4AF37]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>السعر قيد المراجعة</span>
            </span>
          ) : (
            <>
              <span className="font-display text-sm sm:text-base font-extrabold text-[#D4AF37] tabular-nums ml-1">
                {formatPrice(lineTotal)}
              </span>

              <div className="inline-flex items-center bg-[#0E0E0E] border border-white/[0.08] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="تقليل الكمية"
                  className="p-1 text-[#F8F5EF] hover:bg-white/[0.07] rounded cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold tabular-nums text-[#F8F5EF]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="زيادة الكمية"
                  className="p-1 text-[#F8F5EF] hover:bg-white/[0.07] rounded cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

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
            className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap min-h-[36px] ${
              currentPending
                ? 'bg-[#222222] text-[#A8A29E]/50 cursor-not-allowed'
                : 'bg-[#B91C1C] hover:bg-[#991B1B] text-white cursor-pointer'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>أضف للسلة</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDetail(item, selectedSize)}
            aria-label={`تخصيص ${item.name}`}
            className="p-2 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-[#D4AF37] border border-white/[0.08] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Paid Extras Drawer */}
      {extrasExpanded && item.supportsPaidExtras && (
        <div className="bg-[#0F0F0F] border border-white/[0.08] rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
          {PAID_EXTRAS.map((extra) => {
            const checked = selectedExtras.some((e) => e.id === extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                onClick={() => toggleExtra(extra)}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                  checked
                    ? 'bg-[#222222] border-[#D4AF37]/70 text-[#F8F5EF] font-semibold'
                    : 'bg-transparent border-white/[0.05] text-[#A8A29E] hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
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
                  +{extra.price} ج.م
                </span>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
