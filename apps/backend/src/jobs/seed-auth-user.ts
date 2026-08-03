import { eq } from "drizzle-orm";
import { loadBackendConfig } from "../config.ts";
import { createDatabase } from "../db/index.ts";
import { user } from "../db/schemas/auth.schema.ts";
import { createAuthAdapter } from "../modules/auth/adapters/better-auth.adapter.ts";

type SeedRole = "admin" | "user";
type SeedUserConfig = { readonly email: string; readonly name: string; readonly password: string; readonly role: SeedRole };
type SeedConfigResult = { readonly _tag: "Valid"; readonly config: SeedUserConfig } | { readonly _tag: "Invalid"; readonly message: string };

/** Parse seed-user configuration without exposing credential values. */
function parseConfig(env: Readonly<Record<string, string | undefined>>): SeedConfigResult {
  const email = env.AUTH_SEED_EMAIL?.trim();
  const name = env.AUTH_SEED_NAME?.trim();
  const password = env.AUTH_SEED_PASSWORD;
  const role = env.AUTH_SEED_ROLE?.trim() ?? "user";
  if (!email || !name || !password) return { _tag: "Invalid", message: "AUTH_SEED_EMAIL, AUTH_SEED_NAME and AUTH_SEED_PASSWORD are required" };
  if (password.length < 8) return { _tag: "Invalid", message: "AUTH_SEED_PASSWORD must be at least 8 characters" };
  if (role !== "admin" && role !== "user") return { _tag: "Invalid", message: "AUTH_SEED_ROLE must be admin or user" };
  return { _tag: "Valid", config: { email, name, password, role } };
}

/** Create an initial Better Auth user, or update the role of an existing user. */
async function seedUser(seedConfig: SeedUserConfig): Promise<void> {
  const config = loadBackendConfig({ ...process.env, AUTH_DISABLE_SIGN_UP: "false" });
  const resources = createDatabase(config);
  const auth = createAuthAdapter({ database: resources.database, config });
  try {
    const existingUser = resources.database.select({ id: user.id }).from(user).where(eq(user.email, seedConfig.email)).limit(1).get();
    if (existingUser) {
      resources.database.update(user).set({ name: seedConfig.name, role: seedConfig.role, updatedAt: new Date() }).where(eq(user.id, existingUser.id)).run();
      console.log(`Updated auth user ${seedConfig.email} with role ${seedConfig.role}`);
      return;
    }
    const created = await auth.api.signUpEmail({ body: { email: seedConfig.email, name: seedConfig.name, password: seedConfig.password } });
    resources.database.update(user).set({ role: seedConfig.role, updatedAt: new Date() }).where(eq(user.id, created.user.id)).run();
    console.log(`Created auth user ${seedConfig.email} with role ${seedConfig.role}`);
  } finally {
    resources.close();
  }
}

const parsed = parseConfig(process.env);
if (parsed._tag === "Invalid") {
  console.error(parsed.message);
  process.exit(1);
}
await seedUser(parsed.config);
