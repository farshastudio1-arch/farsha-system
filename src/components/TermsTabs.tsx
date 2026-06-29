'use client';

import { useState } from 'react';

type Language = 'id' | 'en';

type TermsSection = {
  title: string;
  body: string[];
};

type TermsContent = {
  label: string;
  eyebrow: string;
  title: string;
  intro: string;
  reviewNote: string;
  lastUpdated: string;
  sections: TermsSection[];
};

const terms: Record<Language, TermsContent> = {
  id: {
    label: 'Indonesia',
    eyebrow: 'Syarat & Ketentuan',
    title: 'Syarat dan Ketentuan Layanan Farsha Studio',
    intro:
      'Halaman ini memuat syarat dan ketentuan untuk menyewa dan menggunakan layanan dari Farsha Studio.',
    reviewNote:
      'Dokumen ini adalah draf syarat ketentuan praktis dan bukan nasihat hukum. Pemilik bisnis perlu meninjau isi akhir sebelum digunakan sebagai ketentuan resmi.',
    lastUpdated: 'Terakhir diperbarui: 28 Juni 2026',
    sections: [
      {
        title: '1. Pemesanan dan Jadwal Fitting',
        body: [
          'Pemesanan dianggap sah setelah pelanggan melakukan pembayaran uang muka (DP) atau pembayaran penuh sesuai kesepakatan.',
          'Jadwal fitting hanya dapat dilakukan setelah reservasi atau kesepakatan jadwal dengan admin melalui WhatsApp.',
          'Pembatalan sepihak oleh penyewa dapat mengakibatkan uang muka (DP) hangus sesuai kebijakan studio.',
        ],
      },
      {
        title: '2. Harga dan Pembayaran',
        body: [
          'Semua harga yang tertera di website dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya.',
          'Sisa pembayaran (jika ada) harus dilunasi sebelum pengambilan gaun atau kebaya.',
          'Pembayaran hanya melalui rekening resmi yang diinformasikan oleh admin Farsha Studio.',
        ],
      },
      {
        title: '3. Durasi Penyewaan',
        body: [
          'Durasi sewa standar adalah 3 hari (hari pengambilan, hari H, dan hari pengembalian), kecuali disepakati lain.',
          'Keterlambatan pengembalian akan dikenakan denda keterlambatan per hari sesuai dengan ketentuan dari Farsha Studio.',
        ],
      },
      {
        title: '4. Kondisi dan Perawatan Pakaian',
        body: [
          'Pakaian disewakan dalam kondisi bersih dan terawat. Pelanggan dilarang untuk mencuci atau menyetrika sendiri pakaian yang disewa.',
          'Segala bentuk perubahan (permak) pada pakaian tanpa izin dari Farsha Studio dilarang keras.',
        ],
      },
      {
        title: '5. Kerusakan dan Kehilangan',
        body: [
          'Penyewa bertanggung jawab penuh atas segala kerusakan (seperti robek, noda permanen, atau hilangnya payet) selama masa sewa.',
          'Apabila terjadi kerusakan atau kehilangan, penyewa wajib mengganti rugi atau membayar biaya perbaikan yang nominalnya akan ditentukan oleh Farsha Studio.',
        ],
      },
    ],
  },
  en: {
    label: 'English',
    eyebrow: 'Terms & Conditions',
    title: 'Terms of Service for Farsha Studio',
    intro:
      'This page contains the terms and conditions for renting and using services from Farsha Studio.',
    reviewNote:
      'This document is a practical terms and conditions draft and is not legal advice. The business owner should review the final wording before using it as official terms.',
    lastUpdated: 'Last updated: June 28, 2026',
    sections: [
      {
        title: '1. Booking and Fitting Schedule',
        body: [
          'A booking is considered valid after the customer makes a down payment (DP) or full payment as agreed.',
          'Fitting sessions can only be conducted after making a reservation or agreeing on a schedule with the admin via WhatsApp.',
          'Unilateral cancellation by the renter may result in the forfeiture of the down payment (DP) according to studio policy.',
        ],
      },
      {
        title: '2. Pricing and Payment',
        body: [
          'All prices listed on the website are subject to change at any time without prior notice.',
          'The remaining payment (if any) must be settled before the dress or kebaya is picked up.',
          'Payments are only accepted through the official bank accounts informed by the Farsha Studio admin.',
        ],
      },
      {
        title: '3. Rental Duration',
        body: [
          'The standard rental duration is 3 days (pickup day, event day, and return day), unless agreed otherwise.',
          "Late returns will incur a daily late fee in accordance with Farsha Studio's policy.",
        ],
      },
      {
        title: '4. Clothing Condition and Care',
        body: [
          'Clothes are rented in clean and well-maintained condition. Customers are strictly prohibited from washing or ironing the rented clothes themselves.',
          'Any form of alteration to the clothing without permission from Farsha Studio is strictly prohibited.',
        ],
      },
      {
        title: '5. Damage and Loss',
        body: [
          'The renter is fully responsible for any damage (such as tears, permanent stains, or missing sequins) during the rental period.',
          'In the event of damage or loss, the renter must provide compensation or pay for repair costs, the amount of which will be determined by Farsha Studio.',
        ],
      },
    ],
  },
};

export default function TermsTabs() {
  const [activeLanguage, setActiveLanguage] = useState<Language>('id');
  const term = terms[activeLanguage];

  return (
    <section className="space-y-10">
      <div className="theme-soft-surface theme-border inline-flex w-full border p-1 sm:w-auto">
        {(Object.keys(terms) as Language[]).map((language) => {
          const isActive = activeLanguage === language;

          return (
            <button
              key={language}
              type="button"
              onClick={() => setActiveLanguage(language)}
              className={`min-h-11 flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors sm:min-w-34 ${
                isActive
                  ? 'theme-selected'
                  : 'theme-muted-strong hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'
              }`}
              aria-pressed={isActive}
            >
              {terms[language].label}
            </button>
          );
        })}
      </div>

      <article className="space-y-10">
        <header className="theme-border space-y-5 border-b pb-8">
          <div className="space-y-2">
            <p className="theme-muted-strong font-mono text-xs font-bold uppercase tracking-widest">
              {term.eyebrow}
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-[var(--theme-text)] sm:text-5xl">
              {term.title}
            </h1>
          </div>
          <div className="theme-muted-strong max-w-3xl space-y-4 text-sm leading-relaxed sm:text-base">
            <p>{term.intro}</p>
            <p className="theme-soft-surface theme-border border p-4 text-xs leading-relaxed text-[var(--theme-text)] sm:text-sm">
              {term.reviewNote}
            </p>
            <p className="theme-muted font-mono text-[11px] font-semibold uppercase tracking-wider">
              {term.lastUpdated}
            </p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {term.sections.map((section) => (
            <section key={section.title} className="theme-surface theme-border border p-5 sm:p-6">
              <h2 className="font-serif text-xl font-semibold text-[var(--theme-text)]">
                {section.title}
              </h2>
              <div className="theme-muted-strong mt-4 space-y-3 text-sm leading-relaxed">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}
