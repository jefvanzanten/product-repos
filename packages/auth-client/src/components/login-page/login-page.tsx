import { useState, type FormEvent } from "react";
import type { ProductReposAuthClient } from "../../auth-client";
import styles from "./login-page.module.css";

/** Visual variants supported by the shared login page. */
export type LoginPageAppearance = "dark" | "light";

/** Host-specific content and behavior for the shared login page. */
export type LoginPageProps = {
  /** Better Auth browser client owned by the host application. */
  readonly authClient: ProductReposAuthClient;
  /** Product name shown above the login heading. */
  readonly appName: string;
  /** Supporting login text shown below the heading. */
  readonly intro: string;
  /** Visual treatment selected by the host application. */
  readonly appearance: LoginPageAppearance;
  /** Location opened after successful authentication. */
  readonly successPath?: string;
};

/** Render the shared Product Repos email and password login page. */
export function LoginPage({
  appearance,
  appName,
  authClient,
  intro,
  successPath = "/",
}: LoginPageProps): React.ReactNode {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Authenticate the submitted credentials through Better Auth. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError("E-mailadres of wachtwoord is onjuist.");
        setSubmitting(false);
        return;
      }
      window.location.assign(successPath);
    } catch {
      setError("Inloggen is tijdelijk niet beschikbaar. Probeer het opnieuw.");
      setSubmitting(false);
    }
  }

  return (
    <main className={`${styles.page} ${styles[appearance]}`}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div>
          <p className={styles.eyebrow}>{appName}</p>
          <h1>Inloggen</h1>
          <p className={styles.intro}>{intro}</p>
        </div>
        <label className={styles.field}>
          <span>E-mailadres</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className={styles.field}>
          <span>Wachtwoord</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Bezig met inloggen…" : "Inloggen"}
        </button>
      </form>
    </main>
  );
}
