export interface ValidationResult {
  passed: boolean;
  errorMessage?: string;
  line?: number;
  details?: string;
}

export interface ValidationRule {
  type: "syntax" | "semantic" | "intention";
  check: (code: string) => ValidationResult;
  errorMessage: string;
}

export interface TerminalResponse {
  output: string;
  exitCode: number;
  delay?: number; // ms
}

export type TerminalCommandHandler = (code: string) => TerminalResponse;

export interface Exercise {
  id: string;
  module: string;
  title: string;
  briefing: string;
  initialCode: string;
  language: string;
  terminalCommands: Record<string, TerminalCommandHandler>;
  validations: ValidationRule[];
  prerequisites: string[];
  hints: string[];
  successMessage: string;
}
