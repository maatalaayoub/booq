'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import {
  User,
  MapPin,
  Phone,
  Briefcase,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  GraduationCap,
  Wrench,
  Upload,
  X,
  Plus,
  Camera,
  RotateCw,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const MOROCCAN_CITIES = [
  '', 'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès',
  'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Temara', 'Safi', 'Mohammedia',
  'El Jadida', 'Béni Mellal', 'Nador', 'Taza', 'Settat', 'Berrechid',
  'Khémisset', 'Inezgane', 'Khouribga', 'Larache', 'Guelmim', 'Berkane',
  'Taourirt', 'Errachidia', 'Sidi Kacem', 'Sidi Slimane',
];

const EXPERIENCE_OPTIONS = [
  { value: '', labelKey: 'myProfile.select' },
  { value: 'less_than_1', labelKey: 'onboarding.exp.lessThan1' },
  { value: '1_to_3', labelKey: 'onboarding.exp.1to3' },
  { value: '3_to_5', labelKey: 'onboarding.exp.3to5' },
  { value: '5_to_10', labelKey: 'onboarding.exp.5to10' },
  { value: 'more_than_10', labelKey: 'onboarding.exp.moreThan10' },
];

const PROFESSIONAL_TYPES = [
  { value: 'barber', labelKey: 'dbSpec.barber' },
  { value: 'hairdresser', labelKey: 'dbSpec.hairdresser' },
  { value: 'makeup', labelKey: 'dbSpec.makeup' },
  { value: 'nails', labelKey: 'dbSpec.nails' },
  { value: 'massage', labelKey: 'dbSpec.massage' },
];

// ─── SKELETON ────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gradient-to-r from-[#364153] to-[#4a5568] rounded-[5px] p-6 mb-6">
        <div className="h-7 w-48 bg-white/20 rounded mb-2" />
        <div className="h-4 w-64 bg-white/10 rounded" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[5px] border border-gray-200 p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-[5px] border border-gray-200 p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FORM INPUT ────────────────────────────────────────────
function FormInput({ label, icon: Icon, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] disabled:bg-gray-50 disabled:text-gray-500 transition-all"
      />
    </div>
  );
}

