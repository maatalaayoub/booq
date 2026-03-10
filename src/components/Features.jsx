'use client';

import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  GraduationCap, 
  ShoppingBag, 
  Briefcase, 
  Users
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Features() {
  const { t } = useLanguage();
  
  const features = [
    {
      icon: Calendar,
      title: t('barberSalonBooking'),
      description: t('barberSalonBookingDesc'),
    },
    {
      icon: MapPin,
      title: t('mobileBarberBooking'),
      description: t('mobileBarberBookingDesc'),
    },
    {
      icon: GraduationCap,
      title: t('learnBarberingSec'),
      description: t('learnBarberingDesc'),
    },
    {
      icon: ShoppingBag,
      title: t('shopSuppliesSec'),
      description: t('shopSuppliesDesc'),
    },
    {
      icon: Briefcase,
      title: t('careerOpportunitiesSec'),
      description: t('careerOpportunitiesDesc'),
    },
    {
      icon: Users,
      title: t('barberCommunity'),
      description: t('barberCommunityDesc'),
    }
  ];
  
  return (
    <section id="features" className="relative bg-white py-20 lg:py-28">
      {/* Top Separator Line */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-center">
        <div className="flex w-full max-w-7xl items-center px-6 sm:px-8 lg:px-8">
          <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300" />
          <div className="mx-4 h-3 w-3 rotate-45 bg-[#D4AF37]" />
          <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300" />
        </div>
      </div>
      
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-8">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <span className="text-sm font-bold uppercase tracking-widest text-[#D4AF37]">
              {t('ourFeatures')}
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>
          <h2 className="text-3xl font-bold text-[#0F172A] sm:text-4xl lg:text-5xl">
            {t('everythingYouNeed')}
          </h2>
        </motion.div>

        {/* Features Grid */}
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group text-center"
            >
              {/* Icon Circle */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37]/10 transition-all duration-300 group-hover:bg-[#D4AF37]/20 group-hover:scale-110">
                <feature.icon className="h-7 w-7 text-[#D4AF37]" strokeWidth={1.5} />
              </div>
              
              {/* Title */}
              <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">
                {feature.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
