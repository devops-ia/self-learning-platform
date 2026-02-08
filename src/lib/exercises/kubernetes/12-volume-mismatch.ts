import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parsePod(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function getContainer(parsed: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!parsed) return null;
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const containers = spec?.containers as Record<string, unknown>[] | undefined;
  return containers?.[0] ?? null;
}

function getVolumeMounts(container: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!container) return [];
  const mounts = container.volumeMounts as Record<string, unknown>[] | undefined;
  return mounts ?? [];
}

function getVolumes(parsed: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!parsed) return [];
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const volumes = spec?.volumes as Record<string, unknown>[] | undefined;
  return volumes ?? [];
}

function getVolumeNames(volumes: Record<string, unknown>[]): string[] {
  return volumes.map(function (v) { return String(v.name || ""); });
}

function getMountNames(mounts: Record<string, unknown>[]): string[] {
  return mounts.map(function (m) { return String(m.name || ""); });
}

function allMountsHaveVolumes(parsed: Record<string, unknown> | null): boolean {
  const container = getContainer(parsed);
  const mounts = getVolumeMounts(container);
  const volumes = getVolumes(parsed);
  const volumeNames = getVolumeNames(volumes);

  return mounts.every(function (mount) {
    return volumeNames.indexOf(String(mount.name)) !== -1;
  });
}

