import type { InventoryApiFailure } from "../data/inventory-api";

/**
 * Present an add-inventory failure as safe Dutch feedback.
 *
 * @param failure - Classified adapter failure.
 * @returns User-facing failure message.
 */
export function presentAddInventoryFailure(failure: InventoryApiFailure): string {
  if (failure.tag === "HttpFailure") {
    if (failure.code === "PRODUCT_ARCHIVED") return "Dit product is niet meer actief.";
    if (failure.code === "LOCATION_ARCHIVED") return "Deze opbergplaats is niet meer actief. Kies een andere opbergplaats.";
    if (failure.code === "PRODUCT_NOT_FOUND") return "Dit product bestaat niet meer.";
    if (failure.code === "PRODUCT_CONTENT_UNKNOWN") return "Dit product heeft nog geen bekende inhoud.";
    if (failure.code === "LOCATION_NOT_FOUND") return "Deze opbergplaats bestaat niet meer.";
    if (failure.code === "ADMIN_ROLE_REQUIRED") return "Je hebt geen beheerdersrechten om voorraad toe te voegen.";
  }
  return "Voorraad toevoegen is niet gelukt. Controleer je verbinding en probeer opnieuw.";
}

/**
 * Present an item-edit failure as safe Dutch feedback.
 *
 * @param failure - Classified adapter failure.
 * @returns User-facing failure message.
 */
export function presentInventoryItemFailure(failure: InventoryApiFailure): string {
  if (failure.tag === "HttpFailure" && failure.code === "INVENTORY_ITEM_VERSION_CONFLICT") return "De verpakking is intussen gewijzigd. Sluit en open opnieuw.";
  if (failure.tag === "HttpFailure" && failure.code === "AMOUNT_EXCEEDS_PRODUCT_CONTENT") return "De resterende inhoud mag niet hoger zijn dan het maximum.";
  return "Wijzigen is niet gelukt. Probeer opnieuw.";
}
