import { type NodeKind } from "@/features/canvas/canvas-types";

export const ADD_KINDS: {kind:NodeKind;label:string;desc:string}[] = [
  {kind:"text",   label:"文本节点",   desc:"提示词 / 剧本描述"},
  {kind:"image",  label:"图片节点",   desc:"上传或接收生成图"},
  {kind:"genImg", label:"生图配置",   desc:"AI 图像生成节点"},
  {kind:"video",  label:"视频节点",   desc:"上传或接收视频"},
  {kind:"genVid", label:"视频配置",   desc:"AI 视频生成节点"},
  {kind:"audio",  label:"音频节点",   desc:"配乐 / 音效"},
  {kind:"group",  label:"分组",       desc:"框选节点归组"},
];
