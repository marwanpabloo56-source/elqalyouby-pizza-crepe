import { useEffect, useState } from 'react';

interface FoodImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function FoodImage({ src, alt, className = '' }: FoodImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1C1C] via-[#131313] to-[#0B0B0B] text-center px-3 py-4 ${className}`}
        role="img"
        aria-label={`${alt} - صورة الصنف غير متوفرة حالياً`}
      >
        <div className="border border-[#D4AF37]/25 bg-[#090909]/70 rounded-xl px-3 py-2 max-w-[90%]">
          <span className="block text-[11px] sm:text-xs font-bold text-[#D4AF37]">
            صورة الصنف غير متوفرة
          </span>
          <span className="mt-1 block font-display text-[10px] sm:text-[11px] font-medium text-[#A8A29E] line-clamp-2">
            {hasError ? 'تعذر تحميل الصورة' : 'بانتظار التصوير الفعلي للطبق'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
