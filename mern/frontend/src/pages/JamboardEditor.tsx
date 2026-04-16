import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Canvas, Group, PencilBrush, Rect, Shadow, Textbox } from "fabric";
import { apiFetch } from "../lib/api";
import "./JamboardEditor.css";

type ToolMode = "select" | "pen" | "marker" | "pencil" | "text" | "sticky";
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type WhiteboardResponse = {
  whiteboardID: string;
  studentID: string;
  title?: string;
  dataJSON?: string;
  createdAt?: string;
  lastSavedAt?: string;
};

const COLOR_PRESETS = ["#111827", "#2563EB", "#059669", "#DC2626", "#F59E0B", "#7C3AED"];
const STICKY_PRESETS = ["#FDE68A", "#BFDBFE", "#BBF7D0", "#FBCFE8", "#DDD6FE"];

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

function JamboardEditor() {
  const { whiteboardID } = useParams<{ whiteboardID: string }>();
  const navigate = useNavigate();

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const isHydratingRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);

  const [tool, setTool] = useState<ToolMode>("select");
  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [textColor, setTextColor] = useState("#111827");
  const [textSize, setTextSize] = useState(24);
  const [stickyColor, setStickyColor] = useState("#FDE68A");
  const [boardTitle, setBoardTitle] = useState("Jamboard");
  const [status, setStatus] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState("");

  const statusLabel = useMemo(() => {
    if (status === "saving") return "Saving...";
    if (status === "saved") return "Saved";
    if (status === "dirty") return "Unsaved changes";
    if (status === "error") return "Save failed";
    return "Ready";
  }, [status]);

  const configureBrush = useCallback((canvas: Canvas) => {
    if (!["pen", "marker", "pencil"].includes(tool)) {
      canvas.isDrawingMode = false;
      return;
    }

    const brush = new PencilBrush(canvas);

    if (tool === "pen") {
      brush.width = Math.max(2, strokeWidth);
      brush.color = strokeColor;
    }

    if (tool === "marker") {
      brush.width = Math.max(9, strokeWidth + 5);
      brush.color = hexToRgba(strokeColor, 0.35);
    }

    if (tool === "pencil") {
      brush.width = Math.max(1, strokeWidth - 2);
      brush.color = hexToRgba(strokeColor, 0.7);
    }

    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
  }, [strokeColor, strokeWidth, tool]);

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

    const resizeCanvas = () => {
      if (!workspaceRef.current || !fabricCanvasRef.current) return;
      const width = workspaceRef.current.clientWidth;
      const height = Math.max(440, window.innerHeight - 180);
      fabricCanvasRef.current.setDimensions({ width, height });
      fabricCanvasRef.current.requestRenderAll();
    };

    const handleMouseDown = (opt: any) => {
      if (!opt?.e || canvas.isDrawingMode) return;

      const point = canvas.getScenePoint(opt.e);

      if (tool === "text") {
        const text = new Textbox("Type here", {
          left: point.x,
          top: point.y,
          width: 240,
          fontSize: textSize,
          fill: textColor,
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        scheduleSave();
      }

      if (tool === "sticky") {
        const noteRect = new Rect({
          width: 240,
          height: 180,
          rx: 14,
          ry: 14,
          fill: stickyColor,
          stroke: "rgba(17, 24, 39, 0.12)",
          strokeWidth: 1,
          shadow: new Shadow({
            color: "rgba(15, 23, 42, 0.12)",
            blur: 12,
            offsetX: 0,
            offsetY: 6,
          }),
        });

        const noteText = new Textbox("Double-click to edit", {
          left: 16,
          top: 16,
          width: 208,
          fontSize: 18,
          lineHeight: 1.25,
          fill: "#0f172a",
          editable: true,
        });

        const stickyGroup = new Group([noteRect, noteText], {
          left: point.x,
          top: point.y,
          subTargetCheck: true,
        });

        (stickyGroup as any).jamType = "sticky-note";

        canvas.add(stickyGroup);
        canvas.setActiveObject(stickyGroup);
        scheduleSave();
      }
    };

    const handleDoubleClick = (opt: any) => {
      const target = opt?.target;
      if (!(target instanceof Group) || (target as any).jamType !== "sticky-note") return;

      const textbox = target.getObjects().find((obj) => obj instanceof Textbox) as Textbox | undefined;
      if (!textbox) return;

      const updatedText = window.prompt("Edit sticky note text", textbox.text || "");
      if (updatedText === null) return;

      textbox.set("text", updatedText);
      target.set("dirty", true);
      target.setCoords();
      canvas.requestRenderAll();
      scheduleSave();
    };

    const changeEvents = ["object:added", "object:modified", "object:removed", "path:created", "text:changed"];

    window.addEventListener("resize", resizeCanvas);
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:dblclick", handleDoubleClick);
    changeEvents.forEach((eventName) => canvas.on(eventName as any, scheduleSave));

    resizeCanvas();

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
        setBoardTitle(board.title || "My Whiteboard");

        if (board.dataJSON && board.dataJSON.trim()) {
          await canvas.loadFromJSON(board.dataJSON);
          canvas.requestRenderAll();
        }

        hasUnsavedChangesRef.current = false;
        setStatus("saved");
      } catch (err: any) {
        setLoadError(err?.message || "Unable to load whiteboard");
      } finally {
        isHydratingRef.current = false;
      }
    })();

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      window.removeEventListener("resize", resizeCanvas);
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:dblclick", handleDoubleClick);
      changeEvents.forEach((eventName) => canvas.off(eventName as any, scheduleSave));
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [scheduleSave, textColor, textSize, stickyColor, tool, whiteboardID]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    configureBrush(canvas);

    if (tool === "select") {
      canvas.defaultCursor = "default";
    } else {
      canvas.defaultCursor = "crosshair";
    }
  }, [configureBrush, tool]);

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

  function deleteSelection() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (!activeObjects.length) return;

    activeObjects.forEach((object) => canvas.remove(object));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    scheduleSave();
  }

  function bringForward() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const object = canvas.getActiveObject();
    if (!object) return;

    canvas.bringObjectForward(object);
    canvas.requestRenderAll();
    scheduleSave();
  }

  function sendBackward() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const object = canvas.getActiveObject();
    if (!object) return;

    canvas.sendObjectBackwards(object);
    canvas.requestRenderAll();
    scheduleSave();
  }

  function clearBoard() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (!window.confirm("Clear the entire board?")) return;

    canvas.clear();
    scheduleSave();
  }

  return (
    <div className="jam-editor-page">
      <header className="jam-editor-header">
        <div>
          <p className="jam-editor-kicker">Interactive Canvas</p>
          <h1>{boardTitle}</h1>
        </div>

        <div className="jam-editor-top-actions">
          <span className={`jam-save-status ${status}`}>{statusLabel}</span>
          <button className="jam-btn ghost" onClick={() => navigate("/student-panel")}>Back</button>
          <button className="jam-btn primary" onClick={saveBoard}>Save Now</button>
        </div>
      </header>

      {loadError && <p className="jam-error-banner">{loadError}</p>}

      <div className="jam-editor-toolbar">
        <div className="jam-tool-group">
          <button className={`jam-tool ${tool === "select" ? "active" : ""}`} onClick={() => setTool("select")}>Select</button>
          <button className={`jam-tool ${tool === "pen" ? "active" : ""}`} onClick={() => setTool("pen")}>Pen</button>
          <button className={`jam-tool ${tool === "marker" ? "active" : ""}`} onClick={() => setTool("marker")}>Marker</button>
          <button className={`jam-tool ${tool === "pencil" ? "active" : ""}`} onClick={() => setTool("pencil")}>Pencil</button>
          <button className={`jam-tool ${tool === "text" ? "active" : ""}`} onClick={() => setTool("text")}>Text</button>
          <button className={`jam-tool ${tool === "sticky" ? "active" : ""}`} onClick={() => setTool("sticky")}>Sticky</button>
        </div>

        <div className="jam-toolbar-split" />

        <div className="jam-tool-group">
          <label className="jam-control">
            <span>Stroke</span>
            <input type="range" min={1} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} />
          </label>

          <label className="jam-control color">
            <span>Color</span>
            <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
          </label>

          <label className="jam-control color">
            <span>Text</span>
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
          </label>

          <label className="jam-control">
            <span>Size</span>
            <input type="range" min={12} max={64} value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} />
          </label>
        </div>

        <div className="jam-toolbar-split" />

        <div className="jam-color-preset-group">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className={`jam-swatch ${strokeColor === color ? "active" : ""}`}
              style={{ background: color }}
              onClick={() => setStrokeColor(color)}
              title={color}
            />
          ))}
        </div>

        <div className="jam-color-preset-group">
          {STICKY_PRESETS.map((color) => (
            <button
              key={color}
              className={`jam-swatch sticky ${stickyColor === color ? "active" : ""}`}
              style={{ background: color }}
              onClick={() => setStickyColor(color)}
              title={color}
            />
          ))}
        </div>

        <div className="jam-tool-group">
          <button className="jam-btn danger" onClick={deleteSelection}>Delete</button>
          <button className="jam-btn" onClick={bringForward}>Bring Forward</button>
          <button className="jam-btn" onClick={sendBackward}>Send Backward</button>
          <button className="jam-btn ghost" onClick={clearBoard}>Clear</button>
        </div>
      </div>

      <div className="jam-canvas-shell" ref={workspaceRef}>
        <canvas ref={canvasElementRef} />
      </div>

      <footer className="jam-editor-footer">
        <p>
          Click on canvas with Text or Sticky tools to place objects. Sticky notes are Fabric groups containing a rectangle and editable textbox.
        </p>
      </footer>
    </div>
  );
}

export default JamboardEditor;
