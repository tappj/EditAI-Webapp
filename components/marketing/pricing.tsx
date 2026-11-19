"use client";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { marketingContent as content } from "@/lib/marketing/content";
export function PricingSelector() {
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [planId, setPlanId] = useState(content.pricing.plans[1].id);
  const selected = content.pricing.plans.find((p) => p.id === planId)!;
  return (
    <section
      className="pricing-section"
      id="pricing"
      data-nav-section="pricing"
      aria-labelledby="pricing-title"
    >
      <div className="m-container">
        <div className="m-section-heading m-reveal">
          <h2 id="pricing-title">
            Simple plans.
            <br />
            For your next chapter.
          </h2>
          <p>
            {content.pricing.approved
              ? "Choose your EditAI iOS app plan."
              : "A preview of what’s next. Plan details coming soon."}
          </p>
        </div>
        <div
          className="billing-options"
          role="group"
          aria-label="Billing period"
        >
          {(["monthly", "annual"] as const).map((item) => (
            <button
              key={item}
              aria-pressed={cadence === item}
              onClick={() => setCadence(item)}
            >
              {item === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
        <fieldset className="pricing-grid">
          <legend className="m-sr-only">Choose a plan</legend>
          {content.pricing.plans.map((plan) => {
            const offer = plan[cadence];
            const checkout =
              content.pricing.approved &&
              offer?.checkoutUrl &&
              /^https:\/\//.test(offer.checkoutUrl)
                ? offer.checkoutUrl
                : null;
            const monthlyEquivalent =
              cadence === "annual" ? plan.annual?.monthlyEquivalent : undefined;
            return (
              <article
                className={`pricing-card m-reveal ${plan.id === planId ? "selected" : ""}`}
                key={plan.id}
              >
                <label className="plan-heading">
                  <input
                    type="radio"
                    name="marketing-plan"
                    value={plan.id}
                    checked={plan.id === planId}
                    onChange={() => setPlanId(plan.id)}
                  />
                  <span>{plan.name}</span>
                  {content.pricing.approved && plan.recommended && (
                    <small>RECOMMENDED</small>
                  )}
                </label>
                <p className="plan-description">{plan.description}</p>
                <div
                  className={`plan-price ${!content.pricing.approved || !offer ? "pending" : ""}`}
                >
                  {content.pricing.approved && offer
                    ? monthlyEquivalent ?? offer.price
                    : "Coming soon"}
                </div>
                <p className="plan-cadence">
                  {content.pricing.approved && offer
                    ? cadence === "monthly"
                      ? "per month, billed monthly"
                      : monthlyEquivalent
                        ? `per month, billed ${offer.price} annually`
                        : "per year, billed annually"
                    : `${cadence === "monthly" ? "Monthly" : "Annual"} pricing to be announced`}
                </p>
                <ul>
                  {plan.benefits.map((benefit) => (
                    <li key={benefit}>
                      <Check size={15} />
                      {benefit}
                    </li>
                  ))}
                </ul>
                {checkout ? (
                  <a className="m-button" href={checkout}>
                    Choose {plan.name}
                    <ArrowRight size={16} />
                  </a>
                ) : (
                  <button className="m-button" disabled>
                    iOS coming soon
                  </button>
                )}
              </article>
            );
          })}
        </fieldset>
        <p className="billing-summary" aria-live="polite">
          {selected.name} · {cadence === "monthly" ? "Monthly" : "Annual"}
          {content.pricing.approved && selected[cadence]
            ? ` · ${selected[cadence]!.price}`
            : " pricing to be announced. No checkout is available."}
        </p>
        <p className="pricing-disclosure">
          U.S. iOS App Store prices in USD. Subscriptions renew automatically;
          cancel anytime. Local prices and availability are confirmed in the app.
          Web and macOS AI access uses your Publik account and its plan and usage.
        </p>
        <a className="pricing-web-link" href={content.links.app}>
          Explore the web editor <ArrowRight size={14} />
        </a>
      </div>
    </section>
  );
}
