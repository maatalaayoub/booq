'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, User, Calendar, ChevronDown, Settings, AtSign, AlertCircle, MapPin, Search, Phone } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useLanguage } from '@/contexts/LanguageContext';

const genderOptions = [
  { value: 'male', labelEn: 'Male', labelAr: 'ذكر', labelFr: 'Homme' },
  { value: 'female', labelEn: 'Female', labelAr: 'أنثى', labelFr: 'Femme' },
  { value: 'prefer_not_to_say', labelEn: 'Prefer not to say', labelAr: 'أفضل عدم الإفصاح', labelFr: 'Je préfère ne pas dire' },
];

const moroccoCities = [
  'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger', 'Meknès', 'Agadir',
  'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Temara', 'Safi', 'Mohammédia',
  'Khouribga', 'El Jadida', 'Béni Mellal', 'Nador', 'Taza', 'Settat',
  'Berrechid', 'Khémisset', 'Inezgane', 'Larache', 'Guelmim', 'Ksar El Kebir',
  'Taourirt', 'Berkane', 'Sidi Kacem', 'Sidi Slimane', 'Errachidia',
  'Guercif', 'Ouarzazate', 'Fquih Ben Salah', 'Tiznit', 'Tan-Tan',
  'Sefrou', 'Ifrane', 'Azrou', 'Essaouira', 'Taroudant', 'Oulad Teima',
  'Youssoufia', 'Midelt', 'Chefchaouen', 'Al Hoceïma', 'Ben Guerir',
  'Asilah', 'Azemmour', 'Skhirat', 'Bir Jdid', 'Ouazzane',
  'Tinghir', 'Zagora', 'Dakhla', 'Laâyoune', 'Boujdour', 'Smara',
  'Es-Semara', 'Assa', 'Tata', 'Bouarfa', 'Fnideq', 'Martil',
  'M\'diq', 'Imzouren', 'Driouch', 'Jerada', 'Ain Taoujdate',
  'Moulay Idriss Zerhoun', 'Missour', 'Azilal', 'Demnate', 'Kasba Tadla',
  'Souk El Arbaa', 'Mechra Bel Ksiri', 'Sidi Bennour', 'Ait Melloul',
  'Biougra', 'Chichaoua', 'El Kelaa des Sraghna', 'Ben Slimane',
  'Bouznika', 'Tifelt', 'Sidi Yahia El Gharb', 'Aïn Harrouda',
  'Oued Zem', 'Bejaad'
];

