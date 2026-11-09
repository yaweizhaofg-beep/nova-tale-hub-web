export const SPACE_KINDS = ["personal", "team"] as const;
export type SpaceKind = (typeof SPACE_KINDS)[number];
