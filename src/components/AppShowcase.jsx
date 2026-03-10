'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Star,
  Clock,
  MapPin,
  Calendar,
  Zap,
  Shield,
  Users,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AppShowcase() {
  const { t } = useLanguage();

  const stats = [
    { value: '50K+', label: t('activeUsers'), icon: Users },
    { value: '4.9', label: t('appRating'), icon: Star },
    { value: '99%', label: t('instantConfirmation'), icon: Zap },
  ];

  return (
    <section id="app" className="relative overflow-hidden bg-white py-24">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/5 blur-[80px]" />
        
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_0.5px,transparent_0.5px)] opacity-20 [background-size:24px_24px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-20 max-w-2xl text-center"
        >
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <span className="text-sm font-bold uppercase tracking-widest text-[#D4AF37]">
              {t('premiumExperience')}
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>

          <h2 className="mb-6 text-3xl font-bold text-[#0F172A] sm:text-4xl">
            {t('mobileApp')}{' '}
            <span className="bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] bg-clip-text text-transparent">
              {t('youllLove')}
            </span>
          </h2>

          <p className="text-lg text-gray-600">
            {t('appDescription')}
          </p>
        </motion.div>

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left side - Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Glow effect behind phone */}
              <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-transparent blur-[60px]" />
              
              {/* Floating particles */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 top-20 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F4CF67] shadow-lg shadow-[#D4AF37]/30"
              >
                <Bell className="h-6 w-6 text-[#0F172A]" />
              </motion.div>
              
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-4 bottom-32 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                <Star className="h-5 w-5 text-[#D4AF37]" fill="#D4AF37" />
              </motion.div>

              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-12 top-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
              >
                <Shield className="h-7 w-7 text-white" />
              </motion.div>

              {/* Main phone mockup */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <div className="relative h-[580px] w-[280px] overflow-hidden rounded-[3rem] border-[6px] border-[#1E293B] bg-[#0F172A] shadow-2xl shadow-gray-900/30">
                  {/* Phone notch */}
                  <div className="absolute left-1/2 top-0 z-20 h-7 w-32 -translate-x-1/2 rounded-b-2xl bg-[#1E293B]" />
                  
                  <div className="h-full w-full bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-4 pt-10">
                    {/* Status bar */}
                    <div className="mb-4 flex items-center justify-between px-2 text-xs text-white/70">
                      <span className="font-medium">9:41</span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          <div className="h-2 w-1 rounded-sm bg-white/70" />
                          <div className="h-2.5 w-1 rounded-sm bg-white/70" />
                          <div className="h-3 w-1 rounded-sm bg-white/70" />
                          <div className="h-3.5 w-1 rounded-sm bg-white/50" />
                        </div>
                        <div className="h-3 w-5 rounded-sm border border-white/50">
                          <div className="m-0.5 h-2 w-3 rounded-sm bg-[#D4AF37]" />
                        </div>
                      </div>
                    </div>

                    {/* App content */}
                    <div className="mb-4">
                      <h3 className="mb-1 text-base font-bold text-white">{t('bookingDetails')}</h3>
                      <p className="text-xs text-gray-400">{t('confirmedAppointment')}</p>
                    </div>

                    {/* Booking card */}
                    <div className="mb-4 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#F4CF67] p-4 shadow-lg shadow-[#D4AF37]/20">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl bg-[#0F172A]/20">
                          <Image
                            src="/images/barber-profile.jpg"
                            alt="Barber"
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A]">Mohammed A.</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-[#0F172A]" fill="#0F172A" />
                            <span className="text-xs text-[#0F172A]/80">4.9 (312)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Friday, Feb 14, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>2:30 PM</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Fes Medina, Morocco</span>
                        </div>
                      </div>
                    </div>

                    {/* Services */}
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                        <span className="text-xs text-gray-300">{t('classicHaircut')}</span>
                        <span className="text-xs font-semibold text-[#D4AF37]">50 DH</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                        <span className="text-xs text-gray-300">{t('beardTrim')}</span>
                        <span className="text-xs font-semibold text-[#D4AF37]">30 DH</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="mb-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-sm font-semibold text-white">{t('total')}</span>
                      <span className="text-lg font-bold text-[#D4AF37]">80 DH</span>
                    </div>

                    {/* Action button */}
                    <button className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] py-3 text-sm font-bold text-[#0F172A] shadow-lg shadow-[#D4AF37]/20">
                      {t('navigate')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right side - Content & Download */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center lg:text-left"
          >
            {/* Stats */}
            <div className="mb-10 grid grid-cols-3 gap-4">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#D4AF37]/50 hover:shadow-md"
                >
                  <stat.icon className="mx-auto mb-2 h-6 w-6 text-[#D4AF37] lg:mx-0" />
                  <div className="text-2xl font-bold text-[#0F172A]">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Download buttons - Redesigned */}
            <div className="mb-8 space-y-4">
              <p className="text-sm font-medium text-gray-500">Available on iOS & Android</p>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                {/* App Store Button */}
                <a
                  href="#"
                  className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-[#0F172A] px-6 py-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-gray-900/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  </div>
                  <div className="relative flex-1">
                    <div className="text-xs font-medium text-gray-400">{t('downloadOnThe')}</div>
                    <div className="text-xl font-bold text-white">{t('appStore')}</div>
                  </div>
                  <ChevronRight className="relative h-5 w-5 text-white/50 transition-transform group-hover:translate-x-1" />
                </a>

                {/* Google Play Button */}
                <a
                  href="#"
                  className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border-2 border-[#D4AF37] bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] px-6 py-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#D4AF37]/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F4CF67] to-[#D4AF37] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F172A]/10">
                    <svg className="h-7 w-7 text-[#0F172A]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                    </svg>
                  </div>
                  <div className="relative flex-1">
                    <div className="text-xs font-medium text-[#0F172A]/60">{t('getItOn')}</div>
                    <div className="text-xl font-bold text-[#0F172A]">{t('googlePlay')}</div>
                  </div>
                  <ChevronRight className="relative h-5 w-5 text-[#0F172A]/50 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Trust badge */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:justify-start"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-[#D4AF37] to-[#F4CF67] shadow-sm"
                  />
                ))}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-bold text-[#0F172A]">50,000+</span> happy users worldwide
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
