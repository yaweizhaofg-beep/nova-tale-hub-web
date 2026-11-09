import type { AssetItem, AssetTab, CostumeVersion, VAge, VGender } from "./asset-types";

export const TEAM_MEMBERS = [
  { id: "u1", name: "林凯", role: "导演",   avatar: "林" },
  { id: "u2", name: "苏玫", role: "编剧",   avatar: "苏" },
  { id: "u3", name: "陈刚", role: "制片",   avatar: "陈" },
  { id: "u4", name: "王芳", role: "美术",   avatar: "王" },
  { id: "u5", name: "赵磊", role: "摄影",   avatar: "赵" },
];

export const PROJECTS = [
  { id: "p1", name: "镜像",     genre: "都市悬疑", color: "#FF8A1F", date: "2026-08-28", chars: 5, scenes: 6, props: 3,  audioReady: true,  status: "active"   },
  { id: "p2", name: "星坠",     genre: "科幻冒险", color: "#a855f7", date: "2026-08-21", chars: 3, scenes: 5, props: 6,  audioReady: true,  status: "active"   },
  { id: "p3", name: "归途",     genre: "现实主义", color: "#06b6d4", date: "2026-08-14", chars: 2, scenes: 3, props: 2,  audioReady: false, status: "draft"    },
  { id: "p4", name: "长夜将尽", genre: "历史古装", color: "#10b981", date: "2026-07-30", chars: 14, scenes: 18, props: 24, audioReady: true, status: "archived" },
];

