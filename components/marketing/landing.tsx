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
  Check,
  ChevronRight,
  Download,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Menu,
  Minus,
  Monitor,
  Pause,
  Play,
  Plus,
  Scissors,
  Sparkles,
  Star,
  Subtitles,
  Upload,
  X,
} from "lucide-react";
import { DesktopDownloads } from "@/components/desktop-downloads";
import {
  marketingContent as content,
  approvedReviews,
  type FeatureIcon,
  type Review,
} from "@/lib/marketing/content";
import { MarketingVideo } from "./video-player";
import { PricingSelector } from "./pricing";
import { TimeCalculator } from "./time-calculator";
import { AmbientHeroBackground } from "./ambient-hero";

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
      <Icon size={small ? 21 : 29} strokeWidth={1.7} />
    </span>
  );
}
export function MarketingBrand() {
  return (
    <a className="m-brand" href={content.links.home} aria-label="EditAI home">
      <img src="/brand/editai-icon-192.png" alt="" width="32" height="32" />
      <span>
        Edit<span>AI</span>
      </span>
    </a>
  );
}
function MainCta({ children = content.hero.cta }: { children?: ReactNode }) {
  return (
    <a className="m-button" href={content.links.app}>
      {children}
      <ArrowRight size={16} />
    </a>
  );
}
function FloatingNav() {
  const [active, setActive] = useState(""),
    [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
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
      { rootMargin: "-16% 0px -40% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  return (
    <header className="m-header" ref={header}>
      <div className="m-header-inner m-container">
        <MarketingBrand />
        <nav
          id="marketing-navigation"
          className={`m-nav ${open ? "is-open" : ""}`}
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
        <div className="nav-actions">
          <a className="nav-sign-in" href={content.links.app}>
            Sign in
          </a>
          <a className="m-button nav-cta" href={content.ios.href}>
            {content.ios.label}
            <ArrowRight size={13} />
          </a>
          <button
            className="m-menu-button"
            ref={toggle}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls="marketing-navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="review-card">
      {review.rating && (
        <span
          className="review-stars"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {Array.from(
            { length: Math.min(5, Math.round(review.rating)) },
            (_, i) => (
              <Star key={i} size={11} fill="currentColor" />
            ),
          )}
        </span>
      )}
      <h3>{review.title}</h3>
      <p>{review.text}</p>
      <div className="review-credit">
        {review.avatar && (
          <img
            src={review.avatar}
            width="20"
            height="20"
            alt=""
            loading="lazy"
          />
        )}
        <span>
          {review.author} · {review.source}
        </span>
      </div>
    </article>
  );
}
export function ReviewMarquee({
  reviews = approvedReviews,
}: { reviews?: Review[] } = {}) {
  const approved = reviews.filter((review) => review.approved);
  const cards = approved.length ? approved : content.capabilities;
  const items = Array.from(
    { length: Math.max(cards.length, 6) },
    (_, i) => cards[i % cards.length],
  );
  return (
    <div
      className="hero-marquees"
      aria-label={
        approved.length ? "Creator reviews" : "Explore the EditAI workflow"
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
                      className="marquee-cell"
                      key={i}
                      aria-hidden={i >= cards.length || undefined}
                    >
                      {approved.length ? (
                        <ReviewCard review={item as Review} />
                      ) : (
                        <article className="capability-card">
                          <span className="capability-label">
                            EDITAI WORKFLOW
                          </span>
                          <h3>{item.title}</h3>
                          <p>{item.text}</p>
                          <span className="capability-footer">
                            YOUR FOOTAGE. YOUR FINAL SAY.
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
      className="marketing-hero"
      data-nav-section=""
      aria-labelledby="hero-title"
    >
      <AmbientHeroBackground />
      <div className="hero-echo" aria-hidden="true">
        {[...content.capabilities, ...content.capabilities.slice(0, 2)].map(
          (item, i) => (
            <div key={i}>
              <span>EDITAI WORKFLOW</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          ),
        )}
      </div>
      <div className="hero-heading m-container">
        <div className="hero-availability">
          <img src="/brand/editai-icon-32.png" width="20" height="20" alt="" />
          <span>Your story. Your creative control.</span>
          <span className="platform-badge">
            <Monitor size={11} /> Web + macOS
          </span>
        </div>
        <h1 id="hero-title">
          {content.hero.firstLine}
          <br />
          <span>{content.hero.secondLine}</span>
        </h1>
        <p>{content.hero.subtitle}</p>
        <div className="hero-actions">
          <MainCta />
          <DesktopDownloads placement="hero" />
          <a className="hero-watch" href="#how-it-works">
            <Play size={12} /> See it in action
          </a>
        </div>
        <div className="hero-meta">EDIT · CAPTION · TRANSCRIBE · EXPORT</div>
      </div>
      <ReviewMarquee />
    </section>
  );
}
function LandscapeScene({ caption = false }: { caption?: boolean }) {
  return (
    <div className="studio-landscape" aria-hidden="true">
      <div className="scene-sun" />
      <div className="scene-ridge ridge-back" />
      <div className="scene-ridge ridge-middle" />
      <div className="scene-ridge ridge-front" />
      {caption && <span>the little moments.</span>}
    </div>
  );
}
function WorkflowScreen({
  kind,
  title,
  note,
}: {
  kind: "import" | "cut" | "review" | "export";
  title: string;
  note: string;
}) {
  return (
    <div className={`workflow-screen screen-${kind}`}>
      <div className="studio-chrome">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>EditAI</span>
        <span>•••</span>
      </div>
      <div className="studio-screen-body">
        <div className="studio-screen-heading">{title}</div>
        {kind === "import" ? (
          <>
            <img
              className="studio-app-icon"
              src="/brand/editai-icon-192.png"
              width="54"
              height="54"
              alt=""
            />
            <div className="studio-import-zone">
              <Upload size={23} />
              <strong>Bring your footage</strong>
              <span>Your next story starts with a take.</span>
              <div>
                Import a video <Plus size={10} />
              </div>
            </div>
            <div className="studio-file-row">
              <Film size={14} />
              <span>Your project library</span>
              <ChevronRight size={12} />
            </div>
          </>
        ) : (
          <>
            <LandscapeScene caption={kind !== "cut"} />
            {kind === "cut" ? (
              <>
                <div className="studio-analysis-label">
                  <Sparkles size={12} /> AI-assisted first cut
                </div>
                <div className="studio-transcript-lines">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="studio-process-steps">
                  <span>
                    <Check size={10} /> Transcribe
                  </span>
                  <span>
                    <Scissors size={10} /> Review the cut
                  </span>
                </div>
              </>
            ) : kind === "review" ? (
              <>
                <div className="studio-playbar">
                  <Play size={10} />
                  <span>00:00 ──────── 00:24</span>
                </div>
                <div className="studio-tool-row">
                  <Scissors />
                  <Subtitles />
                  <ImageIcon />
                  <AudioLines />
                </div>
                <div className="studio-timeline">
                  <div />
                  <div />
                  <div />
                </div>
                <div className="studio-audio-track">
                  <AudioLines size={12} />
                  <span>Original audio</span>
                </div>
                <div className="studio-caption-track">
                  Captions · your style
                </div>
              </>
            ) : (
              <>
                <div className="studio-export-note">
                  <Check size={13} /> Your finished cut
                </div>
                <div className="studio-export-settings">
                  <span>
                    Format<b>MP4</b>
                  </span>
                  <span>
                    Video<b>H.264</b>
                  </span>
                  <span>
                    Audio<b>AAC</b>
                  </span>
                </div>
                <div className="studio-export-action">
                  <Download size={12} /> Export your story
                </div>
              </>
            )}
          </>
        )}
        <div className="studio-note">{note}</div>
      </div>
      <div className="studio-bottom-bar">
        <FolderOpen />
        <Scissors />
        <Subtitles />
        <Download />
      </div>
      <span className="interface-note">ILLUSTRATIVE WORKFLOW PREVIEW</span>
    </div>
  );
}
function WorkflowSection() {
  const [active, setActive] = useState("cut");
  return (
    <section
      className="workflow-section"
      id="how-it-works"
      data-nav-section=""
      aria-labelledby="workflow-title"
    >
      <div className="m-container">
        <h2 id="workflow-title" className="m-sr-only">
          How EditAI works
        </h2>
        <div
          className="workflow-switcher"
          aria-label="Explore the editing workflow"
        >
          {content.workflow.map((step, i) => (
            <div key={step.id}>
              <button
                aria-pressed={active === step.id}
                onClick={() => setActive(step.id)}
              >
                {step.title}
              </button>
              {i < 3 && <ArrowRight size={14} />}
            </div>
          ))}
        </div>
        <div className="workflow-grid">
          {content.workflow.map((step, i) => (
            <article
              className={`workflow-step m-reveal ${active === step.id ? "active" : ""}`}
              style={{ "--stagger": `${i * 65}ms` } as CSSProperties}
              key={step.id}
            >
              {step.image ? (
                <img
                  className="workflow-authentic-image"
                  src={step.image}
                  alt={step.alt || step.title}
                  width="360"
                  height="680"
                  loading="lazy"
                />
              ) : (
                <WorkflowScreen
                  kind={step.id}
                  title={step.screenTitle}
                  note={step.screenNote}
                />
              )}
              <span className="m-eyebrow">{step.label}</span>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
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
      tabIndex={0}
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
      className="features-section"
      data-nav-section=""
      aria-labelledby="features-title"
    >
      <div className="m-container">
        <div className="m-section-heading m-reveal">
          <span className="m-eyebrow">FEATURES</span>
          <h2 id="features-title">Tools that do the editing for you</h2>
        </div>
        <AnimatedFeatureIcons />
        <div className="feature-grid">
          {content.features.map((feature, i) => (
            <article
              className="feature-card m-reveal"
              style={{ "--stagger": `${(i % 4) * 55}ms` } as CSSProperties}
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
function CreatorVideoGallery() {
  const realVideos = content.videos.some((video) => video.src);
  const [paused, setPaused] = useState(false);
  return (
    <section
      className="gallery-section"
      id="creators"
      data-nav-section="creators"
      aria-labelledby="creators-title"
    >
      <div className="m-container">
        <div className="m-section-heading m-reveal">
          <h2 id="creators-title">
            Your next great story.
            <br />
            Made with EditAI.
          </h2>
          <p>
            {realVideos
              ? "Finished videos, from the people behind the camera. Tap for sound."
              : "A space for your stories. Authentic creator videos coming soon."}
          </p>
        </div>
        <div className="creator-video-grid">
          {content.videos.map((asset, i) => (
            <article className="creator-video-card m-reveal" key={asset.id}>
              <div className="gallery-frame-label">
                {String(i + 1).padStart(2, "0")} · EDITAI STORIES
              </div>
              <MarketingVideo asset={asset} paused={paused} />
              <div className="creator-video-credit">
                <span>
                  {asset.creator?.approved ? asset.creator.name : asset.title}
                </span>
                <ArrowUpRight size={14} />
              </div>
              <small>
                {asset.creator?.approved
                  ? `${asset.creator.platform || "CREATOR"}${asset.creator.followers ? ` · ${asset.creator.followers}` : ""}`
                  : "YOUR FOOTAGE. YOUR POINT OF VIEW."}
              </small>
            </article>
          ))}
        </div>
        <p className="gallery-caption">
          REAL STORIES · A LITTLE MORE YOU · MADE WITH EDITAI
        </p>
        {realVideos ? (
          <button
            className="gallery-pause"
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "Resume the videos" : "Pause the videos"}
          </button>
        ) : (
          <p className="gallery-pending">CREATOR SHOWCASE COMING SOON</p>
        )}
      </div>
    </section>
  );
}
function WorkflowComparison() {
  return (
    <section
      className="comparison-section"
      data-nav-section="creators"
      aria-labelledby="comparison-title"
    >
      <div className="m-container">
        <div className="comparison-heading m-reveal">
          <h2 id="comparison-title">
            Give your ideas
            <br />
            <span>more of your time.</span>
          </h2>
          <p>
            Bring the point of view. Keep the creative decisions.
            <br />
            Let the tools help with the steps in between.
          </p>
        </div>
        <p className="table-scroll-hint">
          Scroll to compare <ArrowRight size={12} />
        </p>
        <div
          className="workflow-table-wrap m-reveal"
          tabIndex={0}
          role="region"
          aria-label="Compare the EditAI workflow"
        >
          <table className="workflow-table">
            <caption className="m-sr-only">
              From original footage through AI assistance to your final EditAI
              cut
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="m-sr-only">Workflow</span>
                </th>
                <th scope="col">YOUR FOOTAGE</th>
                <th scope="col">AI ASSISTANCE</th>
                <th scope="col">EDITAI</th>
              </tr>
            </thead>
            <tbody>
              {content.comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, i) => (
                    <td key={i}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="estimate-eyebrow m-eyebrow">
          MAKE ROOM FOR CREATING <span>· EXPLORE YOUR OWN ESTIMATE</span>
        </p>
        <TimeCalculator />
      </div>
    </section>
  );
}
const faqGroups = content.faqCategories;
function FaqAccordion() {
  const [group, setGroup] = useState(0),
    [open, setOpen] = useState<number | null>(null);
  return (
    <section
      className="faq-section"
      id="faq"
      data-nav-section="faq"
      aria-labelledby="faq-title"
    >
      <div className="m-container faq-layout">
        <div className="faq-intro m-reveal">
          <h2 id="faq-title">
            Still have
            <br />
            questions?
          </h2>
          <a className="m-secondary-button" href={content.links.support}>
            Contact us <ArrowRight size={14} />
          </a>
        </div>
        <div className="faq-content">
          <div
            className="faq-categories"
            role="group"
            aria-label="Question categories"
          >
            {faqGroups.map((item, i) => (
              <button
                aria-pressed={group === i}
                onClick={() => {
                  setGroup(i);
                  setOpen(null);
                }}
                key={item.name}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="faq-list">
            {faqGroups[group].indices.map((index) => {
              const item = content.faqs[index];
              return (
                <article
                  className={`faq-row ${open === index ? "is-open" : ""}`}
                  key={index}
                >
                  <h3>
                    <button
                      id={`faq-question-${index}`}
                      aria-expanded={open === index}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpen(open === index ? null : index)}
                    >
                      {item.question}
                      {open === index ? (
                        <Minus size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                    </button>
                  </h3>
                  <div
                    className="faq-answer"
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                    inert={open !== index}
                  >
                    <div>
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
function ClosingCtaFooter({ onPrivacy }: { onPrivacy: () => void }) {
  return (
    <>
      <section
        className="closing-section"
        id="get-editai"
        data-nav-section="faq"
      >
        <div className="closing-sweep" aria-hidden="true" />
        <div className="closing-copy m-reveal">
          <h2>
            <span>
              Stop <em className="strike-word">editing.</em>
            </span>
            <span>
              Start <em className="circle-word">creating.</em>
            </span>
          </h2>
          <p>
            Record the whole take. Find your story.
            <br />
            Give it your own finishing touch.
          </p>
          <MainCta />
          <div className="marketing-downloads">
            <DesktopDownloads />
          </div>
          <small id="ios-coming-soon">{content.footer.note}</small>
        </div>
      </section>
      <footer className="m-footer">
        <div className="m-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <MarketingBrand />
              <p>{content.footer.description}</p>
            </div>
            <div>
              <h3>PRODUCT</h3>
              {content.footer.product.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h3>LEGAL & SUPPORT</h3>
              <button onClick={onPrivacy}>Privacy & data</button>
              <a href={content.links.app}>Privacy choices</a>
              <a href={content.links.support}>Support</a>
              <a
                href="https://github.com/tappj/EditAI-Webapp/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
              >
                Open source <ArrowUpRight size={11} />
              </a>
            </div>
            <div className="footer-cta">
              <a className="m-button" href={content.ios.href}>
                {content.ios.label}
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
          <div className="footer-baseline">
            <span>© {new Date().getFullYear()} EDITAI</span>
            <a href={content.links.source} target="_blank" rel="noreferrer">
              YOUR FOOTAGE. YOUR CREATIVE CONTROL.
            </a>
          </div>
          <div className="footer-wordmark" aria-hidden="true">
            EDITAI
          </div>
        </div>
      </footer>
    </>
  );
}
function usePageMotion() {
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
      { threshold: 0.06 },
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
  return root;
}
export function MarketingLanding({ onPrivacy }: { onPrivacy: () => void }) {
  const root = usePageMotion();
  return (
    <div className="marketing" ref={root}>
      <a className="m-skip-link" href="#main-content">
        Skip to content
      </a>
      <FloatingNav />
      <main id="main-content">
        <Hero />
        <WorkflowSection />
        <FeatureGrid />
        <CreatorVideoGallery />
        <WorkflowComparison />
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
      <header className="sign-in-header m-container">
        <MarketingBrand />
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
