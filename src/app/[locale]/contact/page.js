'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Mail, Phone, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const { t, locale, isRTL } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStatus({ type: 'success', message: t('contact.success') });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ type: 'error', message: t('contact.error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-gray-900 to-[#0a0f1a] h-96">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        {/* Header / Back */}
        <div className="mb-12">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {t('auth.backToHome') || 'Back to Home'}
          </Link>
          <div className="mt-8 text-center md:text-start">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start z-10 relative mb-20 sm:mb-0">
          {/* Main Form */}
          <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="p-6 sm:p-10">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {t('contact.formTitle')}
              </h2>
              
              {status.message && (
                <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center ${
                  status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {status.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('contact.name')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#244C70] focus:ring-1 focus:ring-[#244C70] transition-colors outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('contact.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#244C70] focus:ring-1 focus:ring-[#244C70] transition-colors outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('contact.subject')}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#244C70] focus:ring-1 focus:ring-[#244C70] transition-colors outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#244C70] focus:ring-1 focus:ring-[#244C70] transition-colors outline-none resize-y"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-[#244C70] hover:bg-[#1f4262] text-white text-[15px] font-bold active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span>{isSubmitting ? t('contact.sending') : t('contact.send')}</span>
                    <Send className={`w-4 h-4 ${isRTL ? '-scale-x-100' : ''} ${isSubmitting ? 'animate-bounce' : ''}`} strokeWidth={2.5} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 sm:p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{t('contact.getInTouch')}</h3>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <MapPin className="w-5 h-5 text-[#244C70]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">{t('contact.office')}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      123 Business Avenue<br />
                      Suite 400<br />
                      Casablanca, Morocco 20000
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Mail className="w-5 h-5 text-[#244C70]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">{t('contact.emailUs')}</h4>
                    <a href="mailto:support@booka.ma" className="text-sm text-gray-600 font-medium hover:text-[#244C70] transition-colors">
                      support@booka.ma
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Phone className="w-5 h-5 text-[#244C70]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">{t('contact.callUs')}</h4>
                    <a href="tel:+212500000000" className="text-sm text-gray-600 font-medium hover:text-[#244C70] transition-colors" dir="ltr">
                      +212 500 000 000
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}