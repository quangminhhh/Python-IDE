"use client";

import * as React from "react";

export type TermConsoleHandle = {
  write: (s: string) => void;
  clear: () => void;
  focus: () => void;
  forceReset: () => void; // Thêm method để reset hoàn toàn
};

type Props = {
  waitingInput: boolean;
  onSubmitLine: (line: string) => void; // không kèm \n
  onCtrlC?: () => void;
  theme?: "light" | "dark";
};

export const TermConsole = React.forwardRef<TermConsoleHandle, Props>(
  ({ waitingInput, onSubmitLine, onCtrlC, theme = "light" }, ref) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const termRef = React.useRef<any | null>(null);
    const fitRef = React.useRef<any | null>(null);
    const initialized = React.useRef(false);
    const lineBufRef = React.useRef<string>("");

    // --- giữ callback & state mới nhất qua ref (tránh rebind onData) ---
    const onSubmitRef = React.useRef(onSubmitLine);
    React.useEffect(() => { onSubmitRef.current = onSubmitLine; }, [onSubmitLine]);

    const onCtrlCRef = React.useRef(onCtrlC);
    React.useEffect(() => { onCtrlCRef.current = onCtrlC; }, [onCtrlC]);

    const waitingRef = React.useRef(waitingInput);
    React.useEffect(() => { waitingRef.current = waitingInput; }, [waitingInput]);

    const applyTheme = React.useCallback((term: any, mode: "light" | "dark") => {
      const themeObj =
        mode === "dark"
          ? {
              background: "#0d1117",
              foreground: "#e6edf3",
              cursor: "#7c3aed",
              cursorAccent: "#ffffff",
              selectionBackground: "#264f78"
            }
          : {
              background: "#ffffff",
              foreground: "#24292f",
              cursor: "#0969da",
              cursorAccent: "#ffffff",
              selectionBackground: "#0969da20"
            };
      if (term?.options) {
        term.options.theme = themeObj;
        // Luôn hiển thị cursor
        term.options.cursorBlink = true;
        term.options.cursorStyle = 'bar';
      }
    }, []);

    React.useEffect(() => {
      if (initialized.current) return;
      initialized.current = true;

      let term: any;
      let fit: any;
      let disposeOnData: any;

      (async () => {
        if (typeof window === "undefined") return;

        await import("@xterm/xterm/css/xterm.css" as any);
        const { Terminal } = await import("@xterm/xterm");
        const { FitAddon } = await import("@xterm/addon-fit");
        const { ClipboardAddon } = await import("@xterm/addon-clipboard");

        term = new Terminal({
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontSize: 15.5, // Tăng từ 13 lên 14
          cursorBlink: true,
          cursorStyle: 'bar', // Con trỏ hình chữ I
          convertEol: false,
          scrollback: 5000,
        });
        fit = new FitAddon();
        const clip = new ClipboardAddon();
        term.loadAddon(fit);
        term.loadAddon(clip);
        applyTheme(term, theme);

        const el = containerRef.current!;
        // đợi layout ổn định trước khi open+fit
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

        term.open(el);
        fit.fit();
        term.focus();

        // Hiển thị prompt mặc định để thấy cursor
        term.write(">>> ");

        // Nhấn vào vùng container sẽ focus terminal (đề phòng)
        el.addEventListener("mousedown", () => term.focus());

        // Bắt phím người dùng
        disposeOnData = term.onData((data: string) => {
          // Ctrl+C
          if (data === "\x03") {
            onCtrlCRef.current?.();
            return;
          }
          // Chỉ echo/nhận khi đang chờ input() từ Python
          if (!waitingRef.current) return;

          for (let i = 0; i < data.length; i++) {
            const ch = data[i];

            if (ch === "\r" || ch === "\n") {
              term.write("\r\n");
              const line = lineBufRef.current;
              lineBufRef.current = "";
              onSubmitRef.current?.(line);
              continue;
            }
            if (ch === "\x7F" || ch === "\b") {
              if (lineBufRef.current.length > 0) {
                term.write("\b \b");
                lineBufRef.current = lineBufRef.current.slice(0, -1);
              }
              continue;
            }
            if (ch >= " " || ch === "\t") {
              term.write(ch);
              lineBufRef.current += ch;
            }
          }
        });

        termRef.current = term;
        fitRef.current = fit;

        const onResize = () => { try { fit.fit(); } catch {} };
        window.addEventListener("resize", onResize);
        (term as any)._onResizeCleanup = onResize;
      })();

      return () => {
        if (termRef.current) {
          try { window.removeEventListener("resize", (termRef.current as any)._onResizeCleanup); } catch {}
          try { termRef.current.dispose(); } catch {}
        }
        termRef.current = null;
        fitRef.current = null;
        lineBufRef.current = "";
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Đổi theme động
    React.useEffect(() => {
      if (termRef.current) applyTheme(termRef.current, theme);
    }, [theme, applyTheme]);

    // Khi chuyển sang trạng thái chờ input() -> đảm bảo focus để thấy con trỏ
    React.useEffect(() => {
      if (waitingInput) termRef.current?.focus();
    }, [waitingInput]);

    React.useImperativeHandle(ref, () => ({
      write(s: string) {
        const norm = s.replace(/\r?\n/g, "\r\n");
        termRef.current?.write(norm);
      },
      clear() {
        termRef.current?.clear();
        lineBufRef.current = "";
        // Hiển thị lại prompt để thấy cursor
        termRef.current?.write(">>> ");
      },
      focus() {
        termRef.current?.focus();
      },
      forceReset() {
        // Reset hoàn toàn terminal - xóa tất cả và reset cursor
        if (termRef.current) {
          termRef.current.reset();
          termRef.current.clear();
          lineBufRef.current = "";
          // Hiển thị lại prompt để thấy cursor
          termRef.current.write(">>> ");
        }
      },
    }));

    return (
      <div className="h-full w-full overflow-hidden">
        <div ref={containerRef} className="h-full w-full" />
        <style jsx global>{`
          .xterm .xterm-cursor {
            opacity: 1 !important;
            background-color: currentColor !important;
            border: none !important;
            width: 2px !important;
          }

          .xterm .xterm-cursor.xterm-cursor-blink {
            animation: xtermBlink 1.0s ease-in-out infinite;
          }

          .xterm:not(.focus) .xterm-cursor {
            opacity: 0.4 !important;
            animation: none;
          }

          .xterm.focus .xterm-cursor {
            opacity: 1 !important;
            animation: xtermBlink 1.0s ease-in-out infinite;
          }

          .xterm .xterm-selection div {
            background-color: rgba(9, 105, 218, 0.2) !important;
          }

          .xterm-screen {
            font-feature-settings: "liga" 0;
            font-variant-ligatures: none;
          }

          /* Ensure terminal fills container */
          .xterm {
            height: 100% !important;
            width: 100% !important;
          }

          .xterm .xterm-screen {
            height: 100% !important;
          }

          .xterm .xterm-viewport {
            height: 100% !important;
            overflow-y: auto !important;
            scrollbar-width: thin !important;
            scrollbar-color: hsl(var(--border)) transparent !important;
          }

          @keyframes xtermBlink {
            0% { opacity: 1; }
            50% { opacity: 0.2; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }
);
TermConsole.displayName = "TermConsole";
