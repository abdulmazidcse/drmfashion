import NewsletterForm from "../NewsletterForm";

/**
 * The white panel that closes the homepage. The form itself is the existing
 * <NewsletterForm> — same POST to /api/newsletter, same states — so there is one
 * signup implementation on the site, not two.
 */
export default function NewsletterCard() {
  return (
    <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 py-10 lg:py-14">
      <div className="sg-card sg-card-lg sg-raise p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div>
          <span className="sg-kicker">Stay in the loop</span>
          <h2 className="text-[28px] sm:text-[34px] font-extrabold leading-[1.12] mt-3">
            Get 15% off your first order.
          </h2>
          <p className="text-soft text-[15px] leading-relaxed mt-3 max-w-[46ch]">
            Early access to drops, restock alerts and fit guides. One email a week —
            unsubscribe whenever you like.
          </p>
        </div>

        <div>
          <NewsletterForm />
          <p className="text-faint text-[12.5px] mt-4">
            No spam, ever. We never share your details.
          </p>
        </div>
      </div>
    </section>
  );
}
