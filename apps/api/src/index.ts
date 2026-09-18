import { buildApp } from "./app";
import { env } from "./env";

const app = await buildApp();

// 0.0.0.0, not the default localhost: inside a container (Railway, Docker) a
// server bound to the loopback interface is unreachable from outside it, and the
// symptom is a health check that never passes with no error in the logs.
await app.listen({ port: env.PORT, host: "0.0.0.0" });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
