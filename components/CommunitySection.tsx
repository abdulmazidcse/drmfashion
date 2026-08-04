"use client";

import React, { useState } from "react";
import Link from "next/link";

type TabKey = "heights" | "fit" | "purpose";

interface TabContent {
  label: string;
  heading: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

interface CommunitySectionProps {
  initialTabs?: {
    heights?: TabContent;
    fit?: TabContent;
    purpose?: TabContent;
  } | null;
}

const defaultTabs = {
  heights: {
    label: "Our Heights",
    heading: "Designed For Real Heights.",
    description: "We engineer clothing specifically for tall men from 6'3\" to 7'1\" and tall women from 5'9\" to 6'6\". Every pattern is scaled vertically to ensure the waist, elbows, and knees land exactly where they should.",
    image: "/images/men_hero.png",
    ctaText: "Explore Heights",
    ctaLink: "/about"
  },
  fit: {
    label: "Our Fit",
    heading: "Proportions, Perfected.",
    description: "Standard grading just adds width. We adjust every single measurement—sleeve length, torso length, shoulder width, and rise—to create a tailored fit that respects your height without being baggy.",
    image: "/images/pants.png",
    ctaText: "Explore Fit Guide",
    ctaLink: "/about"
  },
  purpose: {
    label: "Our Purpose",
    heading: "We're All About Community.",
    description: "We know the frustration of searching endlessly for clothing that fits—and coming up short. What started as one family's mission to solve fit challenges with better options has reached a global community of tall people with a shared vision.",
    image: "/images/community.png",
    ctaText: "Learn More",
    ctaLink: "/about"
  }
};

export default function CommunitySection({ initialTabs }: CommunitySectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("purpose");

  const tabContents = {
    heights: { ...defaultTabs.heights, ...initialTabs?.heights },
    fit: { ...defaultTabs.fit, ...initialTabs?.fit },
    purpose: { ...defaultTabs.purpose, ...initialTabs?.purpose }
  };

  return (
    <section className="max-w-[1440px] mx-auto py-24 px-6 lg:px-12 grid md:grid-cols-2 gap-20 items-center bg-white border-t border-line">
      <div className="max-w-xl">
        {/* Toggle tabs */}
        <div className="flex gap-8 mb-10 text-[10px] font-bold uppercase tracking-[0.2em] text-faint border-b border-line pb-3">
          {(["heights", "fit", "purpose"] as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`transition-all pb-1 duration-300 cursor-pointer ${
                activeTab === key
                  ? "text-black border-b-2 border-black font-extrabold"
                  : "hover:text-black"
              }`}
            >
              {tabContents[key].label}
            </button>
          ))}
        </div>

        {/* Dynamic content area */}
        <div key={`text-${activeTab}`} className="animate-fade-up">
          <h2 className="text-5xl font-bold mb-8 tracking-tighter leading-tight text-foreground">
            {tabContents[activeTab].heading}
          </h2>
          <p className="text-soft text-lg leading-relaxed mb-12 min-h-[120px]">
            {tabContents[activeTab].description}
          </p>
          <Link 
            href={tabContents[activeTab].ctaLink} 
            className="inline-block bg-black text-white px-12 py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
          >
            {tabContents[activeTab].ctaText}
          </Link>
        </div>
      </div>

      {/* Image container with transition */}
      <div key={`img-${activeTab}`} className="aspect-square bg-cream overflow-hidden relative border border-line rounded-xl animate-fade-in">
        <img 
          src={tabContents[activeTab].image} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105" 
          alt={tabContents[activeTab].label} 
        />
      </div>
    </section>
  );
}
