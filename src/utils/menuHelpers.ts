import { SIZE_LABELS } from '../data/menuData';
import {
  BranchInfo,
  CartItem,
  CustomerCheckoutInfo,
  MenuItem,
  RestaurantSettings,
  SizeKey,
} from '../types/menu';

export const ORDERED_SIZES: SizeKey[] = ['small', 'medium', 'large', 'single'];

export function getItemSizes(item: MenuItem): SizeKey[] {
  return ORDERED_SIZES.filter((size) => item.prices[size] !== undefined);
}

export function isSizePending(item: MenuItem, size: SizeKey): boolean {
  if (item.isPricePending) return true;
  if (item.pendingSizes?.includes(size)) return true;
  const val = item.prices[size];
  return val === null || val === undefined || val <= 0;
}

export function getFirstSelectableSize(item: MenuItem): SizeKey | null {
  const sizes = getItemSizes(item);
  for (const s of sizes) {
    if (!isSizePending(item, s)) return s;
  }
  return sizes[0] ?? null;
}

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('en-US')} ج.م`;
}

export function getCartItemUnitTotal(item: CartItem): number {
  const extrasTotal = item.selectedExtras.reduce((sum, ex) => sum + ex.price, 0);
  return item.unitPrice + extrasTotal;
}

export function getCartItemTotal(item: CartItem): number {
  return getCartItemUnitTotal(item) * item.quantity;
}

export function formatWhatsappOrderMessage(params: {
  items: CartItem[];
  customer: CustomerCheckoutInfo;
  settings: RestaurantSettings;
  branches: BranchInfo[];
  subtotal: number;
  total: number;
}): string {
  const { items, customer, settings, branches, subtotal, total } = params;
  const branch = branches.find((b) => b.id === customer.preferredBranchId);

  const lines: string[] = [
    `*طلب جديد (معاينة عرض تجريبي) — ${settings.restaurantName}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `*بيانات العميل:*`,
    `• الاسم: ${customer.name || 'غير محدد'}`,
    `• الموبايل: ${customer.phone || 'غير محدد'}`,
    `• العنوان: ${customer.address || 'غير محدد'}`,
    branch ? `• الفرع المختار: ${branch.name}` : '',
    customer.notes ? `• ملاحظات الطلب: ${customer.notes}` : '',
    ``,
    `*تفاصيل الطلب:*`,
  ].filter(Boolean);

  items.forEach((item, index) => {
    const sizeLabel = SIZE_LABELS[item.selectedSize];
    const unitWithExtras = getCartItemUnitTotal(item);
    const lineTotal = unitWithExtras * item.quantity;
    const siyamiTag = item.isSiyami ? ' [صيامي]' : '';
    lines.push(
      `${index + 1}. ${item.name} (${sizeLabel})${siyamiTag} × ${item.quantity} = ${lineTotal} ج.م`
    );
    if (item.selectedExtras.length > 0) {
      lines.push(
        `   الإضافات: ${item.selectedExtras.map((e) => `${e.name} (+${e.price} ج.م)`).join('، ')}`
      );
    }
    if (item.notes?.trim()) {
      lines.push(`   ملاحظة الصنف: ${item.notes.trim()}`);
    }
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`• إجمالي الأصناف: ${subtotal} ج.م`);
  if (settings.deliveryFee > 0) {
    lines.push(`• رسوم التوصيل (تجريبية): ${settings.deliveryFee} ج.م`);
  }
  lines.push(`• *الإجمالي النهائي: ${total} ج.م*`);
  lines.push(``);
  lines.push(`_ملاحظة: هذه معاينة رسالة طلب لموقع عرض تجريبي._`);

  return lines.join('\n');
}
