'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useLanguage } from '@/contexts/LanguageContext';
import { sanitizeInput as sanitizeText, sanitizePhone } from '@/lib/sanitize';

import { 
  Store, 
  MapPin, 
  Search, 
  Award, 
  Clock, 
  Scissors, 
  Sparkles, 
  Palette, 
  UserCircle,
  Star,
  TrendingUp,
  Trophy,
  Crown,
  GraduationCap,
  Check,
  ChevronRight,
  ChevronDown,
  Brush,
  Hand,
  Building2,
  Phone,
  MapPinned,
  Heart,
  Loader2,
  CalendarCheck,
  Users,
  ArrowLeftRight,
  UtensilsCrossed,
  Car,
  CarFront,
  HardHat,
  Stethoscope,
  SmilePlus,
  HeartPulse,
  Eye,
  Brain,
  Pill,
  Activity,
  ShieldPlus,
  Baby,
  Ribbon,
  Cross,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-gray-100 rounded-[5px] flex items-center justify-center">
      <p className="text-gray-400 text-sm" id="map-loading-placeholder"></p>
    </div>
  ),
});

const DAYS_OF_WEEK = [
  { id: 0, nameKey: 'onboarding.day.sunday' },
  { id: 1, nameKey: 'onboarding.day.monday' },
  { id: 2, nameKey: 'onboarding.day.tuesday' },
  { id: 3, nameKey: 'onboarding.day.wednesday' },
  { id: 4, nameKey: 'onboarding.day.thursday' },
  { id: 5, nameKey: 'onboarding.day.friday' },
  { id: 6, nameKey: 'onboarding.day.saturday' },
];

const MOROCCO_CITIES = [
  'Casablanca', 'Rabat', 'Fes', 'Marrakech', 'Tanger', 'Meknes', 'Agadir',
  'Oujda', 'Kenitra', 'Tetouan', 'Sale', 'Temara', 'Safi', 'Mohammedia',
  'Khouribga', 'El Jadida', 'Beni Mellal', 'Nador', 'Taza', 'Settat',
  'Berrechid', 'Khemisset', 'Inezgane', 'Larache', 'Guelmim', 'Ksar El Kebir',
  'Taourirt', 'Berkane', 'Sidi Kacem', 'Sidi Slimane', 'Errachidia',
  'Guercif', 'Ouarzazate', 'Fquih Ben Salah', 'Tiznit', 'Tan-Tan',
  'Sefrou', 'Ifrane', 'Azrou', 'Essaouira', 'Taroudant', 'Oulad Teima',
  'Youssoufia', 'Midelt', 'Chefchaouen', 'Al Hoceima', 'Ben Guerir',
  'Asilah', 'Azemmour', 'Skhirat', 'Bir Jdid', 'Ouazzane',
  'Tinghir', 'Zagora', 'Dakhla', 'Laayoune', 'Boujdour', 'Smara',
  'Es-Semara', 'Assa', 'Tata', 'Bouarfa', 'Fnideq', 'Martil',
  'M\'diq', 'Imzouren', 'Driouch', 'Jerada', 'Ain Taoujdate',
  'Moulay Idriss Zerhoun', 'Missour', 'Azilal', 'Demnate', 'Kasba Tadla',
  'Souk El Arbaa', 'Mechra Bel Ksiri', 'Sidi Bennour', 'Ait Melloul',
  'Biougra', 'Chichaoua', 'El Kelaa des Sraghna', 'Ben Slimane',
  'Bouznika', 'Tifelt', 'Sidi Yahia El Gharb', 'Ain Harrouda',
  'Oued Zem', 'Bejaad'
];

const BUSINESS_CATEGORIES = [
  { 
    id: 'business_owner', 
    nameKey: 'onboarding.cat.businessOwner', 
    descKey: 'onboarding.cat.businessOwnerDesc',
    icon: Store,
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    borderActive: 'border-violet-500'
  },
  { 
    id: 'mobile_service', 
    nameKey: 'onboarding.cat.mobileService', 
    descKey: 'onboarding.cat.mobileServiceDesc',
    icon: MapPin,
    gradient: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
    borderActive: 'border-blue-500'
  },
  { 
    id: 'job_seeker', 
    nameKey: 'onboarding.cat.jobSeeker', 
    descKey: 'onboarding.cat.jobSeekerDesc',
    icon: Search,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    borderActive: 'border-emerald-500'
  },
];

const SERVICE_CATEGORY_ICONS = {
  Sparkles,
  Heart,
  Star,
  Scissors,
  Trophy,
  UtensilsCrossed,
  Car,
  CarFront,
  HardHat,
};

