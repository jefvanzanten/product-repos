import { useState } from "react";
import { AdminForm as Form, AdminLink as Link } from "../../../../../core/presentation/routing/admin-source-context";
import { ConsumptionTypeSection, MacroProfileSection, ProductFormActions, ProductNameSection } from "../../products/components/product-form-sections/product-form-sections";
import type { ConcreteProductDetail, ProductDetailActionResult, ProductDetailEditIntent, ProductDetailLoaderData } from "../../types/product-detail.types";
import styles from "./ProductDetailPage.module.css";

/** Render concrete product detail with separate shared and local compartments. */
export function ProductDetailPage({ actionData, loaderData }: { readonly actionData?: ProductDetailActionResult; readonly loaderData: ProductDetailLoaderData }): React.ReactNode {
  const [selectedMode, setMode] = useState<ProductDetailEditIntent | null>(actionData?.errors ? actionData.intent : null);
  const mode = actionData?.ok ? null : selectedMode;
  const product = actionData?.product ?? (loaderData.found ? loaderData.product : null);
  if (!loaderData.found || product === null) return <main className={styles.page}><Link className={styles.primaryLink} to={loaderData.backUrl}>Terug naar productcatalogus</Link></main>;
  const values = actionData?.errors ? actionData.values : undefined;

  return <main className={styles.page}>
    <header className={styles.header}><Link to={loaderData.backUrl}>← Productcatalogus</Link><h1>{product.displayName}</h1>{product.archivedAt ? <span className={styles.archivedBadge}>Gearchiveerd</span> : null}</header>
    {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}

    {mode === "composition" ? <CompositionForm loaderData={loaderData} product={product} values={values} errors={actionData?.errors} onCancel={() => setMode(null)} /> : <CompositionCard product={product} onEdit={() => setMode("composition")} />}
    {mode === "nutrition" ? <NutritionForm loaderData={loaderData} product={product} values={values} errors={actionData?.errors} onCancel={() => setMode(null)} /> : <NutritionCard product={product} onEdit={() => setMode("nutrition")} />}
    {mode === "product" ? <ConcreteProductForm loaderData={loaderData} product={product} values={values} errors={actionData?.errors} onCancel={() => setMode(null)} /> : <ConcreteProductCard product={product} onEdit={() => setMode("product")} />}

    <section className={styles.card}><h2>Acties</h2><Link className={styles.primaryLink} to={`/product-catalogus/nieuw?sameAs=${product.productId}`}>Nieuw product met dezelfde samenstelling</Link><Form method="post"><input name="intent" type="hidden" value={product.archivedAt ? "restore" : "archive"} /><button className={product.archivedAt ? styles.secondaryButton : styles.dangerButton} type="submit">{product.archivedAt ? "Product herstellen" : "Dit product archiveren"}</button></Form><p className={styles.muted}>Wijkt de werkelijke samenstelling af? Archiveer dit product en maak een nieuw product met een nieuwe samenstelling.</p></section>
  </main>;
}

/** Render shared composition edit fields with mandatory impact acknowledgement. */
function CompositionForm({ errors, loaderData, onCancel, product, values }: DetailFormProps): React.ReactNode {
  const composition = product.composition;
  return <Form className={styles.editCard} method="post"><input name="intent" type="hidden" value="composition" /><h2>Gedeelde samenstelling bewerken</h2><p className={styles.impact}>Deze wijziging raakt {composition.productCount} concrete producten.</p><ProductNameSection error={errors?.productName} value={values?.productName ?? composition.name} /><Field label="Categorie"><select name="categoryId" defaultValue={values?.categoryId ?? composition.category.id}>{loaderData.found ? loaderData.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>) : null}</select></Field><Field label="Merk"><select name="brandId" defaultValue={values?.brandId ?? composition.brand?.id ?? ""}><option value="">Geen merk</option>{loaderData.found ? loaderData.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>) : null}</select></Field><Field label="Of nieuw merk"><input name="brandName" defaultValue={values?.brandName ?? ""} /></Field><ConsumptionTypeSection error={errors?.consumptionType} initiallyEnabled={values ? values.consumableEnabled === "on" : composition.consumptionType !== null} value={values?.consumptionType ?? composition.consumptionType} /><ImpactConfirmation count={composition.productCount} /><ProductFormActions onCancel={onCancel} /></Form>;
}

