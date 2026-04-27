import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "openai_api_key";
const GOOGLE_STORAGE_KEY = "google_ai_studio_key";

interface ApiKeyContextValue {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasKey: boolean;
  googleApiKey: string;
  setGoogleApiKey: (key: string) => void;
  hasGoogleKey: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [googleApiKey, setGoogleApiKeyState] = useState("");

  // Load persisted key on mount (client only — guarded for SSR).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setApiKeyState(stored);
      const storedGoogle = window.localStorage.getItem(GOOGLE_STORAGE_KEY);
      if (storedGoogle) setGoogleApiKeyState(storedGoogle);
    } catch {
      // localStorage unavailable (private mode, disabled storage, etc.)
    }
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (typeof window === "undefined") return;
    try {
      if (key.trim()) {
        window.localStorage.setItem(STORAGE_KEY, key);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore write failures — key still works for the session.
    }
  };

  const setGoogleApiKey = (key: string) => {
    setGoogleApiKeyState(key);
    if (typeof window === "undefined") return;
    try {
      if (key.trim()) {
        window.localStorage.setItem(GOOGLE_STORAGE_KEY, key);
      } else {
        window.localStorage.removeItem(GOOGLE_STORAGE_KEY);
      }
    } catch {
      // Ignore write failures.
    }
  };

  return (
    <ApiKeyContext.Provider
      value={{
        apiKey,
        setApiKey,
        hasKey: apiKey.trim().length > 0,
        googleApiKey,
        setGoogleApiKey,
        hasGoogleKey: googleApiKey.trim().length > 0,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error("useApiKey must be used within ApiKeyProvider");
  return ctx;
}
