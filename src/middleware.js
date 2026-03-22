import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Supported locales
const locales = ['en', 'fr', 'ar'];
const defaultLocale = 'fr';

// Define route matchers for different sections
const isUserRoute = createRouteMatcher(['/user/:path*', '/:locale/user/:path*']);
const isBusinessRoute = createRouteMatcher(['/business/:path*', '/:locale/business/:path*']);
const isAdminRoute = createRouteMatcher(['/admin/:path*', '/:locale/admin/:path*']);
const isUserAuthRoute = createRouteMatcher(['/auth/user/:path*', '/:locale/auth/user/:path*']);
const isBusinessAuthRoute = createRouteMatcher(['/auth/business/:path*', '/:locale/auth/business/:path*']);

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

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const searchParams = req.nextUrl.searchParams;
  
  // Debug logging
  console.log('[Middleware] Path:', pathname, 'Search:', searchParams.toString());
  
  // Check for setup flag (allows passing role setup parameter)
  const setupRole = searchParams.get('setup');
  
  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle locale routing first
  const pathnameLocale = getLocaleFromPath(pathname);
  const hasLocale = pathnameLocale !== null;
  
  // If no locale in path, redirect with locale prefix
  if (!hasLocale && !pathname.startsWith('/api')) {
    const locale = getPreferredLocale(req);
    const newUrl = new URL(`/${locale}${pathname}`, req.url);
    // Preserve search params
    newUrl.search = req.nextUrl.search;
    return NextResponse.redirect(newUrl);
  }

  const locale = pathnameLocale || defaultLocale;
  
  // Get auth state (only check if user is signed in)
  const { userId } = await auth();

  // Check if accessing auth routes
  if (isUserAuthRoute(req) || isBusinessAuthRoute(req)) {
    // Don't interfere with Clerk's sign-up flow - let forceRedirectUrl work
    // After signup, Clerk handles the redirect with the ?setup= param
    // Only redirect if user is explicitly visiting auth pages when already signed in
    // (detected by absence of Clerk session initialization indicators)
    if (userId) {
      // Check if this is a fresh page load (not a Clerk callback/redirect)
      // Clerk sets __clerk_status cookie during auth flow
      const isClerkCallback = pathname.includes('/sso-callback') || 
                              pathname.includes('/verify') ||
                              searchParams.has('__clerk_ticket') ||
                              searchParams.has('__clerk_status');
      
      // If not a Clerk callback, redirect signed-in users away from auth pages
      if (!isClerkCallback) {
        // Allow sign-in and sign-up pages to handle their own redirects
        // They need to check if user exists in database first
        const isSignUpPage = pathname.includes('/sign-up');
        const isSignInPage = pathname.includes('/sign-in');
        
        // Let auth pages handle their own redirects for business users
        // This allows them to check database before deciding where to go
        if (!isSignUpPage && !isSignInPage) {
          if (isBusinessAuthRoute(req)) {
            return NextResponse.redirect(new URL(`/${locale}/business/dashboard`, req.url));
          }
          return NextResponse.redirect(new URL(`/${locale}`, req.url));
        }
      }
    }
    // Allow access to auth pages
    return NextResponse.next();
  }

  // User routes - redirect to home (users don't have dashboard)
  if (isUserRoute(req)) {
    console.log('[Middleware] User route, redirecting to home');
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  // Admin routes - require authentication (role verified on page level via API)
  if (isAdminRoute(req)) {
    console.log('[Middleware] Admin route, userId:', userId ? 'present' : 'missing');
    if (!userId) {
      return NextResponse.redirect(new URL(`/${locale}/auth/business/sign-in`, req.url));
    }
  }

  // Business routes - require authentication only
  // Role verification is done on the page level via useRole hook
  if (isBusinessRoute(req)) {
    console.log('[Middleware] Business route, userId:', userId ? 'present' : 'missing');
    if (!userId) {
      console.log('[Middleware] No userId, redirecting to sign-in');
      return NextResponse.redirect(new URL(`/${locale}/auth/business/sign-in`, req.url));
    }
    console.log('[Middleware] Business route allowed');
    // Allow access - role check done client-side in dashboard
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

