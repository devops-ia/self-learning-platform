import { Exercise } from "./types";
import { brokenProvider } from "./terraform/01-broken-provider";
import { variablesOutputs } from "./terraform/02-variables-outputs";
import { missingTerraformBlock } from "./terraform/03-missing-terraform-block";
import { brokenBackend } from "./terraform/04-broken-backend";
import { variableNoType } from "./terraform/05-variable-no-type";
import { brokenOutput } from "./terraform/06-broken-output";
import { noProvider } from "./terraform/07-no-provider";
import { invalidCount } from "./terraform/08-invalid-count";
import { brokenForeach } from "./terraform/09-broken-foreach";
import { missingDepends } from "./terraform/10-missing-depends";
import { brokenLifecycle } from "./terraform/11-broken-lifecycle";
import { localState } from "./terraform/12-local-state";
import { invalidPod } from "./kubernetes/01-invalid-pod";
import { crashloopDebug } from "./kubernetes/02-crashloop-debug";
import { missingApiversion } from "./kubernetes/03-missing-apiversion";
import { deploymentNoSelector } from "./kubernetes/04-deployment-no-selector";
import { serviceWrongPort } from "./kubernetes/05-service-wrong-port";
import { invalidImagepullpolicy } from "./kubernetes/06-invalid-imagepullpolicy";
import { configmapWrongRef } from "./kubernetes/07-configmap-wrong-ref";
import { secretPlaintext } from "./kubernetes/08-secret-plaintext";
import { wrongNamespace } from "./kubernetes/09-wrong-namespace";
import { brokenLiveness } from "./kubernetes/10-broken-liveness";
import { rbacNoVerbs } from "./kubernetes/11-rbac-no-verbs";
import { volumeMismatch } from "./kubernetes/12-volume-mismatch";

export const exercises: Record<string, Exercise> = {
  "tf-01-broken-provider": brokenProvider,
  "tf-02-variables-outputs": variablesOutputs,
  "tf-03-missing-terraform-block": missingTerraformBlock,
  "tf-04-broken-backend": brokenBackend,
  "tf-05-variable-no-type": variableNoType,
  "tf-06-broken-output": brokenOutput,
  "tf-07-no-provider": noProvider,
  "tf-08-invalid-count": invalidCount,
  "tf-09-broken-foreach": brokenForeach,
  "tf-10-missing-depends": missingDepends,
  "tf-11-broken-lifecycle": brokenLifecycle,
  "tf-12-local-state": localState,
  "k8s-01-invalid-pod": invalidPod,
  "k8s-02-crashloop-debug": crashloopDebug,
  "k8s-03-missing-apiversion": missingApiversion,
  "k8s-04-deployment-no-selector": deploymentNoSelector,
  "k8s-05-service-wrong-port": serviceWrongPort,
  "k8s-06-invalid-imagepullpolicy": invalidImagepullpolicy,
  "k8s-07-configmap-wrong-ref": configmapWrongRef,
  "k8s-08-secret-plaintext": secretPlaintext,
  "k8s-09-wrong-namespace": wrongNamespace,
  "k8s-10-broken-liveness": brokenLiveness,
  "k8s-11-rbac-no-verbs": rbacNoVerbs,
  "k8s-12-volume-mismatch": volumeMismatch,
};

export const terraformExercises = [
  brokenProvider,
  variablesOutputs,
  missingTerraformBlock,
  brokenBackend,
  variableNoType,
  brokenOutput,
  noProvider,
  invalidCount,
  brokenForeach,
  missingDepends,
  brokenLifecycle,
  localState,
];

export const kubernetesExercises = [
  invalidPod,
  crashloopDebug,
  missingApiversion,
  deploymentNoSelector,
  serviceWrongPort,
  invalidImagepullpolicy,
  configmapWrongRef,
  secretPlaintext,
  wrongNamespace,
  brokenLiveness,
  rbacNoVerbs,
  volumeMismatch,
];

export function getExercise(id: string): Exercise | undefined {
  return exercises[id];
}

export function getModuleExercises(module: "terraform" | "kubernetes"): Exercise[] {
  return module === "terraform" ? terraformExercises : kubernetesExercises;
}
