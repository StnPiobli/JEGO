"use client";
import { useEffect, useRef, useState } from "react";

// Bouton flottant « remonter en haut ».
//
// Il ne surveille pas UN conteneur mais TOUS : le dernier element que
// l'on fait defiler (page principale OU liste/carte a scroll interne)
// devient la cible. Le bouton apparait des qu'on a descendu dedans, et
// le ramene en haut. Ainsi il marche partout ou du contenu defile.
export default function BoutonRemonter() {
  const [visible, setVisible] = useState(false);
  const cible = useRef<HTMLElement | Window | null>(null);

  useEffect(() => {
    function scrollTopDe(el: EventTarget | null): number {
      if (el === document || el === window) return window.scrollY;
      return (el as HTMLElement)?.scrollTop ?? 0;
    }
    function onScroll(e: Event) {
      const el = e.target as HTMLElement | Document;
      // On ignore le défilement de la barre latérale (<aside>) : le bouton
      // doit toujours remonter le CONTENU de la page, jamais le menu.
      if (el !== document && (el as HTMLElement)?.closest?.("aside")) return;
      cible.current = (el === document ? window : (el as HTMLElement));
      setVisible(scrollTopDe(el) > 300);
    }
    // Capture : on entend le scroll de n'importe quel element imbrique.
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  function remonter() {
    const c = cible.current;
    if (!c) return;
    if (c === window) window.scrollTo({ top: 0, behavior: "smooth" });
    else (c as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <button
      onClick={remonter}
      title="Remonter en haut"
      aria-label="Remonter en haut"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-green-700 text-white shadow-lg flex items-center justify-center text-[20px] leading-none hover:bg-green-800"
    >
      ↑
    </button>
  );
}
