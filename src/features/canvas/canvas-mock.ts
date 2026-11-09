import type { CNode, CEdge } from "./canvas-types";

export const INIT_NODES: CNode[] = [
  { id:"prompt", kind:"text",   label:"文本提示词",   x:80,  y:220, w:240, h:170, status:"idle",
    content:"主角林沐，30岁，现代都市艺术家。站在空旷画廊，背光，缓慢转身。侧脸近景，神情内敛，棉麻白衬衫。" },
  { id:"ref",    kind:"image",  label:"人物参考图",   x:390, y:150, w:190, h:240, status:"done" },
  { id:"genImg", kind:"genImg", label:"生图配置",     x:650, y:120, w:250, h:280, status:"done",
    params:{ 模型:"SD XL", 比例:"3:4", 数量:4, 积分:60 } },
  { id:"r1",     kind:"image",  label:"生成结果 1",   x:970, y:80,  w:176, h:230, status:"done" },
  { id:"r2",     kind:"image",  label:"生成结果 2",   x:1160,y:80,  w:176, h:230, status:"done" },
  { id:"r3",     kind:"image",  label:"生成结果 3",   x:970, y:326, w:176, h:230, status:"partial" },
  { id:"r4",     kind:"image",  label:"生成结果 4",   x:1160,y:326, w:176, h:230, status:"error" },
  { id:"genVid", kind:"genVid", label:"视频生成配置", x:1000,y:610, w:250, h:230, status:"idle",
    params:{ 模型:"Kling 1.5", 比例:"16:9", 时长:"5秒", 积分:80 } },
  { id:"vid",    kind:"video",  label:"视频结果",     x:1310,y:600, w:270, h:170, status:"queued" },
];
export const INIT_EDGES: CEdge[] = [
  { from:"prompt", to:"genImg" },
  { from:"ref",    to:"genImg" },
  { from:"genImg", to:"r1" },
  { from:"genImg", to:"r2" },
  { from:"genImg", to:"r3" },
  { from:"genImg", to:"r4" },
  { from:"r1",     to:"genVid" },
  { from:"genVid", to:"vid" },
];

export const CANVAS_TEAM_MEMBERS = [
  { id:1, name:"赵雅薇", avatar:"赵", role:"管理员",  online:true  },
  { id:2, name:"林子墨", avatar:"林", role:"管理员",  online:true  },
  { id:3, name:"陈晓悦", avatar:"陈", role:"导演",    online:false },
  { id:4, name:"吴诗涵", avatar:"吴", role:"编剧",    online:true  },
  { id:5, name:"孙轩宇", avatar:"孙", role:"制作人",  online:false },
];
