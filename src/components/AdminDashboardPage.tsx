import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
  ImagePlus,
  KeyRound,
  Lock,
  LogOut,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { BRAND_LOGO, SIZE_LABELS } from '../data/menuData';
import type {
  BranchInfo,
  CategoryInfo,
  MenuItem,
  RestaurantSettings,
  SizeKey,
  SizePriceMap,
} from '../types/menu';

interface AdminDashboardPageProps {
  onNavigateHome: () => void;
  onCatalogMutated: () => Promise<void> | void;
}

interface AuthStatusResponse {
  requiresSetup: boolean;
  isEnvConfigured: boolean;
  publicRegistrationAllowed: boolean;
}

interface AdminCatalogResponse {
  categories: CategoryInfo[];
  items: MenuItem[];
  branches: BranchInfo[];
  settings: RestaurantSettings;
  updatedAt: string;
}

type AdminTab = 'products' | 'categories' | 'branches' | 'settings';
type VisibilityFilter = 'all' | 'visible' | 'hidden' | 'missing-image';

function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

async function fileToOptimizedDataUrl(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('حجم الصورة كبير جداً. الحد الأقصى للملف المختار 20 ميجابايت.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذر معالجة ملف الصورة المحدد.'));
    image.src = rawDataUrl;
  });

  const maxWidth = 1200;
  const maxHeight = 900;
  let targetW = img.naturalWidth || img.width;
  let targetH = img.naturalHeight || img.height;

  const ratio = Math.min(1, maxWidth / targetW, maxHeight / targetH);
  targetW = Math.max(1, Math.round(targetW * ratio));
  targetH = Math.max(1, Math.round(targetH * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر تهيئة معالجة الصورة في المتصفح.');
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Prefer WebP when supported, fallback cleanly to JPEG
  const outWebp = canvas.toDataURL('image/webp', 0.86);
  if (outWebp.startsWith('data:image/webp')) {
    return outWebp;
  }
  return canvas.toDataURL('image/jpeg', 0.88);
}

interface ProductDraft {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  subGroup: string;
  smallPrice: string;
  mediumPrice: string;
  largePrice: string;
  singlePrice: string;
  useMultiSize: boolean;
  isPricePending: boolean;
  supportsComplimentaryToppings: boolean;
  supportsSiyamiOption: boolean;
  supportsPaidExtras: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isHidden: boolean;
  existingImageUrl: string | null;
  pendingFileDataUrl: string | null;
}

function itemToDraft(item: MenuItem): ProductDraft {
  const hasSingle = item.prices.single !== undefined;
  const hasMulti =
    item.prices.small !== undefined ||
    item.prices.medium !== undefined ||
    item.prices.large !== undefined;
  const useMultiSize = hasMulti && !hasSingle;

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    categoryId: item.categoryId,
    subGroup: item.subGroup ?? '',
    smallPrice: item.prices.small != null ? String(item.prices.small) : '',
    mediumPrice: item.prices.medium != null ? String(item.prices.medium) : '',
    largePrice: item.prices.large != null ? String(item.prices.large) : '',
    singlePrice: item.prices.single != null ? String(item.prices.single) : '',
    useMultiSize,
    isPricePending: Boolean(item.isPricePending),
    supportsComplimentaryToppings: Boolean(item.supportsComplimentaryToppings),
    supportsSiyamiOption: Boolean(item.supportsSiyamiOption),
    supportsPaidExtras: Boolean(item.supportsPaidExtras),
    isFeatured: Boolean(item.isFeatured),
    isNew: Boolean(item.isNew),
    isHidden: Boolean(item.isHidden),
    existingImageUrl: item.image ?? null,
    pendingFileDataUrl: null,
  };
}

function createEmptyProductDraft(defaultCategoryId: string): ProductDraft {
  return {
    name: '',
    description: '',
    categoryId: defaultCategoryId,
    subGroup: '',
    smallPrice: '',
    mediumPrice: '',
    largePrice: '',
    singlePrice: '',
    useMultiSize: true,
    isPricePending: false,
    supportsComplimentaryToppings: false,
    supportsSiyamiOption: false,
    supportsPaidExtras: true,
    isFeatured: false,
    isNew: false,
    isHidden: false,
    existingImageUrl: null,
    pendingFileDataUrl: null,
  };
}