const SPECIALTY_ICONS = {
  Stethoscope,
  SmilePlus,
  HeartPulse,
  Eye,
  Brain,
  Pill,
  Activity,
  ShieldPlus,
  Baby,
  Ribbon,
  Cross,
  Heart,
  Scissors,
  Sparkles,
  Palette,
  Hand,
};

const PROFESSIONAL_TYPES = [
  { id: 'barber', nameKey: 'dbSpec.barber', descKey: 'dbSpec.barber.desc', icon: null, customIcon: '/images/icons-barber.png', color: 'text-slate-700', bg: 'bg-slate-100' },
  { id: 'hairdresser', nameKey: 'dbSpec.hairdresser', descKey: 'dbSpec.hairdresser.desc', icon: null, customIcon: '/images/icons-hairdresser.png', color: 'text-pink-600', bg: 'bg-pink-100' },
  { id: 'makeup', nameKey: 'dbSpec.makeup', descKey: 'dbSpec.makeup.desc', icon: null, customIcon: '/images/icon-makeup.png', color: 'text-rose-600', bg: 'bg-rose-100' },
  { id: 'nails', nameKey: 'dbSpec.nails', descKey: 'dbSpec.nails.desc', icon: null, customIcon: '/images/icon-nails.png', color: 'text-purple-600', bg: 'bg-purple-100' },
  { id: 'massage', nameKey: 'dbSpec.massage', descKey: 'dbSpec.massage.desc', icon: null, customIcon: '/images/icon-massage.png', color: 'text-teal-600', bg: 'bg-teal-100' },
];

