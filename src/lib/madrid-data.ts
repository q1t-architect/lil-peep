/**
 * Madrid neighborhood data + mock users/listings.
 * Replaces Budapest data — all content in English, locations in Madrid.
 */

export type ListingStatus = "available" | "reserved";

export type User = {
  id: string;
  name: string;
  avatar: string;
  neighborhood: string;
  rating: number;
  exchanges: number;
  verified: boolean;
  bio: string;
  reviews: Review[];
};

export type Review = {
  id: string;
  author: string;
  text: string;
  rating: number;
  date: string;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  distanceKm: number;
  neighborhood: string;
  owner: User;
  status: ListingStatus;
  priceType: "free" | "symbolic";
  priceEuro?: number;
  mapX: number;
  mapY: number;
  createdAt: string;
};

export type Conversation = {
  id: string;
  peer: User;
  lastMessage: string;
  lastAt: string;
  unread: number;
  messages: ChatMessage[];
};

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  text: string;
  at: string;
};

export type AppNotification = {
  id: string;
  type: "listing" | "message" | "reservation" | "pickup";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// -------------------------------------------------------------------
// Madrid barrios — center coordinates (lat/lng) for map use
// -------------------------------------------------------------------

export const MADRID_NEIGHBORHOODS = [
  { name: "Centro",       nameEs: "Centro",       lat: 40.4153, lng: -3.7019 },
  { name: "Malasaña",     nameEs: "Malasaña",     lat: 40.4267, lng: -3.7050 },
  { name: "Chueca",       nameEs: "Chueca",       lat: 40.4237, lng: -3.6964 },
  { name: "La Latina",    nameEs: "La Latina",    lat: 40.4098, lng: -3.7102 },
  { name: "Lavapiés",     nameEs: "Lavapiés",     lat: 40.4085, lng: -3.7012 },
  { name: "Salamanca",    nameEs: "Salamanca",    lat: 40.4260, lng: -3.6810 },
  { name: "Retiro",       nameEs: "Retiro",       lat: 40.4151, lng: -3.6836 },
  { name: "Chamberí",     nameEs: "Chamberí",     lat: 40.4346, lng: -3.7002 },
  { name: "Argüelles",    nameEs: "Argüelles",    lat: 40.4290, lng: -3.7177 },
  { name: "Moncloa",      nameEs: "Moncloa",      lat: 40.4354, lng: -3.7248 },
  { name: "Tetuán",       nameEs: "Tetuán",       lat: 40.4518, lng: -3.7000 },
  { name: "Vallehermoso", nameEs: "Vallehermoso", lat: 40.4400, lng: -3.7122 },
  { name: "Justicia",     nameEs: "Justicia",     lat: 40.4210, lng: -3.6983 },
  { name: "Palacio",      nameEs: "Palacio",      lat: 40.4136, lng: -3.7121 },
  { name: "Cortes",       nameEs: "Cortes",       lat: 40.4145, lng: -3.6978 },
] as const;

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

const avatars = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
];

function user(
  id: string,
  i: number,
  name: string,
  neighborhood: string,
  rating: number,
  exchanges: number,
  verified: boolean,
  bio: string,
  reviews: { author: string; text: string; rating: number; date: string }[],
): User {
  return {
    id,
    name,
    avatar: avatars[i % avatars.length],
    neighborhood,
    rating,
    exchanges,
    verified,
    bio,
    reviews: reviews.map((r, j) => ({
      id: `${id}-r${j}`,
      author: r.author,
      text: r.text,
      rating: r.rating,
      date: r.date,
    })),
  };
}

// -------------------------------------------------------------------
// Mock users — Spanish names, Madrid neighborhoods
// -------------------------------------------------------------------

