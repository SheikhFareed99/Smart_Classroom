import { useState, createContext, useContext, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import Icon from "./ui/Icon";
import "./ThemeToggle.css";

//context so any child component can read dark mode state
const ThemeContext = createContext({
  darkMode: false,
  toggleTheme: () => {},
});

//hook to use theme in any component
export function useTheme() {
  return useContext(ThemeContext);
}

//provider wraps the app or page, manages dark mode state
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("aico-theme");
      if (saved === "dark") return true;
      if (saved === "light") return false;
    } catch (e) {
      // ignore
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  function toggleTheme() {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aico-theme", next ? "dark" : "light");
      } catch (e) {
        // ignore
      }
      return next;
    });
  }

  // keep document root in sync so global selectors work (e.g. [data-theme="dark"] or .dark)
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <div className={darkMode ? "dark" : ""}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// toggle button component — pass className to override position; inline drops fixed positioning
export default function ThemeToggle({
  className = "",
  inline = false,
}: {
  className?: string;
  /** When true, sits in normal flow (e.g. inside nav bars) instead of fixed top-right */
  inline?: boolean;
}) {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle ${inline ? "theme-toggle--inline" : ""} ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon icon={darkMode ? Sun : Moon} size={20} />
    </button>
  );
}
