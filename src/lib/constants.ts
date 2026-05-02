// =============================================================================
// Application constants — real data, no mocks
// =============================================================================

export const CATEGORIES = [
  "All",
  "Tools",
  "Sports",
  "Outdoors",
  "Home",
  "Kids",
  "Electronics",
] as const;

export type Category = (typeof CATEGORIES)[number];

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

export const WISHLIST_TAGS = [
  "Hammer",
  "Drill",
  "Football boots",
  "Football",
  "Ladder",
  "Pressure washer",
  "Projector",
  "Camping stove",
] as const;
