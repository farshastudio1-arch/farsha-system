function getConsignmentBaseUrl() {
  return process.env.CONSIGNMENT_BASE_URL || 'https://titipsewa.farshastudio.com';
}

function getResendHeaders() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function sendConsignorEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const headers = getResendHeaders();

  if (!headers) {
    return { sent: false as const, reason: 'missing_resend_key' as const };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Farsha Studio <titipsewa@farshastudio.com>',
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send email: ${text}`);
  }

  return { sent: true as const };
}

export function buildConsignorInviteLink(token: string) {
  return `${getConsignmentBaseUrl()}/set-password?token=${encodeURIComponent(token)}`;
}

export function buildConsignorResetLink(token: string) {
  return `${getConsignmentBaseUrl()}/set-password?token=${encodeURIComponent(token)}`;
}

export async function sendConsignorInvite(email: string, link: string) {
  return sendConsignorEmail({
    to: email,
    subject: 'Undangan akun consignor Farsha Studio',
    html: `
      <p>Akunnya sudah dibuat.</p>
      <p><a href="${link}">Set password consignor</a></p>
    `,
  });
}

export async function sendConsignorReset(email: string, link: string) {
  return sendConsignorEmail({
    to: email,
    subject: 'Reset password consignor Farsha Studio',
    html: `
      <p>Kami menerima permintaan reset password.</p>
      <p><a href="${link}">Reset password consignor</a></p>
    `,
  });
}
