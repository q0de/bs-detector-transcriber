import { useTheme as useHeroUITheme } from "@heroui/use-theme";

export function useTheme() {
  const { theme, setTheme } = useHeroUITheme();
  
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return { 
    theme, 
    setTheme, 
    toggleTheme, 
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}

