import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Canvas, IText, PencilBrush, Point } from "fabric";
import { apiFetch } from "../lib/api";
import "./JamboardEditor.css";

type ToolMode = "select" | "move" | "pen" | "marker" | "eraser" | "text";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type WhiteboardResponse = {
  whiteboardID: string;
  studentID: string;
  title?: string;
  dataJSON?: string;
  createdAt?: string;
  lastSavedAt?: string;
};

type JamboardEditorProps = {
  whiteboardID?: string;
};

const COLOR_PRESETS = ["#000000", "#EF4444", "#2563EB", "#16A34A", "#F97316", "#7C3AED", "#EC4899", "#FACC15"] as const;

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized;

  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const TOOL_BUTTON_STYLE: React.CSSProperties = {
  width: 42,
  height: 42,
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#ffffff",
  color: "#111827",
  padding: 0,
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

type ToolIconName = "select" | "move" | "pen" | "marker" | "eraser" | "text" | "clear" | "save";

function ToolIcon({ name }: { name: ToolIconName }) {
  const base = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "select") {
    return (
      <svg {...base}>
        <path d="M4 3l13 13" />
        <path d="M4 3l4 15 3-6 6-3z" />
      </svg>
    );
  }

  if (name === "move") {
    return (
      <svg {...base}>
        <path d="M12 2v20" />
        <path d="M2 12h20" />
        <path d="M8 6l4-4 4 4" />
        <path d="M8 18l4 4 4-4" />
        <path d="M6 8l-4 4 4 4" />
        <path d="M18 8l4 4-4 4" />
      </svg>
    );
  }

  if (name === "pen") {
    return (
      <svg {...base}>
        <path d="M3 21l3.5-1 11-11a2.5 2.5 0 0 0-3.5-3.5l-11 11z" />
        <path d="M13 6l5 5" />
      </svg>
    );
  }

  if (name === "marker") {
    return (
      <svg {...base}>
        <path d="M4 14l6 6" />
        <path d="M8 18l9-9a2.8 2.8 0 1 0-4-4l-9 9z" />
        <path d="M3 21h6" />
      </svg>
    );
  }

  if (name === "eraser") {
    return (
      <svg {...base}>
        <path d="M4 16l7-9a2 2 0 0 1 3.1-.2l5.9 6a2 2 0 0 1 .1 2.8L16 21H9z" />
        <path d="M14 21h7" />
      </svg>
    );
  }

  if (name === "text") {
    return (
      <svg {...base}>
        <path d="M4 5h16" />
        <path d="M12 5v14" />
        <path d="M8 19h8" />
      </svg>
    );
  }

  if (name === "clear") {
    return (
      <svg {...base}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 14h10l1-14" />
        <path d="M10 10v7" />
        <path d="M14 10v7" />
      </svg>
    );
  }

  return (
    <svg {...base}>
      <path d="M5 12l4 4L19 6" />
      <path d="M12 3v5" />
      <path d="M3 12h5" />
    </svg>
  );
}