function handleApply(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed) {
    return {
      output: 'error: error validating "pod.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  const container = getContainer(parsed);
  const mounts = getVolumeMounts(container);
  const volumes = getVolumes(parsed);
  const volumeNames = getVolumeNames(volumes);

  for (let i = 0; i < mounts.length; i++) {
    const mountName = String(mounts[i].name);
    if (volumeNames.indexOf(mountName) === -1) {
      return {
        output: [
          'Error from server (Invalid): error when creating "pod.yaml": Pod "data-processor" is invalid:',
          'spec.containers[0].volumeMounts[' + i + '].name: Not found: "' + mountName + '"',
        ].join("\n"),
        exitCode: 1,
      };
    }
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "data-processor";
  return { output: "pod/" + name + " created", exitCode: 0 };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed || !allMountsHaveVolumes(parsed)) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "data-processor";
  return {
    output: [
      "NAME              READY   STATUS    RESTARTS   AGE",
      name + "   1/1     Running   0          5s",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribe(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed || !allMountsHaveVolumes(parsed)) {
    return {
      output: 'Error from server (NotFound): pods "data-processor" not found',
      exitCode: 1,
    };
  }

  const container = getContainer(parsed);
  const mounts = getVolumeMounts(container);
  const volumes = getVolumes(parsed);

  const mountLines = mounts.map(function (m) {
    return "      " + String(m.name) + ":\n        Mount Path: " + String(m.mountPath) + "\n        ReadOnly:   false";
  });

  const volumeLines = volumes.map(function (v) {
    if (v.emptyDir !== undefined) return "  " + String(v.name) + ":\n    Type:       EmptyDir";
    if (v.configMap !== undefined) return "  " + String(v.name) + ":\n    Type:       ConfigMap";
    if (v.persistentVolumeClaim !== undefined) return "  " + String(v.name) + ":\n    Type:       PersistentVolumeClaim";
    return "  " + String(v.name) + ":\n    Type:       EmptyDir";
  });

  return {
    output: [
      "Name:         data-processor",
      "Namespace:    default",
      "Status:       Running",
      "Containers:",
      "  processor:",
      "    Image:          " + (container?.image || "python:3.12-slim"),
      "    Port:           <none>",
      "    Mounts:",
    ].concat(mountLines).concat([
      "Volumes:",
    ]).concat(volumeLines).concat([
      "Events:",
      "  Type    Reason     Age   From               Message",
      "  ----    ------     ----  ----               -------",
      "  Normal  Scheduled  10s   default-scheduler  Successfully assigned default/data-processor",
      "  Normal  Pulled     9s    kubelet            Container image already present",
      "  Normal  Created    9s    kubelet            Created container processor",
      "  Normal  Started    8s    kubelet            Started container processor",
    ]).join("\n"),
    exitCode: 0,
  };
}

function validateYaml(code: string) {
  try {
    yaml.load(code);
    return { passed: true };
  } catch (e) {
    return {
      passed: false,
      errorMessage: [
        "Error: YAML parse error",
        "",
        e instanceof Error ? e.message : "YAML invalido",
      ].join("\n"),
    };
  }
}

function validateVolumesExist(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const container = getContainer(parsed);
  const mounts = getVolumeMounts(container);
  const volumes = getVolumes(parsed);

  if (mounts.length > 0 && volumes.length === 0) {
    return {
      passed: false,
      errorMessage: [
        "Error: spec.volumes no esta definido",
        "",
        "El container tiene volumeMounts pero el Pod no tiene ningun volumen definido en spec.volumes. Necesitas definir cada volumen que los containers montan.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateMountsMatchVolumes(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const container = getContainer(parsed);
  const mounts = getVolumeMounts(container);
  const volumes = getVolumes(parsed);
  const volumeNames = getVolumeNames(volumes);

  for (let i = 0; i < mounts.length; i++) {
    const mountName = String(mounts[i].name);
    if (volumeNames.indexOf(mountName) === -1) {
      return {
        passed: false,
        errorMessage: [
          'Error: volumeMount "' + mountName + '" no tiene un volumen correspondiente',
          "",
          "Cada volumeMount en un container debe tener un volumen con el mismo nombre definido en spec.volumes. El nombre del volumeMount y el del volumen deben coincidir exactamente.",
        ].join("\n"),
      };
    }
  }
  return { passed: true };
}

function validateVolumesHaveType(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const volumes = getVolumes(parsed);

  for (let i = 0; i < volumes.length; i++) {
    const vol = volumes[i];
    const hasType = vol.emptyDir !== undefined ||
      vol.configMap !== undefined ||
      vol.secret !== undefined ||
      vol.persistentVolumeClaim !== undefined ||
      vol.hostPath !== undefined;
    if (!hasType) {
      return {
        passed: false,
        errorMessage: [
          'Warning: volumen "' + String(vol.name) + '" no tiene un tipo definido',
          "",
          "Cada volumen necesita un tipo. Los mas comunes son:",
          "- emptyDir: {} — directorio temporal que se borra al morir el Pod",
          "- configMap — monta un ConfigMap como archivos",
          "- secret — monta un Secret como archivos",
          "- persistentVolumeClaim — usa un PVC para almacenamiento persistente",
        ].join("\n"),
      };
    }
  }
  return { passed: true };
}

export const volumeMismatch: Exercise = {
  id: "k8s-12-volume-mismatch",
  module: "kubernetes",
  title: "Volume no definido",
  briefing:
    "El container monta un volumen que no esta definido en la especificacion del Pod. Anade la definicion del volumen que falta.",
  language: "yaml",
  initialCode: [
    "apiVersion: v1",
    "kind: Pod",
    "metadata:",
    "  name: data-processor",
    "  labels:",
    "    app: processor",
    "spec:",
    "  containers:",
    "    - name: processor",
    "      image: python:3.12-slim",
    '      command: ["python", "process.py"]',
    "      volumeMounts:",
    "        - name: data",
    "          mountPath: /app/data",
    "",
  ].join("\n"),
  terminalCommands: {
    "kubectl apply -f pod.yaml": handleApply,
    "kubectl get pods": handleGetPods,
    "kubectl describe pod data-processor": handleDescribe,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "Falta la seccion spec.volumes en el Pod.",
      check: validateVolumesExist,
    },
    {
      type: "intention",
      errorMessage: "El nombre del volumen debe coincidir con el volumeMount.",
      check: validateMountsMatchVolumes,
    },
  ],
  prerequisites: ["k8s-11-rbac-no-verbs"],
  hints: [
    'El error dice que el volumeMount "data" no tiene un volumen correspondiente. Necesitas definir un volumen con el mismo nombre en spec.volumes.',
    "spec.volumes se define al mismo nivel que containers, dentro de spec. Cada volumen necesita un nombre y un tipo (por ejemplo emptyDir para un directorio temporal).",
    'Solucion: anade esto al final del spec, al mismo nivel que containers:\n  volumes:\n    - name: data\n      emptyDir: {}',
  ],
  successMessage: [
    "¡Excelente! El Pod ahora tiene el volumen correctamente definido.",
    "",
    "Lo que aprendiste:",
    "- Cada volumeMount debe tener un volumen correspondiente en spec.volumes",
    "- El nombre del volumeMount y el volumen deben coincidir exactamente",
    "- spec.volumes define el almacenamiento; volumeMounts define donde se monta en el container",
    "- emptyDir: {} crea un directorio temporal que vive mientras el Pod exista",
    "- Un Pod puede tener multiples volumenes compartidos entre sus containers (sidecar pattern)",
    "- Para persistencia mas alla de la vida del Pod, usa PersistentVolumeClaim",
  ].join("\n"),
};
