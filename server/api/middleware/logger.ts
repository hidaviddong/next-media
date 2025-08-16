import { consola } from "consola";
export const customLogger = (message: string, ...rest: string[]) => {
  consola.success("Hono Logger: " + message + rest.join(" "));
};
