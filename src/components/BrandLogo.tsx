import logo from "../assets/brand-logo-gold-v1.png";
export default function BrandLogo({size = 40}: {size?: number}) {
  return <img className="brand-logo-gold" src={logo} alt="星核耀火Hub Logo" width={size} height={size} style={{display:"block",objectFit:"contain",flexShrink:0,borderRadius:size * .2}} />;
}
