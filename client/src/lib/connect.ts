import { createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { LixoCertoService } from "@shared/gen/lixo_certo/v1/lixo_certo_pb";

const transport = createGrpcWebTransport({
  baseUrl: "/api/rpc",
});

export const lixoCertoClient = createClient(LixoCertoService, transport);