export function AdminDashboardPage({
  onNavigateHome,
  onCatalogMutated,
}: AdminDashboardPageProps) {
  // Keep token ONLY in React memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Login / First-Run Setup forms
  const [loginPassword, setLoginPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Admin Catalog State
  const [catalog, setCatalog] = useState<AdminCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Products tab filters & modals
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'product' | 'category' | 'branch'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Categories tab state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState<{
    name: string;
    subtitle: string;
    existingImageUrl: string;
    pendingFileDataUrl: string | null;
  }>({ name: '', subtitle: '', existingImageUrl: '', pendingFileDataUrl: null });
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [catSaving, setCatSaving] = useState(false);

  // Branches tab state
  const [editingBranch, setEditingBranch] = useState<BranchInfo | null>(null);
  const [isNewBranch, setIsNewBranch] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');

  // Settings & Change Password state
  const [settingsDraft, setSettingsDraft] = useState<RestaurantSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const fetchAuthStatus = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth-status');
      if (!res.ok) throw new Error('تعذر الاتصال بخادم الإدارة.');
      const data = (await res.json()) as AuthStatusResponse;
      setAuthStatus(data);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'الخادم الآمن للإدارة غير متصل حالياً.'
      );
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthStatus();
  }, [fetchAuthStatus]);

  const fetchAdminCatalog = useCallback(
    async (activeToken: string) => {
      setCatalogLoading(true);
      try {
        const res = await fetch('/api/admin/catalog', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.status === 401) {
          setToken(null);
          setAuthError('انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.');
          return;
        }
        if (!res.ok) {
          throw new Error('تعذر تحميل بيانات الإدارة.');
        }
        const data = (await res.json()) as AdminCatalogResponse;
        setCatalog(data);
        setSettingsDraft(data.settings);
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'تعذر تحميل البيانات.');
      } finally {
        setCatalogLoading(false);
      }
    },
    [notify]
  );

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = (await res.json()) as { token?: string; error?: string; requiresSetup?: boolean };
      if (!res.ok || !data.token) {
        if (data.requiresSetup) {
          await fetchAuthStatus();
        }
        setAuthError(data.error || 'فشل تسجيل الدخول.');
        return;
      }
      setLoginPassword('');
      setToken(data.token);
      await fetchAdminCatalog(data.token);
    } catch {
      setAuthError('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSetupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (setupPassword.trim().length < 4) {
      setAuthError('يجب أن تكون كلمة المرور 4 أحرف أو أرقام على الأقل.');
      return;
    }
    if (setupPassword.trim() !== setupConfirm.trim()) {
      setAuthError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: setupPassword.trim() }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error || 'تعذر حفظ كلمة المرور الأولية.');
        await fetchAuthStatus();
        return;
      }
      setSetupPassword('');
      setSetupConfirm('');
      setAuthStatus({
        requiresSetup: false,
        isEnvConfigured: false,
        publicRegistrationAllowed: false,
      });
      setToken(data.token);
      await fetchAdminCatalog(data.token);
      notify('success', 'تم تعيين كلمة مرور الإدارة بنجاح وتأمين لوحة التحكم.');
    } catch {
      setAuthError('حدث خطأ أثناء إعداد كلمة المرور.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const uploadImageDataUrl = async (dataUrl: string): Promise<string> => {
    if (!token) throw new Error('انتهت الجلسة.');
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dataUrl }),
    });
    const data = (await res.json()) as { imageUrl?: string; error?: string };
    if (!res.ok || !data.imageUrl) {
      throw new Error(data.error || 'فشل رفع الصورة.');
    }
    return data.imageUrl;
  };

  const handleProductFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !productDraft) return;
    try {
      const optimized = await fileToOptimizedDataUrl(file);
      setProductDraft((prev) => (prev ? { ...prev, pendingFileDataUrl: optimized } : prev));
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر قراءة الصورة.');
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !productDraft) return;
    if (!productDraft.name.trim()) {
      notify('error', 'يرجى إدخال اسم الصنف.');
      return;
    }

    setProductSaving(true);
    try {
      let finalImageUrl = productDraft.existingImageUrl;
      if (productDraft.pendingFileDataUrl) {
        finalImageUrl = await uploadImageDataUrl(productDraft.pendingFileDataUrl);
      }

      const prices: SizePriceMap = {};
      if (productDraft.useMultiSize) {
        const parseNum = (s: string) => {
          const n = Number(s.trim());
          return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
        };
        const sm = parseNum(productDraft.smallPrice);
        const md = parseNum(productDraft.mediumPrice);
        const lg = parseNum(productDraft.largePrice);
        if (sm !== undefined) prices.small = sm;
        if (md !== undefined) prices.medium = md;
        if (lg !== undefined) prices.large = lg;
        if (Object.keys(prices).length === 0) {
          prices.medium = null;
        }
      } else {
        const n = Number(productDraft.singlePrice.trim());
        prices.single =
          productDraft.singlePrice.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
      }

      const payload = {
        name: productDraft.name.trim(),
        description: productDraft.description.trim(),
        categoryId: productDraft.categoryId,
        subGroup: productDraft.subGroup.trim(),
        image: finalImageUrl,
        prices,
        isPricePending: productDraft.isPricePending,
        supportsComplimentaryToppings: productDraft.supportsComplimentaryToppings,
        supportsSiyamiOption: productDraft.supportsSiyamiOption,
        supportsPaidExtras: productDraft.supportsPaidExtras,
        isFeatured: productDraft.isFeatured,
        isNew: productDraft.isNew,
        isHidden: productDraft.isHidden,
      };

      const isEdit = Boolean(productDraft.id);
      const url = isEdit
        ? `/api/admin/products/${encodeURIComponent(productDraft.id!)}`
        : '/api/admin/products';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'تعذر حفظ الصنف.');
      }

      setProductDraft(null);
      await fetchAdminCatalog(token);
      await onCatalogMutated();
      notify('success', isEdit ? 'تم حفظ تعديلات الصنف والصورة بنجاح.' : 'تمت إضافة الصنف الجديد بنجاح.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ.');
    } finally {
      setProductSaving(false);
    }
  };

  const handleToggleProductVisibility = async (item: MenuItem) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isHidden: !item.isHidden }),
      });
      if (!res.ok) throw new Error('تعذر تغيير حالة الظهور.');
      await fetchAdminCatalog(token);
      await onCatalogMutated();
      notify(
        'success',
        !item.isHidden ? `تم إخفاء "${item.name}" من المنيو العام.` : `تم إظهار "${item.name}" في المنيو العام.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر تحديث الحالة.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint =
        deleteTarget.type === 'product'
          ? `/api/admin/products/${encodeURIComponent(deleteTarget.id)}`
          : deleteTarget.type === 'category'
            ? `/api/admin/categories/${encodeURIComponent(deleteTarget.id)}`
            : `/api/admin/branches/${encodeURIComponent(deleteTarget.id)}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'تعذر الحذف.');
      }
      setDeleteTarget(null);
      await fetchAdminCatalog(token);
      await onCatalogMutated();
      notify('success', `تم حذف "${deleteTarget.name}" بنجاح.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر الحذف.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCategoryFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const optimized = await fileToOptimizedDataUrl(file);
      setCatDraft((prev) => ({ ...prev, pendingFileDataUrl: optimized }));
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر قراءة الصورة.');
    }
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!catDraft.name.trim()) {
      notify('error', 'اسم القسم مطلوب.');
      return;
    }

    setCatSaving(true);
    try {
      let image = catDraft.existingImageUrl;
      if (catDraft.pendingFileDataUrl) {
        image = await uploadImageDataUrl(catDraft.pendingFileDataUrl);
      }

      const isEdit = Boolean(editingCatId);
      const url = isEdit
        ? `/api/admin/categories/${encodeURIComponent(editingCatId!)}`
        : '/api/admin/categories';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: catDraft.name.trim(),
          subtitle: catDraft.subtitle.trim(),
          image,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'تعذر حفظ القسم.');

      setEditingCatId(null);
      setNewCatOpen(false);
      await fetchAdminCatalog(token);
      await onCatalogMutated();
      notify('success', isEdit ? 'تم تحديث القسم بنجاح.' : 'تمت إضافة القسم بنجاح.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر حفظ القسم.');
    } finally {
      setCatSaving(false);
    }
  };

  const handleSaveBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editingBranch) return;
    if (!editingBranch.name.trim() || !editingBranch.address.trim()) {
      notify('error', 'يرجى إدخال اسم الفرع وعنوانه.');
      return;
    }

    setBranchSaving(true);
    try {
      const url = isNewBranch
        ? '/api/admin/branches'
        : `/api/admin/branches/${encodeURIComponent(editingBranch.id)}`;
      const res = await fetch(url, {
        method: isNewBranch ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingBranch),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'تعذر حفظ بيانات الفرع.');

      setEditingBranch(null);
      setIsNewBranch(false);
      await fetchAdminCatalog(token);
      await onCatalogMutated();
      notify('success', 'تم حفظ بيانات الفرع بنجاح.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر حفظ الفرع.');
    } finally {
      setBranchSaving(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !settingsDraft) return;
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsDraft),
      });
      const data = (await res.json()) as { settings?: RestaurantSettings; error?: string };
      if (!res.ok || !data.settings) throw new Error(data.error || 'تعذر حفظ الإعدادات.');
      await fetchAdminCatalog(token);
      await onCatalogMutated();
      notify('success', 'تم حفظ إعدادات المطعم والواتساب والتوصيل بنجاح.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر حفظ الإعدادات.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPw.trim().length < 4) {
      notify('error', 'يجب أن تكون كلمة المرور الجديدة 4 أحرف أو أرقام على الأقل.');
      return;
    }
    if (newPw.trim() !== confirmNewPw.trim()) {
      notify('error', 'تأكيد كلمة المرور الجديدة غير مطابق.');
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPw.trim(),
          newPassword: newPw.trim(),
        }),
      });
      const data = (await res.json()) as { token?: string; message?: string; error?: string };
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'تعذر تغيير كلمة المرور.');
      }
      setToken(data.token);
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
      notify('success', data.message || 'تم تغيير كلمة المرور بنجاح.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذر تغيير كلمة المرور.');
    } finally {
      setPwSaving(false);
    }
  };

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    catalog?.categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    if (!catalog) return [];
    const nq = normalizeArabic(searchQuery);
    return catalog.items.filter((item) => {
      if (categoryFilter !== 'all' && item.categoryId !== categoryFilter) return false;
      if (visibilityFilter === 'visible' && item.isHidden) return false;
      if (visibilityFilter === 'hidden' && !item.isHidden) return false;
      if (visibilityFilter === 'missing-image' && item.image) return false;
      if (nq) {
        const matchName = normalizeArabic(item.name).includes(nq);
        const matchSub = item.subGroup ? normalizeArabic(item.subGroup).includes(nq) : false;
        const matchCat = normalizeArabic(categoryNameMap.get(item.categoryId) || '').includes(nq);
        return matchName || matchSub || matchCat;
      }
      return true;
    });
  }, [catalog, searchQuery, categoryFilter, visibilityFilter, categoryNameMap]);

  const stats = useMemo(() => {
    const items = catalog?.items ?? [];
    return {
      total: items.length,
      withImage: items.filter((i) => Boolean(i.image)).length,
      hidden: items.filter((i) => Boolean(i.isHidden)).length,
      categories: catalog?.categories.length ?? 0,
      branches: catalog?.branches.length ?? 0,
    };
  }, [catalog]);

  // =================== UNAUTHENTICATED SCREEN ===================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#090909] text-[#F8F5EF] flex flex-col justify-center items-center px-4 py-10">
        <div className="w-full max-w-md bg-[#171717] border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={BRAND_LOGO}
              alt="شعار بيتزا وكريب القليوبي"
              className="w-20 h-20 rounded-full object-contain ring-2 ring-[#D4AF37]/65 bg-[#090909] mb-4"
            />
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>بوابة إدارة المطعم المحمية</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[#F8F5EF]">
              بيتزا وكريب القليوبي
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A29E] mt-1">
              لوحة خاصة بالإدارة للتحكم في المنتجات والصور والأسعار والفروع
            </p>
          </div>

          {authLoading ? (
            <div className="py-8 text-center text-sm text-[#A8A29E]">
              جاري التحقق من حالة الخادم الآمن...
            </div>
          ) : authStatus?.requiresSetup ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="bg-[#090909] border border-[#D4AF37]/30 rounded-xl p-3.5 text-xs text-[#E7E1D6] leading-relaxed">
                <p className="font-bold text-[#D4AF37] mb-1">
                  الإعداد الأولي لكلمة مرور الإدارة
                </p>
                <p>
                  لم يتم تعيين متغير <span dir="ltr" className="text-[#D4AF37]">ADMIN_INITIAL_PASSWORD</span> على الخادم بعد. يمكنك تعيين كلمة مرور الإدارة الآن لمرة واحدة لتأمين لوحة التحكم (يُغلق هذا الإعداد تلقائياً بعد الحفظ ولا يُسمح بالتسجيل العام).
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-xs text-[#F8F5EF] bg-[#B91C1C]/20 border border-[#B91C1C]/50 rounded-xl p-3"
                >
                  <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label htmlFor="setup-pw" className="block text-xs font-semibold text-[#A8A29E] mb-1.5">
                  كلمة المرور الأولية للإدارة *
                </label>
                <input
                  id="setup-pw"
                  type="password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور المطلوبة"
                  className="w-full px-4 py-3 rounded-xl bg-[#090909] border border-white/[0.12] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label htmlFor="setup-pw-confirm" className="block text-xs font-semibold text-[#A8A29E] mb-1.5">
                  تأكيد كلمة المرور *
                </label>
                <input
                  id="setup-pw-confirm"
                  type="password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className="w-full px-4 py-3 rounded-xl bg-[#090909] border border-white/[0.12] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-bold text-sm transition-colors cursor-pointer min-h-[46px]"
              >
                {authSubmitting ? 'جاري التفعيل والحفظ...' : 'تعيين كلمة المرور والدخول'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-xs text-[#F8F5EF] bg-[#B91C1C]/20 border border-[#B91C1C]/50 rounded-xl p-3"
                >
                  <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label htmlFor="admin-pw" className="block text-xs font-semibold text-[#A8A29E] mb-1.5">
                  كلمة مرور الإدارة *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#D4AF37] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-pw"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور الإدارة"
                    className="w-full pr-10 pl-4 py-3 rounded-xl bg-[#090909] border border-white/[0.12] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting || !authStatus}
                className="w-full py-3 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-bold text-sm transition-colors cursor-pointer min-h-[46px]"
              >
                {authSubmitting ? 'جاري التحقق...' : 'دخول إلى لوحة الإدارة'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#A8A29E]">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-[#D4AF37] hover:underline cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة إلى موقع المطعم</span>
            </button>
            <span>محمي بتحقق الخادم</span>
          </div>
        </div>
      </div>
    );
  }

  // =================== AUTHENTICATED DASHBOARD ===================
  return (
    <div className="min-h-screen bg-[#090909] text-[#F8F5EF] flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 bg-[#111111]/95 backdrop-blur-md border-b border-[#D4AF37]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_LOGO}
              alt="شعار بيتزا وكريب القليوبي"
              className="w-10 h-10 rounded-full object-contain ring-1 ring-[#D4AF37]/65 bg-[#090909] shrink-0"
            />
            <div>
              <h1 className="font-display text-base sm:text-lg font-extrabold text-[#F8F5EF]">
                لوحة إدارة بيتزا وكريب القليوبي
              </h1>
              <p className="text-[11px] sm:text-xs text-[#D4AF37]">
                تعديل فوري ومحفوظ على الخادم · ينعكس مباشرة على الموقع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAdminCatalog(token)}
              disabled={catalogLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171717] hover:bg-[#222222] border border-white/[0.1] text-xs font-medium text-[#F8F5EF] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${catalogLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171717] hover:bg-[#222222] border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37] cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>عرض الموقع</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setToken(null);
                setCatalog(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#B91C1C]/20 hover:bg-[#B91C1C] border border-[#B91C1C]/40 text-xs font-semibold text-[#F8F5EF] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Summary Metrics + Navigation Tabs */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-5 flex-1 pb-14">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-3.5">
            <span className="text-[11px] text-[#A8A29E] block">إجمالي المنتجات</span>
            <span className="font-display text-xl font-black text-[#F8F5EF] tabular-nums">
              {stats.total}
            </span>
          </div>
          <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-3.5">
            <span className="text-[11px] text-[#A8A29E] block">منتجات بصور</span>
            <span className="font-display text-xl font-black text-[#D4AF37] tabular-nums">
              {stats.withImage}
            </span>
          </div>
          <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-3.5">
            <span className="text-[11px] text-[#A8A29E] block">منتجات مخفية</span>
            <span className="font-display text-xl font-black text-[#B91C1C] tabular-nums">
              {stats.hidden}
            </span>
          </div>
          <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-3.5">
            <span className="text-[11px] text-[#A8A29E] block">الأقسام</span>
            <span className="font-display text-xl font-black text-[#F8F5EF] tabular-nums">
              {stats.categories}
            </span>
          </div>
          <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-3.5 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#A8A29E] block">الفروع</span>
            <span className="font-display text-xl font-black text-[#F8F5EF] tabular-nums">
              {stats.branches}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#B91C1C] text-white'
                : 'bg-[#171717] text-[#A8A29E] hover:text-[#F8F5EF] border border-white/[0.08]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>المنتجات ({stats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[#B91C1C] text-white'
                : 'bg-[#171717] text-[#A8A29E] hover:text-[#F8F5EF] border border-white/[0.08]'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>الأقسام ({stats.categories})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'branches'
                ? 'bg-[#B91C1C] text-white'
                : 'bg-[#171717] text-[#A8A29E] hover:text-[#F8F5EF] border border-white/[0.08]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>الفروع والأرقام ({stats.branches})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#B91C1C] text-white'
                : 'bg-[#171717] text-[#A8A29E] hover:text-[#F8F5EF] border border-white/[0.08]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>الإعدادات وكلمة المرور</span>
          </button>
        </div>

        {/* Inline Status Banner */}
        {feedback && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#F8F5EF]'
                : 'bg-[#B91C1C]/20 border-[#B91C1C]/60 text-[#F8F5EF]'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />
              )}
              <span>{feedback.text}</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 text-[#A8A29E] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =================== TAB 1: PRODUCTS =================== */}
        {activeTab === 'products' && catalog && (
          <div className="space-y-4">
            {/* Search & Filters Row */}
            <div className="bg-[#171717] border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#A8A29E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم الصنف أو القسم أو التصنيف الفرعي..."
                    className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] placeholder:text-[#A8A29E]/60 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">كل الأقسام ({catalog.items.length})</option>
                  {catalog.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setProductDraft(
                      createEmptyProductDraft(catalog.categories[0]?.id ?? 'italian-pizza')
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c39f2d] text-[#090909] font-bold text-sm transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة منتج جديد</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(
                  [
                    ['all', 'الكل'],
                    ['visible', 'الظاهرة فقط'],
                    ['hidden', 'المخفية فقط'],
                    ['missing-image', 'بدون صورة'],
                  ] as [VisibilityFilter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVisibilityFilter(key)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                      visibilityFilter === key
                        ? 'bg-[#262626] border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-[#090909] border-white/[0.08] text-[#A8A29E] hover:text-[#F8F5EF]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span className="mr-auto text-[#A8A29E] tabular-nums">
                  النتائج: {filteredProducts.length} صنف
                </span>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((item) => {
                const catName = categoryNameMap.get(item.categoryId) ?? item.categoryId;
                const priceSummary = (['small', 'medium', 'large', 'single'] as SizeKey[])
                  .filter((k) => item.prices[k] !== undefined)
                  .map((k) => `${SIZE_LABELS[k]}: ${item.prices[k] != null ? `${item.prices[k]} ج.م` : 'مراجعة'}`)
                  .join(' · ');

                return (
                  <article
                    key={item.id}
                    className={`bg-[#171717] border rounded-2xl overflow-hidden flex flex-col transition-colors ${
                      item.isHidden
                        ? 'border-[#B91C1C]/50 opacity-80'
                        : 'border-white/[0.08] hover:border-[#D4AF37]/45'
                    }`}
                  >
                    <div className="flex gap-3 p-3.5">
                      <div className="w-24 h-20 rounded-xl bg-[#090909] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-[#A8A29E] text-center px-1">
                            بدون صورة
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] text-[#D4AF37] truncate font-medium">
                            {catName}
                          </span>
                          {item.isHidden && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#B91C1C]/25 text-[#F8F5EF] shrink-0">
                              مخفي
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-sm font-bold text-[#F8F5EF] leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-[#A8A29E] mt-1 line-clamp-1 tabular-nums">
                          {priceSummary || 'سعر غير محدد'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto px-3.5 py-2.5 bg-[#111111] border-t border-white/[0.07] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setProductDraft(itemToDraft(item))}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-[#222222] hover:bg-[#2B2B2B] text-xs font-semibold text-[#F8F5EF] border border-white/[0.08] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>تعديل / الصورة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleProductVisibility(item)}
                        title={item.isHidden ? 'إظهار الصنف' : 'إخفاء الصنف'}
                        className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#090909] hover:bg-white/[0.06] text-xs font-medium text-[#A8A29E] hover:text-[#F8F5EF] border border-white/[0.08] cursor-pointer"
                      >
                        {item.isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>إظهار</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>إخفاء</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({ type: 'product', id: item.id, name: item.name })
                        }
                        aria-label={`حذف ${item.name}`}
                        className="p-1.5 rounded-lg bg-[#090909] hover:bg-[#B91C1C]/25 text-[#A8A29E] hover:text-[#B91C1C] border border-white/[0.08] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* =================== TAB 2: CATEGORIES =================== */}
        {activeTab === 'categories' && catalog && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#F8F5EF]">
                إدارة أقسام المنيو
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingCatId(null);
                  setCatDraft({
                    name: '',
                    subtitle: '',
                    existingImageUrl: '',
                    pendingFileDataUrl: null,
                  });
                  setNewCatOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#090909] text-xs sm:text-sm font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قسم جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalog.categories.map((cat) => {
                const count = catalog.items.filter((i) => i.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-[#171717] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="w-20 h-20 rounded-xl bg-[#090909] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#A8A29E]">بدون صورة</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base font-bold text-[#F8F5EF]">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-[#A8A29E] line-clamp-2 mt-0.5">
                        {cat.subtitle}
                      </p>
                      <p className="text-[11px] text-[#D4AF37] mt-1 tabular-nums">
                        {count} صنف مسجل
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setCatDraft({
                            name: cat.name,
                            subtitle: cat.subtitle,
                            existingImageUrl: cat.image || '',
                            pendingFileDataUrl: null,
                          });
                          setNewCatOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-xs font-semibold text-[#F8F5EF] border border-white/[0.08] cursor-pointer"
                      >
                        تعديل
                      </button>

                      {count === 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#B91C1C]/20 hover:bg-[#B91C1C] text-xs font-semibold text-[#F8F5EF] cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================== TAB 3: BRANCHES =================== */}
        {activeTab === 'branches' && catalog && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#F8F5EF]">
                إدارة الفروع وأرقام الهاتف والشكاوى
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsNewBranch(true);
                  setNewPhoneInput('');
                  setEditingBranch({
                    id: '',
                    name: '',
                    address: '',
                    hasVerifiedStreetAddress: false,
                    phones: [],
                    complaintsWhatsapp: '',
                    management: '',
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#090909] text-xs sm:text-sm font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فرع</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalog.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-[#171717] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <h3 className="font-display text-base font-bold text-[#F8F5EF]">
                      {branch.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#A8A29E]">{branch.address}</p>
                    {branch.management && (
                      <p className="text-xs text-[#D4AF37]">إدارة: {branch.management}</p>
                    )}
                    {branch.complaintsWhatsapp && (
                      <p className="text-xs text-[#E7E1D6] tabular-nums">
                        واتساب الشكاوى: <span dir="ltr">{branch.complaintsWhatsapp}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {branch.phones.map((phone) => (
                        <span
                          key={phone}
                          dir="ltr"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#090909] border border-white/[0.08] text-xs text-[#F8F5EF] tabular-nums"
                        >
                          <Phone className="w-3 h-3 text-[#D4AF37]" />
                          {phone}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.07] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewBranch(false);
                        setNewPhoneInput('');
                        setEditingBranch({
                          ...branch,
                          phones: [...branch.phones],
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-xs font-semibold text-[#F8F5EF] border border-white/[0.08] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>تعديل الفرع</span>
                    </button>
                    {catalog.branches.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'branch',
                            id: branch.id,
                            name: branch.name,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#B91C1C]/20 hover:bg-[#B91C1C] text-xs font-semibold text-[#F8F5EF] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================== TAB 4: SETTINGS & PASSWORD =================== */}
        {activeTab === 'settings' && settingsDraft && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Restaurant & WhatsApp Settings */}
            <form
              onSubmit={handleSaveSettings}
              className="bg-[#171717] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-bold text-[#F8F5EF]">
                إعدادات المطعم والواتساب والتوصيل
              </h2>

              <div>
                <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                  اسم المطعم
                </label>
                <input
                  type="text"
                  required
                  value={settingsDraft.restaurantName}
                  onChange={(e) =>
                    setSettingsDraft((s) => (s ? { ...s, restaurantName: e.target.value } : s))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                  الشعار الوصفي (Tagline)
                </label>
                <input
                  type="text"
                  required
                  value={settingsDraft.tagline}
                  onChange={(e) =>
                    setSettingsDraft((s) => (s ? { ...s, tagline: e.target.value } : s))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    رسوم التوصيل (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settingsDraft.deliveryFee}
                    onChange={(e) =>
                      setSettingsDraft((s) =>
                        s ? { ...s, deliveryFee: Math.max(0, Number(e.target.value) || 0) } : s
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    الحد الأدنى للطلب (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settingsDraft.minOrderAmount}
                    onChange={(e) =>
                      setSettingsDraft((s) =>
                        s ? { ...s, minOrderAmount: Math.max(0, Number(e.target.value) || 0) } : s
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#090909] border border-white/[0.08] cursor-pointer">
                <div>
                  <span className="block text-sm font-semibold text-[#F8F5EF]">
                    تفعيل زر إرسال الطلب عبر واتساب
                  </span>
                  <span className="block text-xs text-[#A8A29E]">
                    يُظهر زر الإرسال الفوري لرقم الواتساب المحدد أدناه
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsDraft.demoWhatsappEnabled}
                  onChange={(e) =>
                    setSettingsDraft((s) =>
                      s ? { ...s, demoWhatsappEnabled: e.target.checked } : s
                    )
                  }
                  className="w-5 h-5 accent-[#D4AF37] cursor-pointer"
                />
              </label>

              <div>
                <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                  رقم واتساب استلام الطلبات (مع كود الدولة مثل 2010XXXXXXXX)
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={settingsDraft.demoWhatsappNumber}
                  onChange={(e) =>
                    setSettingsDraft((s) =>
                      s ? { ...s, demoWhatsappNumber: e.target.value } : s
                    )
                  }
                  placeholder="201092929026"
                  className="w-full text-right px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                disabled={settingsSaving}
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-bold text-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{settingsSaving ? 'جاري الحفظ...' : 'حفظ إعدادات المطعم'}</span>
              </button>
            </form>

            {/* Change Admin Password */}
            <form
              onSubmit={handleChangePassword}
              className="bg-[#171717] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 h-fit"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="font-display text-lg font-bold text-[#F8F5EF]">
                  تغيير كلمة مرور لوحة الإدارة
                </h2>
              </div>
              <p className="text-xs text-[#A8A29E] leading-relaxed">
                يتم تشفير كلمة المرور الجديدة وحفظها بأمان على الخادم مع إنهاء الجلسات السابقة تلقائياً.
              </p>

              <div>
                <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                  كلمة المرور الحالية *
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                  كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                  تأكيد كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  value={confirmNewPw}
                  onChange={(e) => setConfirmNewPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                disabled={pwSaving}
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#c39f2d] disabled:opacity-60 text-[#090909] font-bold text-sm cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{pwSaving ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* =================== MODAL: ADD/EDIT PRODUCT =================== */}
      {productDraft && catalog && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !productSaving && setProductDraft(null)}
        >
          <form
            onSubmit={handleSaveProduct}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92vh] bg-[#171717] border border-white/[0.12] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 bg-[#111111] border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#F8F5EF]">
                {productDraft.id ? 'تعديل الصنف وصورته' : 'إضافة صنف جديد'}
              </h2>
              <button
                type="button"
                onClick={() => setProductDraft(null)}
                className="p-2 rounded-lg text-[#A8A29E] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Image Upload & Preview Before Saving */}
              <div className="bg-[#090909] border border-white/[0.1] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#D4AF37]">
                    صورة الصنف (معاينة قبل الحفظ)
                  </span>
                  {productDraft.pendingFileDataUrl && (
                    <span className="text-[11px] font-semibold text-[#D4AF37] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md">
                      صورة جديدة بانتظار الحفظ
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-44 aspect-[4/3] rounded-xl bg-[#171717] border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                    {productDraft.pendingFileDataUrl || productDraft.existingImageUrl ? (
                      <img
                        src={productDraft.pendingFileDataUrl || productDraft.existingImageUrl!}
                        alt="معاينة صورة الصنف"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#A8A29E]">لا توجد صورة حالياً</span>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2.5">
                    <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2C2C2C] border border-[#D4AF37]/45 text-xs sm:text-sm font-semibold text-[#F8F5EF] cursor-pointer">
                      <Upload className="w-4 h-4 text-[#D4AF37]" />
                      <span>
                        {productDraft.pendingFileDataUrl || productDraft.existingImageUrl
                          ? 'رفع أو استبدال صورة من الجهاز'
                          : 'رفع صورة من الهاتف أو الكمبيوتر'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleProductFileChange}
                        className="hidden"
                      />
                    </label>

                    {(productDraft.pendingFileDataUrl || productDraft.existingImageUrl) && (
                      <button
                        type="button"
                        onClick={() =>
                          setProductDraft((p) =>
                            p
                              ? { ...p, existingImageUrl: null, pendingFileDataUrl: null }
                              : p
                          )
                        }
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#B91C1C]/15 hover:bg-[#B91C1C] border border-[#B91C1C]/40 text-xs font-semibold text-[#F8F5EF] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف صورة الصنف</span>
                      </button>
                    )}

                    <p className="text-[11px] text-[#A8A29E]">
                      يتم ضغط الصورة تلقائياً وحفظها على الخادم فور الضغط على &quot;حفظ الصنف&quot;.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    اسم الصنف بالعربي *
                  </label>
                  <input
                    type="text"
                    required
                    value={productDraft.name}
                    onChange={(e) =>
                      setProductDraft((p) => (p ? { ...p, name: e.target.value } : p))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    القسم الرئيسي *
                  </label>
                  <select
                    value={productDraft.categoryId}
                    onChange={(e) =>
                      setProductDraft((p) => (p ? { ...p, categoryId: e.target.value } : p))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {catalog.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    تصنيف فرعي (اختياري)
                  </label>
                  <input
                    type="text"
                    value={productDraft.subGroup}
                    onChange={(e) =>
                      setProductDraft((p) => (p ? { ...p, subGroup: e.target.value } : p))
                    }
                    placeholder="مثال: كريب اللحوم"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A8A29E] mb-1.5">
                    وصف أو ملاحظات الصنف (اختياري)
                  </label>
                  <input
                    type="text"
                    value={productDraft.description}
                    onChange={(e) =>
                      setProductDraft((p) => (p ? { ...p, description: e.target.value } : p))
                    }
                    placeholder="مكونات أو وصف مختصر"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Sizes & Prices */}
              <div className="bg-[#090909] border border-white/[0.08] rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#F8F5EF]">
                    الأحجام والأسعار (ج.م)
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setProductDraft((p) => (p ? { ...p, useMultiSize: true } : p))
                      }
                      className={`px-3 py-1 rounded-lg border cursor-pointer ${
                        productDraft.useMultiSize
                          ? 'bg-[#B91C1C] border-[#B91C1C] text-white'
                          : 'bg-[#171717] border-white/[0.1] text-[#A8A29E]'
                      }`}
                    >
                      أحجام (صغير / وسط / كبير)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProductDraft((p) => (p ? { ...p, useMultiSize: false } : p))
                      }
                      className={`px-3 py-1 rounded-lg border cursor-pointer ${
                        !productDraft.useMultiSize
                          ? 'bg-[#B91C1C] border-[#B91C1C] text-white'
                          : 'bg-[#171717] border-white/[0.1] text-[#A8A29E]'
                      }`}
                    >
                      سعر موحد
                    </button>
                  </div>
                </div>

                {productDraft.useMultiSize ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[#A8A29E] mb-1">صغير</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={productDraft.smallPrice}
                        onChange={(e) =>
                          setProductDraft((p) => (p ? { ...p, smallPrice: e.target.value } : p))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#A8A29E] mb-1">وسط</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={productDraft.mediumPrice}
                        onChange={(e) =>
                          setProductDraft((p) => (p ? { ...p, mediumPrice: e.target.value } : p))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#A8A29E] mb-1">كبير</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={productDraft.largePrice}
                        onChange={(e) =>
                          setProductDraft((p) => (p ? { ...p, largePrice: e.target.value } : p))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-[#A8A29E] mb-1">السعر الموحد (ج.م)</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={productDraft.singlePrice}
                      onChange={(e) =>
                        setProductDraft((p) => (p ? { ...p, singlePrice: e.target.value } : p))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#171717] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums"
                    />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#090909] border border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productDraft.supportsPaidExtras}
                    onChange={(e) =>
                      setProductDraft((p) =>
                        p ? { ...p, supportsPaidExtras: e.target.checked } : p
                      )
                    }
                    className="w-4 h-4 accent-[#D4AF37]"
                  />
                  <span>يدعم الإضافات الاختيارية</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#090909] border border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productDraft.supportsSiyamiOption}
                    onChange={(e) =>
                      setProductDraft((p) =>
                        p ? { ...p, supportsSiyamiOption: e.target.checked } : p
                      )
                    }
                    className="w-4 h-4 accent-[#D4AF37]"
                  />
                  <span>متاح صيامي</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#090909] border border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productDraft.isFeatured}
                    onChange={(e) =>
                      setProductDraft((p) => (p ? { ...p, isFeatured: e.target.checked } : p))
                    }
                    className="w-4 h-4 accent-[#D4AF37]"
                  />
                  <span>عرض في المختارات الرئيسية</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#090909] border border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productDraft.isHidden}
                    onChange={(e) =>
                      setProductDraft((p) => (p ? { ...p, isHidden: e.target.checked } : p))
                    }
                    className="w-4 h-4 accent-[#B91C1C]"
                  />
                  <span>إخفاء مؤقت من المنيو العام</span>
                </label>
              </div>
            </div>

            <div className="px-5 py-4 bg-[#111111] border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={productSaving}
                onClick={() => setProductDraft(null)}
                className="px-4 py-2.5 rounded-xl bg-[#222222] text-xs sm:text-sm font-semibold text-[#F8F5EF] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={productSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{productSaving ? 'جاري الرفع والحفظ...' : 'حفظ الصنف'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================== MODAL: ADD/EDIT CATEGORY =================== */}
      {newCatOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !catSaving && setNewCatOpen(false)}
        >
          <form
            onSubmit={handleSaveCategory}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#171717] border border-white/[0.12] rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#111111] border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#F8F5EF]">
                {editingCatId ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </h2>
              <button
                type="button"
                onClick={() => setNewCatOpen(false)}
                className="p-1.5 text-[#A8A29E] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#A8A29E] mb-1.5">اسم القسم *</label>
                <input
                  type="text"
                  required
                  value={catDraft.name}
                  onChange={(e) => setCatDraft((c) => ({ ...c, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A8A29E] mb-1.5">الوصف المختصر</label>
                <input
                  type="text"
                  value={catDraft.subtitle}
                  onChange={(e) => setCatDraft((c) => ({ ...c, subtitle: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF]"
                />
              </div>
              <div className="bg-[#090909] border border-white/[0.08] rounded-xl p-3.5 flex items-center gap-4">
                <div className="w-20 h-16 rounded-lg bg-[#171717] overflow-hidden flex items-center justify-center shrink-0">
                  {catDraft.pendingFileDataUrl || catDraft.existingImageUrl ? (
                    <img
                      src={catDraft.pendingFileDataUrl || catDraft.existingImageUrl}
                      alt="معاينة صورة القسم"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-[#A8A29E]" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#222222] text-xs font-semibold text-[#F8F5EF] cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>رفع صورة للقسم</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCategoryFileChange}
                      className="hidden"
                    />
                  </label>
                  {(catDraft.pendingFileDataUrl || catDraft.existingImageUrl) && (
                    <button
                      type="button"
                      onClick={() =>
                        setCatDraft((c) => ({
                          ...c,
                          existingImageUrl: '',
                          pendingFileDataUrl: null,
                        }))
                      }
                      className="block text-[11px] text-[#B91C1C] hover:underline cursor-pointer"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-[#111111] border-t border-white/[0.08] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewCatOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#222222] text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={catSaving}
                className="px-5 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold cursor-pointer"
              >
                {catSaving ? 'جاري الحفظ...' : 'حفظ القسم'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================== MODAL: ADD/EDIT BRANCH =================== */}
      {editingBranch && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !branchSaving && setEditingBranch(null)}
        >
          <form
            onSubmit={handleSaveBranch}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] bg-[#171717] border border-white/[0.12] rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 bg-[#111111] border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#F8F5EF]">
                {isNewBranch ? 'إضافة فرع جديد' : 'تعديل بيانات الفرع'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
                className="p-1.5 text-[#A8A29E] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#A8A29E] mb-1.5">اسم الفرع *</label>
                <input
                  type="text"
                  required
                  value={editingBranch.name}
                  onChange={(e) =>
                    setEditingBranch((b) => (b ? { ...b, name: e.target.value } : b))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A8A29E] mb-1.5">العنوان *</label>
                <input
                  type="text"
                  required
                  value={editingBranch.address}
                  onChange={(e) =>
                    setEditingBranch((b) => (b ? { ...b, address: e.target.value } : b))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#A8A29E] mb-1.5">إدارة الفرع (اختياري)</label>
                  <input
                    type="text"
                    value={editingBranch.management || ''}
                    onChange={(e) =>
                      setEditingBranch((b) => (b ? { ...b, management: e.target.value } : b))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#A8A29E] mb-1.5">واتساب الشكاوى (اختياري)</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editingBranch.complaintsWhatsapp || ''}
                    onChange={(e) =>
                      setEditingBranch((b) =>
                        b ? { ...b, complaintsWhatsapp: e.target.value } : b
                      )
                    }
                    className="w-full text-right px-3.5 py-2.5 rounded-xl bg-[#090909] border border-white/[0.1] text-sm text-[#F8F5EF] tabular-nums"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingBranch.hasVerifiedStreetAddress}
                  onChange={(e) =>
                    setEditingBranch((b) =>
                      b ? { ...b, hasVerifiedStreetAddress: e.target.checked } : b
                    )
                  }
                  className="w-4 h-4 accent-[#D4AF37]"
                />
                <span>إظهار رابط خرائط جوجل لهذا العنوان</span>
              </label>

              {/* Branch Phones List */}
              <div className="bg-[#090909] border border-white/[0.08] rounded-xl p-3.5 space-y-2.5">
                <label className="block text-xs font-bold text-[#D4AF37]">
                  أرقام تليفونات الفرع
                </label>
                <div className="flex flex-wrap gap-2">
                  {editingBranch.phones.map((phone, idx) => (
                    <span
                      key={`${phone}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#171717] border border-white/[0.1] text-xs tabular-nums"
                    >
                      <span dir="ltr">{phone}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingBranch((b) =>
                            b
                              ? { ...b, phones: b.phones.filter((_, i) => i !== idx) }
                              : b
                          )
                        }
                        className="text-[#A8A29E] hover:text-[#B91C1C] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    dir="ltr"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    placeholder="أدخل رقم هاتف جديد"
                    className="flex-1 text-right px-3 py-2 rounded-lg bg-[#171717] border border-white/[0.1] text-xs sm:text-sm text-[#F8F5EF] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = newPhoneInput.trim();
                      if (!cleaned) return;
                      setEditingBranch((b) =>
                        b ? { ...b, phones: [...b.phones, cleaned] } : b
                      );
                      setNewPhoneInput('');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#090909] text-xs font-bold cursor-pointer"
                  >
                    إضافة رقم
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-[#111111] border-t border-white/[0.08] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
                className="px-4 py-2 rounded-xl bg-[#222222] text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={branchSaving}
                className="px-5 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold cursor-pointer"
              >
                {branchSaving ? 'جاري الحفظ...' : 'حفظ بيانات الفرع'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================== INLINE DELETE CONFIRMATION =================== */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-[#171717] border border-[#B91C1C]/50 rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#F8F5EF]">
              تأكيد الحذف النهائي
            </h3>
            <p className="text-xs sm:text-sm text-[#A8A29E] leading-relaxed">
              هل أنت متأكد من حذف{' '}
              <strong className="text-[#F8F5EF]">&quot;{deleteTarget.name}&quot;</strong>؟ لا يمكن التراجع عن هذه الخطوة.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#222222] text-xs font-semibold text-[#F8F5EF] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold cursor-pointer"
              >
                {deleting ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
