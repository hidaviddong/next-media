export const customLogger = (message: string, ...rest: string[]) => {
  console.log("Hono Logger: " + message + rest.join(" "));
};
