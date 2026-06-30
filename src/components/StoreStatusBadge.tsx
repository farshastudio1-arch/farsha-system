'use client';

import React, { useState, useEffect } from 'react';

export default function StoreStatusBadge() {
  const [status, setStatus] = useState<'open' | 'closed' | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      // Convert local client timezone to WITA (UTC+8)
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const witaDate = new Date(utcTime + 3600000 * 8);
      const hours = witaDate.getHours();

      // Open daily 10 AM to 8 PM (20:00) WITA
      if (hours >= 10 && hours < 20) {
        setStatus('open');
      } else {
        setStatus('closed');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (status === null) {
    return (
      <div className="flex flex-col gap-1 mt-1">
        <span className="theme-muted font-mono text-[8px] font-bold uppercase tracking-wider">
          STATUS
        </span>
        <span className="border border-slate-100 bg-slate-50 px-2 py-1 text-left font-mono text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400 animate-pulse">
          Checking...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      <span className="theme-muted font-mono text-[8px] font-bold uppercase tracking-wider">
        STATUS
      </span>
      {status === 'open' ? (
        <span className="landing-visit-badge-open border px-2.5 py-1.5 text-left font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shadow-xs">
          Open
        </span>
      ) : (
        <span className="landing-visit-badge-closed border px-2.5 py-1.5 text-left font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shadow-xs">
          Closed
        </span>
      )}
    </div>
  );
}