const translations = {
  en: {
    title: 'Edit Profile',
    firstName: 'First Name',
    lastName: 'Last Name',
    username: 'Username',
    birthday: 'Birthday',
    gender: 'Gender',
    selectGender: 'Select gender',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    error: 'Failed to update profile. Please try again.',
    success: 'Profile updated successfully!',
    accountSettings: 'Account Settings',
    firstNameHint: 'Enter your first name',
    lastNameHint: 'Enter your last name',
    usernameHint: 'e.g. john_doe',
    birthdayHint: 'Your date of birth',
    usernameAvailable: 'Username is available',
    usernameTaken: 'Username is already taken',
    usernameInvalid: '3–20 characters: letters, numbers, or underscores only',
    usernameChecking: 'Checking availability...',
    usernameSelf: 'This is your current username',
    phone: 'Phone Number',
    phoneHint: 'e.g. +212 6XX XXXXXX',
    city: 'City',
    selectCity: 'Select a city',
    searchCity: 'Search city...',
    noResults: 'No city found',
  },
  ar: {
    title: 'تعديل الملف الشخصي',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    username: 'اسم المستخدم',
    birthday: 'تاريخ الميلاد',
    gender: 'الجنس',
    selectGender: 'اختر الجنس',
    save: 'حفظ',
    cancel: 'إلغاء',
    saving: 'جاري الحفظ...',
    error: 'فشل تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.',
    success: 'تم تحديث الملف الشخصي بنجاح!',
    accountSettings: 'إعدادات الحساب',
    firstNameHint: 'أدخل اسمك الأول',
    lastNameHint: 'أدخل اسم عائلتك',
    usernameHint: 'مثال: john_doe',
    birthdayHint: 'تاريخ ميلادك',
    usernameAvailable: 'اسم المستخدم متاح',
    usernameTaken: 'اسم المستخدم مأخوذ بالفعل',
    usernameInvalid: '3–20 حرفًا: حروف وأرقام وشرطات سفلية فقط',
    usernameChecking: 'جاري التحقق من التوفر...',
    usernameSelf: 'هذا هو اسم مستخدمك الحالي',
    phone: 'رقم الهاتف',
    phoneHint: 'مثال: +212 6XX XXXXXX',
    city: 'المدينة',
    selectCity: 'اختر المدينة',
    searchCity: 'ابحث عن مدينة...',
    noResults: 'لم يتم العثور على مدينة',
  },
  fr: {
    title: 'Modifier le profil',
    firstName: 'Prénom',
    lastName: 'Nom',
    username: "Nom d'utilisateur",
    birthday: 'Date de naissance',
    gender: 'Genre',
    selectGender: 'Sélectionner',
    save: 'Enregistrer',
    cancel: 'Annuler',
    saving: 'Enregistrement...',
    error: 'Échec de la mise à jour du profil. Veuillez réessayer.',
    success: 'Profil mis à jour avec succès!',
    accountSettings: 'Paramètres du compte',
    firstNameHint: 'Entrez votre prénom',
    lastNameHint: 'Entrez votre nom de famille',
    usernameHint: 'ex: john_doe',
    birthdayHint: 'Votre date de naissance',
    usernameAvailable: "Nom d'utilisateur disponible",
    usernameTaken: "Ce nom d'utilisateur est déjà pris",
    usernameInvalid: '3–20 caractères : lettres, chiffres ou underscores uniquement',
    usernameChecking: 'Vérification de la disponibilité...',
    usernameSelf: "C'est votre nom d'utilisateur actuel",
    phone: 'Numéro de téléphone',
    phoneHint: 'ex. +212 6XX XXXXXX',
    city: 'Ville',
    selectCity: 'Sélectionner une ville',
    searchCity: 'Rechercher une ville...',
    noResults: 'Aucune ville trouvée',
  },
};

