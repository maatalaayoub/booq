'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sparkles,
  Heart,
  Trophy,
  UtensilsCrossed,
  Car,
  CarFront,
  HardHat,
  Scissors,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const CATEGORY_ICONS = {
  Sparkles,
  Heart,
  Trophy,
  UtensilsCrossed,
  Car,
  CarFront,
  HardHat,
  Scissors,
};

const CATEGORY_IMAGES = {
  Sparkles: '/images/makeup.jpeg',
  Heart: '/images/doctor.jpeg',
  Trophy: '/images/sport.jpeg',
  UtensilsCrossed: '/images/restaurant.jpeg',
  Car: '/images/automotive.jpeg',
  CarFront: '/images/vehicle-rental.jpeg',
  Scissors: '/images/barber.jpeg',
  HardHat: '/images/Construction-equipment.jpeg',
};

const CATEGORY_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-600', ring: 'ring-violet-200' },
  { bg: 'bg-rose-100', text: 'text-rose-600', ring: 'ring-rose-200' },
  { bg: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-200' },
  { bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200' },
  { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600', ring: 'ring-cyan-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-200' },
];

export default function CategoryBrowse() {
  const { t, locale, isRTL } = useLanguage();
  const router = useRouter();
  const scrollRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tDb = (prefix, slug, field, fallback) => {
    const key = field ? `${prefix}.${slug}.${field}` : `${prefix}.${slug}`;
    const translated = t(key);
    return translated !== key ? translated : fallback;
  };

  useEffect(() => {
    setMounted(true);
    fetch('/api/business/specialty')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(data => setCategories(data.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  const handleCategoryClick = (cat) => {
    router.push(`/${locale}/search?category=${cat.slug}`);
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <section className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="flex gap-6 justify-center">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="bg-white pt-10 pb-4 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-[#1E293B] sm:text-2xl">
            {t('home.browseByCategory')}
          </h2>
          {/* Scroll arrows — desktop only */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => scroll(isRTL ? 1 : -1)}
              disabled={isRTL ? !canScrollRight : !canScrollLeft}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(isRTL ? -1 : 1)}
              disabled={isRTL ? !canScrollLeft : !canScrollRight}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable categories */}
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <div
            ref={scrollRef}
            className="flex gap-5 sm:gap-8 overflow-x-auto pt-2 pb-4 px-4 sm:px-6 lg:px-8 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <style>{`.category-scroll::-webkit-scrollbar { display: none; }`}</style>
            {categories.map((cat, index) => {
              const IconComponent = CATEGORY_ICONS[cat.icon] || Sparkles;
              const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              const imageSrc = CATEGORY_IMAGES[cat.icon];
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className="flex flex-col items-center gap-3 flex-shrink-0 snap-start group cursor-pointer min-w-[90px] sm:min-w-[110px]"
                >
                  {/* Circle image or icon */}
                  <div className={`w-[76px] h-[76px] sm:w-[90px] sm:h-[90px] rounded-full ring-2 ${color.ring} overflow-hidden transition-all duration-300 group-hover:ring-4 group-hover:shadow-lg group-hover:scale-105 ${imageSrc ? 'relative' : `${color.bg} flex items-center justify-center`}`}>
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={cat.name}
                        fill
                        sizes="90px"
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <IconComponent className={`w-8 h-8 sm:w-9 sm:h-9 ${color.text} transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.8} />
                    )}
                  </div>
                  {/* Label */}
                  <span className="text-xs sm:text-sm font-semibold text-[#364153] text-center leading-tight max-w-[100px] sm:max-w-[120px] group-hover:text-[#1E293B] transition-colors">
                    {tDb('dbCat', cat.slug, null, cat.name)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
