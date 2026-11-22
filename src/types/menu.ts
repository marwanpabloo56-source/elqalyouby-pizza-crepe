export type BuiltinCategoryId =
  | 'italian-pizza'
  | 'oriental-pizza'
  | 'stuffed-feteer'
  | 'savory-feteer'
  | 'sweet-feteer'
  | 'meat-chicken-crepe'
  | 'cheese-crepe'
  | 'sweet-crepe'
  | 'saroukh'
  | 'extras';

export type CategoryId = BuiltinCategoryId | (string & {});

export type SizeKey = 'small' | 'medium' | 'large' | 'single';

export interface SizePriceMap {
  small?: number | null;
  medium?: number | null;
  large?: number | null;
  single?: number | null;
}

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  subtitle: string;
  image: string;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: CategoryId;
  subGroup?: string;
  description?: string;
  /** Exact matching dish photo path, or null for explicit placeholder */
  image: string | null;
  prices: SizePriceMap;
  /** If true, the entire item's price is unreadable/missing on the printed menu */
  isPricePending?: boolean;
  /** Specific sizes whose printed price is unclear/pending review */
  pendingSizes?: SizeKey[];
  supportsComplimentaryToppings?: boolean;
  supportsSiyamiOption?: boolean;
  supportsPaidExtras?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isHidden?: boolean;
}

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  categoryId: CategoryId;
  image: string | null;
  selectedSize: SizeKey;
  unitPrice: number;
  quantity: number;
  selectedExtras: ExtraOption[];
  isSiyami?: boolean;
  notes?: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  address: string;
  hasVerifiedStreetAddress: boolean;
  phones: string[];
  complaintsWhatsapp?: string;
  management?: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  tagline: string;
  deliveryFee: number;
  minOrderAmount: number;
  demoWhatsappEnabled: boolean;
  demoWhatsappNumber: string;
}

export interface CustomerCheckoutInfo {
  name: string;
  phone: string;
  address: string;
  notes: string;
  preferredBranchId: string;
}
