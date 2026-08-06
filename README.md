This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Titipsewa email setup

Consignor activation and reset emails use Resend from `src/lib/email.ts`.

1. Verify a sender domain or address in Resend.
2. Set `RESEND_API_KEY` as a Cloudflare secret for the Worker.
3. Set `RESEND_FROM` in `wrangler.jsonc` to a verified sender, for example `Farsha Studio <no-reply@farshastudio.com>`.
4. Keep `CONSIGNMENT_BASE_URL` pointed at the public consignment host so links in activation emails are correct.
5. Deploy with the secret in place:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

Local dev can use `.env.local`, but production needs the Worker secret. `RESEND_FROM` is already a non-secret Worker variable in `wrangler.jsonc`. If `RESEND_API_KEY` is missing, the admin UI will now show that the invite link was created but the email was not sent.
