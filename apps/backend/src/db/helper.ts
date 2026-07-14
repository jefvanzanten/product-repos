import { text } from "drizzle-orm/sqlite-core";

const textColumn = <TName extends string>(name: TName) =>
  text(name, { mode: "text" });

const uuid = <TName extends string>(name: TName) =>
  textColumn(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export { textColumn, uuid };
