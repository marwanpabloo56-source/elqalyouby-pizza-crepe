import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  X,
  Copy,
  Check,
  MessageSquareText,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  BranchInfo,
  CartItem,
  CustomerCheckoutInfo,
  RestaurantSettings,
} from '../types/menu';
import {
  formatPrice,
  formatWhatsappOrderMessage,
  getCartItemTotal,
} from '../utils/menuHelpers';

interface CheckoutModalProps {
  isOpen: boolean;
  items: CartItem[];
  branches: BranchInfo[];
  settings: RestaurantSettings;
  onClose: () => void;
  onOrderSimulated: () => void;
}

export function CheckoutModal({
  isOpen,
  items,
  branches,
  settings,
  onClose,
  onOrderSimulated,
}: CheckoutModalProps) {
  const [customer, setCustomer] = useState<CustomerCheckoutInfo>({
    name: '',
    phone: '',
    address: '',
    notes: '',
    preferredBranchId: branches[0]?.id ?? 'shobra',
  });
  const [copied, setCopied] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (branches.length === 0) return;
    if (!branches.some((b) => b.id === customer.preferredBranchId)) {
      setCustomer((prev) => ({ ...prev, preferredBranchId: branches[0].id }));
    }
  }, [branches, customer.preferredBranchId]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + getCartItemTotal(item), 0),
    [items]
  );
  const total = subtotal + (items.length > 0 ? settings.deliveryFee : 0);

  const previewMessage = useMemo(
    () =>
      formatWhatsappOrderMessage({
        items,
        customer,
        settings,
        branches,
        subtotal,
        total,
      }),
    [items, customer, settings, branches, subtotal, total]
  );

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      setValidationError('برجاء إدخال الاسم ورقم الموبايل والعنوان لإتمام معاينة الطلب.');
      return;
    }
    setValidationError('');
    const demoRef = `DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedRef(demoRef);
  };

  const hasConfiguredWhatsapp =
    settings.demoWhatsappEnabled && settings.demoWhatsappNumber.trim().length >= 8;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-4xl max-h-[93vh] bg-[#171717] border border-white/[0.1] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-5 py-4 bg-[#111111] border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 id="checkout-title" className="font-display text-lg sm:text-xl font-bold text-[#F8F5EF]">
              إتمام الطلب ومعاينة رسالة الواتساب
            </h2>
            <p className="text-xs text-[#A8A29E] mt-0.5">
              نموذج عرض تفاعلي لمحاكاة تجربة طلب العميل الكاملة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة إتمام الطلب"
            className="p-2 rounded-lg text-[#A8A29E] hover:text-[#F8F5EF] hover:bg-white/[0.06] cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Disclaimer Banner */}
        <div className="px-5 py-3 bg-[#D4AF37]/10 border-b border-[#D4AF37]/25 flex items-start gap-2.5 text-xs sm:text-sm text-[#F8F5EF]">
          <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <p>
            هذا الموقع نموذج عرض تفاعلي (Demo). لا يتم إرسال طلبات حقيقية للمطعم أو فتح واتساب فعلي حتى يتم ربط رقم واتساب معتمد من الإدارة.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {submittedRef ? (
            <div className="py-8 max-w-xl mx-auto text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-[#D4AF37]" />
              </div>

              <div>
                <p className="text-xs text-[#D4AF37] font-semibold mb-1">
                  محاكاة نجاح الطلب — العرض التجريبي
                </p>
                <h3 className="font-display text-2xl font-bold text-[#F8F5EF]">
                  تم تجهيز رسالة الطلب بنجاح
                </h3>
                <p className="text-sm text-[#A8A29E] mt-2 tabular-nums">
                  رقم المعاينة التجريبي: {submittedRef} · الإجمالي: {formatPrice(total)}
                </p>
              </div>

              <div className="bg-[#090909] border border-white/[0.08] rounded-xl p-4 text-right">
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#F8F5EF]/90 leading-relaxed">
                  {previewMessage}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#222222] hover:bg-[#2B2B2B] border border-white/[0.1] text-sm font-medium text-[#F8F5EF] cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-[#D4AF37]" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'تم نسخ الرسالة' : 'نسخ نص الرسالة'}</span>
                </button>

                {hasConfiguredWhatsapp && (
                  <a
                    href={`https://wa.me/${settings.demoWhatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(previewMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#090909] text-sm font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>فتح معاينة واتساب بالرقم المربوط</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSubmittedRef(null);
                    onOrderSimulated();
                    onClose();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-semibold cursor-pointer"
                >
                  إنهاء المعاينة وإفراغ السلة
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Form */}
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-display text-base font-bold text-[#F8F5EF]">
                  بيانات التوصيل
                </h3>

                {validationError && (
                  <p role="alert" className="text-xs text-[#F8F5EF] bg-[#B91C1C]/20 border border-[#B91C1C]/50 rounded-lg px-3.5 py-2.5">
                    {validationError}
                  </p>
                )}

                <div>
                  <label htmlFor="cust-name" className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    الاسم *
                  </label>
                  <input
                    id="cust-name"
                    type="text"
                    required
                    value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    placeholder="اكتب اسمك بالكامل"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] placeholder:text-[#A8A29E]/50 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label htmlFor="cust-phone" className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    رقم الموبايل *
                  </label>
                  <input
                    id="cust-phone"
                    type="tel"
                    required
                    dir="ltr"
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                    className="w-full text-right px-3.5 py-2.5 rounded-lg bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] placeholder:text-[#A8A29E]/50 focus:outline-none focus:border-[#D4AF37] tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="cust-address" className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    العنوان *
                  </label>
                  <input
                    id="cust-address"
                    type="text"
                    required
                    value={customer.address}
                    onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                    placeholder="المنطقة، الشارع، رقم العمارة والدور"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] placeholder:text-[#A8A29E]/50 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label htmlFor="cust-branch" className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    الفرع الأقرب لك
                  </label>
                  <select
                    id="cust-branch"
                    value={customer.preferredBranchId}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, preferredBranchId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="cust-notes" className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    ملاحظات الطلب (اختياري)
                  </label>
                  <textarea
                    id="cust-notes"
                    rows={3}
                    value={customer.notes}
                    onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
                    placeholder="أي تفاصيل إضافية عن التوصيل أو الطلب..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] placeholder:text-[#A8A29E]/50 focus:outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>
              </form>

              {/* Live WhatsApp Order Message Preview */}
              <div className="flex flex-col bg-[#090909] border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#111111] border-b border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4 text-[#D4AF37]" />
                    <span className="font-display text-sm font-bold text-[#F8F5EF]">
                      معاينة رسالة واتساب الطلب
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto max-h-[360px]">
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#F8F5EF]/90 leading-relaxed">
                    {previewMessage}
                  </pre>
                </div>

                <div className="px-4 py-3 bg-[#111111] border-t border-white/[0.08] flex items-center justify-between text-xs text-[#A8A29E]">
                  <span>حالة الربط الفعلي</span>
                  <span className="text-[#D4AF37] font-medium">
                    {hasConfiguredWhatsapp
                      ? `مربوط للتجربة (${settings.demoWhatsappNumber})`
                      : 'غير مربوط (وضع العرض التجريبي)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Submit */}
        {!submittedRef && (
          <div className="p-4 sm:p-5 bg-[#111111] border-t border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-[#A8A29E]">الإجمالي النهائي: </span>
              <span className="font-display text-lg font-bold text-[#D4AF37] tabular-nums">
                {formatPrice(total)}
              </span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="px-7 py-3 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold text-sm sm:text-base transition-colors cursor-pointer min-h-[48px]"
            >
              تأكيد معاينة الطلب التجريبي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
