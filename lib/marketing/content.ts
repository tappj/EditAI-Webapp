/** Owner handoff: insert only approved EditAI assets/claims here. See docs/MARKETING.md. */
export type FeatureIcon = "cut" | "audio" | "sparkles" | "captions" | "timeline" | "batch" | "export";
export type Review = { id: string; approved: boolean; title: string; text: string; author: string; source: string; rating?: number; avatar?: string };
export type Creator = { id: string; approved: boolean; name: string; portrait: string; platform?: string; followers?: string };
export type VideoAsset = { id: string; title: string; description: string; src?: string; poster?: string; creator?: Creator };
export type Plan = { id: string; name: string; description: string; benefits: string[]; monthly: { price: string; checkoutUrl: string } | null; annual: { price: string; checkoutUrl: string } | null; recommended?: boolean };
export const marketingContent = {
  hero: { firstLine: "Film freely.", secondLine: "Let EditAI do the editing.", subtitle: "We find your best takes, add captions, and make every frame yours.", cta: "Open EditAI Web" },
  links: { app: "/sign-in", support: "mailto:editaiapp@gmail.com", source: "https://github.com/tappj/EditAI-Webapp/tree/codex/desktop-migration" },
  navigation: [{ id: "how-it-works", label: "How it works" }, { id: "creators", label: "Creators" }, { id: "pricing", label: "Pricing" }, { id: "faq", label: "FAQ" }],
  // TODO: approved, authentic customer reviews, awards and creator profiles.
  reviews: [] as Review[],
  awards: [] as { id: string; approved: boolean; quote: string; source: string; rating?: number }[],
  creators: [] as Creator[],
  metrics: [ { value: "Your cut.", label: "AI assistance. Your final say." }, { value: "Your style.", label: "Captions, color & a personal touch." }, { value: "Your story.", label: "From first take to final export." } ],
  capabilities: [
    { title: "A first cut, a fresh start.", text: "Let AI suggest an edit from your transcript. Review the changes, then make the final call.", icon: "cut" },
    { title: "Give every word a place.", text: "Generate timed captions from your audio and make their style your own.", icon: "captions" },
    { title: "Room to find your rhythm.", text: "Split, trim and reorder clips on a timeline that keeps your source footage intact.", icon: "timeline" },
    { title: "Make the frame yours.", text: "Adjust your crop, color and exposure. Add text, images and audio in the editor.", icon: "sparkles" },
    { title: "More than one idea?", text: "Import a batch of clips into independent projects, ready for their own finishing touches.", icon: "batch" },
    { title: "Ready for the next screen.", text: "Export your finished project as an MP4, with your edits and captions together.", icon: "export" },
  ] as { title: string; text: string; icon: FeatureIcon }[],
  comparison: { before: { id: "before", title: "Before", description: "Your original footage" }, after: { id: "after", title: "After", description: "Your EditAI cut" } } as { before: VideoAsset; after: VideoAsset },
  // TODO: replace neutral previews with authentic screenshots, keeping alt text accurate.
  demos: [ { title: "Find the take.\nKeep the story.", kind: "cut", image: "", alt: "", label: "AI-assisted first cut" }, { title: "Big ideas.\nOne tidy workspace.", kind: "batch", image: "", alt: "", label: "Your project library" }, { title: "Your finishing touch.\nIn every frame.", kind: "export", image: "", alt: "", label: "Captions & MP4 export" } ] as { title: string; kind: "cut" | "batch" | "export"; image: string; alt: string; label: string }[],
  features: [
    { icon: "cut", title: "An AI first cut", text: "Turn your transcript into a suggested edit. Review it before applying." },
    { icon: "audio", title: "Trim the pauses", text: "Find quiet gaps with audio evidence and refine your pacing." },
    { icon: "sparkles", title: "Find your best takes", text: "Get AI-assisted take selection with source-anchored edits." },
    { icon: "captions", title: "Make captions yours", text: "Timed words, expressive styles and full control over your text." },
    { icon: "timeline", title: "A real editor", text: "Trim, split and reorder. Add text, overlays, music and color." },
    { icon: "batch", title: "A home for every clip", text: "Batch-import recordings into separate, saved projects." },
    { icon: "export", title: "Take your story out", text: "Export an MP4 with your timeline, captions and effects." },
  ] as { icon: FeatureIcon; title: string; text: string }[],
  workflow: [ { title: "Start with the real thing.", text: "Import your recordings, or record in the studio with a teleprompter. Keep your original footage.", label: "01 · BRING YOUR FOOTAGE" }, { title: "Let the first cut find you.", text: "Connect your Publik account for transcription and AI editing. Review every suggested change.", label: "02 · FIND YOUR STORY" }, { title: "A little more you.", text: "Shape the timing, style your captions and add the finishing touches on the timeline.", label: "03 · MAKE IT YOURS" }, { title: "And out into the world.", text: "Export your finished MP4 and share it wherever your story belongs.", label: "04 · READY TO SHARE" } ],
  // TODO: supply approved portrait videos/posters, e.g. /marketing/creator-01.mp4.
  videos: [ { id: "creator-01", title: "Your next story", description: "Creator showcase · coming soon" }, { id: "creator-02", title: "Your point of view", description: "Creator showcase · coming soon" }, { id: "creator-03", title: "Your kind of creative", description: "Creator showcase · coming soon" } ] as VideoAsset[],
  // Presentation-ready slots, NOT purchasable subscriptions. No price/quota claims.
  pricing: { approved: false, usage: ["A few a week", "Every day", "Lots to create"], plans: [
    { id: "starter", name: "Starter", description: "For your next creative beginning", benefits: ["Timeline editing", "Caption styling", "MP4 exports"], monthly: null, annual: null },
    { id: "creator", name: "Creator", description: "For a regular creative rhythm", benefits: ["Timeline editing", "Caption styling", "Multiple project workflow"], monthly: null, annual: null },
    { id: "studio", name: "Studio", description: "For a workspace full of ideas", benefits: ["Timeline editing", "Caption styling", "Batch project imports"], monthly: null, annual: null },
  ] as Plan[] },
  faqs: [
    { question: "Where can I use EditAI?", answer: "Open the web editor in your browser, or use the signed macOS download on a supported Mac. EditAI for iOS is coming soon." },
    { question: "Can I fine-tune the AI edit?", answer: "Yes. Review suggested edits, then trim, split, reorder, style captions and adjust your video on the timeline. Your original source stays intact." },
    { question: "How do I get started?", answer: "Choose Open EditAI Web and continue through the official Publik sign-in. Connect an available AI plan and give permission before using AI tools." },
    { question: "Can I add my own captions?", answer: "You can generate word-timed captions from audio, edit the text and change its style. Transcription needs a connected AI account and your consent." },
    { question: "What can I export?", answer: "EditAI exports MP4 video with H.264 video and AAC audio. Browser exports are SDR; supported codecs, memory and device performance affect the available workflow." },
    { question: "What happens to my original footage?", answer: "Timeline edits reference your sources without changing the original recordings. Keep a copy of important originals and exports." },
    { question: "Can I work with several clips?", answer: "Yes. Import multiple clips into a project, or use batch import to create independent projects from your recordings." },
    { question: "Can I record in the editor?", answer: "The studio includes recording and a teleprompter. Camera and microphone access depend on your browser and device permissions." },
    { question: "Where are my web projects saved?", answer: "Drafts and source files use this browser’s IndexedDB. Optional cloud source backup is limited to 100 MB per file and 500 MB per account. Clearing browser storage removes local files." },
    { question: "Does desktop automatically sync with the web?", answer: "Automatic cross-device project sync is not currently available. Desktop projects and optional backup copies stay in the computer’s app storage." },
    { question: "Are EditAI subscription prices available?", answer: "EditAI subscription prices have not been announced here. AI access is connected through Publik. Check your account there for your actual plan and usage." },
    { question: "How can I manage my data?", answer: "Use Settings to manage AI consent, usage telemetry and deletion of EditAI data. Manage your Publik account and plan separately on publikhq.com. Contact editaiapp@gmail.com with data questions." },
  ],
  footer: { description: "A little less editing. A little more you.", firstLine: "Stop editing.", secondLine: "Start creating.", note: "Web & macOS · iOS coming soon", product: [{ label: "How it works", href: "#how-it-works" }, { label: "Creators", href: "#creators" }, { label: "Pricing", href: "#pricing" }, { label: "Open EditAI Web", href: "/sign-in" }] },
};
export const approvedReviews = marketingContent.reviews.filter((review) => review.approved);
