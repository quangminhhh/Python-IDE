// src/components/layout/app-shell.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Square, Share2, Moon, Sun, Copy, GripVertical, Plus, Minus, RotateCcw } from "lucide-react";
import { CodeEditor } from "@/components/editor/code-editor";
import { PythonLogo } from "@/components/ui/python-logo";
import { AutoSaveIndicator } from "@/components/ui/auto-save-indicator";
import { ExecutionTime } from "@/components/ui/execution-time";
import { useTheme } from "next-themes";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { toast } from "sonner";
import dynamic from "next/dynamic";

type TermConsoleHandle = {
  write: (s: string) => void;
  clear: () => void;
  focus: () => void;
  forceReset: () => void; // Thêm method mới
};

// chỉ load trên client, tránh SSR đụng @xterm/*
const TermConsole = dynamic(
  () => import("@/components/terminal/term-console").then(m => m.TermConsole),
  { ssr: false }
);

// Dùng trong onRun để áp dụng interruptible sleep + MPLBACKEND=agg
const FAST_SLEEP_PRELUDE = [
  "import os, js, time",
  "os.environ.setdefault('MPLBACKEND', 'agg')",  // NEW: chọn backend headless
  "try:",
  "    time.sleep = js.interruptibleSleep",
  "except Exception:",
  "    pass",
  "",
].join("\n");

type WorkerOut =
  | { type: "ready" }
  | { type: "awaiting_input" }
  | { type: "got_input" }
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "result"; ok: true }
  | { type: "result"; ok: false; error: string };

const LS_KEY = "python-ide:code:v1";
const LS_RESIZE_KEY = "python-ide:resize:v1";
const LS_FONT_SIZE_KEY = "python-ide:font-size:v1";
const DEBOUNCE_MS = 400;

// Font size configuration
const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24] as const;
const DEFAULT_FONT_SIZE = 14;

