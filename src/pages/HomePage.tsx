import React from 'react';
import InteractiveHero from "@/components/ui/hero-section-nexus";
import { Footer } from "@/app/layout/Footer";

export function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <InteractiveHero />
      <Footer />
    </div>
  );
}

