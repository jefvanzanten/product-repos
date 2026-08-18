import { isLocationApiFailure } from "../domain/location-api-failure";
import type { LocationActionErrors } from "./types/location-management.types";

/**
 * Translate backend conflicts to contextual Dutch dialog errors.
 *
 * @param error - Action failure.
 * @returns Name or form error safe for presentation.
 */
export function mapLocationApiError(error: Error): LocationActionErrors {
  if (!isLocationApiFailure(error)) return { form: "De wijziging kon niet worden opgeslagen. Probeer opnieuw." };
  switch (error.code) {
    case "LOCATION_ALREADY_EXISTS": return { name: "Op dit niveau bestaat al een opbergplaats met deze naam." };
    case "VALIDATION_ERROR": return { name: "Vul een geldige naam van maximaal 100 tekens in." };
    case "LOCATION_NOT_FOUND": return { form: "Deze opbergplaats bestaat niet meer. Vernieuw de pagina." };
    case "PARENT_LOCATION_NOT_FOUND": return { form: "De gekozen bovenliggende opbergplaats bestaat niet meer." };
    case "LOCATION_ARCHIVED": return { form: "Een gearchiveerde opbergplaats kan niet worden verplaatst." };
    case "PARENT_LOCATION_ARCHIVED": return { form: "De gekozen bovenliggende opbergplaats is gearchiveerd." };
    case "LOCATION_CYCLE": return { form: "Deze verplaatsing zou een ongeldige locatieboom maken." };
    case "LOCATION_ARCHIVED_BY_ANCESTOR": return { form: "Herstel eerst de bovenliggende gearchiveerde opbergplaats." };
    case "ADMIN_ROLE_REQUIRED": return { form: "Beheerderstoegang is vereist." };
    case "UNAUTHENTICATED": return { form: "Je sessie is verlopen. Log opnieuw in." };
    case "AUTH_UNAVAILABLE": return { form: "Authenticatie is tijdelijk niet beschikbaar." };
    case "INTERNAL_ERROR": return { form: "De wijziging kon niet worden opgeslagen. Probeer opnieuw." };
  }
}
