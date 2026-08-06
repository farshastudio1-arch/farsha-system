import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '../auth';

function normalizeHost(value: string | null) {
  return value?.split(':')[0]?.toLowerCase() ?? '';
}

function isStaticRequest(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  );
}

function rewriteConsignmentPath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const targetPath =
    pathname === '/'
      ? '/titipsewa'
      : pathname === '/titipsewa' || pathname.startsWith('/titipsewa/')
        ? pathname
        : `/titipsewa${pathname}`;

  const targetUrl = request.nextUrl.clone();
  targetUrl.pathname = targetPath;
  return NextResponse.rewrite(targetUrl);
}

function isLocalDevHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1';
}

function isInternalWorkerRequest(request: NextRequest) {
  return request.headers.get('cf-worker') === 'farshastudio.com';
}

function rewriteLocalConsignmentPath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const targetPath = pathname === '/' ? '/titipsewa' : `/titipsewa${pathname}`;
  const targetUrl = request.nextUrl.clone();
  targetUrl.pathname = targetPath;
  return NextResponse.rewrite(targetUrl);
}

export default auth((request: NextRequest) => {
  const host = normalizeHost(request.headers.get('host'));
  const consignmentHost = normalizeHost(process.env.CONSIGNMENT_HOST ?? '');
  const pathname = request.nextUrl.pathname;

  if (isStaticRequest(pathname)) {
    return NextResponse.next();
  }

  const isConsignmentHost = Boolean(consignmentHost && host === consignmentHost);

  if (isConsignmentHost) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/pos')) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return rewriteConsignmentPath(request);
  }

  if (
    isLocalDevHost(host) &&
    (pathname === '/login' ||
      pathname === '/forgot' ||
      pathname === '/set-password' ||
      pathname === '/dashboard' ||
      pathname === '/terms')
  ) {
    return rewriteLocalConsignmentPath(request);
  }

  if (
    pathname.startsWith('/titipsewa') &&
    !isLocalDevHost(host) &&
    !isInternalWorkerRequest(request)
  ) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
