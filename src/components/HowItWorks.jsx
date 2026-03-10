'use client';

import { motion } from 'framer-motion';
import { Search, CalendarClock, Scissors, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export default function HowItWorks() {
  const { t, locale } = useLanguage();
  
  const steps = [
    {
      number: '01',
      icon: Search,
      title: t('step1Title'),
      description: t('step1Desc'),
      highlights: [t('verifiedProfiles'), t('realReviews'), t('portfolioGallery')]
    },
    {
      number: '02',
      icon: CalendarClock,
      title: t('step2Title'),
      description: t('step2Desc'),
      highlights: [t('realTimeAvailability'), t('turnBasedBooking'), t('instantConfirmation')]
    },
    {
      number: '03',
      icon: Scissors,
      title: t('step3Title'),
      description: t('step3Desc'),
      highlights: [t('noWaiting'), t('premiumService'), t('rateReview')]
    }
  ];
  
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-white py-24">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      </div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-20 max-w-2xl text-center"
        >
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <span className="text-sm font-bold uppercase tracking-widest text-[#D4AF37]">
              {t('howItWorksSubtitle')}
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>
          <h2 className="mb-6 text-3xl font-bold text-[#0F172A] sm:text-4xl">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-lg text-gray-600">
            {t('howItWorksDesc')}
          </p>
        </motion.div>

        {/* Steps Timeline */}
        <div className="relative">
          {/* Vertical line for desktop */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-[#D4AF37] via-[#D4AF37]/30 to-transparent lg:block" />
          
          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className={`relative flex flex-col items-center gap-8 lg:flex-row ${idx % 2 === 0 ? '' : 'lg:flex-row-reverse'}`}
              >
                {/* Content Card */}
                <div className={`order-2 lg:order-none w-full lg:w-[calc(50%-3rem)] ${idx % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                  <div className="rounded-[5px] border border-gray-200 bg-white p-8 transition-all hover:border-[#D4AF37]">
                    <div className={`mb-4 flex items-center gap-3 ${idx % 2 === 0 ? 'lg:justify-end' : ''}`}>
                      <span className="text-3xl font-bold text-[#D4AF37]">{step.number}</span>
                      <h3 className="text-xl font-bold text-[#0F172A]">{step.title}</h3>
                    </div>
                    <p className="mb-6 text-gray-600">{step.description}</p>
                    <div className={`flex flex-wrap gap-2 ${idx % 2 === 0 ? 'lg:justify-end' : ''}`}>
                      {step.highlights.map((highlight, hIdx) => (
                        <span 
                          key={hIdx} 
                          className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#D4AF37]/10 px-3 py-1 text-xs font-medium text-[#D4AF37]"
                        >
                          <CheckCircle className="h-3 w-3" />
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Center Icon */}
                <div className="order-1 lg:order-none relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-gradient-to-br from-[#D4AF37] to-[#F4CF67]">
                  <step.icon className="h-7 w-7 text-[#0F172A]" />
                </div>
                
                {/* Empty space for alignment */}
                <div className="hidden w-[calc(50%-3rem)] lg:block" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20 text-center"
        >
          <Link 
            href={`/${locale}/auth/user/sign-up`}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[#0F172A] px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-[#1E293B]"
          >
            <span className="relative z-10">{t('startBookingNow')}</span>
            <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37] transition-transform duration-300 group-hover:translate-x-1">
              <svg className="h-4 w-4 text-[#0F172A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
