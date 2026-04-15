'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createAuthClient } from '@/lib/supabase/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, EyeOff, Phone } from 'lucide-react';

const supabase = createAuthClient();

/**
 * Custom sign-up form.
 * Renders email/password fields + Google OAuth button.
 *
 * @param {Object} props
 * @param {string} props.signInUrl - URL to the sign-in page
 * @param {string} props.redirectTo - Where to redirect after OAuth (also used as emailRedirectTo for confirmation)
 * @param {Function} props.onSuccess - Called after successful sign-up (receives session)
 * @param {string} [props.variant='user'] - 'user' | 'business' — changes button gradient
 */
export default function SignUpForm({ signInUrl, redirectTo, onSuccess, variant = 'user' }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const buttonGradient = variant === 'business'
    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02]'
    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02]';

  async function handleEmailSignUp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          intended_role: variant,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo || '/')}`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is required, Supabase returns a user but no session
    if (data.user && !data.session) {
      setConfirmationSent(true);
      setResendCooldown(60);
      return;
    }

    onSuccess?.(data.session);
  }

  async function handleGoogleSignUp() {
    setError('');
    setOauthLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?role=${variant}&next=${encodeURIComponent(redirectTo || '/')}`,
      },
    });

    if (oauthError) {
      setOauthLoading(false);
      setError(oauthError.message);
    }
  }

  // Handle OTP digit input
  function handleOtpChange(index, value) {
    if (value.length > 1) {
      // Handle paste of full code
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otpCode];
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d; });
      setOtpCode(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    const code = otpCode.join('');
if (code.length !== 6) { setError(t('auth.form.enterCode') || 'Please enter the 6-digit code'); return; }

    setError('');
    setVerifying(true);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    });

    if (verifyError) {
      setVerifying(false);
      setError(verifyError.message);
      return;
    }

    // Assign role immediately after email verification
    try {
      const roleRes = await fetch('/api/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: variant }),
      });
      const roleData = await roleRes.json();
      if (!roleRes.ok && roleData.error !== 'Role already assigned. Role cannot be changed.') {
        console.error('[SignUpForm] Failed to assign role:', roleData);
      }
    } catch (err) {
      console.error('[SignUpForm] Error assigning role:', err);
    }

    setVerifying(false);
    onSuccess?.(data.session);
  }

  async function handleResendCode() {
    setError('');
    setLoading(true);

    // Re-calling signUp for an unconfirmed user resends the OTP code
    const { error: resendError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    setLoading(false);

    if (resendError) {
      setError(resendError.message);
    } else {
      setOtpCode(['', '', '', '', '', '']);
      setError('');
      setResendCooldown(60);
    }
  }

  // Email confirmation — OTP code input screen
  if (confirmationSent) {
    return (
      <div className="w-full text-center space-y-5 py-8">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900">{t('auth.form.checkEmail') || 'Check your email'}</h3>
        <p className="text-slate-500 max-w-sm mx-auto">
          {t('auth.form.otpSent') || 'We sent a 6-digit code to'} <span className="font-medium text-slate-700">{email}</span>. {t('auth.form.otpActivate') || 'Enter it below to activate your account.'}
        </p>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex justify-center gap-2">
            {otpCode.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-11 h-13 text-center text-xl font-semibold bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-0 focus:bg-white transition-all"
              />
            ))}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className={`w-full ${buttonGradient} text-white rounded-xl h-12 text-base font-semibold transition-all disabled:opacity-50`}
          >
            {verifying ? (t('auth.form.verifying') || 'Verifying...') : (t('auth.form.verifyAndContinue') || 'Verify & continue')}
          </button>
        </form>

        <p className="text-slate-500 text-sm">
          {t('auth.form.didntReceive') || "Didn't receive the code?"}{' '}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading || resendCooldown > 0}
            className="text-amber-600 hover:text-amber-700 font-semibold disabled:opacity-50"
          >
            {loading ? (t('auth.form.sending') || 'Sending...') : resendCooldown > 0 ? `${t('auth.form.resendIn') || 'Resend in'} ${resendCooldown}s` : (t('auth.form.resendCode') || 'Resend code')}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Email/Password Form */}
      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-medium text-sm mb-1.5">{t('auth.form.firstNameLabel') || 'First name'}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 transition-all"
              placeholder="أيوب"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-medium text-sm mb-1.5">{t('auth.form.lastNameLabel') || 'Last name'}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 transition-all"
              placeholder="معتال"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-medium text-sm mb-1.5">{t('auth.form.phoneLabel') || 'Phone number'}</label>
          <div className="relative">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 pl-11 transition-all"
              placeholder="+212 6XX XXX XXX"
              dir="ltr"
            />
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-medium text-sm mb-1.5">{t('auth.form.emailLabel') || 'Email address'}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-medium text-sm mb-1.5">{t('auth.form.passwordLabel') || 'Password'}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 pr-12 transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || oauthLoading}
          className={`w-full ${buttonGradient} text-white rounded-xl h-12 text-base font-semibold transition-all disabled:opacity-50`}
        >
          {loading ? (t('auth.form.creatingAccount') || 'Creating account...') : (t('auth.form.continue') || 'Continue')}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-slate-400 text-sm">{t('auth.form.or') || 'or'}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={oauthLoading || loading}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-xl h-12 font-medium disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {oauthLoading ? (t('auth.form.redirecting') || 'Redirecting...') : (t('auth.form.continueWithGoogle') || 'Continue with Google')}
      </button>

      {/* Footer — sign-in link */}
      {signInUrl && (
        <p className="text-center text-slate-600 text-sm">
          {t('auth.form.haveAccount') || 'Already have an account?'}{' '}
          <a href={signInUrl} className="text-amber-600 hover:text-amber-700 font-semibold">
            {t('auth.form.signIn') || 'Sign in'}
          </a>
        </p>
      )}
    </div>
  );
}
