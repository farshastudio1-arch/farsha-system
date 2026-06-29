'use client';

import { useState } from 'react';

type Language = 'id' | 'en';

type PolicySection = {
  title: string;
  body: string[];
};

type PolicyContent = {
  label: string;
  eyebrow: string;
  title: string;
  intro: string;
  reviewNote: string;
  lastUpdated: string;
  sections: PolicySection[];
};

const policies: Record<Language, PolicyContent> = {
  id: {
    label: 'Indonesia',
    eyebrow: 'Kebijakan Privasi',
    title: 'Cara Farsha Studio Menangani Data Anda',
    intro:
      'Halaman ini menjelaskan data yang mungkin diproses saat Anda melihat katalog Farsha Studio, menghubungi admin melalui WhatsApp, atau masuk ke area admin yang dilindungi.',
    reviewNote:
      'Dokumen ini adalah draf informasi privasi praktis dan bukan nasihat hukum. Pemilik bisnis perlu meninjau isi akhir sebelum digunakan sebagai kebijakan resmi.',
    lastUpdated: 'Terakhir diperbarui: 28 Juni 2026',
    sections: [
      {
        title: 'Informasi yang Farsha Studio tangani',
        body: [
          'Pengunjung publik dapat melihat katalog tanpa membuat akun dan tanpa mengisi formulir di website ini.',
          'Jika Anda menghubungi admin, informasi seperti nama, nomor telepon, isi pesan, serta item kebaya yang Anda tanyakan akan diproses melalui percakapan WhatsApp.',
          'Admin internal dapat masuk menggunakan Google. Untuk kebutuhan akses admin, sistem dapat menerima informasi akun seperti alamat email dan status verifikasi dari Google.',
        ],
      },
      {
        title: 'Alur kontak WhatsApp',
        body: [
          'Tombol WhatsApp membuat pesan awal berisi nama dan kode item agar admin dapat memahami koleksi yang Anda tanyakan.',
          'Setelah Anda membuka WhatsApp, percakapan berada di layanan WhatsApp dan mengikuti kebijakan privasi WhatsApp/Meta.',
          'Farsha Studio menggunakan isi percakapan untuk menjawab ketersediaan, jadwal fitting, dan kebutuhan layanan sewa offline.',
        ],
      },
      {
        title: 'Login admin Google',
        body: [
          'Area admin dan PoS dilindungi login Google untuk akun yang diizinkan.',
          'Website memeriksa alamat email dan status verifikasi akun untuk memastikan hanya admin yang dapat masuk.',
          'Pengunjung publik tidak perlu menggunakan login Google untuk melihat katalog.',
        ],
      },
      {
        title: 'Cookie dan data sesi',
        body: [
          'Website dapat menggunakan cookie atau token sesi yang diperlukan untuk menjaga login admin tetap aman.',
          'Saat ini website tidak menampilkan banner cookie pemasaran karena tidak ada alur pemasaran atau pelacakan iklan yang terbukti di kode aplikasi.',
          'Jika fitur analitik, iklan, atau pelacakan tambahan ditambahkan, kebijakan ini perlu diperbarui.',
        ],
      },
      {
        title: 'Layanan pihak ketiga',
        body: [
          'Website dapat memuat layanan pihak ketiga seperti WhatsApp, Google untuk login admin, dan penyedia gambar eksternal yang menampilkan foto katalog.',
          'Pihak ketiga tersebut dapat memproses data teknis seperti alamat IP, informasi perangkat, atau aktivitas yang terjadi di layanan mereka.',
          'Farsha Studio tidak mengontrol sepenuhnya cara pihak ketiga memproses data di luar website ini.',
        ],
      },
      {
        title: 'Penyimpanan data',
        body: [
          'Farsha Studio menyimpan informasi percakapan dan administrasi selama dibutuhkan untuk melayani penyewaan, mencatat transaksi offline, menyelesaikan pertanyaan, atau memenuhi kebutuhan operasional.',
          'Data admin disimpan sebatas kebutuhan pengamanan akses dan pengelolaan sistem.',
          'Data yang tidak lagi diperlukan sebaiknya dihapus atau diminimalkan sesuai kebijakan internal studio.',
        ],
      },
      {
        title: 'Pilihan dan kontak Anda',
        body: [
          'Anda dapat memilih untuk tidak menghubungi Farsha Studio melalui WhatsApp jika tidak ingin membagikan data di layanan tersebut.',
          'Untuk meminta koreksi atau penghapusan informasi yang Anda bagikan kepada studio, hubungi admin Farsha Studio melalui nomor kontak resmi di website.',
          'Permintaan dapat membutuhkan verifikasi agar data tidak diberikan atau diubah oleh pihak yang tidak berwenang.',
        ],
      },
    ],
  },
  en: {
    label: 'English',
    eyebrow: 'Privacy Policy',
    title: 'How Farsha Studio Handles Your Data',
    intro:
      'This page explains what data may be processed when you browse the Farsha Studio catalog, contact the studio through WhatsApp, or access the protected admin area.',
    reviewNote:
      'This document is a practical privacy disclosure draft and is not legal advice. The business owner should review the final wording before using it as an official policy.',
    lastUpdated: 'Last updated: June 28, 2026',
    sections: [
      {
        title: 'Information Farsha Studio handles',
        body: [
          'Public visitors can browse the catalog without creating an account and without submitting a form on this website.',
          'If you contact the studio, details such as your name, phone number, message content, and the kebaya item you ask about may be handled through WhatsApp conversations.',
          'Internal admins can sign in with Google. For admin access, the system may receive account information such as email address and verification status from Google.',
        ],
      },
      {
        title: 'WhatsApp contact flow',
        body: [
          'WhatsApp buttons prepare an initial message with the item name and item code so the studio can understand which collection you are asking about.',
          'Once WhatsApp opens, the conversation happens on WhatsApp and is subject to WhatsApp/Meta privacy practices.',
          'Farsha Studio uses the conversation content to answer availability questions, fitting schedules, and offline rental service needs.',
        ],
      },
      {
        title: 'Google admin login',
        body: [
          'The admin and PoS areas are protected with Google login for approved accounts.',
          'The website checks email address and account verification status so only admins can access protected areas.',
          'Public visitors do not need Google login to browse the catalog.',
        ],
      },
      {
        title: 'Cookies and session data',
        body: [
          'The website may use cookies or session tokens that are necessary to keep admin login secure.',
          'The website currently does not show a marketing cookie banner because no marketing or advertising tracking flow is evident in the application code.',
          'If analytics, advertising, or additional tracking features are added, this policy should be updated.',
        ],
      },
      {
        title: 'Third-party services',
        body: [
          'The website may load third-party services such as WhatsApp, Google for admin login, and external image providers used to display catalog photos.',
          'Those third parties may process technical data such as IP address, device information, or activity that happens on their services.',
          'Farsha Studio does not fully control how third parties process data outside this website.',
        ],
      },
      {
        title: 'Data retention',
        body: [
          'Farsha Studio keeps conversation and administration information for as long as needed to provide rental service, record offline transactions, resolve questions, or support operations.',
          'Admin data is kept only as needed for access security and system management.',
          'Data that is no longer needed should be deleted or minimized according to the studio internal policy.',
        ],
      },
      {
        title: 'Your choices and contact',
        body: [
          'You can choose not to contact Farsha Studio through WhatsApp if you do not want to share data through that service.',
          'To request correction or deletion of information you shared with the studio, contact Farsha Studio admin through the official contact number on this website.',
          'Requests may require verification so data is not disclosed or changed by an unauthorized party.',
        ],
      },
    ],
  },
};

