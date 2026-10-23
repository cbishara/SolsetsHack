import { defineRailway, github, postgres, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-west2" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const hermesVolume = volume("hermes-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 5000 });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 5000 });
  const hermes = service("hermes", {
    source: github("cbishara/SolsetsHack", { branch: "codex/railway-deploy", rootDirectory: "/deploy/hermes", checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    replicas: { "us-west2": 1 },
    deploy: { restartPolicyMaxRetries: 3, startCommand: null },
    volumeMounts: { "/opt/data": hermesVolume },
  });
  const backend = service("backend", {
    source: github("cbishara/SolsetsHack", { branch: "codex/railway-deploy", checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    deploy: { healthcheckPath: "/api/health", healthcheckTimeout: 120, restartPolicyMaxRetries: 3, overlapSeconds: 0 },
    replicas: { "us-west2": 1 },
  });

  return project("solsets-hack", {
    variables: { managed: false },
    resources: [hermes, backend, Postgres, hermesVolume, postgresVolume],
  });
});
