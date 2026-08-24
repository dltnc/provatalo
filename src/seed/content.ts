import { slugify } from '@/lib/slugify'

/**
 * Demo data for the Bangla news portal.
 *
 * Everything here is fictional — original copy written for this seed, no real outlet's
 * headlines, bylines, or photographs. Its only job is to give the frontend realistic shapes
 * (populated categories, bylines, video cards, breaking/featured flags) to build against.
 */

// --- Lexical helper -------------------------------------------------------

export type LexicalDoc = { root: Record<string, unknown> }

/** Build a minimal-but-valid Lexical document from plain Bangla paragraphs. */
export const richText = (paragraphs: string[]): LexicalDoc => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      textFormat: 0,
      textStyle: '',
      children: [
        { type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 },
      ],
    })),
  },
})

/** Convenience: the deterministic slug a title/name will resolve to, for idempotent lookups. */
export const slugFor = (value: string): string => slugify(value)

// --- Categories -----------------------------------------------------------

export type SeedCategory = {
  name: string
  color: string
  displayOrder: number
  /** Parent category name; omit for a top-level category. */
  parent?: string
}

export const categories: SeedCategory[] = [
  { name: 'জাতীয়', color: '#c8102e', displayOrder: 1 },
  { name: 'আন্তর্জাতিক', color: '#1a5276', displayOrder: 2 },
  { name: 'অর্থনীতি', color: '#117a65', displayOrder: 3 },
  { name: 'খেলা', color: '#b9770e', displayOrder: 4 },
  { name: 'বিনোদন', color: '#7d3c98', displayOrder: 5 },
  { name: 'প্রযুক্তি', color: '#2874a6', displayOrder: 6 },
  { name: 'রাজনীতি', color: '#922b21', displayOrder: 1, parent: 'জাতীয়' },
  { name: 'ঢাকা', color: '#1f618d', displayOrder: 2, parent: 'জাতীয়' },
]

// --- Tags -----------------------------------------------------------------

export const tags: string[] = [
  'নির্বাচন',
  'বাজেট',
  'ক্রিকেট',
  'ফুটবল',
  'আবহাওয়া',
  'শিক্ষা',
  'স্বাস্থ্য',
  'কৃত্রিম বুদ্ধিমত্তা',
  'স্টার্টআপ',
  'চলচ্চিত্র',
  'জলবায়ু',
  'মেট্রোরেল',
]

// --- Authors --------------------------------------------------------------

export type SeedRole = 'superadmin' | 'editor' | 'reporter'

export type SeedAuthor = {
  name: string
  email: string
  roles: SeedRole[]
  bio: string
}

export const authors: SeedAuthor[] = [
  {
    name: 'সম্পাদকীয় দল',
    email: 'admin@provatalo.test',
    roles: ['superadmin'],
    bio: 'প্রভাতালো-র কেন্দ্রীয় সম্পাদকীয় দল, যারা সাইটের সার্বিক প্রকাশনা তদারকি করে।',
  },
  {
    name: 'তানভীর আহমেদ',
    email: 'tanvir@provatalo.test',
    roles: ['editor'],
    bio: 'জাতীয় ও রাজনৈতিক ডেস্কের সম্পাদক। এক দশকের বেশি সময় ধরে সংবাদ পরিবেশনায় যুক্ত।',
  },
  {
    name: 'নুসরাত জাহান',
    email: 'nusrat@provatalo.test',
    roles: ['editor'],
    bio: 'অর্থনীতি ও প্রযুক্তি বিষয়ক সম্পাদক। ব্যবসা-বাণিজ্য ও উদ্ভাবন নিয়ে নিয়মিত লেখেন।',
  },
  {
    name: 'রাকিব হাসান',
    email: 'rakib@provatalo.test',
    roles: ['reporter'],
    bio: 'ক্রীড়া প্রতিবেদক। ক্রিকেট ও ফুটবলের মাঠ থেকে সরাসরি সংবাদ পাঠান।',
  },
  {
    name: 'সাবিনা ইয়াসমিন',
    email: 'sabina@provatalo.test',
    roles: ['reporter'],
    bio: 'বিনোদন ও সংস্কৃতি বিষয়ক প্রতিবেদক।',
  },
]

// --- Articles -------------------------------------------------------------

