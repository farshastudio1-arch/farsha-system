"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

type LogoutButtonProps = {
  variant?: "sidebar" | "pos";
};

const logoutRedirect = "/admin/login";

export default function LogoutButton({ variant = "sidebar" }: LogoutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut({ redirectTo: logoutRedirect });
    } catch {
      window.location.assign(logoutRedirect);
    }
  }

  const label = isSigningOut ? "Logging out..." : "Logout";

  if (variant === "pos") {
    return (
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={isSigningOut}
        aria-busy={isSigningOut}
        className="flex items-center text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:cursor-wait disabled:opacity-60"
      >
        <LogOut className="mr-1 h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
      aria-busy={isSigningOut}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut className="h-4 w-4 text-neutral-500" />
      {label}
    </button>
  );
}
