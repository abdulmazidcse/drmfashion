"use client"

import { useState } from "react"

interface Model {
  name: string
  height: string
  weight: string
  size: string
  image: string
}

const menModels: Model[] = [
  {
    name: "Regular Tall",
    height: "6'3\" (190 cm)",
    weight: "185 lbs (84 kg)",
    size: "Wearing Size Medium Tall (MT)",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Tall",
    height: "6'6\" (198 cm)",
    weight: "210 lbs (95 kg)",
    size: "Wearing Size Large Tall (LT)",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Extra Tall",
    height: "6'10\" (208 cm)",
    weight: "235 lbs (106 kg)",
    size: "Wearing Size XL Tall (XLT)",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  }
]

const womenModels: Model[] = [
  {
    name: "Regular Tall",
    height: "5'10\" (178 cm)",
    weight: "145 lbs (66 kg)",
    size: "Wearing Size Medium Tall (MT)",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Tall",
    height: "6'1\" (185 cm)",
    weight: "165 lbs (75 kg)",
    size: "Wearing Size Large Tall (LT)",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Extra Tall",
    height: "6'4\" (193 cm)",
    weight: "180 lbs (82 kg)",
    size: "Wearing Size XL Tall (XLT)",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  }
]

export default function AboutModelToggle() {
  const [gender, setGender] = useState<"men" | "women">("men")
  const models = gender === "men" ? menModels : womenModels

  return (
    <div className="w-full bg-zinc-50 p-6 md:p-10 border border-zinc-200/50 flex flex-col items-center">
      {/* Gender Toggles */}
      <div className="flex items-center gap-2 mb-8 bg-zinc-200/40 p-1 rounded-sm">
        <button
          type="button"
          onClick={() => setGender("men")}
          className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm cursor-pointer ${
            gender === "men"
              ? "bg-zinc-950 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-950"
          }`}
        >
          Men Fit
        </button>
        <button
          type="button"
          onClick={() => setGender("women")}
          className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm cursor-pointer ${
            gender === "women"
              ? "bg-zinc-950 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-950"
          }`}
        >
          Women Fit
        </button>
      </div>

      {/* Model Profiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
        {models.map((model, idx) => (
          <div key={idx} className="flex flex-col items-center text-center group">
            {/* Image Box */}
            <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-200 border border-zinc-200/40 mb-4 relative">
              <img
                src={model.image}
                alt={model.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            
            {/* Specs */}
            <h4 className="text-[12px] font-black uppercase tracking-wider text-zinc-950 mb-1">
              {model.name}
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
              {model.height} &bull; {model.weight}
            </p>
            <p className="text-[10px] text-zinc-500 font-medium italic">
              {model.size}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
