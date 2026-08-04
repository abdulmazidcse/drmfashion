import SectionHead from "./SectionHead";

/**
 * Social proof block. The quotes are house copy rather than live `Review` rows on
 * purpose: this sits above the fold-and-a-half on the homepage and must render
 * from the static shell, and a homepage-wide review query would be a fifth
 * database round trip for three sentences. Product pages show the real reviews.
 */
const QUOTES = [
  {
    stars: 5,
    quote: "The cut is spot on and the fabric has held up wash after wash. I bought three more the same week.",
    name: "Rafiul H.",
    meta: "Dhaka · Verified buyer",
    initials: "RH",
  },
  {
    stars: 5,
    quote: "The dress falls exactly where the photo shows it on the model. That never happens anywhere else.",
    name: "Nusrat A.",
    meta: "Chattogram · Verified buyer",
    initials: "NA",
  },
  {
    stars: 4,
    quote: "Free alterations sealed it. Ordered, they adjusted the inseam, and it arrived in four days.",
    name: "Tanvir K.",
    meta: "Sylhet · Verified buyer",
    initials: "TK",
  },
];

export default function Reviews() {
  return (
    <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 py-10 lg:py-14">
      <SectionHead
        kicker="Loved by our customers"
        title="2,140 reviews and counting"
        href="/shop"
        linkLabel="Shop best rated"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {QUOTES.map((r) => (
          <figure key={r.name} className="sg-card p-7 flex flex-col">
            <div className="text-brand-500 text-[15px] tracking-[-1px] mb-4" aria-label={`${r.stars} out of 5 stars`}>
              {"★".repeat(r.stars)}
              <span className="text-line">{"★".repeat(5 - r.stars)}</span>
            </div>

            <blockquote className="text-[15px] leading-[1.75] text-[#33302c] flex-1">
              “{r.quote}”
            </blockquote>

            <figcaption className="flex items-center gap-3 mt-6 pt-5 border-t border-line">
              <span className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-[14px] font-extrabold shrink-0">
                {r.initials}
              </span>
              <span>
                <span className="block text-[14px] font-bold">{r.name}</span>
                <span className="block text-[12px] text-soft">{r.meta}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
