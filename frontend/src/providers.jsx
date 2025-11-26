import { HeroUIProvider } from "@heroui/react";
import { useNavigate, useHref } from "react-router-dom";

export function Providers({ children }) {
  const navigate = useNavigate();

  return (
    <HeroUIProvider 
      navigate={navigate} 
      useHref={useHref}
    >
      {children}
    </HeroUIProvider>
  );
}
