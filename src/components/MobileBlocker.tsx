import { useEffect, useState } from "react";

export function MobileBlocker() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check screen width (mobile/tablet is typically < 1024px)
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobile(isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Mobile support is not yet available
        </h1>
        <p className="text-muted-foreground">
          Please use a desktop browser for the best experience.
        </p>
      </div>
    </div>
  );
}

