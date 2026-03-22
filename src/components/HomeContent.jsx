'use client';

import { useState, useEffect } from 'react';
import { Home, MapPin } from 'lucide-react';
import Hero from '@/components/Hero';
import BusinessCards from '@/components/BusinessCards';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

const serviceModes = [
  { key: 'atHome', icon: Home, titleKey: 'serviceMode.atHome', descKey: 'serviceMode.atHomeDesc' },
  { key: 'inShop', icon: MapPin, titleKey: 'serviceMode.inShop', descKey: 'serviceMode.inShopDesc' },
];

export default function HomeContent() {
  const { t } = useLanguage();
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
      <div className="bg-gray-50 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-x-6 gap-y-3 border-b border-gray-200">
            <h2 className="text-[20px] font-normal text-[#0F172A] pb-3 tracking-tight">
              {t('serviceMode.label')}
            </h2>
            
            <div className="flex items-center gap-8 w-full sm:w-auto">
              {serviceModes.map((mode) => {
                const isSelected = serviceMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    onClick={() => handleServiceModeChange(mode.key)}
                    className={`group relative pb-3 text-[16px] transition-colors duration-200 ${
                      isSelected
                        ? 'font-bold text-[#0F172A]'
                        : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {t(mode.titleKey)}
                    
                    {/* Animated Underline */}
                    <span 
                      className={`absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#0F172A] transition-all duration-300 ease-out origin-center ${
                        isSelected 
                          ? 'scale-x-100' 
                          : 'scale-x-0 group-hover:scale-x-100 group-hover:bg-gray-300'
                      }`}
                    ></span>
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