const YEARS_OF_EXPERIENCE = [
  { id: 'less_than_1', nameKey: 'onboarding.exp.lessThan1', descKey: 'onboarding.exp.lessThan1Desc', icon: Star, color: 'text-gray-500', bg: 'bg-gray-100' },
  { id: '1_to_3', nameKey: 'onboarding.exp.1to3', descKey: 'onboarding.exp.1to3Desc', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: '3_to_5', nameKey: 'onboarding.exp.3to5', descKey: 'onboarding.exp.3to5Desc', icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { id: '5_to_10', nameKey: 'onboarding.exp.5to10', descKey: 'onboarding.exp.5to10Desc', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 'more_than_10', nameKey: 'onboarding.exp.moreThan10', descKey: 'onboarding.exp.moreThan10Desc', icon: Crown, color: 'text-violet-500', bg: 'bg-violet-100' },
];

const WORK_LOCATIONS = [
  { 
    id: 'my_place', 
    nameKey: 'onboarding.workLocation.myPlace', 
    descKey: 'onboarding.workLocation.myPlaceDesc' 
  },
  { 
    id: 'client_location', 
    nameKey: 'onboarding.workLocation.clientLocation', 
    descKey: 'onboarding.workLocation.clientLocationDesc' 
  },
  { 
    id: 'both', 
    nameKey: 'onboarding.workLocation.both', 
    descKey: 'onboarding.workLocation.bothDesc' 
  },
];

const SERVICE_MODES = [
  {
    id: 'booking',
    nameKey: 'onboarding.mode.booking',
    descKey: 'onboarding.mode.bookingDesc',
    icon: CalendarCheck,
    gradient: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
  },
  {
    id: 'walkin',
    nameKey: 'onboarding.mode.walkin',
    descKey: 'onboarding.mode.walkinDesc',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
  },
  {
    id: 'both',
    nameKey: 'onboarding.mode.both',
    descKey: 'onboarding.mode.bothDesc',
    icon: ArrowLeftRight,
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
  },
];

const DEFAULT_HOURS = DAYS_OF_WEEK.map(day => ({
  dayOfWeek: day.id,
  isOpen: day.id >= 1 && day.id <= 5, // Monday to Friday open by default
  openTime: '10:00',
  closeTime: '19:00',
}));

export default function BusinessOnboarding({ userName, onComplete }) {
  const { user, getToken } = useAuthUser();
  const { t, isRTL } = useLanguage();
  
  // Helper to translate DB-sourced text with fallback to original value
  const tDb = (prefix, slug, field, fallback) => {
    const key = field ? `${prefix}.${slug}.${field}` : `${prefix}.${slug}`;
    const translated = t(key);
    return translated !== key ? translated : fallback;
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [userCreated, setUserCreated] = useState(false);
  
  // Form data
  const [businessCategory, setBusinessCategory] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceCategories, setServiceCategories] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [professionalType, setProfessionalType] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [businessHours, setBusinessHours] = useState(DEFAULT_HOURS);
  const [editingDay, setEditingDay] = useState(null);
  // Business details fields (business_owner & mobile_service)
  const [businessName, setBusinessName] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  // City dropdown state
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const cityRef = useRef(null);
  const citySearchRef = useRef(null);
  // Job seeker specific fields
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [hasCertificate, setHasCertificate] = useState(null);
  const [serviceMode, setServiceMode] = useState('');

  const displayName = userName || user?.firstName || 'there';

  // Close city dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setIsCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when city dropdown opens
  useEffect(() => {
    if (isCityOpen && citySearchRef.current) {
      setTimeout(() => citySearchRef.current?.focus(), 100);
    }
    if (!isCityOpen) setCitySearch('');
  }, [isCityOpen]);

  // Fetch service categories on mount
  useEffect(() => {
    setLoadingCategories(true);
    fetch('/api/business/specialty')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(data => setServiceCategories(data.categories || []))
      .catch(e => { console.error('Failed to load service categories:', e); setServiceCategories([]); })
      .finally(() => setLoadingCategories(false));
  }, []);

  // Fetch specialties when service category changes
  useEffect(() => {
    if (!serviceCategoryId) {
      setSpecialties([]);
      return;
    }
    setLoadingSpecialties(true);
    setProfessionalType(''); // Reset specialty when category changes
    fetch(`/api/business/specialty?category_id=${serviceCategoryId}`)
      .then(r => r.ok ? r.json() : { specialties: [] })
      .then(data => setSpecialties(data.specialties || []))
      .catch(e => { console.error('Failed to load specialties:', e); setSpecialties([]); })
      .finally(() => setLoadingSpecialties(false));
  }, [serviceCategoryId]);

  const filteredCities = MOROCCO_CITIES.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );
  
  // Create user in database immediately when component mounts
  // With retry mechanism for cases where auth session isn't immediately available
  const userCreatedRef = useRef(false);
  useEffect(() => {
    userCreatedRef.current = userCreated;
  }, [userCreated]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second
    let cancelled = false;
    let pendingTimeout = null;
    
    async function createUserImmediately() {
      if (cancelled || userCreatedRef.current) return;
      
      console.log('[BusinessOnboarding] Creating user in database (attempt', retryCount + 1, ')...');
      try {
        // Get auth session token to pass explicitly (fixes session sync issues after fresh signup)
        const token = await getToken();
        console.log('[BusinessOnboarding] Got auth token:', token ? 'yes' : 'NO TOKEN');
        
        const response = await fetch('/api/set-role', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ role: 'business' }),
        });
        
        if (cancelled) return;

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('[BusinessOnboarding] API returned non-JSON response, status:', response.status);
          if (retryCount < maxRetries) {
            retryCount++;
            pendingTimeout = setTimeout(createUserImmediately, retryDelay);
            return;
          }
          setSubmitError('Server returned unexpected response');
          return;
        }
        const data = await response.json();
        console.log('[BusinessOnboarding] User creation response (status ' + response.status + '):', JSON.stringify(data, null, 2));
        
        // Check for auth error (userId is null) - this means session not ready yet
        if (response.status === 401 && retryCount < maxRetries) {
          retryCount++;
          console.log('[BusinessOnboarding] Auth not ready, retrying in', retryDelay, 'ms...');
          pendingTimeout = setTimeout(createUserImmediately, retryDelay);
          return;
        }
        
        if (response.ok) {
          setUserCreated(true);
          setSubmitError(null);
          console.log('[BusinessOnboarding] User created successfully in database');
        } else if (data.error === 'Role already assigned. Role cannot be changed.') {
          setUserCreated(true);
          setSubmitError(null);
          console.log('[BusinessOnboarding] User already exists in database');
        } else {
          // Retry on unexpected/empty responses before giving up
          if ((!data.error) && retryCount < maxRetries) {
            retryCount++;
            console.log('[BusinessOnboarding] Unexpected response (status ' + response.status + '), retrying...', data);
            pendingTimeout = setTimeout(createUserImmediately, retryDelay);
            return;
          }
          console.error('[BusinessOnboarding] Failed to create user (status ' + response.status + '):', data);
          // Show ALL error details
          const errorParts = [];
          if (data.error) errorParts.push(data.error);
          if (data.details) errorParts.push(`Details: ${data.details}`);
          if (data.code) errorParts.push(`Code: ${data.code}`);
          if (data.hint) errorParts.push(`Hint: ${data.hint}`);
          setSubmitError(errorParts.join(' | ') || 'Unknown error creating user');
        }
      } catch (error) {
        console.error('[BusinessOnboarding] Network error creating user:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log('[BusinessOnboarding] Network error, retrying in', retryDelay, 'ms...');
          pendingTimeout = setTimeout(createUserImmediately, retryDelay);
          return;
        }
        setSubmitError(`Network error: ${error.message}`);
      }
    }
    
    // Initial delay to allow auth session to establish
    pendingTimeout = setTimeout(createUserImmediately, 500);
    
    return () => {
      cancelled = true;
      if (pendingTimeout) clearTimeout(pendingTimeout);
    };
  }, []);
  
  // Determine total steps and step content based on business category
  const getTotalSteps = () => {
    if (businessCategory === 'job_seeker') return 5;
    return 6; // business_owner and mobile_service now have 6 steps
  };
  const totalSteps = getTotalSteps();

  // Map logical steps to actual step content
  // For business_owner: 1=Category, 2=ServiceCategory, 3=ProfessionalType, 4=ServiceMode, 5=BusinessDetails, 6=BusinessHours
  // For mobile_service: 1=Category, 2=ServiceCategory, 3=ProfessionalType, 4=ServiceMode, 5=BusinessDetails, 6=BusinessHours
  // For job_seeker: 1=Category, 2=ServiceCategory, 3=ProfessionalType, 4=YearsOfExperience, 5=Certificate
  const getStepContent = () => {
    if (businessCategory === 'business_owner' || businessCategory === 'mobile_service') {
      return {
        1: 'category',
        2: 'service_category',
        3: 'professional_type',
        4: 'service_mode',
        5: 'business_details',
        6: 'business_hours'
      };
    }
    // job_seeker flow
    return {
      1: 'category',
      2: 'service_category',
      3: 'professional_type',
      4: 'years_of_experience',
      5: 'certificate'
    };
  };

  const currentStepContent = getStepContent()[currentStep];

  const canContinue = () => {
    switch (currentStepContent) {
      case 'category':
        return !!businessCategory;
      case 'service_category':
        return !!serviceCategoryId;
      case 'professional_type':
        return !!professionalType;
      case 'business_details':
        if (businessCategory === 'mobile_service') {
          return !!businessName.trim() && !!businessCity.trim() && !!businessPhone.trim();
        }
        return !!businessName.trim() && !!businessCity.trim() && !!businessPhone.trim() && !!businessAddress.trim();
      case 'years_of_experience':
        return !!yearsOfExperience;
      case 'certificate':
        return hasCertificate !== null;
      case 'business_hours':
        return businessHours.some(h => h.isOpen);
      case 'service_mode':
        return !!serviceMode;
      default:
        return false;
    }
  };

  const handleLocationSelect = async (lat, lng) => {
    setLocationLat(lat);
    setLocationLng(lng);
    // Only save coordinates, address is entered manually
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleDayOpen = (dayId) => {
    setBusinessHours(hours => 
      hours.map(h => 
        h.dayOfWeek === dayId ? { ...h, isOpen: !h.isOpen } : h
      )
    );
  };

  const updateDayHours = (dayId, field, value) => {
    setBusinessHours(hours => 
      hours.map(h => 
        h.dayOfWeek === dayId ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    // Client-side validation
    console.log('[BusinessOnboarding] Starting submit with:', { businessCategory, professionalType, yearsOfExperience, hasCertificate });
    
    if (!businessCategory) {
      setSubmitError('Please select a business category');
      setIsSubmitting(false);
      return;
    }
    
    if (!professionalType) {
      setSubmitError('Please select your professional type');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // User is already created on mount, so just save onboarding data
      console.log('[BusinessOnboarding] User already created, saving onboarding data...');
      
      // Get token for auth
      const token = await getToken();

      // Find the specialty ID from the specialties array
      const selectedSpecialty = specialties.find(s => s.slug === professionalType);
      const specialtyId = selectedSpecialty?.id || null;

      // Build request body based on business category
      const requestBody = {
        businessCategory,
        professionalType,
        serviceCategoryId: serviceCategoryId || null,
        specialtyId,
        completeOnboarding: true,
      };

      // Set work location and business hours based on category
      if (businessCategory === 'business_owner') {
        requestBody.workLocation = 'my_place';
        requestBody.businessHours = businessHours;
        requestBody.businessName = businessName;
        requestBody.city = businessCity;
        requestBody.phone = businessPhone;
        requestBody.address = businessAddress;
        requestBody.latitude = locationLat;
        requestBody.longitude = locationLng;
        requestBody.serviceMode = serviceMode;
      } else if (businessCategory === 'mobile_service') {
        requestBody.workLocation = 'client_location';
        requestBody.businessHours = businessHours;
        requestBody.businessName = businessName;
        requestBody.city = businessCity;
        requestBody.phone = businessPhone;
        requestBody.address = businessAddress;
        requestBody.latitude = locationLat;
        requestBody.longitude = locationLng;
        requestBody.serviceMode = serviceMode;
      } else if (businessCategory === 'job_seeker') {
        // Job seekers don't have work location or business hours
        requestBody.yearsOfExperience = yearsOfExperience;
        requestBody.hasCertificate = hasCertificate;
      }
      
      console.log('[BusinessOnboarding] Saving onboarding data:', requestBody);
      const response = await fetch('/api/business/onboarding', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[BusinessOnboarding] Response status:', response.status);
      const responseText = await response.text();
      console.log('[BusinessOnboarding] Response text (raw):', responseText);
      
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('[BusinessOnboarding] Failed to parse response:', e);
        responseData = { error: 'Invalid response', raw: responseText };
      }
      
      console.log('[BusinessOnboarding] Onboarding response:', JSON.stringify({ ok: response.ok, status: response.status, data: responseData }));
      
      if (response.ok) {
        // Mark onboarding as completed in users table
        try {
          await fetch('/api/complete-onboarding', { 
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          console.log('[BusinessOnboarding] Onboarding marked as completed');
        } catch (err) {
          console.error('[BusinessOnboarding] Failed to mark onboarding complete:', err);
        }
        
        // Dispatch event for layout to show sidebar
        window.dispatchEvent(new Event('onboarding-complete'));
        onComplete?.();
      } else {
        const errorMessage = responseData.error || responseData.details || JSON.stringify(responseData) || 'Failed to save onboarding data';
        console.error('[BusinessOnboarding] Failed to save onboarding data:', JSON.stringify(responseData));
        setSubmitError(errorMessage);
      }
    } catch (error) {
      console.error('Error saving onboarding:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8 sm:py-12 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
              // On small screens, only show previous, current, and next step
              const isVisible = Math.abs(step - currentStep) <= 1;
              // Show dots indicator when steps are hidden
              const showLeadingDots = step === currentStep - 1 && currentStep > 2;
              const showTrailingDots = step === currentStep + 1 && currentStep < totalSteps - 1;

              return (
                <div key={step} className={`flex items-center transition-all duration-500 ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0 w-0 overflow-hidden sm:opacity-100 sm:scale-100 sm:w-auto sm:overflow-visible'
                }`}>
                  {showLeadingDots && (
                    <div className="flex items-center gap-0.5 mr-2 sm:hidden">
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                    </div>
                  )}
                  <div 
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      step === currentStep 
                        ? 'bg-amber-400 text-white ring-4 ring-amber-100' 
                        : step < currentStep 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }`}
                  >
                    {step < currentStep ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step}
                  </div>
                  {step < totalSteps && (
                    <div className={`w-10 sm:w-14 h-0.5 transition-all duration-300 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    } ${!isVisible || (step + 1 > currentStep + 1 && step + 1 <= totalSteps) ? 'hidden sm:block' : ''}`} />
                  )}
                  {showTrailingDots && (
                    <div className="flex items-center gap-0.5 ml-2 sm:hidden">
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Step counter text for mobile */}
          <p className="text-center text-xs text-gray-400 mt-2 sm:hidden">
            {t('onboarding.stepOf').replace('{current}', currentStep).replace('{total}', totalSteps)}
          </p>
        </div>

        {/* Step: Business Category */}
        {currentStepContent === 'category' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.welcome').replace('{name}', displayName)}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('onboarding.whatDescribes')}
            </p>

            <div className="space-y-4">
              {BUSINESS_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                const isSelected = businessCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setBusinessCategory(category.id)}
                    className={`group w-full flex items-center gap-4 p-5 rounded-[5px] border transition-all duration-300 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${
                      isSelected 
                        ? 'border-amber-400 bg-white' 
                        : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-all duration-300">
                      <IconComponent className="w-7 h-7 text-gray-500 group-hover:text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-lg transition-colors ${
                        isSelected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                      }`}>{t(category.nameKey)}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t(category.descKey)}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-amber-400' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              disabled={!canContinue()}
              className={`w-full mt-6 sm:mt-8 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                canContinue() 
                  ? 'bg-amber-400 hover:bg-amber-500' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {t('onboarding.continue')}
            </button>
          </div>
        )}

        {/* Step: Service Category */}
        {currentStepContent === 'service_category' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.chooseServiceCategory')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('onboarding.selectCategoryFit')}
            </p>

            {loadingCategories ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {serviceCategories.map((cat) => {
                  const IconComponent = SERVICE_CATEGORY_ICONS[cat.icon] || Sparkles;
                  const isSelected = serviceCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setServiceCategoryId(cat.id)}
                      className={`group w-full flex items-center gap-4 p-5 rounded-[5px] border transition-all duration-300 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${
                        isSelected 
                          ? 'border-amber-400 bg-white' 
                          : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-all duration-300">
                        <IconComponent className="w-7 h-7 text-gray-500 group-hover:text-gray-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-lg transition-colors ${
                          isSelected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                        }`}>{tDb('dbCat', cat.slug, null, cat.name)}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{tDb('dbCat', cat.slug, 'desc', cat.description)}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-amber-400' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 mt-6 sm:mt-8">
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm sm:text-base"
              >
                {t('onboarding.back')}
              </button>
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className={`flex-1 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                  canContinue() 
                    ? 'bg-amber-400 hover:bg-amber-500' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {t('onboarding.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Professional Type */}
        {currentStepContent === 'professional_type' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.whatsSpecialty')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('onboarding.selectBestDescribes')}
            </p>

            <div className="space-y-3">
              {loadingSpecialties ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              ) : specialties.length > 0 ? (
                specialties.map((type) => {
                  const isSelected = professionalType === type.slug;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setProfessionalType(type.slug)}
                      className={`group w-full flex items-center gap-4 p-4 rounded-[5px] border transition-all duration-300 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${
                        isSelected 
                          ? 'border-amber-400 bg-white' 
                          : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-all">
                        {type.custom_icon ? (
                          <img src={type.custom_icon} alt={type.name} className="w-8 h-8" />
                        ) : (() => {
                          const SpecIcon = SPECIALTY_ICONS[type.icon] || Scissors;
                          return <SpecIcon className="w-6 h-6 text-gray-500 group-hover:text-gray-700" />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold transition-colors ${
                          isSelected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                        }`}>{tDb('dbSpec', type.slug, null, type.name)}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{tDb('dbSpec', type.slug, 'desc', type.description)}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-amber-400' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-gray-400 py-8">{t('onboarding.noSpecialties')}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6 sm:mt-8">
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm sm:text-base"
              >
                {t('onboarding.back')}
              </button>
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className={`flex-1 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                  canContinue() 
                    ? 'bg-amber-400 hover:bg-amber-500' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {t('onboarding.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Business Details (for business_owner & mobile_service) */}
        {currentStepContent === 'business_details' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.businessDetails')}
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm sm:text-base">
              {businessCategory === 'business_owner' 
                ? t('onboarding.tellSalon') 
                : t('onboarding.tellMobile')}
            </p>

            <div className="space-y-4" style={{ position: 'relative' }}>
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Building2 className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-gray-400" />
                  {t('onboarding.businessName')}
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(sanitizeText(e.target.value))}
                  placeholder={businessCategory === 'business_owner' ? t('onboarding.placeholderBusiness') : t('onboarding.placeholderMobile')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900 bg-white text-sm placeholder:text-gray-400"
                />
              </div>

              {/* City */}
              <div ref={cityRef} className="relative" style={{ zIndex: isCityOpen ? 1000 : 'auto' }}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <MapPin className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-gray-400" />
                  {t('onboarding.city')}
                </label>
                <div className="relative">
                  <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10 transition-transform ${isCityOpen ? 'rotate-180' : ''}`} />
                  <button
                    type="button"
                    onClick={() => setIsCityOpen(!isCityOpen)}
                    className="w-full flex items-center px-4 py-3 border border-gray-200 rounded-[5px] text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent pr-10"
                  >
                    <span className={businessCity ? 'text-gray-900' : 'text-gray-400'}>
                      {businessCity || t('onboarding.selectCity')}
                    </span>
                  </button>
                </div>

                {isCityOpen && (
                  <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-[5px] shadow-lg overflow-hidden" style={{ zIndex: 1000 }}>
                    {/* Search */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          ref={citySearchRef}
                          type="text"
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                          placeholder={t('onboarding.searchCity')}
                          className="w-full py-2 pl-9 pr-3 border border-gray-200 rounded-[5px] text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-gray-400"
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
                              setBusinessCity(city);
                              setIsCityOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 text-left ${
                              businessCity === city ? 'text-amber-500 bg-amber-50 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {businessCity === city && <Check className="h-4 w-4 text-amber-500 shrink-0" />}
                            <span>{city}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">{t('onboarding.noCityFound')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-gray-400" />
                  {t('onboarding.phoneNumber')}
                </label>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(sanitizePhone(e.target.value))}
                  placeholder={t('onboarding.phonePlaceholder')}
                  inputMode="tel"
                  className="w-full px-4 py-3 border border-gray-200 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900 bg-white text-sm placeholder:text-gray-400"
                />
              </div>

              {/* Address & Map (business_owner and mobile_service) */}
              {(businessCategory === 'business_owner' || businessCategory === 'mobile_service') && (
                <>
                  {/* Map for precise location */}
                  <div style={{ position: 'relative', zIndex: 0 }}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <MapPinned className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-gray-400" />
                      {businessCategory === 'mobile_service' ? t('onboarding.baseLocation') : t('onboarding.salonLocation')}
                      <span className="text-gray-400 font-normal ml-1">{t('onboarding.clickMapToSet')}</span>
                    </label>
                    <LocationPicker
                      latitude={locationLat}
                      longitude={locationLng}
                      onLocationSelect={handleLocationSelect}
                      className="h-[250px]"
                    />
                  </div>

                  {/* Address (entered manually) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('onboarding.address')}
                    </label>
                    <input
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(sanitizeText(e.target.value))}
                      placeholder={businessCategory === 'mobile_service' ? t('onboarding.enterBaseAddress') : t('onboarding.enterSalonAddress')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-[5px] text-gray-900 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6 sm:mt-8">
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm sm:text-base"
              >
                {t('onboarding.back')}
              </button>
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className={`flex-1 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                  canContinue() 
                    ? 'bg-amber-400 hover:bg-amber-500' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {t('onboarding.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Years of Experience (for job seekers) */}
        {currentStepContent === 'years_of_experience' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.howManyYears')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('onboarding.selectExperienceAs').replace('{type}', tDb('dbSpec', professionalType, null, specialties.find(s => s.slug === professionalType)?.name) || t('onboarding.professional'))}
            </p>

            <div className="space-y-3">
              {YEARS_OF_EXPERIENCE.map((exp) => {
                const IconComponent = exp.icon;
                const isSelected = yearsOfExperience === exp.id;
                return (
                  <button
                    key={exp.id}
                    onClick={() => setYearsOfExperience(exp.id)}
                    className={`group w-full flex items-center gap-4 p-4 rounded-[5px] border transition-all duration-300 text-left ${
                      isSelected 
                        ? 'border-amber-400 bg-white' 
                        : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-all">
                      <IconComponent className="w-6 h-6 text-gray-500 group-hover:text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold transition-colors ${
                        isSelected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                      }`}>{t(exp.nameKey)}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{t(exp.descKey)}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-amber-400' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6 sm:mt-8">
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm sm:text-base"
              >
                {t('onboarding.back')}
              </button>
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className={`flex-1 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                  canContinue() 
                    ? 'bg-amber-400 hover:bg-amber-500' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {t('onboarding.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Certificate/Diploma (for job seekers) */}
        {currentStepContent === 'certificate' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.professionalCertification')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('onboarding.haveCertificate').replace('{type}', tDb('dbSpec', professionalType, null, specialties.find(s => s.slug === professionalType)?.name) || t('onboarding.yourProfession'))}
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setHasCertificate(true)}
                className={`group w-full flex items-center gap-4 p-5 rounded-[5px] border transition-all duration-300 text-left ${
                  hasCertificate === true 
                    ? 'border-amber-400 bg-white' 
                    : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-all">
                  <Award className="w-7 h-7 text-gray-500 group-hover:text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-lg transition-colors ${
                    hasCertificate === true ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                  }`}>{t('onboarding.yesCertified')}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{t('onboarding.yesCertifiedDesc')}</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  hasCertificate === true 
                    ? 'bg-amber-400' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  {hasCertificate === true && <Check className="w-5 h-5 text-white" />}
                </div>
              </button>

              <button
                onClick={() => setHasCertificate(false)}
                className={`group w-full flex items-center gap-4 p-5 rounded-[5px] border transition-all duration-300 text-left ${
                  hasCertificate === false 
                    ? 'border-amber-400 bg-white' 
                    : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-all">
                  <UserCircle className="w-7 h-7 text-gray-500 group-hover:text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-lg transition-colors ${
                    hasCertificate === false ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                  }`}>{t('onboarding.noNotYet')}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{t('onboarding.noNotYetDesc')}</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  hasCertificate === false 
                    ? 'bg-amber-400' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  {hasCertificate === false && <Check className="w-5 h-5 text-white" />}
                </div>
              </button>
            </div>

            {submitError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6 sm:mt-8">
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm sm:text-base"
              >
                {t('onboarding.back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canContinue() || isSubmitting}
                className={`flex-1 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                  canContinue() && !isSubmitting 
                    ? 'bg-amber-400 hover:bg-amber-500' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? t('onboarding.creating') : t('onboarding.completeSetup')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Business Hours */}
        {currentStepContent === 'business_hours' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-4 sm:p-6 md:p-8 border border-gray-100">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.setSchedule')}
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm sm:text-base">
              {t('onboarding.whenCanBook')}
            </p>

            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const dayHours = businessHours.find(h => h.dayOfWeek === day.id);
                const isOpen = dayHours?.isOpen || false;
                const isEditing = editingDay === day.id;

                return (
                  <div key={day.id} className="border border-gray-100 rounded-[5px] overflow-hidden">
                    <div className={`flex items-center justify-between p-3 sm:p-4 transition-all ${
                      isOpen ? 'bg-amber-50/50' : 'bg-gray-50'
                    }`}>
                      {/* Toggle and Day Name */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => toggleDayOpen(day.id)}
                          className={`w-10 sm:w-12 h-6 sm:h-7 rounded-full transition-colors relative flex-shrink-0 ${
                            isOpen ? 'bg-amber-400' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`absolute top-0.5 sm:top-1 start-0.5 sm:start-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            isOpen ? 'translate-x-4 sm:translate-x-5 rtl:-translate-x-4 rtl:sm:-translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                        <span className={`font-medium text-sm sm:text-base ${isOpen ? 'text-gray-900' : 'text-gray-500'}`}>{t(day.nameKey)}</span>
                      </div>

                      {/* Hours or Closed */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        {isOpen ? (
                          <>
                            <span className="text-gray-600 text-xs sm:text-sm font-medium hidden xs:inline" dir="ltr">
                              {formatTime(dayHours?.openTime)} - {formatTime(dayHours?.closeTime)}
                            </span>
                            <span className="text-gray-600 text-xs font-medium xs:hidden" dir="ltr">
                              {dayHours?.openTime} - {dayHours?.closeTime}
                            </span>
                            <button
                              onClick={() => setEditingDay(isEditing ? null : day.id)}
                              className={`p-1.5 rounded-full transition-all ${isEditing ? 'bg-amber-100 text-amber-600 rotate-90' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs sm:text-sm font-medium">{t('onboarding.closed')}</span>
                        )}
                      </div>
                    </div>

                    {/* Time picker when editing */}
                    {isEditing && isOpen && (
                      <div className="p-3 sm:p-4 bg-white border-t border-gray-100">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <div className="flex-1">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('onboarding.opensAt')}</label>
                            <input
                              type="time"
                              dir="ltr"
                              value={dayHours?.openTime || '10:00'}
                              onChange={(e) => updateDayHours(day.id, 'openTime', e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900 bg-white text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('onboarding.closesAt')}</label>
                            <input
                              type="time"
                              dir="ltr"
                              value={dayHours?.closeTime || '19:00'}
                              onChange={(e) => updateDayHours(day.id, 'closeTime', e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900 bg-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {submitError && (
              <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-[5px] flex items-center gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-700 text-xs sm:text-sm font-medium">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6 sm:mt-8">
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm sm:text-base"
              >
                {t('onboarding.back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canContinue() || isSubmitting}
                className={`flex-1 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                  canContinue() && !isSubmitting
                    ? 'bg-amber-400 hover:bg-amber-500' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('onboarding.creating')}
                  </span>
                ) : t('onboarding.completeSetup')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Service Mode (for business_owner & mobile_service) */}
        {currentStepContent === 'service_mode' && (
          <div className="bg-white rounded-[5px] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {t('onboarding.howReceiveCustomers')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('onboarding.chooseHowCustomers')}
            </p>

            <div className="space-y-4">
              {SERVICE_MODES.map((mode) => {
                const IconComponent = mode.icon;
                const isSelected = serviceMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setServiceMode(mode.id)}
                    className={`group w-full flex items-center gap-4 p-5 rounded-[5px] border transition-all duration-300 text-left ${
                      isSelected 
                        ? 'border-amber-400 bg-white' 
                        : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover:bg-gray-200 transition-all duration-300">
                      <IconComponent className="w-7 h-7 text-gray-500 group-hover:text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-lg transition-colors ${
                        isSelected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                      }`}>{t(mode.nameKey)}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t(mode.descKey)}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-amber-400' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {submitError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6 sm:mt-8">
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-3 sm:py-4 rounded-[5px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm sm:text-base"
              >
                {t('onboarding.back')}
              </button>
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className={`flex-1 py-3 sm:py-4 rounded-[5px] font-semibold text-white transition-all text-sm sm:text-base ${
                  canContinue()
                    ? 'bg-amber-400 hover:bg-amber-500' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {t('onboarding.continue')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
