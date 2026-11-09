import atlas from "../assets/project-covers-v1.png";

export default function ProjectCover({ name }: { name: string }) {
  const quadrant = name.includes("星坠") || name.includes("星际") ? 2 : name.includes("归途") ? 3 : name.includes("镜像") ? 0 : 1;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <img src={atlas} alt={`${name}封面`} draggable={false}
        style={{ position: "absolute", width: "200%", maxWidth: "none", height: "200%",
          left: quadrant % 2 ? "-100%" : 0, top: quadrant >= 2 ? "-100%" : 0, objectFit: "fill" }} />
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.06) 50%,rgba(0,0,0,.65))" }} />
    </div>
  );
}
