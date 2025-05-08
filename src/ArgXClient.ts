import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { encode, decode } from "@msgpack/msgpack";
import { ArgonTransportClient } from "./proto/transport.client";
import { consola } from "consola";

const logger = consola;

export class ArgXClient {
  private client: ArgonTransportClient;
  private authGetter: () => string;

  constructor(baseUrl: string, getterAuthToken: () => string) {
    const transport = new GrpcWebFetchTransport({
      baseUrl,
      format: "text",
      timeout: 60000 * 10,
    });
    this.client = new ArgonTransportClient(transport);
    this.authGetter = getterAuthToken;
  }

  create<T>(serviceName: string): T {
    return new Proxy(
      {},
      {
        get: (_, methodName) => {
          return async (...args: any[]) => {
            const payload = encode(args, {
              useBigInt64: true,
            });

            try {
              const response = await this.client.unary(
                {
                  interface: serviceName,
                  method: String(methodName),
                  payload: payload,
                },
                {
                  meta: {
                    authorize: this.authGetter(),
                  },
                }
              );

              if (response.response.statusCode == 2 && !!this.authGetter()) {
                throw "not authorized";
              }
              if (response.status.code !== "OK") {
                throw new Error(
                  `${response.status.code} - ${
                    response.status.detail || "Unknown error occurred."
                  }`
                );
              }

              if (response.response.statusCode !== 0) {
                throw new Error(
                  `${response.response.statusCode} - ${
                    response.response.errorMessage || "Unknown error occurred."
                  }, ${response.response.exceptionType}`
                );
              }

              if (response.response.payload.length === 0) return null;

              const resposnse_data = decode(response.response.payload);

              logger.log(resposnse_data);
              return resposnse_data;
            } catch (error) {
              throw error;
            }
          };
        },
      }
    ) as T;
  }
}
