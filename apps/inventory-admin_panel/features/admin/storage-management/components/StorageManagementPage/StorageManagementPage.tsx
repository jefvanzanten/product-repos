import styles from "./StorageManagementPage.module.css";

export default function StorageManagementPage(): React.ReactNode {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Opbergplaatsen</h1>
        <p className={styles.description}>
          Nog geen opbergplaatsen gevonden.
        </p>
        <button className={styles.button} type="button">
          + Opbergplaats toevoegen
        </button>
      </section>
    </main>
  );
}
