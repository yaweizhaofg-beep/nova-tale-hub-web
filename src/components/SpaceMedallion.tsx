import { Crown, UserRound, UsersRound } from "lucide-react";
import "./space-medallion.css";
export default function SpaceMedallion({space,size=64}:{space:"personal"|"team";size?:number}) {
  const Icon=space==="team"?UsersRound:UserRound;
  return <span className={`vip-medallion vip-medallion-${space}`} style={{width:size,height:size}} aria-hidden="true"><span className="vip-medallion-core"><Crown className="vip-crown"/><Icon className="vip-person"/></span><span className="vip-medallion-seal">VIP</span></span>;
}
