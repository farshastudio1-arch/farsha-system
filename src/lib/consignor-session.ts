import { cookies } from 'next/headers';

import { createConsignorSession, deleteConsignorSession, getConsignorBySessionToken } from '@/lib/consignor-db';

const sessionCookieName = 'titip_session';
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

function isSecureCookie() {
  return process.env.NODE_ENV === 'production';
}

export async function getCurrentConsignor() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const consignor = await getConsignorBySessionToken(token);
  return consignor?.status === 'suspended' ? null : consignor;
}

export async function createConsignorSessionCookie(consignorId: string) {
  const { token } = await createConsignorSession({
    consignorId,
    expiresAt: new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString(),
  });
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(),
    path: '/',
    maxAge: sessionMaxAgeSeconds,
  });
}

export async function clearConsignorSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await deleteConsignorSession(token);
  }

  cookieStore.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(),
    path: '/',
    maxAge: 0,
  });
}
