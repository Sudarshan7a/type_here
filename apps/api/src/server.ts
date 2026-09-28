import { buildApp } from "./index.js";

const port = Number(process.env.PORT ?? 3000);

const app = await buildApp();

try {
  const address = await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`RealType API listening at ${address}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
