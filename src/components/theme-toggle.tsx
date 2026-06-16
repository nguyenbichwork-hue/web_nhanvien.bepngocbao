"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

// Theo dõi class "dark" trên <html> như một external store → không cần
// setState trong effect, không lệch hydration (server luôn coi là sáng).
function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("bnb-theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button className="iconbtn" onClick={toggle} title="Chế độ sáng/tối" aria-label="Chế độ sáng/tối">
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
