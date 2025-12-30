import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SnackbarType = "success" | "error" | "info";

interface SnackbarMessage {
  id: number;
  text: string;
  type: SnackbarType;
  duration?: number; // ms
}

interface SnackbarContextValue {
  showSnackbar: (text: string, type?: SnackbarType, duration?: number) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

export const useSnackbar = () => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider");
  return ctx;
};

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<SnackbarMessage[]>([]);

  const showSnackbar = useCallback((text: string, type: SnackbarType = "info", duration = 3000) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text, type, duration }]);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const timers = messages.map((m) => setTimeout(() => {
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    }, m.duration ?? 3000));
    return () => { timers.forEach(clearTimeout); };
  }, [messages]);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div aria-live="polite" aria-relevant="additions" className="snackbar-container">
        {messages.map((m) => (
          <div key={m.id} className={`snackbar snackbar-${m.type}`} role={m.type === "error" ? "alert" : "status"}>
            {m.text}
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
};
