const ITEMS = [
  { icon: "⇥", tone: "copper", title: "Free shipping", text: "On every order above ৳5,000, dispatched the same day." },
  { icon: "↺", tone: "aqua", title: "30-day returns", text: "Wrong fit? Send it back free — no questions, no restocking fee." },
  { icon: "✂", tone: "copper", title: "Free alterations", text: "Complimentary hemming and taper for life on full-price pieces." },
  { icon: "✆", tone: "aqua", title: "Real support", text: "Talk to a fit specialist seven days a week, 10am–8pm." },
] as const;

/**
 * The four promises, as four cards. Alternating copper/cyan icon tiles so the row
 * reads as a set rather than four identical boxes.
 */
export default function ValueProps() {
  return (
    <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 py-4 lg:py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {ITEMS.map((item) => (
          <div key={item.title} className="sg-card p-6 sm:p-7">
            <span
              className={`w-12 h-12 rounded-[15px] grid place-items-center text-[20px] mb-4 ${
                item.tone === "aqua" ? "bg-aqua-50 text-aqua-700" : "bg-brand-50 text-brand-600"
              }`}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <h3 className="text-[15.5px] font-extrabold mb-1.5">{item.title}</h3>
            <p className="text-soft text-[13.5px] leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
