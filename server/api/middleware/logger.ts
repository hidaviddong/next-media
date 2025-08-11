import pc from "picocolors";
export const customLogger = (message: string, ...rest: string[]) => {
  console.log(pc.bgGreenBright("Hono Logger: " + message + rest.join(" ")));
};