/** Render nutrition editing while retaining canonical composition identity fields. */
function NutritionForm({ errors, onCancel, product, values }: DetailFormProps): React.ReactNode {
  const composition = product.composition;
  return <Form className={styles.editCard} method="post"><input name="intent" type="hidden" value="nutrition" /><h2>Gedeelde voedingswaarden bewerken</h2><p className={styles.impact}>Deze wijziging raakt {composition.productCount} concrete producten.</p><MacroProfileSection available={composition.consumptionType !== null} errors={errors} profile={composition.macroProfile} values={values} /><ImpactConfirmation count={composition.productCount} /><ProductFormActions onCancel={onCancel} /></Form>;
}

/** Render the local concrete product edit form. */
function ConcreteProductForm({ errors, loaderData, onCancel, product, values }: DetailFormProps): React.ReactNode {
  if (!loaderData.found) return null;
  return <Form className={styles.editCard} method="post"><input name="intent" type="hidden" value="product" /><h2>Dit product bewerken</h2><div className={styles.twoColumns}><Field error={errors?.packageTypeId} label="Verpakkingstype"><select name="packageTypeId" defaultValue={values?.packageTypeId ?? product.packageTypeId ?? ""}>{loaderData.packageTypes.map((type) => <option key={type.id} value={type.id}>{type.singularName}</option>)}</select></Field><Field label="Barcode"><input name="barcode" defaultValue={values?.barcode ?? product.barcode ?? ""} /></Field><Field error={errors?.amount} label="Inhoud"><input name="amount" defaultValue={values?.amount ?? product.content?.amount ?? ""} /></Field><Field error={errors?.unitTypeId} label="Eenheid"><select name="unitTypeId" defaultValue={values?.unitTypeId ?? product.content?.unitTypeId ?? ""}>{loaderData.unitTypes.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field></div><Field label="Afbeeldings-URL"><input name="imageUrl" type="url" defaultValue={values?.imageUrl ?? product.imageUrl ?? ""} /></Field><label className={styles.check}><input name="portionEnabled" type="checkbox" defaultChecked={values?.portionEnabled === "on" || product.portion !== null} /> Portie behouden of toevoegen</label><div className={styles.twoColumns}><Field label="Enkelvoud"><input name="portionName" defaultValue={values?.portionName ?? product.portion?.singularName ?? ""} /></Field><Field label="Meervoud"><input name="portionPluralName" defaultValue={values?.portionPluralName ?? product.portion?.pluralName ?? ""} /></Field><Field label="Portiegrootte"><input name="portionAmount" defaultValue={values?.portionAmount ?? product.portion?.amount ?? ""} /></Field><Field label="Portie-eenheid"><select name="portionUnitTypeId" defaultValue={values?.portionUnitTypeId ?? product.portion?.unitTypeId ?? ""}><option value="">Kies eenheid</option>{loaderData.unitTypes.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field><Field label="Aantal per product"><input name="portionsPerProduct" type="number" defaultValue={values?.portionsPerProduct ?? product.portion?.portionsPerProduct ?? ""} /></Field></div><ProductFormActions onCancel={onCancel} /></Form>;
}

/** Render shared composition identity and its impact count. */
function CompositionCard({ product, onEdit }: { readonly product: ConcreteProductDetail; readonly onEdit: () => void }): React.ReactNode {
  const composition = product.composition;
  return <section className={styles.card}><div className={styles.cardHeading}><h2>Gedeelde samenstelling</h2><span>{composition.productCount} gekoppelde producten</span></div><dl className={styles.definitionList}><Row label="Naam" value={composition.name} /><Row label="Merk" value={composition.brand?.name ?? "-"} /><Row label="Categorie" value={composition.categoryPath.map((item) => item.name).join(" › ")} /><Row label="Consumptietype" value={formatConsumptionType(composition.consumptionType)} /></dl><button className={styles.secondaryButton} type="button" onClick={onEdit}>Gedeelde gegevens bewerken</button></section>;
}

/** Render the composition-owned macro profile. */
function NutritionCard({ product, onEdit }: { readonly product: ConcreteProductDetail; readonly onEdit: () => void }): React.ReactNode {
  const profile = product.composition.macroProfile;
  return <section className={styles.card}><div className={styles.cardHeading}><h2>Gedeelde voedingswaarden</h2><span>{product.composition.productCount} gekoppelde producten</span></div>{profile?.enabled ? <dl className={styles.definitionList}><Row label="Status" value="Actief" /><Row label="Referentie" value={formatReferenceBasis(profile.referenceBasis)} /><Row label="Calorieën" value={profile.caloriesKcal === null ? "-" : `${profile.caloriesKcal} kcal`} /><Row label="Eiwit" value={profile.proteinG === null ? "-" : `${profile.proteinG} g`} /><Row label="Koolhydraten" value={profile.carbohydratesG === null ? "-" : `${profile.carbohydratesG} g`} /><Row label="Vet" value={profile.fatG === null ? "-" : `${profile.fatG} g`} /></dl> : <p className={styles.muted}>{profile ? "Voedingswaarden zijn uitgeschakeld; opgeslagen waarden blijven bewaard." : "Geen voedingswaarden toegevoegd."}</p>}<button className={styles.secondaryButton} type="button" onClick={onEdit}>{profile ? "Voedingswaarden bewerken" : "Voedingswaarden toevoegen"}</button></section>;
}

/** Render fields that belong only to this concrete product. */
function ConcreteProductCard({ product, onEdit }: { readonly product: ConcreteProductDetail; readonly onEdit: () => void }): React.ReactNode {
  return <section className={styles.card}><h2>Dit product</h2>{product.imageUrl ? <img className={styles.productImage} src={product.imageUrl} alt={product.displayName} /> : null}<dl className={styles.definitionList}><Row label="Verpakkingstype" value={product.packageSummary ?? "-"} /><Row label="Inhoud" value={product.content ? `${product.content.amount} ${product.content.symbol}` : "-"} /><Row label="Barcode" value={product.barcode ?? "-"} /><Row label="Portie" value={product.portion ? `${product.portion.singularName}: ${product.portion.amount}` : "-"} /><Row label="Status" value={product.archivedAt ? "Gearchiveerd" : "Actief"} /></dl><button className={styles.secondaryButton} type="button" onClick={onEdit}>Dit product bewerken</button></section>;
}

type DetailFormProps = { readonly errors?: Record<string, string>; readonly loaderData: ProductDetailLoaderData; readonly onCancel: () => void; readonly product: ConcreteProductDetail; readonly values?: Record<string, string> };

/** Render the mandatory shared-change impact confirmation. */
function ImpactConfirmation({ count }: { readonly count: number }): React.ReactNode { return <label className={styles.check}><input name="confirmSharedImpact" type="checkbox" /> Ik begrijp dat dit {count} producten wijzigt.</label>; }
/** Render one definition-list row. */
function Row({ label, value }: { readonly label: string; readonly value: string }): React.ReactNode { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
/** Render one labeled edit field. */
function Field({ children, error, label }: { readonly children: React.ReactNode; readonly error?: string; readonly label: string }): React.ReactNode { return <label className={styles.label}><span>{label}</span>{children}{error ? <small>{error}</small> : null}</label>; }
/** Translate a consumption type for Dutch presentation. */
function formatConsumptionType(value: ConcreteProductDetail["composition"]["consumptionType"]): string { return value === null ? "-" : value === "FOOD" ? "Voeding" : value === "DRINK" ? "Drinken" : "Supplement"; }
/** Translate a macro reference basis for Dutch presentation. */
function formatReferenceBasis(value: NonNullable<ConcreteProductDetail["composition"]["macroProfile"]>["referenceBasis"]): string { return value === "PER_100_G" ? "Per 100 g" : value === "PER_100_ML" ? "Per 100 ml" : "Per stuk/dosis"; }
