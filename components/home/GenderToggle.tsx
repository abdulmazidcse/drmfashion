"use client";

type Gender = "men" | "women";

/**
 * Men / Women pill switch shared by the homepage sections. A white pill with a
 * sliding ink thumb — the same shape as the header's navigation pill.
 */
export default function GenderToggle({
  value,
  onChange,
  className = "",
}: {
  value: Gender;
  onChange: (g: Gender) => void;
  className?: string;
}) {
  return (
    <div className={`relative flex rounded-full border border-sg-line bg-white p-[4px] ${className}`}>
      <span
        className={`absolute bottom-[4px] top-[4px] w-[calc(50%-4px)] rounded-full bg-sg-ink transition-all duration-300 ease-out ${
          value === "women" ? "left-[50%]" : "left-[4px]"
        }`}
      />
      {(["men", "women"] as Gender[]).map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          className={`relative z-10 min-w-[96px] cursor-pointer rounded-full px-5 py-2 text-center text-[13px] font-semibold capitalize transition-colors duration-300 md:min-w-[120px] ${
            value === g ? "text-white" : "text-sg-soft hover:text-sg-ink"
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
