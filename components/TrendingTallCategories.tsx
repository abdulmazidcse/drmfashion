"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function TrendingTallCategories() {
  const [activeGender, setActiveGender] = useState<"men" | "women">("men");

  const data = {
    men: [
      { title: "Shorts", img: "/images/shorts.png", link: "/shop?gender=men&query=shorts" },
      { title: "Button Shirts", img: "/images/men_hero.png", link: "/shop?gender=men&query=shirt" },
      { title: "Jeans", img: "/images/community.png", link: "/shop?gender=men&query=jeans" },
      { title: "Tees", img: "/images/tees.png", link: "/shop?gender=men&query=tee" },
      { title: "Pants & Chinos", img: "/images/pants.png", link: "/shop?gender=men&query=pants" },
      { title: "Athletic Pants", img: "/images/swim.png", link: "/shop?gender=men&query=athletic" }
    ],
    women: [
      { title: "Shorts", img: "/images/women_shorts.png", link: "/shop?gender=women&query=shorts" },
      { title: "Button Shirts", img: "/images/women_shirt.png", link: "/shop?gender=women&query=shirt" },
      { title: "Jeans", img: "/images/women_jeans.png", link: "/shop?gender=women&query=jeans" },
      { title: "Tees", img: "/images/women_tees.png", link: "/shop?gender=women&query=tee" },
      { title: "Pants & Chinos", img: "/images/women_pants.png", link: "/shop?gender=women&query=pants" },
      { title: "Athletic Pants", img: "/images/women_swim.png", link: "/shop?gender=women&query=athletic" }
    ]
  };

  return (
    <section className="w-full py-24 px-6 lg:px-12 xl:px-20 bg-white border-t border-line">
      {/* Header and Toggle Pill Centered */}
      <div className="flex flex-col sm:flex-row justify-center items-center mb-16 gap-6 sm:gap-8">
        <h2 className="text-4xl font-extrabold uppercase tracking-tighter text-foreground text-center sm:text-left">
          Trending Tall Categories
        </h2>
        <div className="flex bg-[#F5F5F5] p-1.5 rounded-xl border border-line">
          <button 
            onClick={() => setActiveGender("men")}
            className={`px-8 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${activeGender === "men" ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
          >
            Men
          </button>
          <button 
            onClick={() => setActiveGender("women")}
            className={`px-8 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${activeGender === "women" ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
          >
            Women
          </button>
        </div>
      </div>

      {/* Grid Content with transitions */}
      <div key={activeGender} className="grid grid-cols-2 md:grid-cols-6 gap-6 w-full max-w-[1600px] mx-auto animate-fade-up">
        {data[activeGender].map((cat, idx) => (
          <Link href={cat.link} key={idx} className="text-center group cursor-pointer flex flex-col items-center">
            <div className="aspect-[3/4] w-full bg-[#F5F5F5] mb-4 overflow-hidden relative border border-line rounded-xl">
              <img 
                src={cat.img} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" 
                alt={cat.title}
              />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground group-hover:text-soft transition-colors">
              {cat.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
