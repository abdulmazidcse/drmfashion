"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function SummerStyles() {
  const [activeGender, setActiveGender] = useState<"men" | "women">("men");

  const data = {
    men: [
      { title: "Shorts", img: "/images/shorts.png", link: "/shop?gender=men&query=shorts" },
      { title: "Swim", img: "/images/swim.png", link: "/shop?gender=men&query=swim" },
      { title: "Tees", img: "/images/tees.png", link: "/shop?gender=men&query=tees" },
      { title: "Pants", img: "/images/pants.png", link: "/shop?gender=men&query=pants" }
    ],
    women: [
      { title: "Shorts", img: "/images/women_shorts.png", link: "/shop?gender=women&query=shorts" },
      { title: "Swim", img: "/images/women_swim.png", link: "/shop?gender=women&query=swim" },
      { title: "Tees", img: "/images/women_tees.png", link: "/shop?gender=women&query=tees" },
      { title: "Pants", img: "/images/women_pants.png", link: "/shop?gender=women&query=pants" }
    ]
  };

  return (
    <section className="w-full py-24 px-6 lg:px-12 xl:px-20 bg-white border-b border-zinc-100">
      {/* Header and Toggle Pill Centered */}
      <div className="flex flex-col sm:flex-row justify-center items-center mb-16 gap-6 sm:gap-8">
        <h2 className="text-4xl font-extrabold uppercase tracking-tighter text-zinc-900 text-center sm:text-left">
          Summer Styles
        </h2>
        <div className="flex bg-[#F5F5F5] p-1.5 rounded-sm border border-zinc-200">
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
      <div key={activeGender} className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 xl:gap-10 w-full max-w-[1600px] mx-auto animate-fade-up">
        {data[activeGender].map((item, idx) => (
          <Link href={item.link} key={idx} className="group cursor-pointer flex flex-col items-center">
            <div className="aspect-[3/4] w-full bg-zinc-100 overflow-hidden mb-6 relative border border-zinc-100 rounded-sm">
              <img 
                src={item.img} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                alt={item.title} 
              />
            </div>
            <p className="text-center font-bold uppercase text-[12px] tracking-widest text-zinc-900 group-hover:text-zinc-600 transition-colors">
              {item.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
