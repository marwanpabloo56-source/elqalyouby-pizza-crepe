import { useEffect, useState } from 'react';
import { X, Plus, Minus, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import {
  COMPLIMENTARY_PIZZA_FETEER_TOPPINGS,
  PAID_EXTRAS,
  SIZE_LABELS,
} from '../data/menuData';
import { ExtraOption, MenuItem, SizeKey } from '../types/menu';
import {
  formatPrice,
  getFirstSelectableSize,
  getItemSizes,
  isSizePending,
} from '../utils/menuHelpers';
import { FoodImage } from './FoodImage';

interface ProductModalProps {
  item: MenuItem | null;
  categoryName: string;
  initialSize: SizeKey;
  onClose: () => void;
  onAddToCart: (payload: {
    item: MenuItem;
    selectedSize: SizeKey;
    selectedExtras: ExtraOption[];
    quantity: number;
    isSiyami: boolean;
    notes: string;
  }) => void;
}

export function ProductModal({
  item,
  categoryName,
  initialSize,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<SizeKey>(initialSize);
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isSiyami, setIsSiyami] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!item) return;
    const sizes = getItemSizes(item);
    const validInitial = sizes.includes(initialSize)
      ? initialSize
      : (getFirstSelectableSize(item) ?? sizes[0] ?? 'single');
    setSelectedSize(validInitial);
    setSelectedExtras([]);
    setQuantity(1);
    setIsSiyami(false);
    setNotes('');
  }, [item, initialSize]);

  useEffect(() => {
    if (!item) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [item, onClose]);

  if (!item) return null;

  const sizes = getItemSizes(item);
  const pending = isSizePending(item, selectedSize);
  const basePrice = item.prices[selectedSize] ?? 0;
  const extrasTotal = selectedExtras.reduce((sum, ex) => sum + ex.price, 0);
  const totalPrice = (basePrice + extrasTotal) * quantity;

  const toggleExtra = (extra: ExtraOption) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleConfirm = () => {
    if (pending) return;
    onAddToCart({
      item,
      selectedSize,
      selectedExtras,
      quantity,
      isSiyami,
      notes,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] bg-[#171717] border border-white/[0.1] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Media Header or Clean Typographic Header */}
        {item.image ? (
          <div className="relative h-52 sm:h-64 w-full shrink-0 bg-[#090909]">
            <FoodImage
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#171717] via-[#171717]/30 to-black/45"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق نافذة الصنف"
              className="absolute top-3 left-3 p-2 rounded-lg bg-[#090909]/85 hover:bg-[#090909] text-[#F8F5EF] border border-white/15 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="absolute bottom-4 right-5 left-5">
              <div className="flex items-center gap-2 text-xs text-[#D4AF37] mb-1">
                <span>{categoryName}</span>
                {item.subGroup && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#F8F5EF]/80">{item.subGroup}</span>
                  </>
                )}
              </div>
              <h2
                id="product-modal-title"
                className="font-display text-xl sm:text-2xl font-bold text-[#F8F5EF]"
              >
                {item.name}
              </h2>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 bg-[#111111] border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#D4AF37] mb-1">
                <span>{categoryName}</span>
                {item.subGroup && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#F8F5EF]/80">{item.subGroup}</span>
                  </>
                )}
              </div>
              <h2
                id="product-modal-title"
                className="font-display text-xl sm:text-2xl font-bold text-[#F8F5EF]"
              >
                {item.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق نافذة الصنف"
              className="p-2 rounded-lg bg-[#1C1C1C] hover:bg-[#262626] text-[#F8F5EF] border border-white/10 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable Customization Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {item.description && (
            <p className="text-sm text-[#A8A29E] bg-[#111111] border border-white/[0.06] rounded-lg px-4 py-3">
              {item.description}
            </p>
          )}

          {item.supportsComplimentaryToppings && (
            <div className="text-xs sm:text-sm text-[#F8F5EF]/90 bg-[#111111] border border-white/[0.06] rounded-lg px-4 py-3">
              <span className="text-[#D4AF37] font-semibold">يتم إضافة لجميع الأصناف: </span>
              <span>{COMPLIMENTARY_PIZZA_FETEER_TOPPINGS.join(' - ')}</span>
            </div>
          )}

          {/* Size Selection */}
          <div>
            <h3 className="font-display text-sm font-bold text-[#F8F5EF] mb-3">
              اختر الحجم
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {sizes.map((size) => {
                const sizePending = isSizePending(item, size);
                const price = item.prices[size];
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`flex items-center justify-between sm:flex-col sm:items-start gap-1 p-3.5 rounded-xl border text-right transition-colors cursor-pointer min-h-[48px] ${
                      isSelected
                        ? 'bg-[#222222] border-[#D4AF37] text-[#F8F5EF]'
                        : 'bg-[#111111] border-white/[0.08] text-[#A8A29E] hover:border-white/20 hover:text-[#F8F5EF]'
                    }`}
                  >
                    <span className="font-semibold text-sm">{SIZE_LABELS[size]}</span>
                    {sizePending || price == null ? (
                      <span className="text-xs text-[#D4AF37]">السعر قيد المراجعة</span>
                    ) : (
                      <span className="text-sm font-bold text-[#D4AF37] tabular-nums">
                        {formatPrice(price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pending Price Warning */}
          {pending && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#B91C1C]/15 border border-[#B91C1C]/40 text-sm text-[#F8F5EF]"
            >
              <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">السعر قيد المراجعة</p>
                <p className="text-xs text-[#A8A29E] mt-0.5">
                  هذا الحجم أو الصنف غير واضح السعر في نسخة المنيو المرفقة، ولضمان الدقة لا يمكن إضافته لسلة الطلبات حالياً.
                </p>
              </div>
            </div>
          )}

          {/* Siyami Option (when supported) */}
          {item.supportsSiyamiOption && (
            <div>
              <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#111111] border border-white/[0.08] cursor-pointer hover:border-[#D4AF37]/40 transition-colors">
                <div>
                  <span className="block text-sm font-semibold text-[#F8F5EF]">
                    تحضير فطير صيامي
                  </span>
                  <span className="block text-xs text-[#A8A29E]">
                    متاح التحضير بالطريقة الصيامي حسب تنويه المنيو
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isSiyami}
                  onChange={(e) => setIsSiyami(e.target.checked)}
                  className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Paid Extras */}
          {item.supportsPaidExtras && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-bold text-[#F8F5EF]">
                  إضافات اختيارية
                </h3>
                <span className="text-xs text-[#A8A29E]">أسعار المنيو الرسمية</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAID_EXTRAS.map((extra) => {
                  const checked = selectedExtras.some((e) => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => toggleExtra(extra)}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer min-h-[44px] ${
                        checked
                          ? 'bg-[#222222] border-[#D4AF37]/70 text-[#F8F5EF]'
                          : 'bg-[#111111] border-white/[0.07] text-[#A8A29E] hover:text-[#F8F5EF]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            checked
                              ? 'bg-[#D4AF37] border-[#D4AF37] text-[#090909]'
                              : 'border-white/25'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span>{extra.name}</span>
                      </span>
                      <span className="text-xs font-semibold text-[#D4AF37] tabular-nums">
                        +{formatPrice(extra.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Notes */}
          <div>
            <label
              htmlFor="item-notes"
              className="block font-display text-sm font-bold text-[#F8F5EF] mb-2"
            >
              ملاحظات على الصنف (اختياري)
            </label>
            <input
              id="item-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تسوية زيادة، بدون فلفل..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] placeholder:text-[#A8A29E]/50 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="p-4 sm:p-5 bg-[#111111] border-t border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-xs text-[#A8A29E] sm:hidden">الكمية:</span>
            <div className="inline-flex items-center bg-[#171717] border border-white/[0.08] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="تقليل الكمية"
                className="p-2 rounded-md text-[#F8F5EF] hover:bg-white/[0.06] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold tabular-nums text-sm text-[#F8F5EF]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="زيادة الكمية"
                className="p-2 rounded-md text-[#F8F5EF] hover:bg-white/[0.06] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors min-h-[48px] ${
              pending
                ? 'bg-[#222222] text-[#A8A29E] cursor-not-allowed'
                : 'bg-[#B91C1C] hover:bg-[#991B1B] text-white cursor-pointer'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{pending ? 'السعر قيد المراجعة' : 'أضف إلى السلة'}</span>
            {!pending && (
              <span className="tabular-nums font-bold bg-black/25 px-2 py-0.5 rounded text-sm">
                {formatPrice(totalPrice)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
