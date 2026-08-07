import { Avatar, Style } from '@dicebear/core';
import crittersDefinition from '@dicebear/styles/critters.json';

// DiceBear v10 "critters" style — https://www.dicebear.com/styles/critters/
// Avatars are generated locally as SVG (no external API call), so they work
// offline, on Cloudflare Workers, and without a content-security-policy exception.
const crittersStyle = new Style(crittersDefinition as ConstructorParameters<typeof Style>[0]);

/** Deterministic SVG for a given seed. Same seed always yields the same critter. */
export function crittersAvatarSvg(seed: string, size = 96): string {
  return new Avatar(crittersStyle, { seed, size }).toString();
}

/** The seed to actually render for a consignor (falls back to a stable id). */
export function resolveAvatarSeed(input: { avatarSeed: string | null; id: string }): string {
  return input.avatarSeed && input.avatarSeed.trim() ? input.avatarSeed : input.id;
}

/** Curated seed choices shown in the avatar picker. */
export const AVATAR_SEED_OPTIONS = [
  'Luna',
  'Rania',
  'Bintang',
  'Cempaka',
  'Dahlia',
  'Elang',
  'Flora',
  'Gading',
  'Hujan',
  'Indah',
  'Jasmine',
  'Kirana',
  'Langit',
  'Melati',
  'Nusa',
  'Ombak',
  'Pelangi',
  'Ratna',
  'Senja',
  'Tirta',
  'Ungu',
  'Wangi',
  'Yasmin',
  'Zahra',
] as const;
