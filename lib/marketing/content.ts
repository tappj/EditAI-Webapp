/** Owner handoff: insert only approved EditAI assets/claims here. See docs/MARKETING.md. */
export type FeatureIcon =
  | "cut"
  | "audio"
  | "sparkles"
  | "captions"
  | "timeline"
  | "batch"
  | "record"
  | "export";
export type Review = {
  id: string;
  approved: boolean;
  placeholder?: boolean;
  title: string;
  text: string;
  author: string;
  source: string;
  rating?: number;
  avatar?: string;
};
export type Creator = {
  id: string;
  approved: boolean;
  name: string;
  portrait: string;
  platform?: string;
  followers?: string;
};
export type VideoAsset = {
  id: string;
  title: string;
  description: string;
  src?: string;
  poster?: string;
  creator?: Creator;
};
export type Plan = {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  monthly: { price: string; checkoutUrl: string } | null;
  annual: { price: string; checkoutUrl: string } | null;
  recommended?: boolean;
};
// Owner-supplied CutAI review excerpts for attributed layout placeholders.
const placeholderReviewCopy: Array<[string, string, string]> = [
  [
    "Time saver to the max",
    "Cut AI has been a huge time saver for me as a new UGC creator. Editing used to be one of the biggest bottlenecks in my workflow, but now I can get through content much faster without sacrificing quality...",
    "WesADT"
  ],
  [
    "Best Auto Editing App",
    "I’ve used a few others and this one is by far the best, 99% of my videos only need one try and CutAI gets it perfect while still allowing me to quickly make the final touches to the video with their amazing UI design. 10/10",
    "Collin_t90"
  ],
  [
    "INSANELY EFFECTIVE",
    "I love how you can just put your vids in and it edits for you in a few minutes. I can put 10 vids in then leave not even be in the app go to the gym and it’ll edit them all for me, thank you so much!",
    "keonifish123"
  ],
  [
    "I Love Cut AI!",
    "This app has completely changed the way I create UGC. I can spend more time actually being creative instead of spending hours editing. I love everything about this app, and it has helped me so much. It does an amazing job...",
    "Dre9898"
  ],
  [
    "A Must Have for UGC",
    "Genuinely the best ai editing app out there. Time is money. Saves me so much time and I can put out more videos without spending so much time editing",
    "skyfindsthings"
  ],
  [
    "Choose CutAi",
    "I have been using this app before it was on the App Store and I have to say that it is amazing. Just create one video of whatever you choose and it perfectly cuts it for you without any hassle.",
    "LaytoB05"
  ],
  [
    "Increases output and earnings!",
    "I’ve been using this app since it was in testing, it has increased the amount of videos I can put out and saves so much time. The subscription is cheap for the value you get.",
    "Camronbrown"
  ],
  [
    "Fired my editor",
    "Big thanks to the guys at CutAI. This editing app has saved me so much time, and so much money. They also listen to our feedback and implement them as soon as they can. I’ve tried other ai editing apps and they are just not as...",
    "SteveH05"
  ],
  [
    "Cuts my time in half",
    "I love this app. It cuts my editing time by 50% which I love because I can do more content versus spending more time editing and I can never do as much as I always want to, but this allows me to get more content out and less time editing amazing app.",
    "Charcha212"
  ],
  [
    "Saves me so much time",
    "I was about to hire an editor, but I figured I’d try this out and it has saved me so much time especially with the new update where I can edit my videos in under or around a minute. Seriously so impressed with this the only thing I’d want to see is the ability to boost the audio levels and add color grading features like saturation or temperature changes",
    "Chefryan1"
  ],
  ["I came back", "Once I realized it was so much easier for me and my workflow to film in clips and then put them all in and do the overlays I ended up loving it!", "TheTXHouseWife"],
  ["For non techy people", "I’d say it’s about 80 to 90% spot on the only issue is sometimes it edits out the demo because I’m not talking I’m just showing but that’s OK that’s how it works and it’s a good product.", "Larrytreeton"],
  ["This has made my life so much easier", "When I first got it, this was magic. I wasn’t having to edit. It would make the cuts. Everything was working beautifully.", "Evam1717"],
  ["LIFE CHANGING!!", "I don’t mind editing, but it takes me forever and I’ve literally had this for two days and it has saved me hours!", "Tiff926"],
  ["Amazing App", "This app is amazing! It has saved me so much time editing my videos. If you have not got it yet you are missing out!", "The Sacred Spiral"],
  ["Time Saver!", "I’m a hairstylist of 30 years and never have had to use a computer for much of anything and now I’m having to learn editing and so many different things.", "Mesa Leon"]
];
export const marketingContent = {
  hero: {
    firstLine: "Turn your raw footage into",
    secondLine: "edited videos in minutes.",
    subtitle:
      "EditAI cuts out the empty space, finds the best takes, and adds captions.",
    cta: "Open EditAI Web",
    // Owner-provided cumulative savings and portraits; no synthetic counter.
    socialProof: {
      savings: "250+ hours",
      portraits: [
        {
          id: "jadon",
          src: "/marketing/avatars/jadon.jpg",
          x: 53,
          y: 29,
          zoom: 1.6,
        },
        {
          id: "james",
          src: "/marketing/avatars/james.jpg",
          x: 51,
          y: 41,
          zoom: 1.6,
        },
        {
          id: "max",
          src: "/marketing/avatars/max.jpg",
          x: 47,
          y: 40,
          zoom: 1.6,
        },
        {
          id: "tyler",
          src: "/marketing/avatars/tyler.jpg",
          x: 62,
          y: 29,
          zoom: 1.6,
        },
      ],
    },
  },
  ios: { label: "iOS coming soon", href: "#ios-coming-soon" },
  links: {
    home: "/",
    app: "/sign-in",
    support: "mailto:editaiapp@gmail.com",
    source:
      "https://github.com/tappj/EditAI-Webapp/tree/codex/desktop-migration",
  },
  navigation: [
    { id: "creators", label: "Creators" },
    { id: "pricing", label: "Pricing" },
    { id: "faq", label: "FAQ" },
  ],
  // Temporary copy for layout preview. Replace with approved, authentic reviews.
  reviews: placeholderReviewCopy.map(([title, text, author], index) => ({
    id: `sample-${String(index + 1).padStart(2, "0")}`,
    approved: false,
    placeholder: true,
    title,
    text,
    author: "",
    source: "CUTAI REVIEW · DESIGN REFERENCE",
    rating: 5,
  })) as Review[],
  capabilities: [
    {
      title: "A first cut, a fresh start.",
      text: "Let AI suggest an edit from your transcript. Review the changes, then make the final call.",
      icon: "cut",
    },
    {
      title: "Give every word a place.",
      text: "Generate timed captions from your audio and make their style your own.",
      icon: "captions",
    },
    {
      title: "Room to find your rhythm.",
      text: "Split, trim and reorder clips on a timeline that keeps your source footage intact.",
      icon: "timeline",
    },
    {
      title: "Make the frame yours.",
      text: "Adjust your crop, color and exposure. Add text, images and audio in the editor.",
      icon: "sparkles",
    },
    {
      title: "More than one idea?",
      text: "Import a batch of clips into independent projects, ready for their own finishing touches.",
      icon: "batch",
    },
    {
      title: "Ready for the next screen.",
      text: "Export your finished project as an MP4, with your edits and captions together.",
      icon: "export",
    },
  ] as { title: string; text: string; icon: FeatureIcon }[],
  features: [
    {
      icon: "batch",
      title: "Batch",
      text: "Import up to 10 separate projects in one batch.",
    },
    {
      icon: "record",
      title: "Record",
      text: "Record videos directly in-app, with a teleprompter for your script.",
    },
    {
      icon: "cut",
      title: "EditAI",
      text: "EditAI automatically trims empty space and mistakes from your video.",
    },
    {
      icon: "audio",
      title: "Transcribe",
      text: "Turn speech from any video into text.",
    },
    {
      icon: "sparkles",
      title: "Analyze",
      text: "Get a concise summary and highlights from your footage.",
    },
    {
      icon: "captions",
      title: "Auto Caption",
      text: "Generate captions from your video, then adjust their styling and punctuation.",
    },
    {
      icon: "export",
      title: "Export",
      text: "Render your edits and captions into an MP4.",
    },
  ] as { icon: FeatureIcon; title: string; text: string }[],
  workflow: [
    {
      id: "import",
      title: "Upload",
      label: "01 · UPLOAD",
      text: "Tap + to add your footage, or start with a recording.",
      screenTitle: "Your story starts here.",
      screenNote: "Upload your footage",
      image: "/marketing/workflow/upload.png",
      imageWidth: 1170,
      imageHeight: 2532,
      alt: "EditAI iOS app preview: upload screen with Record, Batch, Analyze and Transcribe tools.",
    },
    {
      id: "cut",
      title: "Send",
      label: "02 · SEND",
      text: "Tap Send when you’re ready. EditAI finds the cuts and keeps your story.",
      screenTitle: "Send does the editing.",
      screenNote: "Send your recording",
      image: "/marketing/workflow/send.png",
      imageWidth: 1170,
      imageHeight: 2532,
      alt: "EditAI iOS app preview: recording preview with the Send action highlighted by the guided tour.",
    },
    {
      id: "review",
      title: "AI Edit",
      label: "03 · AI EDIT",
      text: "Trim, add text or captions, and adjust your cut. Make it yours.",
      screenTitle: "Make it yours.",
      screenNote: "AI Edit",
      image: "/marketing/workflow/ai-edit.png",
      imageWidth: 1170,
      imageHeight: 2532,
      alt: "EditAI iOS app preview: guided editor tour highlighting editing tools and the Export action.",
    },
    {
      id: "export",
      title: "Export",
      label: "04 · EXPORT",
      text: "Preview your cut, then tap Export to render your finished video.",
      screenTitle: "A story worth sharing.",
      screenNote: "Export your video",
      image: "/marketing/workflow/export.png",
      imageWidth: 1170,
      imageHeight: 2532,
      alt: "EditAI iOS app preview: video editor with preview, timeline, editing tools and Export button.",
    },
  ] as {
    id: "import" | "cut" | "review" | "export";
    title: string;
    label: string;
    text: string;
    screenTitle: string;
    screenNote: string;
    image?: string;
    imageWidth?: number;
    imageHeight?: number;
    alt?: string;
  }[],
  comparisonRows: [
    {
      label: "COST PER MONTH",
      values: [
        "Your tools — and your time",
        "Based on your editor",
        "Pricing coming soon",
      ],
    },
    {
      label: "YOUR TIME PER VIDEO",
      values: [
        "Hands-on editing",
        "Briefs & revision notes",
        "Review the AI first cut",
      ],
    },
    {
      label: "TURNAROUND",
      values: ["Tonight, maybe", "Depends on their queue", "Start right away"],
    },
    {
      label: "SKILL NEEDED",
      values: [
        "Timeline editing",
        "Managing an editor",
        "Simple to start. Yours to refine.",
      ],
    },
    {
      label: "SCALES WITH VOLUME",
      values: [
        "Capped by your time",
        "Capped by their queue",
        "Batch-ready projects",
      ],
    },
  ],
  calculator: { videos: 10, currentMinutes: 60, targetMinutes: 15 },
  // TODO: supply approved portrait videos/posters, e.g. /marketing/creator-01.mp4.
  videos: [
    {
      id: "creator-01",
      title: "Your next story",
      description: "Your footage. Your final say.",
    },
    {
      id: "creator-02",
      title: "Your point of view",
      description: "Your footage. Your final say.",
    },
    {
      id: "creator-03",
      title: "Your kind of creative",
      description: "Your footage. Your final say.",
    },
  ] as VideoAsset[],
  // Presentation-ready slots, NOT purchasable subscriptions. No price/quota claims.
  pricing: {
    approved: false,
    usage: ["A few a week", "Every day", "Lots to create"],
    plans: [
      {
        id: "starter",
        name: "Starter",
        description: "For your next creative beginning",
        benefits: ["Timeline editing", "Caption styling", "MP4 exports"],
        monthly: null,
        annual: null,
      },
      {
        id: "creator",
        name: "Creator",
        description: "For a regular creative rhythm",
        benefits: [
          "Timeline editing",
          "Caption styling",
          "Multiple project workflow",
        ],
        monthly: null,
        annual: null,
      },
      {
        id: "studio",
        name: "Studio",
        description: "For a workspace full of ideas",
        benefits: [
          "Timeline editing",
          "Caption styling",
          "Batch project imports",
        ],
        monthly: null,
        annual: null,
      },
    ] as Plan[],
  },
  faqCategories: [
    { name: "The edit", indices: [1, 3, 4, 5] },
    { name: "The app", indices: [0, 6, 7, 9] },
    { name: "Getting started", indices: [2, 8, 10, 11] },
  ],
  faqs: [
    {
      question: "Where can I use EditAI?",
      answer:
        "Open the web editor in your browser, or use the signed macOS download on a supported Mac. EditAI for iOS is coming soon.",
    },
    {
      question: "Can I fine-tune the AI edit?",
      answer:
        "Yes. You can always undo, trim, reorder and style captions yourself. We also have an EditAI chatbox which can fine-tune your edit for you.",
    },
    {
      question: "How do I get started?",
      answer:
        "Choose Open EditAI Web and continue through the official Publik sign-in. Connect an available AI plan and give permission before using AI tools.",
    },
    {
      question: "Can I add my own captions?",
      answer:
        "You can generate word-timed captions from audio, edit the text and change its style. Transcription needs a connected AI account and your consent.",
    },
    {
      question: "What can I export?",
      answer:
        "EditAI exports MP4 video with H.264 video and AAC audio. Browser exports are SDR; supported codecs, memory and device performance affect the available workflow.",
    },
    {
      question: "What happens to my original footage?",
      answer:
        "Timeline edits reference your sources without changing the original recordings. Keep a copy of important originals and exports.",
    },
    {
      question: "Can I work with several clips?",
      answer:
        "Yes. Import multiple clips into a project, or use batch import to create independent projects from your recordings.",
    },
    {
      question: "Can I record in the editor?",
      answer:
        "The studio includes recording and a teleprompter. Camera and microphone access depend on your browser and device permissions.",
    },
    {
      question: "Where are my web projects saved?",
      answer:
        "Drafts and source files use this browser’s IndexedDB. Optional cloud source backup is limited to 100 MB per file and 500 MB per account. Clearing browser storage removes local files.",
    },
    {
      question: "Does desktop automatically sync with the web?",
      answer:
        "Automatic cross-device project sync is not currently available. Desktop projects and optional backup copies stay in the computer’s app storage.",
    },
    {
      question: "Are EditAI subscription prices available?",
      answer:
        "EditAI subscription prices have not been announced here. AI access is connected through Publik. Check your account there for your actual plan and usage.",
    },
    {
      question: "How can I manage my data?",
      answer:
        "Use Settings to manage AI consent, usage telemetry and deletion of EditAI data. Manage your Publik account and plan separately on publikhq.com. Contact editaiapp@gmail.com with data questions.",
    },
  ],
  footer: {
    description: "A little less editing. A little more you.",
    firstLine: "Stop editing.",
    secondLine: "Start creating.",
    product: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Creators", href: "#creators" },
      { label: "Pricing", href: "#pricing" },
      { label: "Open EditAI Web", href: "/sign-in" },
    ],
  },
};
export const approvedReviews = marketingContent.reviews.filter(
  (review) => review.approved,
);
