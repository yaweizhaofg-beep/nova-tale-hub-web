export type AssetTab  = "chars" | "scenes" | "props" | "audio";
export type AssetStatus = "confirmed" | "pending" | "generating" | "failed";
export type AssetItem = { id: string; name: string; desc: string; status: AssetStatus; count: number; image?: string; imageStyle?: string; historyImages?: string[]; aspect?: string; prefix?: string };
export type Comp = "pass" | "review" | "generating" | "failed" | "empty";
export type DView = "front" | "side" | "back" | "outfit" | "detail";
export type VTb    = "system" | "custom";
export type VGender = "男" | "女";
export type VAge    = "儿童" | "少年" | "青年" | "中年" | "老年";

export interface CostumeVersion {
  id: string;
  name: string;
  prompt: string;
}
