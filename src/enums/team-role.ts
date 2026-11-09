export const TEAM_ROLES = ["管理员", "导演", "编剧", "制作人"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