function JamboardEditor({ whiteboardID: whiteboardIDProp }: JamboardEditorProps) {
  const params = useParams<{ whiteboardID: string }>();
  const whiteboardID = whiteboardIDProp || params.whiteboardID;

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const isHydratingRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const toolRef = useRef<ToolMode>("select");
  const applyToolModeRef = useRef<(canvas: Canvas) => void>(() => {});

  const [tool, setTool] = useState<ToolMode>("select");
  const [penColor, setPenColor] = useState("#000000");
  const [markerColor, setMarkerColor] = useState("#FACC15");
  const [penSize, setPenSize] = useState(2);
  const [markerSize, setMarkerSize] = useState(12);
  const [eraserSize] = useState(18);
  const [boardTitle, setBoardTitle] = useState("Jamboard");
  const [status, setStatus] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState("");
  const isToolExpanded = tool === "pen" || tool === "marker";

  const statusLabel = useMemo(() => {
    if (status === "saving") return "Saving...";
    if (status === "saved") return "Saved";
    if (status === "dirty") return "Unsaved changes";
    if (status === "error") return "Save failed";
    return "Ready";
  }, [status]);

  const applyToolMode = useCallback((canvas: Canvas) => {
    if (isPanningRef.current || isSpacePressedRef.current) {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "grab";
      return;
    }

    if (tool === "select") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      return;
    }

    if (tool === "move") {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "grab";
      return;
    }

    if (tool === "text") {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
      return;
    }

    const brush = new PencilBrush(canvas);
    brush.shadow = null;

    if (tool === "pen") {
      brush.width = penSize;
      brush.color = penColor;
      (brush as any).globalCompositeOperation = "source-over";
    }

    if (tool === "marker") {
      brush.width = markerSize;
      brush.color = hexToRgba(markerColor, 0.6);
      (brush as any).globalCompositeOperation = "source-over";
    }

    if (tool === "eraser") {
      brush.width = eraserSize;
      brush.color = "rgba(0,0,0,1)";
      (brush as any).globalCompositeOperation = "source-over";
    }

    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair";
  }, [eraserSize, markerColor, markerSize, penColor, penSize, tool]);

  const saveBoard = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !whiteboardID) return;

    try {
      setStatus("saving");
      const payload = JSON.stringify(canvas.toJSON());

      const res = await apiFetch(`/api/whiteboard/${whiteboardID}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataJSON: payload }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Unable to save whiteboard");
      }

      hasUnsavedChangesRef.current = false;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [whiteboardID]);

  const scheduleSave = useCallback(() => {
    if (isHydratingRef.current) return;

    hasUnsavedChangesRef.current = true;
    setStatus("dirty");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveBoard();
    }, 1200);
  }, [saveBoard]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    applyToolModeRef.current = applyToolMode;
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      applyToolMode(canvas);
    }
  }, [applyToolMode]);

  useEffect(() => {
    if (!whiteboardID) {
      setLoadError("Missing whiteboard ID.");
      return;
    }

    if (!canvasElementRef.current || !workspaceRef.current) return;

    const canvas = new Canvas(canvasElementRef.current, {
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    applyToolModeRef.current(canvas);

    const resizeCanvas = () => {
      if (!workspaceRef.current || !fabricCanvasRef.current) return;
      const width = workspaceRef.current.clientWidth;
      const height = workspaceRef.current.clientHeight;
      fabricCanvasRef.current.setDimensions({ width, height });
      fabricCanvasRef.current.requestRenderAll();
    };

    const startPan = (e: MouseEvent) => {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      panOriginRef.current = { x: vpt[4], y: vpt[5] };
      canvas.selection = false;
      canvas.isDrawingMode = false;
      canvas.defaultCursor = "grabbing";
    };

    const stopPan = () => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      applyToolModeRef.current(canvas);
    };

    const handleMouseDown = (opt: any) => {
      if (!opt?.e) return;

      const event = opt.e as MouseEvent;

      if (((isSpacePressedRef.current || toolRef.current === "move") && event.button === 0) || event.button === 1) {
        event.preventDefault();
        startPan(event);
        return;
      }

      if (canvas.isDrawingMode || toolRef.current === "select") return;

      const point = canvas.getScenePoint(opt.e);

      if (toolRef.current === "text") {
        const text = new IText("Type here", {
          left: point.x,
          top: point.y,
          fontSize: 18,
          fill: "#000000",
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        scheduleSave();
      }
    };

    const handleMouseMove = (opt: any) => {
      if (!isPanningRef.current || !opt?.e) return;

      const event = opt.e as MouseEvent;
      const deltaX = event.clientX - panStartRef.current.x;
      const deltaY = event.clientY - panStartRef.current.y;
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

      vpt[4] = panOriginRef.current.x + deltaX;
      vpt[5] = panOriginRef.current.y + deltaY;
      canvas.setViewportTransform(vpt);
      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      stopPan();
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.upperCanvasEl.getBoundingClientRect();
      const pointer = new Point(event.clientX - rect.left, event.clientY - rect.top);
      const zoomDelta = 0.999 ** event.deltaY;
      const nextZoom = Math.min(5, Math.max(0.1, canvas.getZoom() * zoomDelta));
      canvas.zoomToPoint(pointer, nextZoom);
      canvas.requestRenderAll();
    };

    const handlePathCreated = (opt: any) => {
      if (toolRef.current !== "eraser") return;
      const path = opt?.path;
      if (!path) return;

      path.set({
        globalCompositeOperation: "destination-out",
        stroke: "rgba(0,0,0,1)",
      });
      canvas.requestRenderAll();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      const tagName = (event.target as HTMLElement | null)?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA") return;

      event.preventDefault();
      isSpacePressedRef.current = true;
      if (!isPanningRef.current) {
        canvas.defaultCursor = "grab";
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      isSpacePressedRef.current = false;
      stopPan();
      applyToolModeRef.current(canvas);
    };

    const handleWindowBlur = () => {
      isSpacePressedRef.current = false;
      stopPan();
      applyToolModeRef.current(canvas);
    };

    const changeEvents = ["object:added", "object:modified", "object:removed", "path:created", "text:changed"];

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("path:created", handlePathCreated);
    changeEvents.forEach((eventName) => canvas.on(eventName as any, scheduleSave));
    canvas.upperCanvasEl.addEventListener("wheel", handleWheel, { passive: false });

    resizeCanvas();

    let isCancelled = false;

    (async () => {
      try {
        isHydratingRef.current = true;
        setLoadError("");

        const res = await apiFetch(`/api/whiteboard/${whiteboardID}`);
        const data = (await res.json()) as WhiteboardResponse | { message?: string; error?: string };

        if (!res.ok) {
          throw new Error((data as { error?: string; message?: string }).error || (data as { error?: string; message?: string }).message || "Whiteboard not found");
        }

        const board = data as WhiteboardResponse;
        if (isCancelled || fabricCanvasRef.current !== canvas) return;
        setBoardTitle(board.title || "My Whiteboard");

        if (board.dataJSON && board.dataJSON.trim()) {
          await canvas.loadFromJSON(board.dataJSON);
          if (isCancelled || fabricCanvasRef.current !== canvas) return;
          canvas.requestRenderAll();
        }

        if (isCancelled || fabricCanvasRef.current !== canvas) return;
        hasUnsavedChangesRef.current = false;
        setStatus("saved");
      } catch (err: any) {
        if (isCancelled) return;
        setLoadError(err?.message || "Unable to load whiteboard");
      } finally {
        if (!isCancelled) {
          isHydratingRef.current = false;
        }
      }
    })();

    return () => {
      isCancelled = true;
      isHydratingRef.current = false;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("path:created", handlePathCreated);
      changeEvents.forEach((eventName) => canvas.off(eventName as any, scheduleSave));
      canvas.upperCanvasEl.removeEventListener("wheel", handleWheel);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [scheduleSave, whiteboardID]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  function clearBoard() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (!window.confirm("Clear the entire board?")) return;

    canvas.clear();
    scheduleSave();
  }

  const panelStyles = useMemo(() => {
    return {
      page: {
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        margin: 0,
        padding: 0,
        background: "#f8fafc",
      } as React.CSSProperties,
      workspace: {
        position: "absolute",
        inset: 0,
      } as React.CSSProperties,
      toolbar: {
        position: "fixed",
        left: 16,
        top: "50%",
        transform: "translateY(-50%)",
        width: isToolExpanded ? 182 : 64,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        background: "#FEF3C7",
        borderRadius: 14,
        border: "1px solid #FCD34D",
        boxShadow: "0 10px 30px rgba(120, 53, 15, 0.18)",
        zIndex: 30,
        overflow: "hidden",
        transition: "width 0.2s ease",
      } as React.CSSProperties,
      swatchRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 5,
        maxWidth: 156,
      } as React.CSSProperties,
      sizeRow: {
        display: "flex",
        gap: 5,
        marginTop: 6,
      } as React.CSSProperties,
      swatch: {
        width: 16,
        height: 16,
        borderRadius: 999,
        border: "1px solid rgba(15, 23, 42, 0.35)",
        cursor: "pointer",
      } as React.CSSProperties,
      status: {
        fontSize: 10,
        fontWeight: 700,
        color: status === "saved" ? "#15803d" : status === "error" ? "#b91c1c" : "#334155",
        textAlign: "center",
        letterSpacing: "0.02em",
      } as React.CSSProperties,
      titlePill: {
        position: "fixed",
        right: 16,
        top: 16,
        zIndex: 30,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: 10,
        padding: "8px 10px",
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
        fontSize: 13,
        fontWeight: 700,
        color: "#0f172a",
      } as React.CSSProperties,
      errorBanner: {
        position: "fixed",
        left: isToolExpanded ? 206 : 88,
        right: 16,
        top: 16,
        zIndex: 35,
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid rgba(239, 68, 68, 0.35)",
        background: "#FEE2E2",
        color: "#991B1B",
        fontSize: 13,
        fontWeight: 600,
      } as React.CSSProperties,
    };
  }, [isToolExpanded, status]);

  const setToolButtonStyle = (isActive: boolean): React.CSSProperties => ({
    ...TOOL_BUTTON_STYLE,
    background: isActive ? "#FDE68A" : "#fffdf7",
    borderColor: isActive ? "#D97706" : "#E5E7EB",
    color: isActive ? "#92400E" : "#111827",
    boxShadow: isActive ? "0 0 0 2px rgba(217, 119, 6, 0.18)" : "none",
  });

  return (
    <div style={panelStyles.page}>
      {loadError && <div style={panelStyles.errorBanner}>{loadError}</div>}
      <div style={panelStyles.titlePill}>{boardTitle}</div>

      <div style={panelStyles.toolbar}>
        <button
          style={setToolButtonStyle(tool === "select")}
          onClick={() => setTool("select")}
          title="Select"
          aria-label="Select tool"
        >
          <ToolIcon name="select" />
        </button>

        <button
          style={setToolButtonStyle(tool === "move")}
          onClick={() => setTool("move")}
          title="Move"
          aria-label="Move tool"
        >
          <ToolIcon name="move" />
        </button>

        <div>
          <button
            style={setToolButtonStyle(tool === "pen")}
            onClick={() => setTool("pen")}
            title="Pen"
            aria-label="Pen tool"
          >
            <ToolIcon name="pen" />
          </button>
          {tool === "pen" && (
            <>
              <div style={panelStyles.swatchRow}>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={`pen-${color}`}
                    type="button"
                    style={{
                      ...panelStyles.swatch,
                      background: color,
                      boxShadow: penColor === color ? "0 0 0 2px #2563EB" : "none",
                    }}
                    onClick={() => setPenColor(color)}
                    title={color}
                  />
                ))}
              </div>
              <div style={panelStyles.sizeRow}>
                {[2, 5, 10].map((size) => (
                  <button
                    key={`pen-size-${size}`}
                    type="button"
                    style={{
                      ...TOOL_BUTTON_STYLE,
                      width: 48,
                      height: 28,
                      borderRadius: 8,
                      fontSize: 10,
                      background: penSize === size ? "#DBEAFE" : "#fff",
                      borderColor: penSize === size ? "#2563EB" : "#d1d5db",
                    }}
                    onClick={() => setPenSize(size)}
                    title={`Pen size ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <button
            style={setToolButtonStyle(tool === "marker")}
            onClick={() => setTool("marker")}
            title="Marker"
            aria-label="Marker tool"
          >
            <ToolIcon name="marker" />
          </button>
          {tool === "marker" && (
            <>
              <div style={panelStyles.swatchRow}>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={`marker-${color}`}
                    type="button"
                    style={{
                      ...panelStyles.swatch,
                      background: color,
                      boxShadow: markerColor === color ? "0 0 0 2px #2563EB" : "none",
                    }}
                    onClick={() => setMarkerColor(color)}
                    title={color}
                  />
                ))}
              </div>
              <div style={panelStyles.sizeRow}>
                {[8, 16, 24].map((size) => (
                  <button
                    key={`marker-size-${size}`}
                    type="button"
                    style={{
                      ...TOOL_BUTTON_STYLE,
                      width: 48,
                      height: 28,
                      borderRadius: 8,
                      fontSize: 10,
                      background: markerSize === size ? "#DBEAFE" : "#fff",
                      borderColor: markerSize === size ? "#2563EB" : "#d1d5db",
                    }}
                    onClick={() => setMarkerSize(size)}
                    title={`Marker size ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          style={setToolButtonStyle(tool === "eraser")}
          onClick={() => setTool("eraser")}
          title="Eraser"
          aria-label="Eraser tool"
        >
          <ToolIcon name="eraser" />
        </button>
        <button
          style={setToolButtonStyle(tool === "text")}
          onClick={() => setTool("text")}
          title="Text"
          aria-label="Text tool"
        >
          <ToolIcon name="text" />
        </button>

        <button
          style={{ ...TOOL_BUTTON_STYLE, borderColor: "#fca5a5", color: "#991b1b", background: "#fff7ed" }}
          onClick={clearBoard}
          title="Clear all"
          aria-label="Clear all"
        >
          <ToolIcon name="clear" />
        </button>
        <button
          style={{ ...TOOL_BUTTON_STYLE, background: "#2563EB", color: "#fff", borderColor: "#2563EB" }}
          onClick={saveBoard}
          title="Save"
          aria-label="Save"
        >
          <ToolIcon name="save" />
        </button>

        <div style={panelStyles.status}>{statusLabel}</div>
      </div>

      <div ref={workspaceRef} style={panelStyles.workspace}>
        <canvas ref={canvasElementRef} />
      </div>
    </div>
  );
}

export default JamboardEditor;
