'use client';

import { useState, useEffect } from 'react';
import { Home, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import Hero from '@/components/Hero';
import BusinessCards from '@/components/BusinessCards';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

const serviceModes = [
  { key: 'inShop', icon: MapPin, titleKey: 'serviceMode.inShop', descKey: 'serviceMode.inShopDesc' },
  { key: 'atHome', icon: Home, titleKey: 'serviceMode.atHome', descKey: 'serviceMode.atHomeDesc' },
];

export default function HomeContent() {
  const { t, isRTL } = useLanguage();
  const [serviceMode, setServiceMode] = useState('atHome');

  useEffect(() => {
    const savedMode = sessionStorage.getItem('serviceMode');
    if (savedMode) {
      setServiceMode(savedMode);
    }
  }, []);

  const handleServiceModeChange = (mode) => {
    setServiceMode(mode);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('serviceMode', mode);
    }
  };

  return (
    <main className="overflow-hidden">
      <Hero />

      {/* Service Mode */}
      <div className="bg-white pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <p className="text-sm font-medium text-[#244C70] mb-3 lg:mb-0 tracking-wide uppercase whitespace-nowrap">
            {t('serviceMode.label')}
          </p>
          
          <div className="relative inline-flex gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200 self-start">
            {serviceModes.map((mode) => {
              const isSelected = serviceMode === mode.key;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => handleServiceModeChange(mode.key)}
                  className="relative flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold transition-colors duration-200 z-10"
                >
                  {isSelected && (
                    <motion.div
                      layoutId="serviceModeIndicator"
                      className="absolute inset-0 bg-white rounded-md border border-gray-300"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon className={`w-4 h-4 transition-colors duration-200 ${isSelected ? 'text-[#D4AF37]' : 'text-gray-400'}`} strokeWidth={2} />
                    <span className={`transition-colors duration-200 ${isSelected ? 'text-[#1e293b]' : 'text-gray-500'}`}>
                      {t(mode.titleKey)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      <BusinessCards />
      <Footer />
    </main>
  );
}
