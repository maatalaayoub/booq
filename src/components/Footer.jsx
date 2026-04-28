'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { 
  Facebook, 
  Instagram, 
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams } from 'next/navigation';

// Custom X (Twitter) icon
const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: XIcon, href: '#', label: 'X' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' }
];

export default function Footer() {
  const { t } = useLanguage();
  const params = useParams();
  const locale = params?.locale || 'en';
  
  const quickLinks = [
    { name: t('features'), href: '#features' },
    { name: t('howItWorks'), href: '#how-it-works' },
    { name: t('helpCenter'), href: '#' },
    { name: t('contactUs'), href: `/${locale}/contact` },
  ];

  const legalLinks = [
    { name: t('privacyPolicy'), href: '#' },
    { name: t('termsOfService'), href: '#' },
  ];
  
  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-[#0a0f1a] hidden md:block">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Footer Content */}
      <div className="relative mx-auto max-w-7xl px-4 pt-8 pb-8 sm:px-6 lg:px-8">
        
        {/* Top Section - Logo */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pb-4"
        >
          {/* Logo */}
          <div className="flex items-center">
            <Image 
              src="/images/booka(white).png" 
              alt="Booka.ma" 
              width={180} 
              height={45}
              className="h-8 md:h-10 w-auto"
            />
          </div>
        </motion.div>

        {/* Middle Section - Links & Contact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10 py-6"
        >
          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-5 flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
              {t('quickLinks') || 'Quick Links'}
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link, idx) => (
                <li key={idx}>
                  <a 
                    href={link.href}
                    className="group flex items-center gap-2 text-gray-400 text-sm transition-colors hover:text-amber-400"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-5 flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
              {t('contactUs') || 'Contact Us'}
            </h4>
            <div className="space-y-4">
              <a href="mailto:hello@booka.ma" className="flex items-center gap-3 text-gray-400 text-sm transition-colors hover:text-amber-400">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                hello@booka.ma
              </a>
              <a href="tel:+212600000000" className="flex items-center gap-3 text-gray-400 text-sm transition-colors hover:text-amber-400">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Phone className="h-4 w-4" />
                </div>
                +212 6 00 00 00 00
              </a>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </div>
                Fes, Morocco
              </div>
            </div>
          </div>

          {/* Social & Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-5 flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
              {t('followUs') || 'Follow Us'}
            </h4>
            <div className="flex gap-2">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition-all hover:bg-gradient-to-br hover:from-amber-400 hover:to-amber-600 hover:text-white hover:scale-110"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom Section - Copyright */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="pt-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Booka.ma. {t('allRightsReserved')}
            </p>
            
            <div className="flex items-center gap-6">
              {legalLinks.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.href}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
