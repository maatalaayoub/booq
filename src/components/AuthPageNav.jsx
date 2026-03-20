'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthPageNav({ locale, isRTL, t }) {
  return (
    <header className="relative z-20 bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <nav
          dir="ltr"
          className={`flex items-center justify-between py-3 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {/* Logo */}
          <Link href={`/${locale}`}>
            <Image
              src="/images/dark-logo.png"
              alt="Booq"
              width={140}
              height={42}
              className="h-8 md:h-10 w-auto"
              priority
            />
          </Link>

          {/* Back to Home */}
          <Link
            href={`/${locale}`}
            className="flex items-center justify-center w-9 h-9 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          </Link>
        </nav>
      </div>
    </header>
  );
}