// ─── FORM SELECT ────────────────────────────────────────────
function FormSelect({ label, icon: Icon, value, onChange, options, disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] disabled:bg-gray-50 disabled:text-gray-500 bg-white transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── MULTI SELECT (chips) ───────────────────────────────────
function FormMultiSelect({ label, icon: Icon, value = [], onChange, options, disabled = false, placeholder = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const available = options.filter((o) => o.value && !value.includes(o.value));

  const toggle = (city) => {
    if (value.includes(city)) {
      onChange(value.filter((v) => v !== city));
    } else {
      onChange([...value, city]);
    }
  };

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </label>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full min-h-[42px] px-3 py-2 border border-gray-200 rounded-[5px] text-sm bg-white cursor-pointer flex flex-wrap gap-1.5 items-center transition-all ${
          open ? 'ring-2 ring-[#364153]/20 border-[#364153]' : ''
        } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
      >
        {value.length === 0 && (
          <span className="text-gray-400">{placeholder}</span>
        )}
        {value.map((city) => (
          <span
            key={city}
            className="inline-flex items-center gap-1 bg-[#364153]/10 text-[#364153] text-xs font-medium px-2 py-1 rounded-[4px]"
          >
            {city}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(city); }}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {open && available.length > 0 && (
        <div className="border border-gray-200 rounded-[5px] bg-white shadow-lg max-h-48 overflow-y-auto z-50 relative">
          {available.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="w-full text-left px-3.5 py-2 text-sm hover:bg-[#364153]/5 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FORM TEXTAREA ──────────────────────────────────────────
function FormTextarea({ label, icon: Icon, value, onChange, placeholder, rows = 3, disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] disabled:bg-gray-50 disabled:text-gray-500 transition-all resize-none"
      />
    </div>
  );
}

// ─── SECTION CARD ───────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor = 'text-[#364153]', iconBg = 'bg-[#364153]/10', children }) {
  return (
    <div className="bg-white rounded-[5px] border border-gray-300 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-8 h-8 ${iconBg} rounded-[5px] flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────
export default function JobSeekerProfilePage() {
  const { user } = useAuthUser();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error'
  const [uploadingCV, setUploadingCV] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null);
  const [photoDeleted, setPhotoDeleted] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [hasCertificate, setHasCertificate] = useState(false);
  const [preferredCity, setPreferredCity] = useState([]);
  const [resumeUrl, setResumeUrl] = useState(null);
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [professionalType, setProfessionalType] = useState('');

  const photoInputRef = useRef(null);
  const cvInputRef = useRef(null);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/business/job-seeker-profile');
        if (res.ok) {
          const data = await res.json();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setPhone(data.phone || '');
          setCity(data.city || '');
          setProfileImageUrl(data.profileImageUrl || null);
          setYearsOfExperience(data.yearsOfExperience || '');
          setHasCertificate(data.hasCertificate || false);
          setPreferredCity(data.preferredCity || []);
          setResumeUrl(data.resumeUrl || null);
          setBio(data.bio || '');
          setEducation(data.education || '');
          setSkills(data.skills || []);
          setProfessionalType(data.professionalType || '');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/business/job-seeker-profile');
      if (res.ok) {
        const data = await res.json();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhone(data.phone || '');
        setCity(data.city || '');
        setProfileImageUrl(data.profileImageUrl || null);
        setYearsOfExperience(data.yearsOfExperience || '');
        setHasCertificate(data.hasCertificate || false);
        setPreferredCity(data.preferredCity || []);
        setResumeUrl(data.resumeUrl || null);
        setBio(data.bio || '');
        setEducation(data.education || '');
        setSkills(data.skills || []);
        setProfessionalType(data.professionalType || '');
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Save profile
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      let finalImageUrl = profileImageUrl;

      // Upload new photo if one was selected
      if (pendingPhotoFile) {
        const formData = new FormData();
        formData.append('file', pendingPhotoFile);
        formData.append('type', 'avatar');
        const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.url;
        }
      } else if (photoDeleted) {
        finalImageUrl = null;
      }

      const res = await fetch('/api/business/job-seeker-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          city,
          yearsOfExperience,
          hasCertificate,
          preferredCity,
          profileImageUrl: finalImageUrl,
          bio,
          education,
          skills,
        }),
      });
      if (res.ok) {
        setProfileImageUrl(finalImageUrl);
        setPendingPhotoFile(null);
        setPendingPhotoPreview(null);
        setPhotoDeleted(false);
        setSaveStatus('success');
        window.dispatchEvent(new CustomEvent('profile-photo-updated'));
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Select profile photo (preview only, upload on save)
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingPhotoFile(file);
    setPendingPhotoPreview(URL.createObjectURL(file));
    setPhotoDeleted(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Delete profile photo (applied on save)
  const handlePhotoDelete = () => {
    setPendingPhotoFile(null);
    setPendingPhotoPreview(null);
    setPhotoDeleted(true);
  };

  // Upload CV
  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCV(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/business/upload-cv', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setResumeUrl(data.url);
      }
    } catch (err) {
      console.error('CV upload error:', err);
    } finally {
      setUploadingCV(false);
      if (cvInputRef.current) cvInputRef.current.value = '';
    }
  };

  // Skills management
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#364153] to-[#4a5568] rounded-[5px] p-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            {t?.('jobSeekerProfile.title') || 'My Profile'}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {t?.('jobSeekerProfile.subtitle') || 'Complete your profile to increase your chances of getting hired'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-[5px] transition-colors disabled:opacity-50"
            title={t?.('common.refresh') || 'Refresh'}
          >
            <RotateCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#364153] rounded-[5px] text-sm font-medium hover:bg-gray-100 disabled:opacity-60 transition-all"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving
              ? (t?.('common.saving') || 'Saving...')
              : saveStatus === 'success'
                ? (t?.('common.saved') || 'Saved!')
                : saveStatus === 'error'
                  ? (t?.('jobSeekerProfile.saveError') || 'Error saving')
                  : (t?.('common.saveChanges') || 'Save Changes')}
          </button>
        </div>
      </div>

      {/* Profile photo + name row */}
      <div className="bg-white rounded-[5px] border border-gray-300 p-5 mb-6">
        <div className="flex items-center gap-5">
          {/* Profile photo */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden flex-shrink-0">
              {(() => {
                const displayUrl = photoDeleted ? null : (pendingPhotoPreview || profileImageUrl);
                return displayUrl ? (
                  <img src={displayUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-10 h-10" />
                  </div>
                );
              })()}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.firstName || t('myProfile.yourName')}
            </h2>
            <p className="text-sm text-gray-500">
              {PROFESSIONAL_TYPES.find(pt => pt.value === professionalType)?.labelKey ? t(PROFESSIONAL_TYPES.find(pt => pt.value === professionalType).labelKey) : t('myProfile.professional')}
              {city && ` · ${city}`}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => photoInputRef.current?.click()}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-[5px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                {t('myProfile.changePhoto')}
              </button>
              {(profileImageUrl || pendingPhotoPreview) && !photoDeleted && (
                <button
                  onClick={handlePhotoDelete}
                  className="text-xs px-3 py-1.5 border border-red-200 rounded-[5px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  {t('myProfile.remove')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Personal Information */}
          <SectionCard title={t?.('jobSeekerProfile.personalInfo') || 'Personal Information'} icon={User}>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label={t?.('jobSeekerProfile.firstName') || 'First Name'}
                icon={User}
                value={firstName}
                onChange={setFirstName}
                placeholder="e.g. Ahmed"
              />
              <FormInput
                label={t?.('jobSeekerProfile.lastName') || 'Last Name'}
                icon={User}
                value={lastName}
                onChange={setLastName}
                placeholder="e.g. Maatala"
              />
            </div>
            <FormInput
              label={t?.('jobSeekerProfile.phone') || 'Phone Number'}
              icon={Phone}
              value={phone}
              onChange={setPhone}
              placeholder="+212 6XX-XXXXXX"
              type="tel"
            />
            <FormSelect
              label={t?.('jobSeekerProfile.city') || 'City'}
              icon={MapPin}
              value={city}
              onChange={setCity}
              options={MOROCCAN_CITIES.map(c => ({ value: c, label: c || t('myProfile.selectCity') }))}
            />
            <FormMultiSelect
              label={t?.('jobSeekerProfile.preferredCity') || 'Preferred Work Cities'}
              icon={MapPin}
              value={preferredCity}
              onChange={setPreferredCity}
              options={MOROCCAN_CITIES.filter(c => c).map(c => ({ value: c, label: c }))}
              placeholder={t('myProfile.selectCities')}
            />
          </SectionCard>

          {/* Professional Description */}
          <SectionCard title={t?.('jobSeekerProfile.aboutYou') || 'About You'} icon={FileText}>
            <FormTextarea
              label={t?.('jobSeekerProfile.bio') || 'Professional Description'}
              icon={FileText}
              value={bio}
              onChange={setBio}
              placeholder={t?.('jobSeekerProfile.bioPlaceholder') || 'Write a short professional summary about yourself, your experience, and what you are looking for...'}
              rows={4}
            />
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Experience & Education */}
          <SectionCard title={t?.('jobSeekerProfile.experience') || 'Experience & Education'} icon={Briefcase}>
            <FormSelect
              label={t?.('jobSeekerProfile.yearsOfExperience') || 'Years of Experience'}
              icon={Briefcase}
              value={yearsOfExperience}
              onChange={setYearsOfExperience}
              options={EXPERIENCE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }))}
            />
            <FormTextarea
              label={t?.('jobSeekerProfile.education') || 'Education (Diploma, Certificate, Training)'}
              icon={GraduationCap}
              value={education}
              onChange={setEducation}
              placeholder={t?.('jobSeekerProfile.educationPlaceholder') || 'e.g. Diploma in Hairdressing from ABC Academy (2020)'}
              rows={3}
            />
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                {t?.('jobSeekerProfile.hasCertificate') || 'Professional Certificate'}
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={hasCertificate}
                    onChange={(e) => setHasCertificate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-[#364153] transition-colors"></div>
                  <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:start-5 transition-all"></div>
                </div>
                <span className="text-sm text-gray-600">
                  {hasCertificate
                    ? (t?.('jobSeekerProfile.yesCertificate') || 'I have a professional certificate')
                    : (t?.('jobSeekerProfile.noCertificate') || 'No professional certificate')}
                </span>
              </label>
            </div>
          </SectionCard>

          {/* Skills */}
          <SectionCard title={t?.('jobSeekerProfile.skills') || 'Skills'} icon={Wrench}>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder={t?.('jobSeekerProfile.addSkill') || 'Type a skill and press Enter...'}
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] transition-all"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  disabled={!skillInput.trim()}
                  className="px-3 py-2.5 bg-[#364153] text-white rounded-[5px] hover:bg-[#2a3342] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#364153]/10 text-[#364153] text-sm rounded-full"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {t?.('jobSeekerProfile.noSkills') || 'No skills added yet'}
                </p>
              )}
            </div>
          </SectionCard>

          {/* CV / Resume */}
          <SectionCard title={t?.('jobSeekerProfile.resume') || 'CV / Resume'} icon={FileText}>
            <div className="space-y-3">
              {resumeUrl && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-[5px]">
                  <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 truncate">
                      {t?.('jobSeekerProfile.resumeUploaded') || 'Resume uploaded'}
                    </p>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline"
                    >
                      {t?.('jobSeekerProfile.viewResume') || 'View file'}
                    </a>
                  </div>
                </div>
              )}
              <button
                onClick={() => cvInputRef.current?.click()}
                disabled={uploadingCV}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-[5px] text-sm text-gray-500 hover:border-[#364153] hover:text-[#364153] transition-colors"
              >
                {uploadingCV ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {resumeUrl
                  ? (t?.('jobSeekerProfile.replaceResume') || 'Replace Resume')
                  : (t?.('jobSeekerProfile.uploadResume') || 'Upload Resume')}
              </button>
              <p className="text-xs text-gray-400 text-center">
                PDF, DOC, DOCX · {t?.('jobSeekerProfile.maxSize') || 'Max 10 MB'}
              </p>
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleCVUpload}
                className="hidden"
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
