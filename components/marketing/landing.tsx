"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  ChevronDown,
  Clapperboard,
  Download,
  Film,
  Layers,
  Menu,
  Minus,
  Monitor,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Subtitles,
  X,
} from "lucide-react";
import { DesktopDownloads } from "@/components/desktop-downloads";
import {
  marketingContent as content,
  approvedReviews,
  type FeatureIcon,
  type Review,
} from "@/lib/marketing/content";
import { AmbientHeroBackground } from "./ambient-hero";
import { MarketingVideo } from "./video-player";
import { PricingSelector } from "./pricing";

const iconMap = {
  cut: Scissors,
  audio: AudioLines,
  sparkles: Sparkles,
  captions: Subtitles,
  timeline: Film,
  batch: Layers,
  export: Download,
};
export function FeatureTile({
  icon,
  small = false,
}: {
  icon: FeatureIcon;
  small?: boolean;
}) {
  const Icon = iconMap[icon];
  return (
    <span className={`feature-tile ${small ? "small" : ""}`} aria-hidden="true">
      <Icon size={small ? 20 : 29} strokeWidth={1.8} />
      <span className="tile-shine" />
    </span>
  );
}
export function MarketingBrand() {
  return (
    <a className="m-brand" href={content.links.home} aria-label="EditAI home">
      <img src="/favicon.svg" width="25" height="25" alt="" />
      <span>EditAI</span>
    </a>
  );
}
function MainCta({ children = content.hero.cta }: { children?: ReactNode }) {
  return (
    <a className="m-button" href={content.links.app}>
      {children}
      <ArrowUpRight size={17} />
    </a>
  );
}
function FloatingNav() {
  const [active, setActive] = useState(""),
    [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null),
    header = useRef<HTMLElement>(null);
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-nav-section]"),
    );
    const visible = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          visible.set(entry.target, entry.isIntersecting),
        );
        const current = sections.find((section) => visible.get(section));
        if (current) setActive(current.dataset.navSection || "");
      },
      { rootMargin: "-15% 0px -45% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  return (
    <header className="m-header" ref={header}>
      <div className="m-pill brand-pill">
        <MarketingBrand />
      </div>
      <nav
        className={`m-pill m-nav ${open ? "is-open" : ""}`}
        id="marketing-navigation"
        aria-label="Main navigation"
      >
        {content.navigation.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </a>
        ))}
        <a className="mobile-sign-in" href={content.links.app}>
          Sign in
        </a>
      </nav>
      <div className="m-pill nav-actions">
        <a className="nav-sign-in" href={content.links.app}>
          Sign in
        </a>
        <a className="m-button nav-cta" href={content.ios.href}>
          {content.ios.label}
        </a>
        <button
          ref={toggle}
          className="m-menu-button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="marketing-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}
