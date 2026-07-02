import type { BadgeDef } from "../types.ts";

/**
 * Master badge table. Order here is the display order in the Collection grid.
 * `mystery-mix` is the fallback for unidentifiable / low-confidence scans and
 * is intentionally the last, most colorful tier ("Mystery").
 *
 * Adding a breed = add a row here. `badgeId` must be a unique kebab slug.
 */
export const BADGES: BadgeDef[] = [
  // --- Common (popular breeds) ---
  { badgeId: "labrador-retriever", breed: "Labrador Retriever", tier: "Common", emoji: "🦮", funFact: "Labs are America's most popular breed — and champion swimmers thanks to webbed toes." },
  { badgeId: "golden-retriever", breed: "Golden Retriever", tier: "Common", emoji: "🐕", funFact: "Goldens were bred in Scotland to retrieve waterfowl without damaging the game." },
  { badgeId: "german-shepherd", breed: "German Shepherd", tier: "Common", emoji: "🐕‍🦺", funFact: "German Shepherds can learn a new command in as few as five repetitions." },
  { badgeId: "french-bulldog", breed: "French Bulldog", tier: "Common", emoji: "🐶", funFact: "Frenchies can't swim well — those big heads and stocky bodies sink fast." },
  { badgeId: "bulldog", breed: "Bulldog", tier: "Common", emoji: "🐶", funFact: "The English Bulldog's ancestors were bred for the brutal sport of bull-baiting." },
  { badgeId: "poodle", breed: "Poodle", tier: "Common", emoji: "🐩", funFact: "That fancy Poodle trim started as practical protection for joints in cold water." },
  { badgeId: "beagle", breed: "Beagle", tier: "Common", emoji: "🐕", funFact: "A Beagle's nose has around 220 million scent receptors — humans have about 5 million." },
  { badgeId: "rottweiler", breed: "Rottweiler", tier: "Common", emoji: "🐕", funFact: "Rottweilers once drove cattle to market and carried the butcher's money in their collars." },
  { badgeId: "dachshund", breed: "Dachshund", tier: "Common", emoji: "🌭", funFact: "\"Dachshund\" means \"badger dog\" — they were bred to dig into badger burrows." },
  { badgeId: "boxer", breed: "Boxer", tier: "Common", emoji: "🥊", funFact: "Boxers \"box\" — they really do bat at things with their front paws when they play." },
  { badgeId: "yorkshire-terrier", breed: "Yorkshire Terrier", tier: "Common", emoji: "🐕", funFact: "Yorkies started as ratters in 19th-century textile mills before becoming lap dogs." },
  { badgeId: "pug", breed: "Pug", tier: "Common", emoji: "🐶", funFact: "A group of pugs is delightfully called a \"grumble.\"" },
  { badgeId: "chihuahua", breed: "Chihuahua", tier: "Common", emoji: "🐕", funFact: "Chihuahuas are the smallest dog breed — and often think they're the biggest." },
  { badgeId: "siberian-husky", breed: "Siberian Husky", tier: "Common", emoji: "🐺", funFact: "Huskies can run 100+ miles a day and their eyes can be two different colors." },

  // --- Uncommon ---
  { badgeId: "australian-shepherd", breed: "Australian Shepherd", tier: "Uncommon", emoji: "🐕‍🦺", funFact: "Despite the name, the Aussie was developed in the United States, not Australia." },
  { badgeId: "border-collie", breed: "Border Collie", tier: "Uncommon", emoji: "🐕", funFact: "A Border Collie named Chaser learned the names of over 1,000 individual toys." },
  { badgeId: "cocker-spaniel", breed: "Cocker Spaniel", tier: "Uncommon", emoji: "🐕", funFact: "Cockers were named for hunting the woodcock bird in dense brush." },
  { badgeId: "shih-tzu", breed: "Shih Tzu", tier: "Uncommon", emoji: "🐶", funFact: "Shih Tzus were prized companions of Chinese royalty for over a thousand years." },
  { badgeId: "great-dane", breed: "Great Dane", tier: "Uncommon", emoji: "🐕", funFact: "The tallest dog ever, a Great Dane named Zeus, stood 44 inches at the shoulder." },
  { badgeId: "doberman-pinscher", breed: "Doberman Pinscher", tier: "Uncommon", emoji: "🐕‍🦺", funFact: "The Doberman was created by a tax collector who wanted a loyal guard on his rounds." },
  { badgeId: "australian-cattle-dog", breed: "Australian Cattle Dog", tier: "Uncommon", emoji: "🐕", funFact: "An Aussie Cattle Dog named Bluey lived to 29 — one of the oldest dogs on record." },
  { badgeId: "shetland-sheepdog", breed: "Shetland Sheepdog", tier: "Uncommon", emoji: "🐕", funFact: "Shelties look like miniature Collies but are their own distinct breed." },
  { badgeId: "bernese-mountain-dog", breed: "Bernese Mountain Dog", tier: "Uncommon", emoji: "🏔️", funFact: "Berners were Swiss farm dogs that pulled carts of milk and cheese to market." },
  { badgeId: "cavalier-king-charles-spaniel", breed: "Cavalier King Charles Spaniel", tier: "Uncommon", emoji: "👑", funFact: "This breed is named for King Charles II, who adored them at court." },
  { badgeId: "corgi", breed: "Pembroke Welsh Corgi", tier: "Uncommon", emoji: "🐕", funFact: "Welsh legend says fairies rode Corgis into battle — the \"saddle\" marks remain." },
  { badgeId: "saint-bernard", breed: "Saint Bernard", tier: "Uncommon", emoji: "🐕", funFact: "Alpine Saint Bernards have rescued thousands of travelers lost in the snow." },
  { badgeId: "weimaraner", breed: "Weimaraner", tier: "Uncommon", emoji: "🐕", funFact: "Nicknamed the \"Grey Ghost\" for its silvery coat and glassy amber eyes." },

  // --- Rare (less common breeds) ---
  { badgeId: "shiba-inu", breed: "Shiba Inu", tier: "Rare", emoji: "🐕", funFact: "The Shiba's dramatic \"Shiba scream\" is a real thing owners know all too well." },
  { badgeId: "basenji", breed: "Basenji", tier: "Rare", emoji: "🐕", funFact: "The Basenji doesn't bark — it yodels, a sound called a \"barroo.\"" },
  { badgeId: "samoyed", breed: "Samoyed", tier: "Rare", emoji: "❄️", funFact: "The Samoyed's upturned mouth — the \"Sammy smile\" — helps keep it from drooling and icing up." },
  { badgeId: "akita", breed: "Akita", tier: "Rare", emoji: "🐕", funFact: "Hachikō the Akita waited at a train station for his owner every day for nearly 10 years." },
  { badgeId: "chow-chow", breed: "Chow Chow", tier: "Rare", emoji: "🦁", funFact: "Chow Chows have blue-black tongues, a trait shared with almost no other breed." },
  { badgeId: "irish-wolfhound", breed: "Irish Wolfhound", tier: "Rare", emoji: "🐺", funFact: "The tallest dog breed — an Irish Wolfhound standing up can be taller than a person." },
  { badgeId: "afghan-hound", breed: "Afghan Hound", tier: "Rare", emoji: "💇", funFact: "Afghan Hounds sport a silky, flowing coat once needed for cold mountain climates." },
  { badgeId: "whippet", breed: "Whippet", tier: "Rare", emoji: "💨", funFact: "Whippets hit 35 mph — the fastest accelerating dog for their size." },
  { badgeId: "newfoundland", breed: "Newfoundland", tier: "Rare", emoji: "🌊", funFact: "Newfoundlands have water-resistant coats and webbed feet built for sea rescues." },
  { badgeId: "dalmatian", breed: "Dalmatian", tier: "Rare", emoji: "⚫", funFact: "Dalmatian puppies are born pure white — their spots appear over the first weeks." },
  { badgeId: "great-pyrenees", breed: "Great Pyrenees", tier: "Rare", emoji: "🏔️", funFact: "These gentle giants guard livestock and often have double dewclaws on their hind legs." },
  { badgeId: "vizsla", breed: "Vizsla", tier: "Rare", emoji: "🐕", funFact: "Vizslas are so attached to people they're nicknamed \"velcro dogs.\"" },
  { badgeId: "bloodhound", breed: "Bloodhound", tier: "Rare", emoji: "👃", funFact: "A Bloodhound's sense of smell is so reliable it can be used as evidence in court." },
  { badgeId: "xoloitzcuintli", breed: "Xoloitzcuintli", tier: "Rare", emoji: "🐕", funFact: "The hairless Xolo is one of the world's oldest breeds, revered by the ancient Aztecs." },

  // --- Mystery (fallback for mixes / unidentifiable) ---
  { badgeId: "mystery-mix", breed: "Mystery Mix", tier: "Mystery", emoji: "❓", funFact: "A one-of-a-kind blend! Mixed-breed dogs are often healthier and always original." },
];

/** Fast lookup by badgeId. */
export const BADGE_BY_ID: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.badgeId, b]),
);

export const MYSTERY_MIX = BADGE_BY_ID["mystery-mix"];

export const TOTAL_BADGES = BADGES.length;