export const MOCK_USERS: Record<string, User> = {
  u1: user(
    "u1",
    0,
    "Sofía García",
    "Malasaña",
    4.97,
    142,
    true,
    "Product designer. Happy to lend tools and camping gear.",
    [
      {
        author: "Leo",
        text: "Pickup was smooth, item exactly as described. Would borrow again.",
        rating: 5,
        date: "Mar 12",
      },
      {
        author: "Ana",
        text: "Super responsive and kind. Neighborly in the true sense.",
        rating: 5,
        date: "Feb 2",
      },
    ],
  ),
  u2: user(
    "u2",
    1,
    "Carlos Martínez",
    "Chamberí",
    4.92,
    89,
    true,
    "Weekend DIY enthusiast. Ladder and power tools available.",
    [
      {
        author: "Elena",
        text: "Reserved a drill — verification code worked perfectly at handoff.",
        rating: 5,
        date: "Apr 1",
      },
    ],
  ),
  u3: user(
    "u3",
    2,
    "Lucía Fernández",
    "Lavapiés",
    4.88,
    56,
    false,
    "Student. Giving away clothes and small furniture.",
    [
      {
        author: "Marcos",
        text: "Great communication, item was free and spotless.",
        rating: 5,
        date: "Jan 18",
      },
    ],
  ),
  u4: user(
    "u4",
    3,
    "Alejandro López",
    "Retiro",
    4.95,
    201,
    true,
    "Parent of two — sports gear rotates quickly.",
    [],
  ),
};