export const ASSET_DATA: Record<string, Record<AssetTab, AssetItem[]>> = {
  p1: {
    chars: [
      { id: "c1", name: "陈默", desc: "女主角 · 内敛冷静 · 28岁", status: "confirmed", count: 23,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=480&h=640&fit=crop&auto=format",
        historyImages: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&h=1100&fit=crop&auto=format", "https://images.unsplash.com/photo-1675726205553-4e348f24da2c?w=900&h=1100&fit=crop&auto=format"] },
      { id: "c2", name: "林凯", desc: "男主角 · 温柔执着 · 30岁", status: "confirmed", count: 18,
        image: "https://images.unsplash.com/photo-1570216601541-fa11cfaf03e5?w=480&h=640&fit=crop&auto=format",
        historyImages: ["https://images.unsplash.com/photo-1570216601541-fa11cfaf03e5?w=900&h=1100&fit=crop&auto=format"] },
      { id: "c3", name: "方远", desc: "反派 · 城府极深", status: "generating", count: 0 },
      { id: "c4", name: "警卫甲", desc: "配角 · 第3集出场", status: "pending", count: 2 },
      { id: "c5", name: "神秘来客", desc: "待定 · 尚未定义", status: "pending", count: 0 },
    ],
    scenes: [
      { id: "s1", name: "公司走廊", desc: "主要场景 · 冷色调大理石", status: "confirmed", count: 34,
        image: "https://images.unsplash.com/photo-1679212839469-fb16a48919ce?w=480&h=640&fit=crop&auto=format",
        historyImages: ["https://images.unsplash.com/photo-1679212839469-fb16a48919ce?w=1200&h=800&fit=crop&auto=format"] },
      { id: "s2", name: "天台", desc: "关键场景 · 傍晚霞光", status: "confirmed", count: 15,
        image: "https://images.unsplash.com/photo-1535391879778-3bae11d29a24?w=480&h=640&fit=crop&auto=format",
        historyImages: ["https://images.unsplash.com/photo-1535391879778-3bae11d29a24?w=1200&h=800&fit=crop&auto=format"] },
      { id: "s3", name: "审讯室", desc: "常用场景 · 室内灯光", status: "generating", count: 0 },
      { id: "s4", name: "咖啡厅", desc: "次要场景 · 暖色调", status: "pending", count: 8 },
      { id: "s5", name: "地铁站", desc: "转场场景", status: "confirmed", count: 6 },
      { id: "s6", name: "陈默公寓", desc: "生活场景 · 极简风格", status: "pending", count: 11 },
    ],
    props: [
      { id: "p1", name: "手机",   desc: "道具 · 未接来电截图", status: "confirmed", count: 31, imageStyle: "linear-gradient(145deg,#1a1a1a 0%,#2c2c2c 35%,#4a4a4a 60%,#333 100%)" },
      { id: "p2", name: "文件夹", desc: "道具 · 机密工作文件", status: "pending", count: 7 },
      { id: "p3", name: "保险箱", desc: "道具 · 关键线索", status: "failed", count: 0 },
    ],
    audio: [
      { id: "a1", name: "陈默·标准音色", desc: "女声 · 青年 · 知性冷静", status: "confirmed", count: 1 },
      { id: "a2", name: "林凯·标准音色", desc: "男声 · 青年 · 温柔低沉", status: "confirmed", count: 1 },
      { id: "a3", name: "旁白·画外音",   desc: "中性 · 叙述风格", status: "pending", count: 0 },
    ],
  },
  p2: {
    chars:    [{ id: "c1", name: "宁远",    desc: "主角·宇航员",         status: "confirmed", count: 20 }, { id: "c2", name: "AI助手", desc: "虚拟角色", status: "confirmed", count: 15 }],
    scenes:   [{ id: "s1", name: "太空舱",  desc: "主场景",             status: "confirmed", count: 40 }, { id: "s2", name: "星球表面", desc: "外景", status: "generating", count: 0 }],
    props:    [{ id: "p1", name: "量子芯片", desc: "核心道具",           status: "pending", count: 1 }, { id: "p2", name: "太空服",   desc: "主角服装", status: "confirmed", count: 8 }],
    audio:    [{ id: "a1", name: "宁远音色", desc: "男声青年", status: "confirmed", count: 1 }, { id: "a2", name: "AI合成音", desc: "机械感", status: "confirmed", count: 1 }],
  },
  p3: {
    chars:    [{ id: "c1", name: "何雨", desc: "主角", status: "confirmed", count: 12 }, { id: "c2", name: "母亲", desc: "配角", status: "pending", count: 5 }],
    scenes:   [{ id: "s1", name: "迷雾森林", desc: "主场景", status: "pending", count: 0 }, { id: "s2", name: "故乡小屋", desc: "记忆场景", status: "pending", count: 0 }],
    props:    [{ id: "p1", name: "旧信件", desc: "关键道具", status: "pending", count: 3 }],
    audio:    [],
  },
  p4: {
    chars:    [{ id: "c1", name: "张小敬", desc: "主角·不良帅", status: "confirmed", count: 55 }],
    scenes:   [{ id: "s1", name: "长安坊市", desc: "主场景", status: "confirmed", count: 80 }, { id: "s2", name: "皇宫", desc: "次要场景", status: "confirmed", count: 20 }],
    props:    [{ id: "p1", name: "烟花", desc: "关键道具", status: "confirmed", count: 8 }, { id: "p2", name: "虎符", desc: "信物", status: "confirmed", count: 4 }],
    audio:    [{ id: "a1", name: "旁白音色", desc: "男声·沉稳", status: "confirmed", count: 1 }],
  },
};

export const SYS_VOICES = [
  { id: "sv1", name: "晓辰",   gender: "女" as VGender, age: "青年" as VAge, lang: "中文", tag: "温柔知性" },
  { id: "sv2", name: "云逸",   gender: "男" as VGender, age: "青年" as VAge, lang: "中文", tag: "沉稳大气" },
  { id: "sv3", name: "小艾",   gender: "女" as VGender, age: "少年" as VAge, lang: "中文", tag: "活泼清亮" },
  { id: "sv4", name: "Marcus", gender: "男" as VGender, age: "青年" as VAge, lang: "英文", tag: "专业播报" },
  { id: "sv5", name: "Echo",   gender: "女" as VGender, age: "青年" as VAge, lang: "英文", tag: "自然流畅" },
  { id: "sv6", name: "墨渊",   gender: "男" as VGender, age: "中年" as VAge, lang: "中文", tag: "磁性低沉" },
];
export const CUSTOM_VOICES = [
  { id: "uv1", name: "林凯专属", gender: "男" as VGender, age: "青年" as VAge, lang: "中文" },
];


export type AssetProject = (typeof PROJECTS)[number];

export const DEFAULT_COSTUMES: CostumeVersion[] = [
    { id: "cv1", name: "日常便装", prompt: "米色风衣、素色高领毛衣、深色直筒裤、简约短靴；自然光，浅景深，居中全身构图。" },
    { id: "cv2", name: "职业正装", prompt: "藏青色西装外套、白色衬衫、黑色西裤、黑色皮鞋；冷调办公室背景，柔和顶光，干净利落。" },
  ];
