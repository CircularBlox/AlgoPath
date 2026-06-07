"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Settings {
  autoSave: "on" | "off";
  // Theme is hard-locked to dark (the app ships dark-only). The field is kept
  // for settings storage compatibility but no longer drives any theme system.
  theme: "system" | "light" | "dark";
  language: "English" | "French" | "Spanish" | "German";
}

const defaults: Settings = {
  autoSave: "on",
  theme: "dark",
  language: "English",
};

const STORAGE_KEY = "lumos-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) }
      : defaults;
  } catch {
    return defaults;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  update: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}
