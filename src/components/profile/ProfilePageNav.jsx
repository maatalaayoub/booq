'use client';

import { Menu, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePageNav({ locale, onMenuClick, isRTL, t }) {
  return (
    <header className="relative z-10 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <nav
          dir={isRTL ? "rtl" : "ltr"}
          className="flex items-center justify-between py-3"
        >
          {/* Back Button */}
          <Link
            href={`/${locale}`}
            className="flex items-center justify-center w-9 h-9 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </Link>

          {/* Menu & Logo */}
          <div className="flex items-center gap-3">
            <Link href={`/${locale}`}>
              <Image
                src="/images/booka(white).png"
                alt="Booka.ma"
                width={100}
                height={30}
                className="h-8 w-auto"
                priority
              />
            </Link>

            <button
              onClick={onMenuClick}
              className="hidden md:flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
