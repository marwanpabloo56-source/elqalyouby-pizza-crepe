import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { BranchInfo } from '../types/menu';

interface BranchesSectionProps {
  branches: BranchInfo[];
}

export function BranchesSection({ branches }: BranchesSectionProps) {
  return (
    <section id="branches" className="py-12 md:py-16 bg-[#0D0D0D] border-b border-[#D4AF37]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#F8F5EF]">
            العنوان والتواصل
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {branches.map((branch) => (
            <article
              key={branch.id}
              className="bg-[#171717] border border-white/[0.08] hover:border-[#D4AF37]/40 transition-colors rounded-2xl p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#F8F5EF]">
                  {branch.name}
                </h3>

                <div className="flex items-start gap-2.5 text-sm text-[#E7E1D6]">
                  <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                  <span>{branch.address}</span>
                </div>

                {branch.management && (
                  <p className="text-xs text-[#A8A29E]">
                    إدارة: {branch.management}
                  </p>
                )}

                {branch.complaintsWhatsapp && (
                  <div className="flex items-center gap-2 text-xs text-[#D4AF37] pt-1">
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>واتساب الشكاوى المعتمد: </span>
                    <span dir="ltr" className="tabular-nums font-semibold">
                      {branch.complaintsWhatsapp}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/[0.07] space-y-3">
                <div className="flex flex-wrap gap-2">
                  {branch.phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#222222] hover:bg-[#B91C1C] text-[#F8F5EF] border border-white/[0.08] hover:border-[#B91C1C] text-xs sm:text-sm font-medium transition-colors tabular-nums min-h-[40px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span dir="ltr">{phone}</span>
                    </a>
                  ))}
                </div>

                {branch.hasVerifiedStreetAddress && (
                  <div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        branch.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#D4AF37] hover:underline py-1"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>عرض الموقع على الخريطة (عنوان موثق)</span>
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