export type SeedArticle = {
  title: string
  subtitle?: string
  /** Category name (must match one in `categories`). */
  category: string
  tags?: string[]
  /** Author email (must match one in `authors`). */
  author: string
  location?: string
  type?: 'text' | 'video'
  youtubeUrl?: string
  duration?: string
  isBreaking?: boolean
  isFeatured?: boolean
  /** How many days before "now" this was published. */
  daysAgo: number
  metaDescription?: string
  body: string[]
}

export const articles: SeedArticle[] = [
  {
    title: 'জাতীয় বাজেটে শিক্ষা খাতে বরাদ্দ বাড়ানোর ঘোষণা',
    subtitle: 'আগামী অর্থবছরে প্রাথমিক ও মাধ্যমিক পর্যায়ে বিশেষ গুরুত্ব দেওয়ার কথা জানানো হয়েছে।',
    category: 'অর্থনীতি',
    tags: ['বাজেট', 'শিক্ষা'],
    author: 'nusrat@provatalo.test',
    location: 'ঢাকা',
    isFeatured: true,
    daysAgo: 1,
    metaDescription: 'আগামী অর্থবছরের প্রস্তাবিত বাজেটে শিক্ষা খাতে বরাদ্দ উল্লেখযোগ্য হারে বাড়ানোর ঘোষণা।',
    body: [
      'আগামী অর্থবছরের প্রস্তাবিত বাজেটে শিক্ষা খাতে বরাদ্দ উল্লেখযোগ্য হারে বাড়ানো হচ্ছে বলে জানিয়েছেন সংশ্লিষ্ট কর্মকর্তারা। প্রাথমিক ও মাধ্যমিক পর্যায়ে অবকাঠামো উন্নয়ন এবং শিক্ষক প্রশিক্ষণে এই বরাদ্দের বড় অংশ ব্যয় হবে।',
      'কর্মকর্তারা বলছেন, প্রত্যন্ত অঞ্চলের বিদ্যালয়গুলোতে ডিজিটাল শ্রেণিকক্ষ চালুর পরিকল্পনা রয়েছে। পাশাপাশি বৃত্তির পরিধি বাড়িয়ে ঝরে পড়ার হার কমানোর লক্ষ্যমাত্রা নির্ধারণ করা হয়েছে।',
      'বিশ্লেষকদের মতে, বরাদ্দ বাড়ানোর পাশাপাশি তা যথাযথ বাস্তবায়ন নিশ্চিত করাই হবে মূল চ্যালেঞ্জ।',
    ],
  },
  {
    title: 'রাজধানীতে মেট্রোরেলের নতুন রুট চালুর প্রস্তুতি চূড়ান্ত',
    subtitle: 'যাত্রীসেবা সম্প্রসারণে নতুন স্টেশনগুলোতে চলছে শেষ মুহূর্তের কাজ।',
    category: 'ঢাকা',
    tags: ['মেট্রোরেল', 'ঢাকা'],
    author: 'tanvir@provatalo.test',
    location: 'ঢাকা',
    isFeatured: true,
    isBreaking: true,
    daysAgo: 0,
    metaDescription: 'রাজধানীতে মেট্রোরেলের নতুন রুট চালুর প্রস্তুতি প্রায় চূড়ান্ত পর্যায়ে।',
    body: [
      'রাজধানীবাসীর যাতায়াত সহজ করতে মেট্রোরেলের নতুন একটি রুট চালুর প্রস্তুতি প্রায় চূড়ান্ত পর্যায়ে পৌঁছেছে। নতুন স্টেশনগুলোতে এখন চলছে শেষ মুহূর্তের সাজসজ্জা ও পরীক্ষামূলক চলাচল।',
      'সংশ্লিষ্টরা বলছেন, নতুন রুট চালু হলে ব্যস্ত সময়ে সড়কে যানজট উল্লেখযোগ্য হারে কমবে বলে আশা করা হচ্ছে।',
    ],
  },
  {
    title: 'আন্তর্জাতিক জলবায়ু সম্মেলনে নতুন অঙ্গীকার',
    subtitle: 'কার্বন নিঃসরণ কমাতে একাধিক দেশ যৌথ ঘোষণায় সম্মত হয়েছে।',
    category: 'আন্তর্জাতিক',
    tags: ['জলবায়ু', 'আবহাওয়া'],
    author: 'tanvir@provatalo.test',
    location: 'জেনেভা',
    isFeatured: true,
    daysAgo: 2,
    metaDescription: 'আন্তর্জাতিক জলবায়ু সম্মেলনে কার্বন নিঃসরণ কমাতে নতুন অঙ্গীকার।',
    body: [
      'চলমান আন্তর্জাতিক জলবায়ু সম্মেলনে কার্বন নিঃসরণ কমানোর লক্ষ্যে একাধিক দেশ একটি যৌথ ঘোষণায় সম্মত হয়েছে। নবায়নযোগ্য জ্বালানিতে বিনিয়োগ বাড়ানোর ওপর জোর দেওয়া হয়েছে।',
      'উন্নয়নশীল দেশগুলোর জন্য জলবায়ু তহবিল বাড়ানোর দাবি এবারও আলোচনার কেন্দ্রে ছিল।',
    ],
  },
  {
    title: 'বিশ্বকাপ বাছাইপর্বে নাটকীয় জয়ে আশা বাঁচিয়ে রাখল বাংলাদেশ',
    subtitle: 'শেষ ওভারের রোমাঞ্চে প্রতিপক্ষকে হারিয়ে টুর্নামেন্টে টিকে রইল দল।',
    category: 'খেলা',
    tags: ['ক্রিকেট'],
    author: 'rakib@provatalo.test',
    location: 'চট্টগ্রাম',
    isBreaking: true,
    isFeatured: true,
    daysAgo: 0,
    metaDescription: 'শেষ ওভারের রোমাঞ্চকর জয়ে বিশ্বকাপ বাছাইপর্বে টিকে রইল বাংলাদেশ।',
    body: [
      'শেষ ওভারের নাটকীয়তায় ভরা এক ম্যাচে প্রতিপক্ষকে হারিয়ে বিশ্বকাপ বাছাইপর্বে টিকে রইল বাংলাদেশ। শেষ বল পর্যন্ত গড়ানো ম্যাচে জয় নিশ্চিত হয় দুই উইকেটে।',
      'অধিনায়ক ম্যাচ শেষে বলেন, চাপের মুহূর্তে দলের তরুণ ক্রিকেটারদের ধৈর্যই পার্থক্য গড়ে দিয়েছে।',
    ],
  },
  {
    title: 'দেশীয় স্টার্টআপে বড় বিনিয়োগ, কর্মসংস্থানের নতুন সম্ভাবনা',
    subtitle: 'কৃষি ও লজিস্টিক খাতে প্রযুক্তিনির্ভর সেবা সম্প্রসারণের পরিকল্পনা।',
    category: 'প্রযুক্তি',
    tags: ['স্টার্টআপ', 'কৃত্রিম বুদ্ধিমত্তা'],
    author: 'nusrat@provatalo.test',
    location: 'ঢাকা',
    isFeatured: true,
    daysAgo: 3,
    metaDescription: 'দেশীয় একটি স্টার্টআপে বড় অঙ্কের বিনিয়োগ, নতুন কর্মসংস্থানের সম্ভাবনা।',
    body: [
      'কৃষি ও লজিস্টিক খাতে কাজ করা একটি দেশীয় স্টার্টআপে বড় অঙ্কের বিনিয়োগ এসেছে। এই বিনিয়োগ দিয়ে প্রযুক্তিনির্ভর সেবা সারা দেশে সম্প্রসারণের পরিকল্পনার কথা জানিয়েছে প্রতিষ্ঠানটি।',
      'উদ্যোক্তারা বলছেন, স্থানীয়ভাবে দক্ষ জনবল তৈরি এবং নতুন কর্মসংস্থান সৃষ্টিই তাঁদের অন্যতম লক্ষ্য।',
    ],
  },
  {
    title: 'নতুন চলচ্চিত্রের ট্রেলার প্রকাশ, দর্শকদের মধ্যে সাড়া',
    subtitle: 'মুক্তির আগেই সামাজিক মাধ্যমে আলোচনার কেন্দ্রে সিনেমাটি।',
    category: 'বিনোদন',
    tags: ['চলচ্চিত্র'],
    author: 'sabina@provatalo.test',
    location: 'ঢাকা',
    daysAgo: 4,
    metaDescription: 'নতুন চলচ্চিত্রের ট্রেলার প্রকাশের পর দর্শকদের মধ্যে ব্যাপক সাড়া।',
    body: [
      'বহুল প্রতীক্ষিত একটি চলচ্চিত্রের ট্রেলার প্রকাশ পাওয়ার পর দর্শকদের মধ্যে ব্যাপক সাড়া পড়েছে। মুক্তির আগেই সামাজিক যোগাযোগমাধ্যমে সিনেমাটি আলোচনার কেন্দ্রে উঠে এসেছে।',
      'নির্মাতারা জানিয়েছেন, গল্প ও নির্মাণে নতুনত্ব রাখার চেষ্টা করা হয়েছে।',
    ],
  },
  {
    title: 'ভিডিও: মেট্রোরেলের নতুন স্টেশন ঘুরে দেখল আমাদের ক্যামেরা',
    subtitle: 'যাত্রীদের জন্য কী কী সুবিধা থাকছে, দেখুন সরেজমিন প্রতিবেদনে।',
    category: 'ঢাকা',
    tags: ['মেট্রোরেল', 'ঢাকা'],
    author: 'tanvir@provatalo.test',
    location: 'ঢাকা',
    type: 'video',
    youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    duration: '4:12',
    isFeatured: true,
    daysAgo: 1,
    metaDescription: 'মেট্রোরেলের নতুন স্টেশন ঘুরে দেখা সরেজমিন ভিডিও প্রতিবেদন।',
    body: [
      'নতুন মেট্রো স্টেশনের ভেতরে যাত্রীসেবার নানা দিক সরেজমিনে ঘুরে দেখেছে আমাদের প্রতিনিধিদল। টিকিট কাউন্টার থেকে প্ল্যাটফর্ম পর্যন্ত পুরো ব্যবস্থাপনা তুলে ধরা হয়েছে এই প্রতিবেদনে।',
    ],
  },
  {
    title: 'ভিডিও: শেষ ওভারের সেই রোমাঞ্চকর মুহূর্ত',
    subtitle: 'যেভাবে দুই বলে ম্যাচের মোড় ঘুরে গেল।',
    category: 'খেলা',
    tags: ['ক্রিকেট'],
    author: 'rakib@provatalo.test',
    location: 'চট্টগ্রাম',
    type: 'video',
    youtubeUrl: 'https://youtu.be/M7lc1UVf-VE',
    duration: '2:38',
    daysAgo: 0,
    metaDescription: 'শেষ ওভারের রোমাঞ্চকর মুহূর্তের ভিডিও।',
    body: [
      'ম্যাচের শেষ ওভারে দুই বলের ব্যবধানে বদলে যায় গোটা চিত্র। সেই রোমাঞ্চকর মুহূর্তগুলো এক নজরে দেখুন।',
    ],
  },
  {
    title: 'ভিডিও: নতুন সিনেমার নেপথ্যে',
    subtitle: 'শুটিং সেট থেকে অভিনয়শিল্পীদের অভিজ্ঞতা।',
    category: 'বিনোদন',
    tags: ['চলচ্চিত্র'],
    author: 'sabina@provatalo.test',
    location: 'ঢাকা',
    type: 'video',
    youtubeUrl: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    duration: '6:05',
    daysAgo: 5,
    metaDescription: 'নতুন সিনেমার নেপথ্যের গল্প নিয়ে ভিডিও।',
    body: [
      'শুটিং সেটের ব্যস্ততা আর অভিনয়শিল্পীদের অভিজ্ঞতা নিয়ে সাজানো এই বিশেষ ভিডিও প্রতিবেদন।',
    ],
  },
  {
    title: 'রাজনৈতিক দলগুলোর সংলাপে সমঝোতার ইঙ্গিত',
    subtitle: 'আসন্ন নির্বাচনকে ঘিরে আলোচনা এগিয়েছে বলে দাবি সংশ্লিষ্টদের।',
    category: 'রাজনীতি',
    tags: ['নির্বাচন'],
    author: 'tanvir@provatalo.test',
    location: 'ঢাকা',
    daysAgo: 6,
    metaDescription: 'রাজনৈতিক দলগুলোর সংলাপে সমঝোতার ইঙ্গিত পাওয়া গেছে।',
    body: [
      'আসন্ন নির্বাচনকে সামনে রেখে রাজনৈতিক দলগুলোর মধ্যে চলমান সংলাপে সমঝোতার ইঙ্গিত পাওয়া গেছে বলে জানিয়েছেন সংশ্লিষ্টরা। বেশ কয়েকটি বিষয়ে অগ্রগতি হয়েছে বলে দাবি করা হয়েছে।',
      'তবে কিছু বিষয়ে মতপার্থক্য এখনো রয়ে গেছে, যা নিয়ে পরবর্তী বৈঠকে আলোচনা হবে।',
    ],
  },
  {
    title: 'বাজারে নিত্যপণ্যের দাম নিয়ে স্বস্তির খবর',
    subtitle: 'সরবরাহ বাড়ায় কয়েকটি পণ্যের দাম কমতে শুরু করেছে।',
    category: 'অর্থনীতি',
    tags: ['বাজেট'],
    author: 'nusrat@provatalo.test',
    location: 'ঢাকা',
    daysAgo: 7,
    metaDescription: 'সরবরাহ বাড়ায় বাজারে কয়েকটি নিত্যপণ্যের দাম কমতে শুরু করেছে।',
    body: [
      'সরবরাহ পরিস্থিতি স্বাভাবিক হওয়ায় বাজারে কয়েকটি নিত্যপণ্যের দাম কমতে শুরু করেছে। ক্রেতারা কিছুটা স্বস্তির কথা জানিয়েছেন।',
      'ব্যবসায়ীরা বলছেন, সরবরাহ ধারাবাহিক থাকলে দাম আরও স্থিতিশীল হবে।',
    ],
  },
  {
    title: 'স্বাস্থ্যসেবায় নতুন উদ্যোগ, বাড়ছে কমিউনিটি ক্লিনিকের পরিধি',
    subtitle: 'গ্রামীণ পর্যায়ে প্রাথমিক চিকিৎসা সহজলভ্য করার লক্ষ্য।',
    category: 'জাতীয়',
    tags: ['স্বাস্থ্য'],
    author: 'rakib@provatalo.test',
    location: 'রংপুর',
    daysAgo: 8,
    metaDescription: 'গ্রামীণ পর্যায়ে প্রাথমিক স্বাস্থ্যসেবা সম্প্রসারণে নতুন উদ্যোগ।',
    body: [
      'গ্রামীণ পর্যায়ে প্রাথমিক স্বাস্থ্যসেবা সহজলভ্য করতে কমিউনিটি ক্লিনিকের পরিধি বাড়ানোর উদ্যোগ নেওয়া হয়েছে। নতুন ক্লিনিকগুলোতে জনবল ও ওষুধ সরবরাহ নিশ্চিত করার কথা জানানো হয়েছে।',
      'স্থানীয় বাসিন্দারা বলছেন, কাছাকাছি সেবা পাওয়ায় তাঁদের ভোগান্তি কমবে।',
    ],
  },
  {
    title: 'প্রযুক্তি মেলায় দেশীয় উদ্ভাবনের প্রদর্শনী',
    subtitle: 'তরুণ উদ্ভাবকদের প্রকল্প ঘিরে দর্শনার্থীদের আগ্রহ।',
    category: 'প্রযুক্তি',
    tags: ['কৃত্রিম বুদ্ধিমত্তা', 'স্টার্টআপ'],
    author: 'nusrat@provatalo.test',
    location: 'ঢাকা',
    daysAgo: 9,
    metaDescription: 'প্রযুক্তি মেলায় দেশীয় তরুণ উদ্ভাবকদের প্রকল্প প্রদর্শিত হয়েছে।',
    body: [
      'একটি প্রযুক্তি মেলায় দেশীয় তরুণ উদ্ভাবকদের নানা প্রকল্প প্রদর্শিত হয়েছে। কৃত্রিম বুদ্ধিমত্তানির্ভর সেবা থেকে শুরু করে কৃষি প্রযুক্তি— বৈচিত্র্যময় উদ্ভাবন ছিল প্রদর্শনীতে।',
      'দর্শনার্থীরা তরুণদের এই উদ্যোগকে স্বাগত জানিয়েছেন।',
    ],
  },
]
