'use client';

import { useMemo, useState } from 'react';
import { sponsorsStore, useResource } from '@/lib/live-store';
import type { Sponsor } from '@/lib/types';

interface SponsorSectionProps {
  className?: string;
  showTitle?: boolean;
}

export default function SponsorSection({
  className = '',
  showTitle = true,
}: SponsorSectionProps) {
  const [sponsors] = useResource(sponsorsStore);

  // Ambil hanya sponsor yang aktif dan memiliki URL logo
  const activeSponsors = useMemo(() => {
    return sponsors.filter((s) => s.active && Boolean(s.logo_url?.trim()));
  }, [sponsors]);

  if (activeSponsors.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="h-px w-6 bg-line" aria-hidden />
          <span className="label text-[10px] sm:text-[11px] text-muted tracking-wider uppercase font-bold">
            Sponsor Resmi
          </span>
          <span className="h-px w-6 bg-line" aria-hidden />
        </div>
      )}

      {activeSponsors.length === 1 ? (
        // Bila hanya ada 1 sponsor: tampilkan di tengah secara rapi (tanpa duplikasi aneh)
        <div className="relative mx-auto flex items-center justify-center">
          <div className="inline-flex items-center justify-center rounded-full border border-line bg-white/[0.025] py-2 px-6 sm:px-8 shadow-sm">
            <SponsorLogoItem sponsor={activeSponsors[0]} />
          </div>
        </div>
      ) : (
        // Bila ada 2 atau lebih sponsor: dua track linear continuous marquee tanpa duplikasi item berlebihan
        <div
          aria-label="Sponsor Slider"
          className="sponsor-slider-host rail-host relative flex w-full overflow-hidden whitespace-nowrap rounded-full border border-line bg-white/[0.025] py-2 sm:py-2.5 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
        >
          {/* Track 1 */}
          <div className="animate-marquee-track flex shrink-0 min-w-full items-center justify-around gap-8 sm:gap-14 px-4 sm:px-8">
            {activeSponsors.map((sponsor) => (
              <SponsorLogoItem key={sponsor.id} sponsor={sponsor} />
            ))}
          </div>

          {/* Track 2 (identik, menyambung langsung di belakang Track 1 secara seamless) */}
          <div
            className="animate-marquee-track flex shrink-0 min-w-full items-center justify-around gap-8 sm:gap-14 px-4 sm:px-8"
            aria-hidden="true"
          >
            {activeSponsors.map((sponsor) => (
              <SponsorLogoItem key={`clone-${sponsor.id}`} sponsor={sponsor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SponsorLogoItem({ sponsor }: { sponsor: Sponsor }) {
  const [imgError, setImgError] = useState(false);

  const imageElement = (
    <div className="h-8 sm:h-9 md:h-10 w-auto max-w-[120px] sm:max-w-[150px] flex items-center justify-center shrink-0 px-2">
      {!imgError && sponsor.logo_url ? (
        <img
          src={sponsor.logo_url}
          alt={sponsor.name}
          onError={() => setImgError(true)}
          className="max-h-full max-w-full object-contain filter drop-shadow-sm opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-300"
          loading="lazy"
        />
      ) : (
        <span className="label text-muted text-xs font-semibold">{sponsor.name}</span>
      )}
    </div>
  );

  if (sponsor.website_url) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Kunjungi ${sponsor.name}`}
        className="no-underline inline-flex items-center shrink-0 cursor-pointer"
      >
        {imageElement}
      </a>
    );
  }

  return <div className="inline-flex items-center shrink-0">{imageElement}</div>;
}
