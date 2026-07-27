import styles from "./InventoryPage.module.css";

export default function InventoryPage(): React.ReactNode {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Inventarisatie</h1>

      <form className={styles.form} aria-label="Inventaris toevoegen">
        <label className={styles.field}>
          Categorie
          <select className={styles.control}>
            <option>Selecteer categorie</option>
            <option>Eten</option>
            <option>Drinken</option>
            <option>Supplementen</option>
            <option>Medicijnen</option>
          </select>
        </label>

        <label className={styles.field}>
          Product
          <input
            className={styles.control}
            placeholder="Zoek product"
            type="search"
          />
        </label>

        <div className={styles.quantityRow}>
          <label className={styles.field}>
            Hoeveelheid
            <input
              className={styles.control}
              placeholder="bijv. 200"
              type="number"
            />
          </label>
          <label className={styles.field}>
            Eenheid
            <select className={styles.control}>
              <option>-</option>
              <option>gram</option>
              <option>ml</option>
              <option>stuks</option>
            </select>
          </label>
        </div>

        <button className={styles.submitButton} type="button">
          Voeg toe
        </button>
      </form>
    </main>
  );
}
