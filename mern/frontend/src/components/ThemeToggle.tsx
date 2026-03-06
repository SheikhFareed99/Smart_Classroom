import { useState, useEffect, createContext, useContext } from "react";
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
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [darkMode, setDarkMode] = useState(systemPrefersDark);

  //sync html & body background so no white bleeds through on scroll
  useEffect(() => {
    const bg = darkMode ? "#0F172A" : "#F8FAFC";
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [darkMode]);


  function toggleTheme() {
    setDarkMode((prev) => !prev);
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <div className={darkMode ? "dark" : ""}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

//toggle button component — pass className to override position
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button className={`theme-toggle ${className}`} onClick={toggleTheme}>
      {darkMode ? (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="4" />
          <path d="M10 1v2M10 17v2M3.3 3.3l1.4 1.4M15.3 15.3l1.4 1.4M1 10h2M17 10h2M3.3 16.7l1.4-1.4M15.3 4.7l1.4-1.4" />
        </svg>
      ) : (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
