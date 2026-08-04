"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type ProductFormStepDef = {
  id: string
  title: string
  description: string
  icon: LucideIcon
}

type ProductFormStepperProps = {
  steps: ProductFormStepDef[]
  currentStep: number
  maxStepReached: number
  onStepClick: (index: number) => void
  onBack: () => void
  onNext: () => void
  isLastStep: boolean
  nextLabel?: string
  backLabel?: string
  submitSlot: React.ReactNode
  children: React.ReactNode
}

export default function ProductFormStepper({
  steps,
  currentStep,
  maxStepReached,
  onStepClick,
  onBack,
  onNext,
  isLastStep,
  nextLabel = "Next",
  backLabel = "Back",
  submitSlot,
  children,
}: ProductFormStepperProps) {
  return (
    <div className="bg-white border border-zinc-150 rounded-3xl shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* SIDEBAR */}
        <div className="md:w-72 shrink-0 bg-zinc-50/50 border-b md:border-b-0 md:border-r border-zinc-100 p-6">
          <nav className="space-y-4">
            {steps.map((s, index) => {
              const isActive = index === currentStep
              const isVisited = !isActive && index <= maxStepReached
              const isLocked = index > maxStepReached
              const isLastItem = index === steps.length - 1
              const Icon = s.icon

              return (
                <div key={s.id} className="relative">
                  {!isLastItem && (
                    <div className="absolute left-2 top-8 bottom-[-48px] w-10 flex justify-center">
                      <span
                        className={`border-l-2 border-dotted h-full ${
                          isActive || isVisited ? "border-primary" : "border-zinc-200"
                        }`}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isLocked}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => onStepClick(index)}
                    className={`relative w-full flex items-start gap-3 text-left px-2 py-3 rounded-xl transition ${
                      isVisited ? "hover:bg-zinc-100/70 cursor-pointer" : ""
                    } ${isLocked ? "cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isVisited
                          ? "border-2 border-primary text-primary bg-white"
                          : "border border-zinc-200 text-zinc-400 bg-zinc-50"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="pt-1.5">
                      <span
                        className={`block text-sm font-semibold ${
                          isActive ? "text-foreground" : isVisited ? "text-zinc-700" : "text-zinc-400"
                        }`}
                      >
                        {s.title}
                      </span>
                      <span className={`block text-xs mt-0.5 ${isLocked ? "text-zinc-400" : "text-zinc-500"}`}>
                        {s.description}
                      </span>
                    </span>
                  </button>
                </div>
              )
            })}
          </nav>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-6 min-w-0 flex flex-col">
          <div className="flex-1">{children}</div>

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-100">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
                {backLabel}
              </button>
            ) : (
              <span />
            )}

            {isLastStep ? (
              submitSlot
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-5 rounded-xl transition cursor-pointer text-sm shadow-sm"
              >
                {nextLabel}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