export default function EditProfileDialog({ isOpen, onClose, initialProfile = null }) {
  const { user } = useAuthUser();
  const { openUserProfile } = useClerk();
  const { isRTL, locale: language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // username availability state
  const [usernameStatus, setUsernameStatus] = useState(null); // null|'checking'|'available'|'taken'|'invalid'|'self'
  const debounceRef = useRef(null);

  // city dropdown state
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const cityRef = useRef(null);
  const citySearchRef = useRef(null);

  // gender dropdown state
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const genderRef = useRef(null);

  const labels = translations[language] || translations.en;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    birthday: '',
    gender: '',
    city: '',
  });

  // Fetch profile data from database when dialog opens
  useEffect(() => {
    if (!isOpen || !user) return;

    setError('');
    setUsernameStatus(null);

    // If parent already provides profile data, use it directly
    if (initialProfile) {
      setFormData({
        firstName: initialProfile.firstName || user.firstName || '',
        lastName: initialProfile.lastName || user.lastName || '',
        username: initialProfile.username || '',
        phone: initialProfile.phone || '',
        birthday: initialProfile.birthday || '',
        gender: initialProfile.gender || '',
        city: initialProfile.city || '',
      });
      return;
    }

    const fetchProfileData = async () => {
      setIsFetching(true);

      try {
        const response = await fetch('/api/user-profile');
        if (response.ok) {
          const data = await response.json();
          setFormData({
            firstName: data.firstName || user.firstName || '',
            lastName: data.lastName || user.lastName || '',
            username: data.username || '',
            phone: data.phone || '',
            birthday: data.birthday || '',
            gender: data.gender || '',
            city: data.city || '',
          });
        } else {
          setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            username: '',
            phone: '',
            birthday: '',
            gender: '',
            city: '',
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          username: '',
          phone: '',
          birthday: '',
          gender: '',
          city: '',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfileData();
  }, [isOpen, user]);

  const checkUsername = useCallback(async (value) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) { setUsernameStatus(null); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    try {
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(trimmed)}`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) { setUsernameStatus(null); return; }
      const data = await res.json();
      if (data.self) setUsernameStatus('self');
      else if (data.available) setUsernameStatus('available');
      else setUsernameStatus('taken');
    } catch { setUsernameStatus(null); }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'username') {
      setUsernameStatus(null);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => checkUsername(value), 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return;
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Update Clerk user (first name, last name)
      await user.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // Update database (all fields including birthday and gender)
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username || undefined,
          phone: formData.phone || null,
          birthday: formData.birthday || null,
          gender: formData.gender || null,
          city: formData.city || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile in database');
      }

      // Close dialog first, then show toast after dialog exit animation
      onClose();
      setTimeout(() => {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }, 350);
    } catch (err) {
      console.error('Error updating profile:', err);
      // Close dialog first, then show error toast
      onClose();
      setTimeout(() => {
        setError(err.message || labels.error);
        setTimeout(() => setError(''), 4000);
      }, 350);
    } finally {
      setIsLoading(false);
    }
  };

  // Close city & gender dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setIsCityOpen(false);
      }
      if (genderRef.current && !genderRef.current.contains(event.target)) {
        setIsGenderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when city dropdown opens
  useEffect(() => {
    if (isCityOpen && citySearchRef.current) {
      setTimeout(() => citySearchRef.current?.focus(), 100);
    }
    if (!isCityOpen) setCitySearch('');
  }, [isCityOpen]);

  const filteredCities = moroccoCities.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  const getGenderLabel = (option) => {
    if (language === 'ar') return option.labelAr;
    if (language === 'fr') return option.labelFr;
    return option.labelEn;
  };

  const inputBorderForUsername = () => {
    if (usernameStatus === 'available' || usernameStatus === 'self') return 'border-green-400 ring-1 ring-green-400';
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return 'border-red-400 ring-1 ring-red-400';
    return 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]';
  };

  const renderUsernameFeedback = () => {
    if (!usernameStatus) return null;
    const configs = {
      checking: { color: 'text-gray-400', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: labels.usernameChecking },
      available: { color: 'text-green-600', icon: <Check className="h-3.5 w-3.5" />, text: labels.usernameAvailable },
      self: { color: 'text-blue-500', icon: <Check className="h-3.5 w-3.5" />, text: labels.usernameSelf },
      taken: { color: 'text-red-500', icon: <AlertCircle className="h-3.5 w-3.5" />, text: labels.usernameTaken },
      invalid: { color: 'text-orange-500', icon: <AlertCircle className="h-3.5 w-3.5" />, text: labels.usernameInvalid },
    };
    const cfg = configs[usernameStatus];
    return (
      <p className={`flex items-center gap-1 mt-1.5 text-xs ${cfg.color} ${isRTL ? 'flex-row-reverse' : ''}`}>
        {cfg.icon}{cfg.text}
      </p>
    );
  };

  const dialog = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          >
            <div 
              className="w-full sm:max-w-md bg-white rounded-t-[3px] sm:rounded-[3px] shadow-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col sm:mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{labels.title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[5px] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form id="edit-profile-form" onSubmit={handleSubmit} className="p-5 pb-6 sm:p-6 sm:pb-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {isFetching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
                  </div>
                ) : (
                <div className="space-y-4 sm:space-y-5">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      {labels.firstName}
                    </label>
                    <div className="relative">
                      <User className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder={labels.firstNameHint}
                        className={`w-full py-2.5 sm:py-3 border border-gray-200 rounded-[5px] text-gray-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-colors text-base placeholder:text-gray-400 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      {labels.lastName}
                    </label>
                    <div className="relative">
                      <User className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder={labels.lastNameHint}
                        className={`w-full py-2.5 sm:py-3 border border-gray-200 rounded-[5px] text-gray-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-colors text-base placeholder:text-gray-400 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      {labels.username}
                    </label>
                    <div className="relative">
                      <AtSign className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder={labels.usernameHint}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className={`w-full py-2.5 sm:py-3 border rounded-[5px] text-gray-900 outline-none transition-colors text-base placeholder:text-gray-400 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} ${inputBorderForUsername()}`}
                      />
                    </div>
                    {renderUsernameFeedback()}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      {labels.phone}
                    </label>
                    <div className="relative">
                      <Phone className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder={labels.phoneHint}
                        maxLength={30}
                        className={`w-full py-2.5 sm:py-3 border border-gray-200 rounded-[5px] text-gray-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-colors text-base placeholder:text-gray-400 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                      />
                    </div>
                  </div>

                  {/* Birthday */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      {labels.birthday}
                    </label>
                    <div className="relative">
                      <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                      <input
                        type="date"
                        name="birthday"
                        value={formData.birthday}
                        onChange={handleChange}
                        placeholder={labels.birthdayHint}
                        className={`w-full py-2.5 sm:py-3 border border-gray-200 rounded-[5px] text-gray-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-colors text-base ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div ref={cityRef} className={`relative transition-all ${isCityOpen ? 'pb-64' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      {labels.city}
                    </label>
                    <div className="relative">
                      <MapPin className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                      <ChevronDown className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10 transition-transform ${isCityOpen ? 'rotate-180' : ''} ${isRTL ? 'left-3.5' : 'right-3.5'}`} />
                      <button
                        type="button"
                        onClick={() => setIsCityOpen(!isCityOpen)}
                        className={`w-full flex items-center py-2.5 sm:py-3 border border-gray-200 rounded-[5px] text-base focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-colors bg-white cursor-pointer ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                      >
                        <span className={formData.city ? 'text-gray-900' : 'text-gray-400'}>
                          {formData.city || labels.selectCity}
                        </span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {isCityOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-[5px] shadow-lg overflow-hidden"
                        >
                          {/* Search */}
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                              <input
                                ref={citySearchRef}
                                type="text"
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                placeholder={labels.searchCity}
                                className={`w-full py-2 border border-gray-200 rounded-[5px] text-sm text-gray-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none placeholder:text-gray-400 ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                              />
                            </div>
                          </div>
                          {/* City list */}
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCities.length > 0 ? (
                              filteredCities.map((city) => (
                                <button
                                  key={city}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, city }));
                                    setIsCityOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${isRTL ? 'text-right' : 'text-left'} ${
                                    formData.city === city ? 'text-[#D4AF37] bg-[#D4AF37]/5 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  {formData.city === city && <Check className="h-4 w-4 text-[#D4AF37] shrink-0" />}
                                  <span>{city}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-400 text-center">{labels.noResults}</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Gender */}
                  <div ref={genderRef} className={`relative transition-all ${isGenderOpen ? 'pb-44' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      {labels.gender}
                    </label>
                    <div className="relative">
                      <User className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                      <ChevronDown className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10 transition-transform ${isGenderOpen ? 'rotate-180' : ''} ${isRTL ? 'left-3.5' : 'right-3.5'}`} />
                      <button
                        type="button"
                        onClick={() => setIsGenderOpen(!isGenderOpen)}
                        className={`w-full flex items-center py-2.5 sm:py-3 border border-gray-200 rounded-[5px] text-base focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-colors bg-white cursor-pointer ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                      >
                        <span className={formData.gender ? 'text-gray-900' : 'text-gray-400'}>
                          {formData.gender ? getGenderLabel(genderOptions.find(o => o.value === formData.gender)) : labels.selectGender}
                        </span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {isGenderOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-[5px] shadow-lg overflow-hidden"
                        >
                          {genderOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, gender: option.value }));
                                setIsGenderOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'} ${
                                formData.gender === option.value ? 'text-[#D4AF37] bg-[#D4AF37]/5 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {formData.gender === option.value && <Check className="h-4 w-4 text-[#D4AF37] shrink-0" />}
                              <span>{getGenderLabel(option)}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                )}
              </form>

              {/* Fixed bottom buttons */}
              <div className={`shrink-0 flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 bg-white rounded-b-[3px] ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-[90px] font-medium transition-all"
                  >
                    {labels.cancel}
                  </button>
                  <button
                    type="submit"
                    form="edit-profile-form"
                    disabled={isLoading || isFetching || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
                    className="px-3 sm:px-6 py-2.5 bg-green-500 sm:bg-white border border-green-500 sm:border-gray-300 text-white sm:text-gray-700 rounded-[90px] font-medium transition-all sm:hover:bg-green-500 sm:hover:text-white sm:hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{labels.saving}</span>
                      </>
                    ) : (
                      labels.save
                    )}
                  </button>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Toast notification portal
  const toast = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {(success || error) && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90vw] pointer-events-auto"
        >
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-sm ${
            success 
              ? 'bg-white border-green-200 text-green-700' 
              : 'bg-white border-red-200 text-red-700'
          }`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
              success ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {success ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
            </div>
            <p className="text-sm font-medium flex-1">
              {success ? labels.success : error}
            </p>
            <button 
              onClick={() => { setSuccess(false); setError(''); }}
              className="shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      {dialog}
      {toast}
    </>
  );
}