// -------------------------------------------------------------------
// Mock listings — Madrid barrios, realistic map positions
// mapX/mapY are fractional positions within a Madrid bounding box:
//   lng range [-3.76, -3.64], lat range [40.38, 40.47]
//   mapX = (lng + 3.76) / 0.12
//   mapY = (40.47 - lat) / 0.09
// -------------------------------------------------------------------

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`;

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "l1",
    title: "Bosch cordless drill 18V",
    description:
      "Light use, two batteries. Perfect for shelves and small fixes. Case included.",
    category: "Tools",
    images: [u("1504148583906-ef39f21b5175"), u("1581092918056-0c4c3d337552")],
    distanceKm: 0.4,
    neighborhood: "Chamberí",
    owner: MOCK_USERS.u2,
    status: "available",
    priceType: "symbolic",
    priceEuro: 0.5,
    mapX: 0.50,
    mapY: 0.39,
    createdAt: "2026-04-24",
  },
  {
    id: "l2",
    title: "Vintage wooden ladder (2.4m)",
    description: "Solid beech, rubber feet. Too tall for our new flat.",
    category: "Tools",
    images: [u("1581578731548-64663659b7e9"), u("1503387762-592deb58ef4e")],
    distanceKm: 0.9,
    neighborhood: "Malasaña",
    owner: MOCK_USERS.u1,
    status: "available",
    priceType: "free",
    mapX: 0.38,
    mapY: 0.48,
    createdAt: "2026-04-23",
  },
  {
    id: "l3",
    title: "Nike football boots size 42",
    description: "Worn one season — studs in great shape. Cleaned and dried.",
    category: "Sports",
    images: [u("1542291026-7eec264c27ff"), u("1518609878373-06ea8301ccb0")],
    distanceKm: 1.2,
    neighborhood: "Retiro",
    owner: MOCK_USERS.u4,
    status: "reserved",
    priceType: "symbolic",
    priceEuro: 0.05,
    mapX: 0.64,
    mapY: 0.61,
    createdAt: "2026-04-22",
  },
  {
    id: "l4",
    title: "Camping hammock + straps",
    description: "Double nest, tree-friendly straps. No rips.",
    category: "Outdoors",
    images: [u("1504280397621-2a1168539d49"), u("1523987355523-c7b5b0dd90a7")],
    distanceKm: 0.6,
    neighborhood: "Lavapiés",
    owner: MOCK_USERS.u3,
    status: "available",
    priceType: "free",
    mapX: 0.49,
    mapY: 0.68,
    createdAt: "2026-04-21",
  },
  {
    id: "l5",
    title: "DeWalt circular saw",
    description:
      "Professional grade. Blade recently replaced. Ear protection recommended.",
    category: "Tools",
    images: [u("1504328345606-44eeb826aefe"), u("1581094794329-fd0aef7c2de8")],
    distanceKm: 1.5,
    neighborhood: "Argüelles",
    owner: MOCK_USERS.u2,
    status: "available",
    priceType: "symbolic",
    priceEuro: 0.5,
    mapX: 0.35,
    mapY: 0.46,
    createdAt: "2026-04-20",
  },
  {
    id: "l6",
    title: "Kids' football (size 4)",
    description: "Barely used — outgrew it in months.",
    category: "Sports",
    images: [u("1575361204480-aadea25e6e68"), u("1579951913859-6d982a046b9a")],
    distanceKm: 0.3,
    neighborhood: "Malasaña",
    owner: MOCK_USERS.u1,
    status: "available",
    priceType: "free",
    mapX: 0.38,
    mapY: 0.48,
    createdAt: "2026-04-25",
  },
  {
    id: "l7",
    title: "Pressure washer Kärcher",
    description:
      "K4 model. Great for balcony and bikes. Short hose extension included.",
    category: "Tools",
    images: [u("1621905251918-48416bd8575a"), u("1558618666-fcd25c85cd64")],
    distanceKm: 2.1,
    neighborhood: "Salamanca",
    owner: MOCK_USERS.u4,
    status: "available",
    priceType: "symbolic",
    priceEuro: 0.5,
    mapX: 0.66,
    mapY: 0.49,
    createdAt: "2026-04-19",
  },
  {
    id: "l8",
    title: "Standing desk frame (manual)",
    description:
      "IKEA crank base only — you supply top. Disassembled for pickup.",
    category: "Home",
    images: [u("1595515106969-1c5c476368d1"), u("1524758631624-e2822e304c36")],
    distanceKm: 0.8,
    neighborhood: "Chueca",
    owner: MOCK_USERS.u1,
    status: "available",
    priceType: "free",
    mapX: 0.53,
    mapY: 0.51,
    createdAt: "2026-04-18",
  },
];

export const WISHLIST_TAGS = [
  "Hammer",
  "Drill",
  "Football boots",
  "Football",
  "Ladder",
  "Pressure washer",
  "Projector",
  "Camping stove",
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    peer: MOCK_USERS.u2,
    lastMessage: "I can meet tomorrow at 18:30 at Mercado de Vallehermoso.",
    lastAt: "2m ago",
    unread: 2,
    messages: [
      {
        id: "m1",
        fromMe: true,
        text: "Hi Carlos — is the drill still available to borrow?",
        at: "10:12",
      },
      { id: "m2", fromMe: false, text: "Yes! Until Friday works for me.", at: "10:18" },
      {
        id: "m3",
        fromMe: false,
        text: "I can meet tomorrow at 18:30 at Mercado de Vallehermoso.",
        at: "10:22",
      },
    ],
  },
  {
    id: "c2",
    peer: MOCK_USERS.u1,
    lastMessage: "Verification code noted. See you then.",
    lastAt: "1h ago",
    unread: 0,
    messages: [
      {
        id: "m4",
        fromMe: false,
        text: "Reservation confirmed — code NLB-4F9Q for pickup.",
        at: "Yesterday",
      },
      { id: "m5", fromMe: true, text: "Verification code noted. See you then.", at: "Yesterday" },
    ],
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    type: "listing",
    title: "New nearby on Neighborly",
    body: "Standing desk frame posted 0.8 km away — free pickup.",
    time: "12 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "message",
    title: "Message from Carlos",
    body: "I can meet tomorrow at 18:30 at Mercado de Vallehermoso.",
    time: "28 min ago",
    read: false,
  },
  {
    id: "n3",
    type: "reservation",
    title: "Reservation confirmed",
    body: "Ladder borrow confirmed. Service fee €0.50 captured symbolically.",
    time: "3h ago",
    read: true,
  },
  {
    id: "n4",
    type: "pickup",
    title: "Pickup reminder",
    body: "Handoff with Sofía in 45 minutes. Bring your pickup code.",
    time: "Yesterday",
    read: true,
  },
];

export const CATEGORIES = [
  "All",
  "Tools",
  "Sports",
  "Outdoors",
  "Home",
  "Kids",
  "Electronics",
] as const;
