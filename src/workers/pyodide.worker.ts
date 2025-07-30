/// <reference lib="webworker" />

// Classic worker: KHÔNG dùng ESM import ở top-level
declare function loadPyodide(options?: Record<string, unknown>): Promise<PyodideInterface>;

interface PyodideInterface {
  setStdout: (handler: { isatty: boolean; write: (buf: Uint8Array) => number }) => void;
  setStderr: (handler: { isatty: boolean; write: (buf: Uint8Array) => number }) => void;
  setStdin: (handler: { isatty: boolean; stdin: () => string | null }) => void;
  setInterruptBuffer: (buffer: Uint8Array) => void;
  checkInterrupt: () => void;
  loadPackagesFromImports: (code: string) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
}

type InMsg =
  | { type: "init"; baseUrl: string; inputSAB: SharedArrayBuffer; interruptSAB: SharedArrayBuffer }
  | { type: "run"; code: string }
  | { type: "ping" };

type OutMsg =
  | { type: "ready" }
  | { type: "awaiting_input" }
  | { type: "got_input" }
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "result"; ok: true }
  | { type: "result"; ok: false; error: string };

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

// Nuốt riêng unhandled rejection do KeyboardInterrupt để tránh log "Uncaught (in promise)"
self.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
  const r: unknown = ev.reason;
  const msg = (r && typeof r === 'object' && 'message' in r ? r.message : r?.toString?.()) || "";
  // Chỉ chặn lỗi KeyboardInterrupt phát sinh từ pyodide.checkInterrupt()
  if (typeof msg === "string" && msg.includes("KeyboardInterrupt")) {
    ev.preventDefault(); // ngăn runtime in lỗi ra console
  }
});

let pyodide: PyodideInterface | null = null;
let baseUrl = ""; // ví dụ "http://localhost:3000"

// Input SAB: [Int32 len | ...bytes]
let lenView: Int32Array | null = null;
let byteView: Uint8Array | null = null;

// Interrupt buffer
let interruptI8: Uint8Array | null = null;

const decoder = new TextDecoder();

async function ensurePyodide(): Promise<PyodideInterface> {
  if (!pyodide) {
    if (!baseUrl) throw new Error("Pyodide baseUrl not set. Did you send the 'init' message?");
    // => DÙNG URL TUYỆT ĐỐI, KHÔNG DÙNG '/pyodide/pyodide.js'
    ctx.importScripts(`${baseUrl}/pyodide/pyodide.js`);
    pyodide = await (self as unknown as { loadPyodide: typeof loadPyodide }).loadPyodide({
      indexURL: `${baseUrl}/pyodide/`,
    });

    // stdout/stderr hiển thị ngay lập tức
    pyodide.setStdout({
      isatty: true,
      write: (buf: Uint8Array) => {
        ctx.postMessage({ type: "stdout", data: decoder.decode(buf) } as OutMsg);
        return buf.length;
      },
    });
    pyodide.setStderr({
      isatty: true,
      write: (buf: Uint8Array) => {
        ctx.postMessage({ type: "stderr", data: decoder.decode(buf) } as OutMsg);
        return buf.length;
      },
    });

    // stdin: block chờ input từ SAB
    pyodide.setStdin({
      isatty: true,
      stdin: () => {
        if (!lenView || !byteView) return null;
        ctx.postMessage({ type: "awaiting_input" } as OutMsg);
        while (Atomics.load(lenView, 0) === 0) {
          Atomics.wait(lenView, 0, 0);
        }
        const n = Atomics.load(lenView, 0);
        const chunk = byteView.slice(0, n);
        Atomics.store(lenView, 0, 0);
        ctx.postMessage({ type: "got_input" } as OutMsg);
        return decoder.decode(chunk);
      },
    });

    // SIGINT
    if (interruptI8) {
      pyodide.setInterruptBuffer(interruptI8);
    }

    // --- interruptible sleep (JS) để Python có thể dừng khi đang "ngủ"
    const sleepBuf = new Int32Array(new SharedArrayBuffer(4));

    /**
     * Ngủ có thể bị ngắt: chia nhỏ thành lát ~50ms; mỗi lát gọi checkInterrupt().
     * @param t số giây cần ngủ (float)
     */
    (self as unknown as { interruptibleSleep: (t: number) => void }).interruptibleSleep = (t: number) => {
      const SLICE_MS = 50; // có thể giảm xuống 25ms nếu muốn nhạy hơn
      const totalMs = Math.max(0, Math.floor(t * 1000));
      const iters = Math.max(1, Math.ceil(totalMs / SLICE_MS));
      for (let i = 0; i < iters; i++) {
        Atomics.wait(sleepBuf, 0, 0, SLICE_MS);
        pyodide?.checkInterrupt(); // cho phép KeyboardInterrupt nếu đã gửi SIGINT
      }
    };
  }
  return pyodide;
}

ctx.onmessage = (async (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === "init") {
    baseUrl = msg.baseUrl; // ví dụ "http://localhost:3000"
    lenView = new Int32Array(msg.inputSAB, 0, 1);
    byteView = new Uint8Array(msg.inputSAB, 4);
    interruptI8 = new Uint8Array(msg.interruptSAB);
    if (pyodide) {
      pyodide.setInterruptBuffer(interruptI8);
    }
    ctx.postMessage({ type: "ready" } as OutMsg);
    return;
  }

  const py = await ensurePyodide();

  if (msg.type === "ping") {
    ctx.postMessage({ type: "ready" } as OutMsg);
    return;
  }

  if (msg.type === "run") {
    try {
      await py.loadPackagesFromImports(msg.code);
      await py.runPythonAsync(msg.code);
      ctx.postMessage({ type: "result", ok: true } as OutMsg);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      ctx.postMessage({ type: "result", ok: false, error: errorMessage } as OutMsg);
    }
  }
}) as unknown as (this: DedicatedWorkerGlobalScope, ev: MessageEvent<InMsg>) => any;
