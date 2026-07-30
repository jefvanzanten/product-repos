import { eq } from "drizzle-orm";

process.env.AUTH_DISABLE_SIGN_UP = "false";

type SeedRole = "admin" | "user";

type SeedUserConfig = {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly role: SeedRole;
};

type SeedConfigResult =
  | { readonly _tag: "Valid"; readonly config: SeedUserConfig }
  | { readonly _tag: "Invalid"; readonly message: string };

/** Parse seed-user configuration without exposing credential values. */
function parseConfig(): SeedConfigResult {
  const email = process.env.AUTH_SEED_EMAIL?.trim();
  const name = process.env.AUTH_SEED_NAME?.trim();
  const password = process.env.AUTH_SEED_PASSWORD;
  const role = process.env.AUTH_SEED_ROLE?.trim() ?? "user";

  if (!email || !name || !password) {
    return {
      _tag: "Invalid",
      message: "AUTH_SEED_EMAIL, AUTH_SEED_NAME and AUTH_SEED_PASSWORD are required",
    };
  }
  if (password.length < 8) {
    return { _tag: "Invalid", message: "AUTH_SEED_PASSWORD must be at least 8 characters" };
  }
  if (role !== "admin" && role !== "user") {
    return { _tag: "Invalid", message: "AUTH_SEED_ROLE must be admin or user" };
  }
  return { _tag: "Valid", config: { email, name, password, role } };
}

/** Create an initial Better Auth user, or update the role of an existing user. */
async function seedUser(config: SeedUserConfig): Promise<void> {
  const [{ auth }, { closeDatabase, db }, { user }] = await Promise.all([
    import("./auth.ts"),
    import("../db/index.ts"),
    import("../db/schemas/auth.schema.ts"),
  ]);

  try {
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, config.email))
      .limit(1);
    const existingUser = existing[0];

    if (existingUser) {
      await db
        .update(user)
        .set({ name: config.name, role: config.role, updatedAt: new Date() })
        .where(eq(user.id, existingUser.id));
      console.log(`Updated auth user ${config.email} with role ${config.role}`);
      return;
    }

    const created = await auth.api.signUpEmail({
      body: {
        email: config.email,
        name: config.name,
        password: config.password,
      },
    });
    await db
      .update(user)
      .set({ role: config.role, updatedAt: new Date() })
      .where(eq(user.id, created.user.id));
    console.log(`Created auth user ${config.email} with role ${config.role}`);
  } finally {
    closeDatabase();
  }
}

const parsed = parseConfig();
if (parsed._tag === "Invalid") {
  console.error(parsed.message);
  process.exit(1);
}

await seedUser(parsed.config);
