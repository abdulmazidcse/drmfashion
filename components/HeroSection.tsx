"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SlideConfig {
  video: string;
  videoFallback: string;
  image: string;
  title: string;
  subtitle: string;
  shopLink: string;
  buttonText: string;
  topBarTag?: string;
}

interface HeroSectionProps {
  initialSlides?: {
    men?: SlideConfig;
    women?: SlideConfig;
    rotationInterval?: number;
  } | null;
}

const defaultSlides = {
  men: {
    video: "/videos/men.mp4",
    videoFallback: "/videos/fashion.mp4",
    image: "/images/men_hero.png",
    title: "FINALLY, CLOTHES THAT FIT.",
    subtitle: "Designed specifically for men up to 7'1\". Proportions perfected for vertical precision.",
    shopLink: "/shop",
    buttonText: "Shop Men",
    topBarTag: "Made for Tall"
  },
  women: {
    video: "/videos/women.mp4",
    videoFallback: "/videos/main-side-video.mp4",
    image: "/images/olaszkolda-fashion-10318918.jpg",
    title: "ELEGANCE IN EVERY INCH.",
    subtitle: "Tailored specifically for tall women up to 6'6\". Modern style with perfect length.",
    shopLink: "/shop",
    buttonText: "Shop Women",
    topBarTag: "Made for Tall"
  },
  rotationInterval: 7000
};

export default function HeroSection({ initialSlides }: HeroSectionProps) {
  const [activeTab, setActiveTab] = useState<"men" | "women">("men");
  const [buttonY, setButtonY] = useState<number | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const slides = {
    men: { ...defaultSlides.men, ...initialSlides?.men },
    women: { ...defaultSlides.women, ...initialSlides?.women }
  };
  const rotationInterval = initialSlides?.rotationInterval || defaultSlides.rotationInterval;

  useEffect(() => {
    if (rotationInterval <= 0) return; // disable auto rotation if 0
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev === "men" ? "women" : "men"));
    }, rotationInterval);
    return () => clearInterval(interval);
  }, [rotationInterval]);

  useEffect(() => {
    const handleResize = () => {
      if (buttonRef.current) {
        const parent = buttonRef.current.closest("section");
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const rect = buttonRef.current.getBoundingClientRect();
          setButtonY(rect.top - parentRect.top + (rect.height / 2));
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <section className="relative h-[85vh] w-full grid grid-cols-1 md:grid-cols-2 bg-zinc-950 overflow-hidden">
      {/* Left Side: Background Video + Content */}
      <div className="relative h-full flex items-center justify-center overflow-hidden p-6 sm:p-12">
        {/* Men Video */}
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${activeTab === "men" ? "opacity-50" : "opacity-0"}`}>
          {activeTab === "men" && (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={slides.men.video} type="video/mp4" />
              <source src={slides.men.videoFallback} type="video/mp4" />
            </video>
          )}
        </div>

        {/* Women Video */}
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${activeTab === "women" ? "opacity-50" : "opacity-0"}`}>
          {activeTab === "women" && (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={slides.women.video} type="video/mp4" />
              <source src={slides.women.videoFallback} type="video/mp4" />
            </video>
          )}
        </div>

        <div className="absolute inset-0 bg-black/30"></div>

        {/* Text Content */}
        <div className="relative z-10 text-center text-white max-w-lg">
          <p className="uppercase tracking-[0.3em] text-[12px] font-bold mb-4 text-indigo-400">
            {activeTab === "men" ? slides.men.topBarTag : slides.women.topBarTag}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-[1.0] tracking-tighter uppercase whitespace-pre-line">
            {activeTab === "men" ? slides.men.title : slides.women.title}
          </h1>
          <p className="mb-8 text-sm md:text-base font-medium opacity-90 leading-relaxed text-zinc-300 min-h-[48px]">
            {activeTab === "men" ? slides.men.subtitle : slides.women.subtitle}
          </p>
          <div ref={buttonRef} className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href={slides.men.shopLink} className={`px-8 py-3.5 font-bold uppercase tracking-widest text-[11px] transition-all duration-300 ${activeTab === "men" ? "bg-white text-black hover:bg-black hover:text-white" : "border border-white text-white hover:bg-white hover:text-black"}`}>
              {slides.men.buttonText}
            </Link>
            <Link href={slides.women.shopLink} className={`px-8 py-3.5 font-bold uppercase tracking-widest text-[11px] transition-all duration-300 ${activeTab === "women" ? "bg-white text-black hover:bg-black hover:text-white" : "border border-white text-white hover:bg-white hover:text-black"}`}>
              {slides.women.buttonText}
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side: Image with Tab Buttons */}
      <div className="relative h-full hidden md:block">
        {/* Men Image */}
        <img 
          src={slides.men.image} 
          className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out ${activeTab === "men" ? "opacity-100" : "opacity-0"}`} 
          alt="Tall Men Collection"
        />

        {/* Women Image */}
        <img 
          src={slides.women.image} 
          className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out ${activeTab === "women" ? "opacity-100" : "opacity-0"}`} 
          alt="Tall Women Collection"
        />
      </div>

      {/* Switcher pill placed on the divider line and aligned vertically with the left buttons */}
      {buttonY !== null && (
        <div 
          style={{ top: `${buttonY}px` }}
          className="absolute left-[75%] -translate-y-1/2 -translate-x-1/2 z-20 hidden md:flex gap-4 whitespace-nowrap"
        >
          <button 
            type="button"
            onClick={() => setActiveTab("men")}
            className={`px-8 py-3.5 font-bold uppercase tracking-widest text-[11px] transition-all duration-300 cursor-pointer ${
              activeTab === "men" 
                ? "bg-white text-black shadow-md" 
                : "border border-white text-white hover:bg-white hover:text-black"
            }`}
          >
            Men
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("women")}
            className={`px-8 py-3.5 font-bold uppercase tracking-widest text-[11px] transition-all duration-300 cursor-pointer ${
              activeTab === "women" 
                ? "bg-white text-black shadow-md" 
                : "border border-white text-white hover:bg-white hover:text-black"
            }`}
          >
            Women
          </button>
        </div>
      )}
    </section>
  );
}
