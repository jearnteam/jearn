import { CSSProperties } from "react";

export function getPopupContainerStyle(
  x: number,
  y: number,
  visible: boolean,
  bg: string,
  text: string
): CSSProperties {
  return {
    position: "absolute",
    top: y,
    left: x,
    transform: visible ? "translate(-50%,0)" : "translate(-50%,8px)",
    transition: "opacity 0.2s ease, transform 0.2s ease",
    background: bg,
    borderRadius: 12,
    zIndex: 999,
    width: 420,
    maxWidth: "90vw",
    maxHeight: "65vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
    overflow: "hidden",
    opacity: visible ? 1 : 0,
    color: text,
  };
}

export const popupHeaderStyle = (edge: string): CSSProperties => ({
  padding: "14px 16px",
  borderBottom: `1px solid ${edge}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const popupBodyStyle: CSSProperties = {
  padding: 16,
  overflowY: "auto",
  flex: 1,
};
