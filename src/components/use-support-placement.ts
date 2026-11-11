import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Drag = { pointer: number; start: Point; anchor: Point; last: Point | null };

const positionKey = "nova:support-position";
const edge = 12;
const gap = 12;
const panelMaxHeight = 560;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

function viewport() {
  const visual = window.visualViewport;
  return {
    x: visual?.offsetLeft ?? 0,
    y: visual?.offsetTop ?? 0,
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
  };
}

function readPosition(): Point | null {
  try {
    const value = JSON.parse(localStorage.getItem(positionKey) ?? "null") as Point | null;
    return value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : null;
  } catch {
    return null;
  }
}

function panelPlacement(anchor: Point, size: Size, screen: ReturnType<typeof viewport>) {
  const leftEdge = screen.x + edge;
  const topEdge = screen.y + edge;
  const rightEdge = screen.x + screen.width - edge;
  const bottomEdge = screen.y + screen.height - edge;
  const width = Math.max(0, Math.min(410, rightEdge - leftEdge));
  const above = anchor.y - gap - topEdge;
  const below = bottomEdge - (anchor.y + size.height + gap);
  const left = anchor.x - gap - width;
  const right = anchor.x + size.width + gap;
  const panelFitsLeft = left >= leftEdge;
  const panelFitsRight = right + width <= rightEdge;

  if (Math.max(above, below) < 460 && (panelFitsLeft || panelFitsRight)) {
    const maxHeight = Math.min(panelMaxHeight, bottomEdge - topEdge);
    return {
      width, maxHeight,
      left: panelFitsLeft ? left : right,
      top: clamp(anchor.y - maxHeight / 2 + size.height / 2, topEdge, bottomEdge - maxHeight),
    };
  }

  return {
    width,
    left: clamp(anchor.x + size.width - width, leftEdge, rightEdge - width),
    maxHeight: clamp(Math.max(above, below), 0, panelMaxHeight),
    ...(above >= below ? { bottom: window.innerHeight - anchor.y + gap } : { top: anchor.y + size.height + gap }),
  };
}

export function useSupportPlacement(onTouchTap: () => void) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState(readPosition);
  const [screen, setScreen] = useState(viewport);
  const [size, setSize] = useState<Size>({ width: 72, height: 84 });

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const measure = () => {
      const { width, height } = button.getBoundingClientRect();
      setSize({ width, height });
      setScreen(viewport());
    };
    const observer = new ResizeObserver(measure);
    const visual = window.visualViewport;
    measure();
    observer.observe(button);
    window.addEventListener("resize", measure);
    visual?.addEventListener("resize", measure);
    visual?.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      visual?.removeEventListener("resize", measure);
      visual?.removeEventListener("scroll", measure);
    };
  }, []);

  function constrain(point: Point) {
    return {
      x: clamp(point.x, screen.x + edge, screen.x + screen.width - size.width - edge),
      y: clamp(point.y, screen.y + edge, screen.y + screen.height - size.height - edge),
    };
  }

  const anchor = constrain(position ?? {
    x: screen.x + screen.width - size.width - 20,
    y: screen.y + screen.height - size.height - 20,
  });

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    suppressClick.current = false;
    drag.current = { pointer: event.pointerId, start: { x: event.clientX, y: event.clientY }, anchor, last: null };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (active?.pointer !== event.pointerId) return;
    const dx = event.clientX - active.start.x;
    const dy = event.clientY - active.start.y;
    if (!active.last) {
      if (Math.hypot(dx, dy) < 6) return;
      suppressClick.current = true;
      setDragging(true);
    }
    active.last = constrain({ x: active.anchor.x + dx, y: active.anchor.y + dy });
    setPosition(active.last);
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (active?.pointer !== event.pointerId) return;
    drag.current = null;
    if (!active.last) return;
    setDragging(false);
    try {
      localStorage.setItem(positionKey, JSON.stringify(active.last));
    } catch {
      // 浏览器禁用存储时，当前位置仍在本次页面会话内生效。
    }
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    const touchTap = event.pointerType === "touch" && active?.pointer === event.pointerId && !active.last &&
      Math.hypot(event.clientX - active.start.x, event.clientY - active.start.y) < 6;
    finishDrag(event);
    if (touchTap) {
      // 触屏拖动后的第一次轻触可能不会生成 click。
      suppressClick.current = true;
      onTouchTap();
    }
  }

  return {
    buttonRef, dragging, suppressClick,
    anchorStyle: { left: anchor.x, top: anchor.y },
    panelStyle: panelPlacement(anchor, size, screen),
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: finishDrag, onLostPointerCapture: finishDrag },
  };
}
