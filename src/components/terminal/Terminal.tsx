"use client";

import { useEffect, useRef, useCallback } from "react";
import "@xterm/xterm/css/xterm.css";
import { useT } from "@/lib/i18n/context";

interface TerminalProps {
  exerciseId: string;
  codeRef: React.MutableRefObject<string>;
}

export default function Terminal({ exerciseId, codeRef }: TerminalProps) {
  const { lang, t } = useT();
  const langRef = useRef(lang);
  const tRef = useRef(t);
  langRef.current = lang;
  tRef.current = t;
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const inputBuffer = useRef("");
  const cleanupRef = useRef<(() => void) | null>(null);

  const writePrompt = useCallback(() => {
    xtermRef.current?.write("\r\n\x1b[32m$ \x1b[0m");
  }, []);

  const executeCommandInTerminal = useCallback(
    async (command: string) => {
      try {
        const res = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId,
            command,
            code: codeRef.current,
            lang: langRef.current,
          }),
        });
        const data = await res.json();

        const lines = data.output.split("\n");
        for (const line of lines) {
          xtermRef.current?.writeln(line);
        }
      } catch (_e) {
        xtermRef.current?.writeln(
          `\x1b[31m${tRef.current.terminal.executionError}\x1b[0m`
        );
      }
      writePrompt();
    },
    [exerciseId, codeRef, writePrompt]
  );

  useEffect(() => {
    if (!terminalRef.current) return;

    let disposed = false;

    const initTerminal = async () => {
      const { Terminal: XTerminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed) return;

      const term = new XTerminal({
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        theme: {
          background: "#0a0a0a",
          foreground: "#ededed",
          cursor: "#ededed",
          selectionBackground: "#3b82f680",
          black: "#0a0a0a",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#f59e0b",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#ededed",
        },
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 1000,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(terminalRef.current!);

      // Small delay to ensure DOM is ready before fitting
      requestAnimationFrame(() => {
        if (disposed) return;
        fitAddon.fit();
      });

      xtermRef.current = term;

      term.writeln(`\x1b[1;36m${t.terminal.title}\x1b[0m`);
      term.writeln(t.terminal.helpPrompt);
      term.write("\r\n\x1b[32m$ \x1b[0m");

      // Focus the terminal so keyboard input works
      term.focus();

      term.onData((data) => {
        if (!xtermRef.current) return;

        if (data === "\r" || data === "\n") {
          const command = inputBuffer.current.trim();
          inputBuffer.current = "";
          xtermRef.current.write("\r\n");

          if (command === "clear") {
            xtermRef.current.clear();
            xtermRef.current.write("\x1b[32m$ \x1b[0m");
            return;
          }

          if (command) {
            executeCommandInTerminal(command);
          } else {
            xtermRef.current.write("\x1b[32m$ \x1b[0m");
          }
        } else if (data === "\x7f") {
          // Backspace
          if (inputBuffer.current.length > 0) {
            inputBuffer.current = inputBuffer.current.slice(0, -1);
            xtermRef.current.write("\b \b");
          }
        } else if (data === "\x03") {
          // Ctrl+C
          inputBuffer.current = "";
          xtermRef.current.write("^C\r\n\x1b[32m$ \x1b[0m");
        } else if (data >= " ") {
          inputBuffer.current += data;
          xtermRef.current.write(data);
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        if (!disposed) {
          try {
            fitAddon.fit();
          } catch (_e) {
            // ignore resize errors on unmount
          }
        }
      });
      resizeObserver.observe(terminalRef.current!);

      cleanupRef.current = () => {
        resizeObserver.disconnect();
        term.dispose();
      };
    };

    initTerminal();

    return () => {
      disposed = true;
      xtermRef.current = null;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [exerciseId, executeCommandInTerminal]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full rounded-lg border border-[var(--border)] overflow-hidden bg-[#0a0a0a]"
      onClick={() => xtermRef.current?.focus()}
    />
  );
}
