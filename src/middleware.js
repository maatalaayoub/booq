import { createMiddlewareClient } from '@/lib/supabase/middleware-client';
import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/access-token';

// Supported locales
const locales = ['en', 'fr', 'ar'];
const defaultLocale = 'fr';

// Route matching helpers
function matchRoute(pathname, patterns) {
  return patterns.some((p) => {
    const regex = new RegExp('^' + p.replace(':path*', '.*') + '$');
    return regex.test(pathname);
  });
}

const isBusinessRoute = (pathname) =>
  matchRoute(pathname, ['/business/:path*', '/:locale/business/:path*'].map(p => p.replace('/:locale', '/[a-z]{2}')));
const isWorkerRoute = (pathname) =>
  matchRoute(pathname, ['/worker/:path*', '/:locale/worker/:path*'].map(p => p.replace('/:locale', '/[a-z]{2}')));
const isAdminRoute = (pathname) =>
  matchRoute(pathname, ['/admin/:path*', '/:locale/admin/:path*'].map(p => p.replace('/:locale', '/[a-z]{2}')));

function isProtectedRoute(pathname) {
  const stripped = pathname.replace(/^\/[a-z]{2}/, '');
  return (
    stripped.startsWith('/business/') ||
    stripped.startsWith('/worker/') ||
    stripped.startsWith('/admin/')
  );
}

// Helper to get locale from pathname
function getLocaleFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

// Helper to get locale from request
function getPreferredLocale(request) {
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().substring(0, 2))
      .find((lang) => locales.includes(lang));
    if (preferredLocale) return preferredLocale;
  }
  return defaultLocale;
}

export async function middleware(req) {
  const pathname = req.nextUrl.pathname;

  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ── Access Gate ──────────────────────────────────────────
  // Allow the access page and its API route through without a cookie
  const isAccessPage = pathname === '/access';
  const isAccessApi = pathname.startsWith('/api/access');

  if (!isAccessPage && !isAccessApi && !pathname.startsWith('/api')) {
    const accessCookie = req.cookies.get('site_access');
    if (!accessCookie || !verifyAccessToken(accessCookie.value)) {
      return NextResponse.redirect(new URL('/access', req.url));
    }
  }
  // ────────────────────────────────────────────────────────

  // The /access page lives outside [locale], skip locale routing for it
  if (isAccessPage || isAccessApi) {
    return NextResponse.next();
  }

  // Handle locale routing first
  const pathnameLocale = getLocaleFromPath(pathname);
  const hasLocale = pathnameLocale !== null;

  if (!hasLocale && !pathname.startsWith('/api')) {
    const locale = getPreferredLocale(req);
    const newUrl = new URL(`/${locale}${pathname}`, req.url);
    newUrl.search = req.nextUrl.search;
    return NextResponse.redirect(newUrl);
  }

  const locale = pathnameLocale || defaultLocale;

  // Create Supabase middleware client (refreshes session cookie)
  const { supabase, response } = createMiddlewareClient(req);

  // Refresh session — this is the key call that keeps cookies alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || null;

  // Protected routes — redirect unauthenticated users
  if (isProtectedRoute(pathname) && !userId) {
    const stripped = pathname.replace(/^\/[a-z]{2}/, '');
    if (stripped.startsWith('/business/') || stripped.startsWith('/worker/') || stripped.startsWith('/admin/')) {
      return NextResponse.redirect(new URL(`/${locale}/auth/business/sign-in`, req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

