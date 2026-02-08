import { getExercise } from "../exercises";
import { TerminalResponse } from "../exercises/types";

export function executeCommand(
  exerciseId: string,
  command: string,
  currentCode: string
): TerminalResponse {
  const exercise = getExercise(exerciseId);
  if (!exercise) {
    return {
      output: `Error: exercise "${exerciseId}" not found`,
      exitCode: 1,
    };
  }

  const trimmedCommand = command.trim();

  // Check for exact match first
  if (exercise.terminalCommands[trimmedCommand]) {
    return exercise.terminalCommands[trimmedCommand](currentCode);
  }

  // Check for command prefix match (e.g., "kubectl logs <pod-name>" matches "kubectl logs")
  for (const [pattern, handler] of Object.entries(exercise.terminalCommands)) {
    if (trimmedCommand.startsWith(pattern) || pattern.startsWith(trimmedCommand)) {
      return handler(currentCode);
    }
  }

  // Built-in commands
  if (trimmedCommand === "help" || trimmedCommand === "?") {
    const availableCommands = Object.keys(exercise.terminalCommands);
    return {
      output: `Comandos disponibles para este ejercicio:\n${availableCommands.map((c) => `  ${c}`).join("\n")}\n\nTambién: help, clear`,
      exitCode: 0,
    };
  }

  if (trimmedCommand === "clear") {
    return {
      output: "\x1b[2J\x1b[H",
      exitCode: 0,
    };
  }

  if (trimmedCommand === "") {
    return { output: "", exitCode: 0 };
  }

  return {
    output: `bash: ${trimmedCommand.split(" ")[0]}: command not found\n\nEscribe "help" para ver los comandos disponibles.`,
    exitCode: 127,
  };
}
