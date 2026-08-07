"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
// TODO(mutations): migrate to mutation layer - legacy module (admin/report/dashboard)
// eslint-disable-next-line no-restricted-imports
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ThemeMode = 'light' | 'dark' | 'auto' | 'system';

interface ThemeContextType {
    textSize: number; // in pixels (default 16)
    displayScale: number; // multiplier (default 1)
    themeMode: ThemeMode;
    updatePreferences: (newTextSize: number, newDisplayScale: number, newThemeMode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
    textSize: 16,
    displayScale: 1,
    themeMode: 'system',
    updatePreferences: async () => { }
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [textSize, setTextSize] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem("app-preferences");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.textSize) return parsed.textSize;
                }
            } catch (e) {}
        }
        return 16;
    });
    const [displayScale, setDisplayScale] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem("app-preferences");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.displayScale) return parsed.displayScale;
                }
            } catch (e) {}
        }
        return 1;
    });
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem("app-preferences");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.themeMode) return parsed.themeMode;
                }
            } catch (e) {}
        }
        return 'system';
    });
    const [loaded, setLoaded] = useState(false);

    // Apply styles
    useEffect(() => {
        const root = document.documentElement;
        root.style.fontSize = `${textSize}px`;

        // Use CSS variable/zoom for body
        (document.body.style as any).zoom = displayScale;

        // Theme Mode Logic
        const applyTheme = () => {
            let isDark = false;

            if (themeMode === 'dark') {
                isDark = true;
            } else if (themeMode === 'light') {
                isDark = false;
            } else if (themeMode === 'auto') {
                // Time based: 19:00 - 07:00 is Dark
                const hour = new Date().getHours();
                isDark = hour >= 19 || hour < 7;
            } else if (themeMode === 'system') {
                // Device based
                isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        applyTheme();

        // Listeners/Intervals
        if (themeMode === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else if (themeMode === 'auto') {
            // Check every minute for time change
            const interval = setInterval(applyTheme, 60000);
            return () => clearInterval(interval);
        }

        localStorage.setItem("app-preferences", JSON.stringify({ textSize, displayScale, themeMode }));
    }, [textSize, displayScale, themeMode]);

    // Fast mark loaded
    useEffect(() => {
        setLoaded(true);
    }, []);

    // Sincroniza preferências do Firestore (fonte authoritative, sobrepõe LocalStorage se válido)
    useEffect(() => {
        let isMounted = true;
        if (user && loaded) {
            const fetchPrefs = async () => {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);

                    if (isMounted && userSnap.exists()) {
                        const prefs = userSnap.data()?.preferences as any;
                        if (prefs && prefs.themeMode) {
                            const newText = prefs.textSize || textSize;
                            const newScale = prefs.displayScale || displayScale;
                            const newTheme = prefs.themeMode;

                            setThemeMode(newTheme);
                            if (prefs.textSize) setTextSize(prefs.textSize);
                            if (prefs.displayScale) setDisplayScale(prefs.displayScale);

                            // Atualização imediata do localStorage para o script de inicialização do <head>
                            if (typeof window !== 'undefined') {
                                try {
                                    localStorage.setItem("app-preferences", JSON.stringify({
                                        textSize: newText,
                                        displayScale: newScale,
                                        themeMode: newTheme
                                    }));
                                } catch {}
                            }
                        } else {
                            // Se o Firestore não possui preferências gravadas, envia a preferência local atual
                            const currentPrefs = {
                                textSize,
                                displayScale,
                                themeMode
                            };
                            updateDoc(userRef, { preferences: currentPrefs }).catch(() => {});
                        }
                    }
                } catch (error) {
                    console.error("Error fetching preferences:", error);
                }
            };
            fetchPrefs();
        }
        return () => { isMounted = false; };
    }, [user, loaded]);

    const updatePreferences = async (newTextSize: number, newDisplayScale: number, newThemeMode: ThemeMode) => {
        setTextSize(newTextSize);
        setDisplayScale(newDisplayScale);
        setThemeMode(newThemeMode);

        const prefsObject = {
            textSize: newTextSize,
            displayScale: newDisplayScale,
            themeMode: newThemeMode
        };

        localStorage.setItem("app-preferences", JSON.stringify(prefsObject));

        // Salva as preferências no Firestore para sincronizar entre dispositivos
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    preferences: prefsObject
                });
            } catch (error) {
                console.error("Error saving preferences:", error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ textSize, displayScale, themeMode, updatePreferences }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