export default function PrivacyPolicyTabs() {
  const [activeLanguage, setActiveLanguage] = useState<Language>('id');
  const policy = policies[activeLanguage];

  return (
    <section className="space-y-10">
      <div className="theme-soft-surface theme-border inline-flex w-full border p-1 sm:w-auto">
        {(Object.keys(policies) as Language[]).map((language) => {
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
              {policies[language].label}
            </button>
          );
        })}
      </div>

      <article className="space-y-10">
        <header className="theme-border space-y-5 border-b pb-8">
          <div className="space-y-2">
            <p className="theme-muted-strong font-mono text-xs font-bold uppercase tracking-widest">
              {policy.eyebrow}
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-[var(--theme-text)] sm:text-5xl">
              {policy.title}
            </h1>
          </div>
          <div className="theme-muted-strong max-w-3xl space-y-4 text-sm leading-relaxed sm:text-base">
            <p>{policy.intro}</p>
            <p className="theme-soft-surface theme-border border p-4 text-xs leading-relaxed text-[var(--theme-text)] sm:text-sm">
              {policy.reviewNote}
            </p>
            <p className="theme-muted font-mono text-[11px] font-semibold uppercase tracking-wider">
              {policy.lastUpdated}
            </p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {policy.sections.map((section) => (
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