export function AppShell() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Resize state
  const [leftWidth, setLeftWidth] = React.useState(50); // Phần trăm chiều rộng của editor
  const [isResizing, setIsResizing] = React.useState(false);
  const [fontSize, setFontSize] = React.useState(DEFAULT_FONT_SIZE);
  const resizeRef = React.useRef<HTMLDivElement>(null);

  // Khôi phục tỷ lệ resize từ localStorage
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LS_RESIZE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 25 && parsed <= 75) {
          setLeftWidth(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Khôi phục font size từ localStorage
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LS_FONT_SIZE_KEY);
      if (saved) {
        const parsed = parseInt(saved);
        if (!isNaN(parsed) && FONT_SIZES.includes(parsed as typeof FONT_SIZES[number])) {
          setFontSize(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Lưu tỷ lệ resize vào localStorage
  React.useEffect(() => {
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(LS_RESIZE_KEY, leftWidth.toString());
      } catch {
        // ignore
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [leftWidth]);

  // Lưu font size vào localStorage
  React.useEffect(() => {
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(LS_FONT_SIZE_KEY, fontSize.toString());
      } catch {
        // ignore
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [fontSize]);

  // Code & console
  const [code, setCode] = React.useState<string>(`# Python console demo
name = input("Your name: ")
print("Hello,", name)
`);
  const [output, setOutput] = React.useState<string>("");
  const [waitingInput, setWaitingInput] = React.useState<boolean>(false);
  const [editorReady, setEditorReady] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);
  const hasShownWelcomeRef = React.useRef(false);

  // New states for enhancements
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [executionStartTime, setExecutionStartTime] = React.useState<number | null>(null);
  const [executionEndTime, setExecutionEndTime] = React.useState<number | null>(null);

  const termRef = React.useRef<TermConsoleHandle | null>(null);

  const append = React.useCallback((s: string) => {
    setOutput(prev => (prev ? prev + s : s));
    termRef.current?.write(s);
  }, []);

  // Worker & SAB
  const workerRef = React.useRef<Worker | null>(null);
  const sabInputRef = React.useRef<SharedArrayBuffer | null>(null);
  const lenViewRef = React.useRef<Int32Array | null>(null);
  const bytesRef = React.useRef<Uint8Array | null>(null);
  const sabInterruptRef = React.useRef<SharedArrayBuffer | null>(null);
  const i8InterruptRef = React.useRef<Uint8Array | null>(null);
  const encoder = React.useMemo(() => new TextEncoder(), []);

  // Khôi phục code từ URL hash hoặc localStorage
  React.useEffect(() => {
    const hash = window.location.hash;
    const m = hash.match(/#code=([^&]+)/);
    if (m?.[1]) {
      try {
        const decompressed = decompressFromEncodedURIComponent(m[1]);
        if (typeof decompressed === "string" && decompressed.length > 0) {
          setCode(decompressed);
          return;
        }
      } catch {
        // ignore
      }
    }
    try {
      const saved = window.localStorage.getItem(LS_KEY);
      if (saved) setCode(saved);
    } catch {
      // ignore
    }
  }, []);

  // Autosave with status indicator
  React.useEffect(() => {
    setSaveStatus("saving");
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(LS_KEY, code);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [code]);

  // Tạo SharedArrayBuffer cho stdin & interrupt
  const setupSharedBuffers = React.useCallback(() => {
    const sabInput = new SharedArrayBuffer(4 + 4096);
    sabInputRef.current = sabInput;
    lenViewRef.current = new Int32Array(sabInput, 0, 1);
    bytesRef.current = new Uint8Array(sabInput, 4);
    const sabInterrupt = new SharedArrayBuffer(1);
    sabInterruptRef.current = sabInterrupt;
    i8InterruptRef.current = new Uint8Array(sabInterrupt);
    i8InterruptRef.current[0] = 0;
  }, []);

  const killWorker = React.useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setWaitingInput(false);
  }, []);

  const spawnWorker = React.useCallback((isForRunning = false) => {
    // Đảm bảo kill worker cũ trước khi tạo mới
    killWorker();

    console.log('spawnWorker called with isForRunning:', isForRunning, 'hasShownWelcome:', hasShownWelcomeRef.current);

    console.log('spawnWorker called with isForRunning:', isForRunning, 'hasShownWelcome:', hasShownWelcomeRef.current);

    setupSharedBuffers();
    const w = new Worker(new URL("../../workers/pyodide.worker.ts", import.meta.url), {
      type: "classic",
      name: "pyodide-worker",
    });

    w.onmessage = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data;
      switch (msg.type) {
        case "ready":
          if (isForRunning) {
            append("Running...\n");
          } else if (!hasShownWelcomeRef.current) {
            // Chỉ hiển thị welcome một lần duy nhất
            append("Welcome to Python IDE! Ready to execute your code.\n\n");
            hasShownWelcomeRef.current = true;
          }
          break;
        case "awaiting_input":
          setWaitingInput(true);
          termRef.current?.focus();
          break;
        case "got_input":
          setWaitingInput(false);
          break;
        case "stdout":
          append(msg.data);
          break;
        case "stderr":
          append(msg.data);
          break;
        case "result":
          append(msg.ok ? "\nExecution completed\n" : `\nError: ${msg.error}\n`);
          setWaitingInput(false);
          setIsRunning(false);
          setExecutionEndTime(Date.now());
          break;
      }
    };
    w.onerror = (e) => append(`[worker error] ${e.message}\n`);

    if (sabInputRef.current && sabInterruptRef.current) {
      w.postMessage({
        type: "init",
        baseUrl: window.location.origin,
        inputSAB: sabInputRef.current as SharedArrayBuffer,
        interruptSAB: sabInterruptRef.current as SharedArrayBuffer,
      });
    }

    workerRef.current = w;
    return w;
  }, [append, setupSharedBuffers, killWorker]);

  const sendInputLine = React.useCallback(
    (line: string) => {
      const lenView = lenViewRef.current;
      const bytes = bytesRef.current;
      if (!workerRef.current || !lenView || !bytes) return;
      const encoded = encoder.encode(line.endsWith("\n") ? line : line + "\n");
      if (encoded.length > bytes.length) {
        append(`[error] Input line too long (${encoded.length} > ${bytes.length})\n`);
        return;
      }
      bytes.fill(0);
      bytes.set(encoded, 0);
      Atomics.store(lenView, 0, encoded.length);
      Atomics.notify(lenView, 0, 1);
    },
    [append, encoder]
  );

  const onRun = React.useCallback(() => {
    setOutput("");
    killWorker();
    setIsRunning(true);
    setExecutionStartTime(Date.now());
    setExecutionEndTime(null);
    const w = spawnWorker(true); // true = isForRunning
    const codeToRun = FAST_SLEEP_PRELUDE + code; // luôn prepend prelude
    w.postMessage({ type: "run", code: codeToRun });
  }, [code, killWorker, spawnWorker]);

  const onStop = React.useCallback(() => {
    const i8 = i8InterruptRef.current;
    if (i8 && workerRef.current) {
      i8[0] = 2; // SIGINT
      append("^C\n");
      setIsRunning(false); // Reset running state immediately
      setExecutionEndTime(Date.now());
      setTimeout(() => {
        if (workerRef.current) {
          append("[force stop]\n");
          killWorker();
        }
      }, 400);
    }
  }, [append, killWorker]);

  // Shortcuts
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onRun();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onStop();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onRun, onStop]);

  // Share via URL
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");
  const makeShareUrl = React.useCallback(() => {
    const compressed = compressToEncodedURIComponent(code);
    const base = window.location.origin + window.location.pathname;
    return `${base}#code=${compressed}`;
  }, [code]);
  const openShare = React.useCallback(() => {
    const url = makeShareUrl();
    setShareUrl(url);
    setShareOpen(true);
  }, [makeShareUrl]);
  const copyShare = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Copied");
    } catch {
      toast.error("Không thể copy tự động.");
    }
  }, [shareUrl]);

  // Theme toggle (ẩn icon cho tới khi mounted để tránh hydration mismatch)
  const toggleTheme = React.useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const onClear = () => {
    setOutput("");
    killWorker();
    setWaitingInput(false); // Reset trạng thái chờ input
    setIsRunning(false); // Reset trạng thái chạy
    hasShownWelcomeRef.current = false;

    // Force reset terminal để xóa tất cả bao gồm cả prompt đang chờ
    setTimeout(() => {
      termRef.current?.forceReset();
      termRef.current?.focus();
    }, 50);
  };
  const onCopyOut = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied output");
    } catch {
      toast.error("Không thể copy tự động.");
    }
  };

  // (CHỈNH) Pre‑warm Pyodide: chỉ khi editorReady === true
  React.useEffect(() => {
    if (!editorReady) return;

    let canceled = false;
    const warm = () => {
      if (canceled) return;
      if (!workerRef.current) {
        const w = spawnWorker(false); // false = không phải chạy code, chỉ pre-warm
        w.postMessage({ type: "ping" });
      }
    };

    // @ts-expect-error requestIdleCallback có thể không có types
    const id = window.requestIdleCallback
      // ưu tiên chạy khi rảnh để không tranh băng thông với monaco
      ? (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(warm, { timeout: 3000 })
      : setTimeout(warm, 500);

    return () => {
      canceled = true;
      // @ts-expect-error cancelIdleCallback có thể không có types
      if (window.cancelIdleCallback) (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [editorReady, spawnWorker]);

  // Handle resize functionality - Optimized for smooth performance
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const container = resizeRef.current?.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame for smooth 60fps updates
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const clampedWidth = Math.min(Math.max(newLeftWidth, 20), 80); // Wider range for better UX
        setLeftWidth(clampedWidth);
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Responsive breakpoint
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Font size controls
  const increaseFontSize = React.useCallback(() => {
    const currentIndex = FONT_SIZES.indexOf(fontSize as typeof FONT_SIZES[number]);
    if (currentIndex < FONT_SIZES.length - 1) {
      setFontSize(FONT_SIZES[currentIndex + 1]);
    }
  }, [fontSize]);

  const decreaseFontSize = React.useCallback(() => {
    const currentIndex = FONT_SIZES.indexOf(fontSize as typeof FONT_SIZES[number]);
    if (currentIndex > 0) {
      setFontSize(FONT_SIZES[currentIndex - 1]);
    }
  }, [fontSize]);

  const resetFontSize = React.useCallback(() => {
    setFontSize(DEFAULT_FONT_SIZE);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <div className="flex items-center gap-3">
            <PythonLogo size={24} className="flex-shrink-0" />
            <div className="text-lg font-semibold tracking-tight text-foreground">Python IDE</div>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="ml-auto flex items-center gap-2">
            {/* Nhóm hành động phiên làm việc - Run/Stop */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="run-btn"
                    size="sm"
                    className="premium-button bg-emerald-600 hover:bg-emerald-700 text-white font-medium premium-transition-colors press-effect disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onRun}
                    disabled={isRunning}
                  >
                    <Play className="size-4" />
                    <span className="ml-2">{isRunning ? 'Running...' : 'Run'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRunning ? 'Code is currently running' : 'Run Python code (Ctrl+Enter)'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="stop-btn"
                    size="sm"
                    variant="ghost"
                    className="premium-button text-destructive premium-transition-opacity opacity-70 hover:opacity-100 press-effect disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={onStop}
                    disabled={!isRunning}
                  >
                    <Square className="size-4" />
                    <span className="hidden sm:inline ml-2">Stop</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRunning ? 'Stop execution (Escape)' : 'No code running'}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Separator giữa nhóm hành động chính và phụ */}
            <div className="h-6 w-px bg-border" />

            {/* Nhóm hành động meta - Theme/Share với độ nổi bật thấp hơn */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="premium-button premium-transition-opacity opacity-60 hover:opacity-90 press-effect"
                    onClick={toggleTheme}
                  >
                    {mounted ? (resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />) : null}
                    <span className="hidden md:inline ml-2">Theme</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="premium-button premium-transition-opacity opacity-60 hover:opacity-90 press-effect"
                    onClick={openShare}
                  >
                    <Share2 className="size-4" />
                    <span className="hidden md:inline ml-2">Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share code via URL</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        <div className={`flex h-full ${isMobile ? 'flex-col' : 'flex-col'} ${isResizing ? 'select-none' : ''}`}>
          {/* Top Header Row - Shared between Editor and Console */}
          {!isMobile && (
            <div className="flex h-12 border-b border-border bg-muted/20">
              {/* Editor Header */}
              <div
                className="flex items-center justify-between border-r border-border bg-muted/30 px-6 py-3 premium-transition-all"
                style={{ width: `${leftWidth}%` }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-foreground">Code Editor</div>
                  <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">Python</div>
                </div>
                <div className="flex items-center gap-3 premium-transition-transform">
                  <AutoSaveIndicator status={saveStatus} />
                </div>
              </div>

              {/* Font Size Control - Expandable from Center */}
              <div className="group relative flex items-center justify-center bg-border/30 premium-transition-all duration-300 hover:w-32"
                   style={{ width: '1px' }}>
                {/* Collapsed State - Just Font Size Display */}
                <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 premium-transition-opacity duration-300">
                  <div className="bg-background/90 border border-border/60 rounded px-2 py-1 text-xs font-mono text-muted-foreground shadow-sm">
                    {fontSize}
                  </div>
                </div>

                {/* Expanded State - Full Controls */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 premium-transition-opacity duration-300 delay-150">
                  <div className="bg-background/95 backdrop-blur-sm border border-border/60 rounded-lg shadow-lg flex items-center gap-1 py-1.5 px-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={decreaseFontSize}
                          disabled={FONT_SIZES.indexOf(fontSize as typeof FONT_SIZES[number]) <= 0}
                          className="flex items-center justify-center w-5 h-5 rounded premium-transition-all hover:bg-muted/80 active:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground press-effect"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Decrease font size</p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-mono text-muted-foreground px-1">
                      {fontSize}
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={increaseFontSize}
                          disabled={FONT_SIZES.indexOf(fontSize as typeof FONT_SIZES[number]) >= FONT_SIZES.length - 1}
                          className="flex items-center justify-center w-5 h-5 rounded premium-transition-all hover:bg-muted/80 active:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground press-effect"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Increase font size</p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="w-px h-3 bg-border/60 mx-0.5" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={resetFontSize}
                          disabled={fontSize === DEFAULT_FONT_SIZE}
                          className="flex items-center justify-center w-5 h-5 rounded premium-transition-all hover:bg-muted/80 active:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-foreground/70 hover:text-foreground press-effect"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset to default ({DEFAULT_FONT_SIZE}px)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Console Header */}
              <div
                className="flex items-center justify-between bg-muted/30 px-6 py-3 premium-transition-all"
                style={{ width: `${100 - leftWidth}%` }}
              >
                <div className="flex items-center gap-4 premium-transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-foreground">Console</div>
                    <div className={`status-indicator ${
                      waitingInput ? 'waiting' : isRunning ? 'running' : 'ready'
                    }`}>
                      {waitingInput ? 'Waiting for input' : isRunning ? 'Running' : 'Ready'}
                    </div>
                  </div>
                  <ExecutionTime
                    startTime={executionStartTime}
                    endTime={executionEndTime}
                    isRunning={isRunning}
                  />
                </div>
                <div className="flex gap-2 premium-transition-transform">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="premium-button premium-transition-opacity opacity-70 hover:opacity-100 press-effect"
                        onClick={onCopyOut}
                        disabled={!output.trim()}
                      >
                        <Copy className="size-3 mr-2" />
                        Copy
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{output.trim() ? 'Copy console output' : 'No output to copy'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="premium-button premium-transition-opacity opacity-70 hover:opacity-100 press-effect disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={onClear}
                        disabled={!output.trim() && !isRunning}
                      >
                        Clear
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{output.trim() || isRunning ? 'Clear console and stop execution' : 'Console is already empty'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}          {/* Bottom Content Row - Editor and Console */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} flex-1 min-h-0`}>
            {/* Editor */}
            <div
              className={`${isMobile ? 'h-1/2' : 'h-full'} overflow-hidden ${!isResizing ? 'premium-transition' : ''}`}
              style={!isMobile ? { width: `${leftWidth}%` } : {}}
            >
              <Card className="h-full border-0 border-r rounded-none shadow-none bg-card py-0">
                <div className="flex h-full min-h-0 flex-col">
                  {/* Mobile Editor Header */}
                  {isMobile && (
                    <div className="border-b border-border bg-muted/30 px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-foreground">Code Editor</div>
                        <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">Python</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <AutoSaveIndicator status={saveStatus} />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      value={code}
                      onChange={setCode}
                      colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
                      onReady={() => setEditorReady(true)}
                      fontSize={fontSize}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Resize Handle - Shortened to not overlap with top header */}
            {!isMobile && (
              <div
                ref={resizeRef}
                className={`group relative flex w-1 cursor-col-resize items-center justify-center premium-transition-opacity bg-border/50 hover:bg-border ${
                  isResizing ? 'bg-primary/20' : ''
                }`}
                onMouseDown={handleMouseDown}
              >
                {/* Visual indicator */}
                <div className={`absolute inset-y-1/2 -translate-y-1/2 w-4 h-8 bg-background border border-border rounded-md shadow-sm flex items-center justify-center premium-transition-opacity ${
                  isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>

                {/* Extended hover area */}
                <div className="absolute inset-y-0 -left-2 -right-2" />
              </div>
            )}

            {/* Console */}
            <div
              className={`${isMobile ? 'h-1/2' : 'h-full'} overflow-hidden ${!isResizing ? 'premium-transition' : ''}`}
              style={!isMobile ? { width: `${100 - leftWidth}%` } : {}}
            >
              <Card className="h-full border-0 rounded-none shadow-none bg-card py-0">
                <div className="flex h-full min-h-0 flex-col">
                  {/* Mobile Console Header */}
                  {isMobile && (
                    <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-foreground">Console</div>
                          <div className={`status-indicator ${
                            waitingInput ? 'waiting' : isRunning ? 'running' : 'ready'
                          }`}>
                            {waitingInput ? 'Waiting for input' : isRunning ? 'Running' : 'Ready'}
                          </div>
                        </div>
                        <ExecutionTime
                          startTime={executionStartTime}
                          endTime={executionEndTime}
                          isRunning={isRunning}
                        />
                      </div>
                      <div className="flex gap-2">
                        {/* Font Size Controls for Mobile */}
                        <div className="flex items-center gap-1 mr-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={decreaseFontSize}
                            disabled={FONT_SIZES.indexOf(fontSize as typeof FONT_SIZES[number]) <= 0}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <div className="text-xs font-mono text-muted-foreground min-w-[1.5rem] text-center">
                            {fontSize}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={increaseFontSize}
                            disabled={FONT_SIZES.indexOf(fontSize as typeof FONT_SIZES[number]) >= FONT_SIZES.length - 1}
                          >
                            <Plus className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={resetFontSize}
                            disabled={fontSize === DEFAULT_FONT_SIZE}
                          >
                            <RotateCcw className="size-3" />
                          </Button>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <Button variant="ghost" size="sm" onClick={onCopyOut} disabled={!output.trim()}>
                          <Copy className="size-3 mr-2" />
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClear} disabled={!output.trim() && !isRunning}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Console Content */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TermConsole
                      ref={termRef}
                      waitingInput={waitingInput}
                      onSubmitLine={(line) => {
                        sendInputLine(line);
                      }}
                      onCtrlC={() => onStop()}
                      theme={resolvedTheme === "dark" ? "dark" : "light"}
                      fontSize={fontSize}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chia sẻ code qua URL</DialogTitle>
            <DialogDescription>
              Link chứa code đã nén trong <code>#code</code>. Sao chép và gửi cho người khác.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <Button variant="secondary" size="sm" onClick={copyShare} className="gap-2">
              <Copy className="size-4" />
              Copy
            </Button>
          </div>
          <DialogFooter>
            <p className="text-[11px] text-muted-foreground">
              Lưu ý: nên giữ URL ngắn (&lt;≈2000 ký tự) để tương thích tốt giữa các trình duyệt.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
