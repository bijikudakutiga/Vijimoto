"use client";

import { useEffect, useState } from "react";

// Menampilkan pop up ajakan install PWA:
// - Android/Chrome: pakai event bawaan 'beforeinstallprompt'
// - iOS/Safari: tidak ada event ini, jadi ditampilkan instruksi manual
//   ("Share -> Add to Home Screen") karena itu satu-satunya cara di iOS.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidPopup, setShowAndroidPopup] = useState(false);
  const [showIosPopup, setShowIosPopup] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissed = localStorage.getItem("vijimoto_install_dismissed");
    if (dismissed) return;

    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

    if (isIos) {
      setShowIosPopup(true);
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPopup(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem("vijimoto_install_dismissed", "1");
    setShowAndroidPopup(false);
    setShowIosPopup(false);
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowAndroidPopup(false);
  }

  if (!showAndroidPopup && !showIosPopup) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm
                     bg-white border border-line rounded-2xl shadow-xl p-4 flex gap-3 items-start">
      <img src="/icons/icon-192.png" alt="Vijimoto" className="w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1">
        <div className="font-display font-semibold text-sm">Install Vijimoto Super POS</div>
        {showIosPopup ? (
          <p className="text-xs text-ink-soft mt-1">
            Tap ikon Share <span className="font-semibold">⎋</span> lalu pilih{" "}
            <span className="font-semibold">&quot;Add to Home Screen&quot;</span> untuk akses lebih cepat.
          </p>
        ) : (
          <p className="text-xs text-ink-soft mt-1">
            Pasang aplikasi ini di perangkat Anda untuk akses lebih cepat, layaknya aplikasi native.
          </p>
        )}
        <div className="flex gap-2 mt-3">
          {showAndroidPopup && (
            <button
              onClick={handleInstallClick}
              className="text-xs font-semibold bg-orange text-white rounded-pill px-3.5 py-1.5"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="text-xs font-semibold text-ink-soft rounded-pill px-3.5 py-1.5"
          >
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}
