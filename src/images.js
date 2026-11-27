// ─────────────────────────────────────────────────────────────────────────────
// Image library.
//  • beach / north = your own photos (src/Assets/Places)
//  • everything else = real photographs from Wikimedia Commons, hot-linked by file
//    name. They are free-licence photos (mostly CC BY / CC BY-SA – credit required,
//    see the footer note). For a commercial launch, swap any entry below for your own
//    photo: just replace the `file`/`local` value – nothing else needs to change.
// ─────────────────────────────────────────────────────────────────────────────
import beach from "./Assets/Places/beach-view.jpg";
import north from "./Assets/Places/chiang-mai.jpg";

const commons = (file, w = 1280) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=${w}`;

const F = {
  bond: "Ko Tapu (James Bond) Island in Phang Nga Bay, Thailand.jpg",
  lagoon: "Koh Hong, Lagoon, Phang Nga Bay, Thailand.jpg",
  maya: "Maya Bay, Thailand by Mike Clegg Photography.jpg",
  arun: "Wat arun at night in Bangkok, Thailand.jpg",
  pattaya: "Pattaya, Thailand Skyline.jpg",
  jetski: "DFC 0176 A sleek blue-and-white jet ski bobbing in gentle waves near the shoreline under a partly cloudy sky.jpg",
  parasail: "Parasailing in KB 44.jpg",
  railay: "West Rai Leh (11).jpg",
  poda: "Poda island beach.jpg",
  yacht: "Yacht Indian Empress in Thailand.jpg",
  sunsetPhuket: "Sunset at Promthep cape, Phuket island, Thailand (33814404556).jpg",
  skydive: "Two parachuters skydiving.jpg",
  dolphin: "Spinner dolphin.jpg",
  jungle: "Khao Sok primary tropical rainforest, southern Thailand.jpg",
  villa: "Koh Samui Luxury Villa Pool.jpg",
  plane: "Thai Boeing 777 HS-TJT Bangkok Suvarnabhumi 2024 (01).jpg",
  tiger: "Bengal tiger walking on the grass.jpg",
  samui: "Koh Samui, Sea beach, Blue sky, Thailand.jpg",
  naiharn: "Sunset at Nai Harn beach, Phuket, Thailand 03.jpg",
  // ── added for destination detail pages (all verified Wikimedia Commons files) ──
  bigBuddha: "The Big Buddha, Phuket.jpg",
  chalong: "Wat Chalong - Phuket.jpg",
  tigerCave: "Krabi, Tiger Cave Temple, Thailand.jpg",
  krabiPlains: "Krabi, View over Krabi plains, Thailand.jpg",
  krabiLimestone: "Krabi, Limestone landscape, Thailand.jpg",
  aoNang: "Ao Nang beach panorama 1.jpg",
  palace: "Grand Palace Bangkok, Thailand.jpg",
  watPho: "Bangkok Wat Pho reclining Buddha.jpg",
  floating: "Damnoen Saduak Floating Market (7974794375).jpg",
  sanctuary: "The Sancturay of Truth, Pattaya, Thailand.JPG",
  samuiBuddha: "Big Buddha Temple (Wat Phra Yai).jpg",
  plaiLaem: "Wat Plai Laem.jpg",
  nangYuan: "Nang Yuan Island, Koh Tao (48109157601).jpg",
  nangYuan2: "Koh Nang Yuan.jpg",
  suthep: "Wat Phra That Doi Suthep - Chiang Mai.jpg",
  inthanonChedi: "Doi Inthanon, Royal Chedi, Thailand.jpg",
  inthanonView: "Doi Inthanon, View from Royal Pagoda, Thailand.jpg",
  inthanonTwin: "Twin Pagodas of Doi Inthanon.JPG",
};

export const IMG = {
  hero: beach,
  north,
  yacht: commons(F.yacht),
  flights: commons(F.plane),
  skydive: commons(F.skydive),
  jetski: commons(F.jetski),
  hotel: commons(F.villa),
  dolphin: commons(F.dolphin),
  paraglide: commons(F.parasail),
  zip: commons(F.jungle),
  coral: commons(F.poda),
  tiger: commons(F.tiger),
  bond: commons(F.bond),
  lagoon: commons(F.lagoon),
  maya: commons(F.maya),
  arun: commons(F.arun),
  pattaya: commons(F.pattaya),
  railay: commons(F.railay),
  phuket: commons(F.sunsetPhuket),
  naiharn: commons(F.naiharn),
  samui: commons(F.samui),
  bigBuddha: commons(F.bigBuddha), chalong: commons(F.chalong), tigerCave: commons(F.tigerCave),
  krabiPlains: commons(F.krabiPlains), krabiLimestone: commons(F.krabiLimestone), aoNang: commons(F.aoNang),
  palace: commons(F.palace), watPho: commons(F.watPho), floating: commons(F.floating), sanctuary: commons(F.sanctuary),
  samuiBuddha: commons(F.samuiBuddha), plaiLaem: commons(F.plaiLaem), nangYuan: commons(F.nangYuan), nangYuan2: commons(F.nangYuan2),
  suthep: commons(F.suthep), inthanonChedi: commons(F.inthanonChedi), inthanonView: commons(F.inthanonView), inthanonTwin: commons(F.inthanonTwin),
};
