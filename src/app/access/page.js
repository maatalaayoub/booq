'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AccessPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        // Hard redirect so the browser sends the newly set cookie
        setTimeout(() => {
          window.location.replace('/');
        }, 1200);
      } else {
        setError(data.error || 'Invalid access code');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">

      <div className="w-full max-w-md">
        <div
          className={`bg-white p-8 sm:p-10 border transition-all duration-500 ${
            success
              ? 'border-green-400 bg-green-50/30'
              : 'border-gray-300'
          }`}
          style={{ borderRadius: '5px' }}
        >
          {success ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 border border-green-200 mb-4 animate-[scaleIn_0.4s_ease-out]" style={{ borderRadius: '5px' }}>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Access Granted</h2>
              <p className="text-slate-500 text-sm">Redirecting you now...</p>
              <div className="mt-4">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            </div>
          ) : (
            /* Default state */
            <>
              {/* Icon + Title */}
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 border border-slate-200 mb-4"
                  style={{ borderRadius: '5px' }}
                >
                  <Lock className="w-6 h-6 text-slate-800" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                  Access Required
                </h1>
                <p className="text-slate-500 text-sm">
                  Enter the access code to continue
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-medium text-sm mb-1.5">
                    Access code
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Enter code"
                      autoFocus
                      required
                      className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#D4AF37] focus:ring-0 focus:bg-white h-12 px-4 pr-12 transition-all"
                      style={{ borderRadius: '5px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200" style={{ borderRadius: '5px' }}>
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-red-700 font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 text-white font-semibold h-12 text-base transition-all duration-200 flex items-center justify-center gap-2"
                  style={{ borderRadius: '5px' }}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
