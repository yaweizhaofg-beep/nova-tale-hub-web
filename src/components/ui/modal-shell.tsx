import type { ReactNode } from "react";
import { colors } from "@/shared";
import { Dialog } from "./dialog";

/** 模态遮罩容器 */
export function ModalShell({ label, onClose, children, width = 460 }: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <Dialog
      label={label}
      onClose={onClose}
      overlayStyle={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      contentStyle={{
        width, maxWidth: "100%",
        background: colors.bgSecondary,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: 20,
        boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        overflow: "hidden",
        maxHeight: "88vh", display: "flex", flexDirection: "column",
      }}
    >
      {children}
    </Dialog>
  );
}
