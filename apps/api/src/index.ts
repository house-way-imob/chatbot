import "dotenv/config";
import Fastify from "fastify";
import sensible from "@fastify/sensible";

const app = Fastify({ logger: true });

app.register(sensible);

app.get("/health", async () => {
  return { status: "ok" };
});

app.post("/webhook/whatsapp", async (request, reply) => {
  // depois tem que processar payload da Evolution API
  app.log.info({ body: request.body }, "webhook recebido");
  return reply.status(200).send();
});

const port = Number(process.env.PORT) || 3001;

app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
