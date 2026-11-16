"use client";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { marketingContent as content } from "@/lib/marketing/content";
export function PricingSelector() {
  const [usage, setUsage] = useState(1),
    [cadence, setCadence] = useState<"monthly" | "annual">("monthly"),
    [planId, setPlanId] = useState(content.pricing.plans[1].id);
  const plan = content.pricing.plans.find((p) => p.id === planId)!;
  const offer = plan[cadence];
  const safeCheckout =
    offer && /^https:\/\//.test(offer.checkoutUrl) ? offer.checkoutUrl : null;
  const available = content.pricing.approved && offer && safeCheckout;
  return (
    <section
      className="marketing-section pricing-section"
      data-nav-section="pricing"
      id="pricing"
      aria-labelledby="pricing-title"
    >
      <div className="pricing-panel m-reveal">
        <div className="m-section-heading">
          <span className="m-eyebrow">PRICING</span>
          <h2 id="pricing-title">Find your creative rhythm.</h2>
          <p>
            {content.pricing.approved
              ? "Choose the plan that fits your workflow."
              : "A preview of what’s next. Plan details coming soon."}
          </p>
        </div>
        <div className="pricing-columns">
          <div className="pricing-options">
            <fieldset className="usage-options">
              <legend>How often do you create?</legend>
              <div>
                {content.pricing.usage.map((item, i) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={usage === i}
                    onClick={() => {
                      setUsage(i);
                      setPlanId(content.pricing.plans[i].id);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
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
            <fieldset className="plan-options">
              <legend className="m-sr-only">Choose a plan preview</legend>
              {content.pricing.plans.map((p) => (
                <label key={p.id} className={planId === p.id ? "selected" : ""}>
                  <input
                    type="radio"
                    name="marketing-plan"
                    value={p.id}
                    checked={planId === p.id}
                    onChange={() => setPlanId(p.id)}
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.description}</small>
                  </span>
                  <span className="plan-price">
                    {content.pricing.approved && p[cadence]
                      ? p[cadence]!.price
                      : "Coming soon"}
                    <small>
                      {content.pricing.approved && p[cadence]
                        ? cadence === "monthly"
                          ? "/ month"
                          : "/ year"
                        : "Plan preview"}
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="pricing-benefits">
            <div aria-live="polite">
              <span className="m-eyebrow">
                {plan.name}{" "}
                {content.pricing.approved ? "INCLUDES" : "WORKFLOW PREVIEW"}
              </span>
              <ul>
                {plan.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check size={17} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            {available ? (
              <a className="m-button" href={safeCheckout!}>
                Choose {plan.name}
                <ArrowRight size={17} />
              </a>
            ) : (
              <button className="m-button" disabled>
                Plans coming soon
              </button>
            )}
            <p className="billing-summary" aria-live="polite">
              {available
                ? `${offer!.price} billed ${cadence === "monthly" ? "monthly" : "annually"}.`
                : `${plan.name} · ${cadence === "monthly" ? "Monthly" : "Annual"} pricing to be announced. No checkout is available.`}
            </p>
            <a href={content.links.app} className="pricing-web-link">
              Explore the web editor <ArrowRight size={14} />
            </a>
            <p className="pricing-disclosure">
              Current AI access is connected through Publik. Your account there
              shows your actual plan and usage.
            </p>
            <a className="m-small-link" href={content.links.support}>
              Have a question? Contact us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
