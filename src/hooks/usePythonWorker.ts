import * as React from 'react';

export type WorkerOut =
  | { type: 'ready' }
  | { type: 'awaiting_input' }
  | { type: 'got_input' }
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'result'; ok: true }
  | { type: 'result'; ok: false; error: string };

export interface PythonWorkerOptions {
  onResult?: (ok: boolean, error?: string) => void;
}

export function usePythonWorker(onOutput?: (s: string) => void, opts: PythonWorkerOptions = {}) {
  const { onResult } = opts;
  const [output, setOutput] = React.useState('');
  const [isRunning, setIsRunning] = React.useState(false);
  const [waitingInput, setWaitingInput] = React.useState(false);

  const workerRef = React.useRef<Worker | null>(null);
  const sabInputRef = React.useRef<SharedArrayBuffer | null>(null);
  const lenViewRef = React.useRef<Int32Array | null>(null);
  const bytesRef = React.useRef<Uint8Array | null>(null);
  const sabInterruptRef = React.useRef<SharedArrayBuffer | null>(null);
  const i8InterruptRef = React.useRef<Uint8Array | null>(null);
  const encoder = React.useMemo(() => new TextEncoder(), []);

  const append = React.useCallback(
    (s: string) => {
      setOutput(prev => (prev ? prev + s : s));
      onOutput?.(s);
    },
    [onOutput]
  );

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
    killWorker();
    setupSharedBuffers();
    const w = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url), {
      type: 'classic',
      name: 'pyodide-worker'
    });

    w.onmessage = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data;
      switch (msg.type) {
        case 'ready':
          if (isForRunning) {
            append('Running...\n');
          }
          break;
        case 'awaiting_input':
          setWaitingInput(true);
          break;
        case 'got_input':
          setWaitingInput(false);
          break;
        case 'stdout':
          append(msg.data);
          break;
        case 'stderr':
          append(msg.data);
          break;
        case 'result':
          append(msg.ok ? '\nExecution completed\n' : `\nError: ${msg.error}\n`);
          setWaitingInput(false);
          setIsRunning(false);
          onResult?.(msg.ok, msg.ok ? undefined : msg.error);
          break;
      }
    };
    w.onerror = (e) => append(`[worker error] ${e.message}\n`);

    if (sabInputRef.current && sabInterruptRef.current) {
      w.postMessage({
        type: 'init',
        baseUrl: window.location.origin,
        inputSAB: sabInputRef.current as SharedArrayBuffer,
        interruptSAB: sabInterruptRef.current as SharedArrayBuffer
      });
    }

    workerRef.current = w;
    return w;
  }, [append, setupSharedBuffers, killWorker, onResult]);

  const sendInput = React.useCallback((line: string) => {
    const lenView = lenViewRef.current;
    const bytes = bytesRef.current;
    if (!workerRef.current || !lenView || !bytes) return;
    const encoded = encoder.encode(line.endsWith('\n') ? line : line + '\n');
    if (encoded.length > bytes.length) {
      append(`[error] Input line too long (${encoded.length} > ${bytes.length})\n`);
      return;
    }
    bytes.fill(0);
    bytes.set(encoded, 0);
    Atomics.store(lenView, 0, encoded.length);
    Atomics.notify(lenView, 0, 1);
  }, [append, encoder]);

  const run = React.useCallback(
    (code: string) => {
      setOutput('');
      killWorker();
      setIsRunning(true);
      const w = spawnWorker(true);
      w.postMessage({ type: 'run', code });
    },
    [killWorker, spawnWorker, setOutput]
  );

  const stop = React.useCallback(() => {
    const i8 = i8InterruptRef.current;
    if (i8 && workerRef.current) {
      i8[0] = 2;
      append('^C\n');
      setIsRunning(false);
      setTimeout(() => {
        if (workerRef.current) {
          append('[force stop]\n');
          killWorker();
        }
      }, 400);
    }
  }, [append, killWorker]);

  return { output, setOutput, isRunning, waitingInput, run, stop, sendInput };
}