function Stars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <span className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: Math.min(5, Math.floor(rating)) }, (_, i) => (
        <Star key={i} size={12} fill="currentColor" />
      ))}
    </span>
  );
}
function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="review-card">
      <Stars rating={review.rating} />
      <h3>{review.title}</h3>
      <p>{review.text}</p>
      <div className="review-credit">
        {review.avatar && (
          <img
            src={review.avatar}
            width="24"
            height="24"
            alt=""
            loading="lazy"
          />
        )}
        <span>
          {review.author} <small>· {review.source}</small>
        </span>
      </div>
    </article>
  );
}
export function ReviewMarquee({
  reviews = approvedReviews,
}: { reviews?: Review[] } = {}) {
  const cards = reviews.length ? reviews : content.capabilities;
  // Fill a whole viewport before duplicating a track, including a single approved review.
  const items = Array.from(
    { length: Math.max(cards.length, 6) },
    (_, i) => cards[i % cards.length],
  );
  return (
    <div
      className="hero-marquees"
      aria-label={
        reviews.length ? "Creator reviews" : "Explore the EditAI workflow"
      }
    >
      {[0, 1].map((row) => (
        <div
          className={`marquee-viewport motion-region row-${row}`}
          key={row}
          tabIndex={0}
          role="region"
          aria-label={`Workflow strip ${row + 1}`}
        >
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <div
                className="marquee-group"
                key={copy}
                aria-hidden={copy === 1 || undefined}
              >
                {items.map((_, i) => {
                  const item = items[(i + row * 3) % items.length];
                  return (
                    <div
                      key={i}
                      className="marquee-cell"
                      aria-hidden={i >= cards.length || undefined}
                    >
                      {reviews.length ? (
                        <ReviewCard review={item as Review} />
                      ) : (
                        <article className="capability-card">
                          <span className="capability-label">
                            EDITAI · YOUR CREATIVE WORKFLOW
                          </span>
                          <h3>{item.title}</h3>
                          <p>{"text" in item ? item.text : ""}</p>
                          <span className="capability-footer">
                            More room for your ideas <ArrowUpRight size={12} />
                          </span>
                        </article>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function Hero() {
  return (
    <section
      className="marketing-hero m-shell"
      data-nav-section=""
      aria-labelledby="hero-title"
    >
      <AmbientHeroBackground />
      <div className="hero-heading">
        <h1 id="hero-title">
          {content.hero.firstLine}
          <br />
          <span>{content.hero.secondLine}</span>
        </h1>
        <p>{content.hero.subtitle}</p>
        <MainCta />
        <span className="hero-availability">
          <Monitor size={14} /> Your browser. Your creative space.
        </span>
      </div>
      <ReviewMarquee />
    </section>
  );
}
function TrustBar() {
  const creators = content.creators.filter((creator) => creator.approved);
  return (
    <div className="trust-bar">
      {creators.length > 0 && (
        <div className="trust-avatars">
          {creators.slice(0, 3).map((creator) => (
            <img
              key={creator.id}
              src={creator.portrait}
              alt={creator.name}
              width="30"
              height="30"
              loading="lazy"
            />
          ))}
        </div>
      )}
      <div>
        <span>
          <ShieldCheck size={14} /> Original footage. Your final say.
        </span>
        <small>
          Available on web & macOS <span aria-hidden="true">·</span> iOS coming
          soon
        </small>
      </div>
    </div>
  );
}
function MetricCards() {
  return (
    <div className="metric-cards m-container">
      {content.metrics.map((metric, i) => (
        <article
          className="metric-card m-reveal"
          style={{ "--stagger": `${i * 80}ms` } as CSSProperties}
          key={metric.value}
        >
          <span className="metric-flare" />
          <strong>{metric.value}</strong>
          <p>{metric.label}</p>
        </article>
      ))}
    </div>
  );
}
function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className={`m-laurel ${flip ? "flip" : ""}`}
      viewBox="0 0 30 100"
      aria-hidden="true"
    >
      <path
        d="M24 95C8 72 7 32 24 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} transform={`translate(${i < 3 ? 2 - i : i - 4},${i * 13})`}>
          <path
            d="M16 19C2 17 2 6 3 4c8 2 14 7 13 15M16 21c-1-11 6-17 11-18 1 10-4 16-11 18"
            fill="currentColor"
          />
        </g>
      ))}
    </svg>
  );
}
function CreatorProof() {
  const awards = content.awards.filter((award) => award.approved),
    creators = content.creators.filter((creator) => creator.approved);
  return (
    <section className="creator-proof m-container">
      <div className="m-section-heading m-reveal">
        <h2>
          {awards.length || creators.length
            ? "Trusted by creators"
            : "Made for your kind of creating."}
        </h2>
      </div>
      <p className="m-eyebrow">
        {awards.length
          ? "STRAIGHT FROM OUR CREATORS"
          : "A LITTLE LESS BUSYWORK. A LITTLE MORE YOU."}
      </p>
      <div className="award-grid">
        {awards.length
          ? awards.map((award) => (
              <article className="award-card m-reveal" key={award.id}>
                <Laurel />
                <div>
                  <Stars rating={award.rating} />
                  <h3>{award.quote}</h3>
                  <small>{award.source}</small>
                </div>
                <Laurel flip />
              </article>
            ))
          : [
              "Keep your creative voice.",
              "Make every frame yours.",
              "Stay in the director’s seat.",
            ].map((text) => (
              <div className="award-card m-reveal" key={text}>
                <Laurel />
                <h3>{text}</h3>
                <Laurel flip />
              </div>
            ))}
      </div>
      <p className="m-eyebrow proof-second-label">
        {creators.length
          ? "CREATED WITH EDITAI"
          : "FROM AN IDEA TO SOMETHING WORTH SHARING"}
      </p>
      <div className="creator-profiles">
        {creators.length
          ? creators.map((creator) => (
              <article className="creator-profile m-reveal" key={creator.id}>
                <img
                  src={creator.portrait}
                  alt=""
                  width="42"
                  height="42"
                  loading="lazy"
                />
                <h3>{creator.name}</h3>
                <p>
                  {creator.platform}
                  {creator.followers ? ` · ${creator.followers}` : ""}
                </p>
              </article>
            ))
          : [
              {
                icon: "cut",
                title: "Find your story",
                text: "AI-assisted editorial suggestions",
              },
              {
                icon: "captions",
                title: "Add your voice",
                text: "Expressive, editable captions",
              },
              {
                icon: "export",
                title: "Make it yours",
                text: "A timeline with room to play",
              },
            ].map((item) => (
              <article className="creator-profile m-reveal" key={item.title}>
                <FeatureTile icon={item.icon as FeatureIcon} small />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
      </div>
    </section>
  );
}
function BeforeAfterComparison() {
  const pair = useRef<HTMLDivElement>(null);
  const sync = (source: HTMLVideoElement) => {
    const other = pair.current?.querySelectorAll("video")[0];
    if (
      other &&
      other !== source &&
      !other.paused &&
      Math.abs(other.duration - source.duration) < 0.5 &&
      Math.abs(other.currentTime - source.currentTime) > 0.35
    )
      other.currentTime = source.currentTime;
  };
  return (
    <section
      className="comparison-section m-container"
      aria-labelledby="how-title"
    >
      <div className="comparison-copy m-reveal">
        <span className="m-eyebrow">HOW IT WORKS</span>
        <h2 id="how-title">How EditAI works</h2>
        <p>
          Bring the whole take. Find the story inside it. Then give it your own
          finishing touch.
        </p>
        <div className="comparison-journey">
          <strong>Your take</strong>
          <ArrowRight size={20} />
          <strong>Your story</strong>
        </div>
        <small>AI suggests. You decide.</small>
      </div>
      <div className="comparison-pair m-reveal" ref={pair}>
        {(["before", "after"] as const).map((key) => (
          <div key={key}>
            <div className={`comparison-label ${key}`}>
              <h3>{content.comparison[key].title}</h3>
              <p>{content.comparison[key].description}</p>
            </div>
            <MarketingVideo
              asset={content.comparison[key]}
              emphasis={key === "after"}
              onProgress={key === "after" ? sync : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
function InterfacePreview({ kind }: { kind: "cut" | "batch" | "export" }) {
  return (
    <div
      className={`interface-preview preview-kind-${kind}`}
      aria-label="Illustrative EditAI interface preview"
    >
      <div className="preview-chrome">
        <span>
          <i />
          <i />
          <i />
        </span>
        <b>EditAI</b>
        <MoreDots />
      </div>
      <div className="preview-toolbar">
        <span>
          <Clapperboard size={12} /> Your workspace
        </span>
        <span>↗</span>
      </div>
      {kind === "batch" ? (
        <div className="preview-projects">
          <h3>Your next great idea.</h3>
          <p>A little room for every story.</p>
          {["Morning light", "A new perspective", "The little moments"].map(
            (label, i) => (
              <div className="preview-project" key={label}>
                <span className={`project-thumb thumb-${i}`}>
                  <Film size={18} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>Ready to edit</small>
                </span>
                <ArrowUpRight size={13} />
              </div>
            ),
          )}
          <div className="preview-add">
            <Plus size={16} /> Import footage
          </div>
        </div>
      ) : (
        <>
          <div className="preview-scene">
            <div className="scene-sun" />
            <div className="scene-hill hill-back" />
            <div className="scene-hill hill-front" />
            {kind === "export" && (
              <span className="preview-caption">the little moments.</span>
            )}
            {kind === "cut" && (
              <span className="preview-cut">
                <Sparkles size={14} /> Find your story
              </span>
            )}
          </div>
          <div className="preview-playbar">
            <span>▶</span>
            <span>00:00 ──────── 00:24</span>
            <span>⊕</span>
          </div>
          <div className="preview-timeline">
            <div className="timeline-ruler" />
            <div className="timeline-blocks">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} />
              ))}
            </div>
            <div className="timeline-audio">
              <AudioLines size={18} />
              <span>Original audio</span>
            </div>
            {kind === "export" && (
              <div className="timeline-captions">Captions · your style</div>
            )}
            <div className="preview-playhead" />
          </div>
        </>
      )}
      <span className="interface-note">INTERFACE PREVIEW</span>
    </div>
  );
}
function MoreDots() {
  return <span aria-hidden="true">•••</span>;
}
function ProductDemoCards() {
  return (
    <div className="demo-cards m-container">
      {content.demos.map((demo, i) => (
        <article
          className="demo-card m-reveal"
          style={{ "--stagger": `${i * 90}ms` } as CSSProperties}
          key={demo.kind}
        >
          <h3>
            {demo.title.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h3>
          <span className="demo-label">{demo.label}</span>
          {demo.image ? (
            <img
              className="demo-authentic-image"
              src={demo.image}
              alt={demo.alt}
              loading="lazy"
              width="700"
              height="900"
            />
          ) : (
            <InterfacePreview kind={demo.kind} />
          )}
        </article>
      ))}
    </div>
  );
}
function AnimatedFeatureIcons() {
  const icons = [
    { icon: "cut", label: "Edit" },
    { icon: "captions", label: "Caption" },
    { icon: "audio", label: "Transcribe" },
    { icon: "export", label: "Export" },
  ] as const;
  return (
    <div
      className="feature-ribbon motion-region"
      aria-label="Edit, caption, transcribe and export"
    >
      <div className="feature-ribbon-path" />
      <div className="feature-ribbon-track">
        {[0, 1].map((copy) => (
          <div
            className="feature-ribbon-group"
            key={copy}
            aria-hidden={copy === 1 || undefined}
          >
            {icons.map((item) => (
              <div className="ribbon-item" key={item.icon}>
                <FeatureTile icon={item.icon} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
function FeatureGrid() {
  return (
    <section
      className="features-section m-shell"
      data-nav-section="how-it-works"
    >
      <div className="m-container">
        <div className="m-section-heading m-reveal">
          <span className="m-eyebrow">FEATURES</span>
          <h2>Tools that do the editing for you</h2>
        </div>
        <AnimatedFeatureIcons />
        <div className="feature-grid">
          {content.features.map((feature, i) => (
            <article
              className="feature-card m-reveal"
              style={{ "--stagger": `${(i % 4) * 60}ms` } as CSSProperties}
              key={feature.icon}
            >
              <FeatureTile icon={feature.icon} small />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export function ReviewWall({
  reviews = approvedReviews,
}: { reviews?: Review[] } = {}) {
  return (
    <section
      data-nav-section="creators"
      className="review-section m-shell"
      aria-labelledby="review-title"
    >
      <div className="m-container">
        <div className="m-section-heading m-reveal">
          <span className="m-eyebrow">
            {reviews.length ? "CREATOR STORIES" : "YOUR CREATIVE FLOW"}
          </span>
          <h2 id="review-title">
            {reviews.length ? (
              <>
                More time for{" "}
                <span className="editorial-underline">creating.</span>
              </>
            ) : (
              <>
                Less busywork.{" "}
                <span className="editorial-underline">More you.</span>
              </>
            )}
          </h2>
        </div>
        {reviews.length ? (
          <div
            className="review-wall motion-region"
            tabIndex={0}
            role="region"
            aria-label="Creator reviews"
          >
            {[0, 1].map((column) => (
              <div
                className={`review-wall-column column-${column}`}
                key={column}
              >
                <div className="review-wall-track">
                  {[0, 1].map((copy) => (
                    <div
                      className="review-wall-group"
                      key={copy}
                      aria-hidden={copy === 1 || undefined}
                    >
                      {Array.from(
                        { length: Math.max(3, reviews.length) },
                        (_, i) => (
                          <div
                            key={i}
                            aria-hidden={i >= reviews.length || undefined}
                          >
                            <ReviewCard
                              review={reviews[(i + column) % reviews.length]}
                            />
                          </div>
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="workflow-wall">
            {content.workflow.map((step) => (
              <article className="workflow-card m-reveal" key={step.label}>
                <span className="m-eyebrow">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <span className="workflow-brand">
                  <img src="/favicon.svg" alt="" width="19" height="19" />{" "}
                  EditAI workflow
                </span>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
function CreatorVideoGallery() {
  const realVideos = content.videos.some((asset) => asset.src);
  return (
    <section
      className="gallery-section m-shell"
      data-nav-section="creators"
      id="creators"
      aria-labelledby="creators-title"
    >
      <div className="m-container">
        <div className="m-section-heading m-reveal">
          <h2 id="creators-title">Real videos, made with EditAI</h2>
          <p>
            {realVideos
              ? "A little inspiration for your next story. Tap for sound."
              : "A space for your stories. Creator videos coming soon."}
          </p>
        </div>
        <div className="creator-video-grid">
          {content.videos.map((asset) => (
            <div key={asset.id} className="m-reveal">
              <MarketingVideo asset={asset} />
            </div>
          ))}
        </div>
        <p className="gallery-caption">CREATORS · STORIES MADE WITH EDITAI</p>
      </div>
    </section>
  );
}
function FaqAccordion() {
  const [expanded, setExpanded] = useState(false),
    [open, setOpen] = useState<number | null>(null);
  return (
    <section
      data-nav-section="faq"
      className="faq-section m-shell"
      id="faq"
      aria-labelledby="faq-title"
    >
      <div className="m-container">
        <div className="m-section-heading m-reveal">
          <span className="m-eyebrow">FAQ</span>
          <h2 id="faq-title">Got a question?</h2>
        </div>
        <div className="faq-list">
          {content.faqs.slice(0, expanded ? undefined : 3).map((faq, i) => (
            <article
              className={`faq-row ${open === i ? "is-open" : ""}`}
              key={faq.question}
            >
              <h3>
                <button
                  id={`faq-question-${i}`}
                  aria-expanded={open === i}
                  aria-controls={`faq-answer-${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {faq.question}
                  <span>
                    {open === i ? <Minus size={17} /> : <Plus size={17} />}
                  </span>
                </button>
              </h3>
              <div
                id={`faq-answer-${i}`}
                role="region"
                aria-labelledby={`faq-question-${i}`}
                className="faq-answer"
                inert={open !== i}
              >
                <div>
                  <p>{faq.answer}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <button
          className="m-secondary-button all-questions"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(!expanded);
            if (expanded && open !== null && open > 2) setOpen(null);
          }}
        >
          {expanded
            ? "Show fewer questions"
            : `See all ${content.faqs.length} questions`}
          <ChevronDown size={15} className={expanded ? "turned" : ""} />
        </button>
        <p className="faq-contact">
          Still have questions? <a href={content.links.support}>Contact us</a>
        </p>
      </div>
    </section>
  );
}
function ClosingCtaFooter({ onPrivacy }: { onPrivacy: () => void }) {
  return (
    <section
      className="closing-section m-shell"
      id="get-editai"
      data-nav-section="faq"
    >
      <div className="closing-clouds" aria-hidden="true" />
      <div className="closing-copy m-reveal">
        <h2>
          {content.footer.firstLine}
          <br />
          <span>{content.footer.secondLine}</span>
        </h2>
        <p>Find your story. Give it your own finishing touch.</p>
        <MainCta />
        <div className="marketing-downloads">
          <DesktopDownloads />
        </div>
        <small id="ios-coming-soon">{content.footer.note}</small>
      </div>
      <footer className="m-footer m-container">
        <div className="footer-brand">
          <MarketingBrand />
          <p>{content.footer.description}</p>
          <small>© {new Date().getFullYear()} EditAI</small>
        </div>
        <div>
          <h3>PRODUCT</h3>
          {content.footer.product.map((link) => (
            <a href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
          <span className="footer-ios">iOS coming soon</span>
        </div>
        <div>
          <h3>CONTACTS</h3>
          <a href={content.links.support}>Help & support</a>
          <a href={content.links.support}>Contact us</a>
          <a href={content.links.source} target="_blank" rel="noreferrer">
            Desktop source <ArrowUpRight size={11} />
          </a>
        </div>
        <div>
          <h3>PRIVACY</h3>
          <button onClick={onPrivacy}>Privacy & data</button>
          <a href="/sign-in">Privacy choices in Settings</a>
          <a
            href="https://publikhq.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Publik privacy <ArrowUpRight size={11} />
          </a>
        </div>
      </footer>
    </section>
  );
}
export function MarketingLanding({ onPrivacy }: { onPrivacy: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current!,
      reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            reveal.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    el.querySelectorAll(".m-reveal").forEach((item) => reveal.observe(item));
    el.dataset.enhanced = "true";
    const regions = new IntersectionObserver((entries) =>
      entries.forEach((entry) => {
        (entry.target as HTMLElement).dataset.inView = String(
          entry.isIntersecting,
        );
      }),
    );
    el.querySelectorAll(".motion-region").forEach((item) =>
      regions.observe(item),
    );
    const visibility = () => {
      el.dataset.paused = String(document.hidden || reduced.matches);
    };
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", visibility);
    visibility();
    return () => {
      reveal.disconnect();
      regions.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", visibility);
    };
  }, []);
  return (
    <div className="marketing" ref={root}>
      <a className="m-skip-link" href="#main-content">
        Skip to content
      </a>
      <FloatingNav />
      <main id="main-content">
        <Hero />
        <section className="proof-section m-shell" data-nav-section="">
          <TrustBar />
          <MetricCards />
          <CreatorProof />
        </section>
        <section
          className="product-section m-shell"
          id="how-it-works"
          data-nav-section="how-it-works"
        >
          <BeforeAfterComparison />
          <ProductDemoCards />
        </section>
        <FeatureGrid />
        <ReviewWall />
        <CreatorVideoGallery />
        <PricingSelector />
        <FaqAccordion />
        <ClosingCtaFooter onPrivacy={onPrivacy} />
      </main>
    </div>
  );
}
export function MarketingSignIn({
  children,
  onPrivacy,
}: {
  children: ReactNode;
  onPrivacy: () => void;
}) {
  return (
    <div className="marketing marketing-sign-in">
      <header>
        <div className="m-pill brand-pill">
          <MarketingBrand />
        </div>
        <a href={content.links.home} className="back-to-site">
          Back to EditAI <ArrowUpRight size={14} />
        </a>
      </header>
      <main>
        <div className="sign-in-heading">
          <span className="m-eyebrow">YOUR NEXT GREAT VIDEO STARTS HERE</span>
          <h1>Make room for your ideas.</h1>
        </div>
        {children}
        <div className="sign-in-platforms">
          <DesktopDownloads />
          <span>iOS coming soon</span>
        </div>
      </main>
      <footer>
        <button onClick={onPrivacy}>Privacy & data</button>
        <a href={content.links.support}>Support</a>
        <a href={content.links.home}>EditAI home</a>
      </footer>
    </div>
  );
}
