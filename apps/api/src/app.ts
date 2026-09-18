import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyError } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "./env";
import { orderRoutes } from "./routes/orders";
import { productRoutes } from "./routes/products";

export const buildApp = async () => {
  // Quiet under vitest; request logs would bury the assertions.
  const app = Fastify({ logger: env.NODE_ENV !== "test" }).withTypeProvider<ZodTypeProvider>();

  /*
    These two are what make the Zod schemas in @repo/shared do triple duty: the
    validator compiler parses requests with them, the serializer compiler checks
    responses against them, and jsonSchemaTransform below turns the same objects
    into the OpenAPI document. One definition, three jobs, no codegen step.
  */
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({
        error: "validation_error",
        message: error.validation
          .map((issue) => `${issue.instancePath || "body"} ${issue.message}`.trim())
          .join("; "),
      });
    }

    // Fastify types this parameter as unknown once a type provider is installed.
    // Everything reaching here is an Error it built or one a route threw.
    const err = error as FastifyError;

    // A thrown 4xx is a deliberate client-facing message and is safe to pass on.
    if (err.statusCode && err.statusCode < 500) {
      return reply.code(err.statusCode).send({ error: "request_error", message: err.message });
    }

    // Anything else is ours. Log the real error, return a generic one: driver
    // messages quote SQL and connection strings, which is not something to hand
    // to a caller.
    request.log.error({ err: error }, "unhandled error");
    return reply.code(500).send({ error: "internal_error", message: "Something went wrong." });
  });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    // Sessions ride in a cookie, so the browser will not send them cross-origin
    // without this — and an allow-list origin is required: "*" and credentials
    // are mutually exclusive by spec.
    credentials: true,
  });

  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "catalyst-commerce API",
        version: "0.1.0",
        description:
          "Every schema in this document is generated from the same Zod objects that validate the requests at runtime, so the two cannot drift.",
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      tags: [
        { name: "catalog", description: "Public storefront reads" },
        { name: "orders", description: "Checkout and order lookup" },
      ],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", { schema: { hide: true } }, async () => ({ ok: true }));

  await app.register(productRoutes);
  await app.register(orderRoutes);

  return app;
};
