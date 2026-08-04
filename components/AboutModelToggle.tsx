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
    name: "Short",
    height: "6'3\" (190 cm)",
    weight: "185 lbs (84 kg)",
    size: "Wearing Medium, short length",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Regular",
    height: "6'6\" (198 cm)",
    weight: "210 lbs (95 kg)",
    size: "Wearing Large, regular length",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Long",
    height: "6'10\" (208 cm)",
    weight: "235 lbs (106 kg)",
    size: "Wearing XL, long length",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  }
]

const womenModels: Model[] = [
  {
    name: "Short",
    height: "5'10\" (178 cm)",
    weight: "145 lbs (66 kg)",
    size: "Wearing Medium, short length",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Regular",
    height: "6'1\" (185 cm)",
    weight: "165 lbs (75 kg)",
    size: "Wearing Large, regular length",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  },
  {
    name: "Long",
    height: "6'4\" (193 cm)",
    weight: "180 lbs (82 kg)",
    size: "Wearing XL, long length",
    image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
  }
]

export default function AboutModelToggle() {
  const [gender, setGender] = useState<"men" | "women">("men")
  const models = gender === "men" ? menModels : womenModels

  return (
    <div className="w-full bg-cream p-6 md:p-10 border border-line/50 flex flex-col items-center">
      {/* Gender Toggles */}
      <div className="flex items-center gap-2 mb-8 bg-line/60 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setGender("men")}
          className={`px-8 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all rounded-xl cursor-pointer ${
            gender === "men"
              ? "bg-brand-ink text-white shadow-sm"
              : "text-soft hover:text-brand-700"
          }`}
        >
          Men Fit
        </button>
        <button
          type="button"
          onClick={() => setGender("women")}
          className={`px-8 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all rounded-xl cursor-pointer ${
            gender === "women"
              ? "bg-brand-ink text-white shadow-sm"
              : "text-soft hover:text-brand-700"
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
            <div className="aspect-[3/4] w-full overflow-hidden bg-line border border-line/40 mb-4 relative">
              <img
                src={model.image}
                alt={model.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            
            {/* Specs */}
            <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-foreground mb-1">
              {model.name}
            </h4>
            <p className="text-[10px] font-bold text-faint uppercase tracking-[0.14em] mb-1">
              {model.height} &bull; {model.weight}
            </p>
            <p className="text-[10px] text-soft font-medium italic">
              {model.size}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
