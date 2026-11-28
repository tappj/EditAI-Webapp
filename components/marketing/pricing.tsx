"use client";
import { Check, ArrowUpRight } from "lucide-react";
import { marketingContent as content } from "@/lib/marketing/content";
export function PricingSelector() {
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
            Free editor.
            <br />
            AI on your terms.
          </h2>
          <p>
            EditAI Web and Desktop have no EditAI subscription. Connect Publik
            for AI, or use your own OpenAI API key.
          </p>
        </div>
        <div className="pricing-grid">
          {content.pricing.plans.map((plan) => (
            <article className="pricing-card m-reveal" key={plan.id}>
              <h3 className="plan-heading">{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-price">{plan.price}</div>
              <p className="plan-cadence">{plan.cadence}</p>
              <ul>
                {plan.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check size={15} aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <a className="m-button" href={content.links.app}>
                {plan.action}
              </a>
            </article>
          ))}
        </div>
        <p className="pricing-disclosure">
          Sign in with Publik, then connect a plan or choose Use my own key.
          Publik trial eligibility and charges are confirmed at checkout; a
          trial requires a card. Unused monthly plan usage does not carry over.
          Packs do not expire.
        </p>
        <p className="pricing-disclosure">
          With your own OpenAI API key, OpenAI bills your API account directly.
          ChatGPT subscriptions and API billing are separate. No Publik
          subscription is required for the own-key option. iOS subscriptions are
          separate from Web and Desktop.
        </p>
        <div className="pricing-actions">
          <a
            className="pricing-web-link"
            href="https://publikhq.com/pricing"
            target="_blank"
            rel="noreferrer"
          >
            View current Publik plans{" "}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <a className="pricing-web-link" href={content.links.app}>
            Use my own OpenAI API key
          </a>
        </div>
      </div>
    </section>
  );
}
