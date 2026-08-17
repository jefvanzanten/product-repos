import type { LogFormSubmissionError } from "../../../domain/log-form-submission";

/** Translate a domain log-form failure into Dutch presentation copy. */
export function presentLogFormSubmissionError(error: LogFormSubmissionError): string {
  switch (error.tag) {
    case "FutureMoment":
      return "Een toekomstig consumptiemoment is niet toegestaan.";
    case "AmbiguousMoment":
      return "Dit tijdstip komt twee keer voor door de wintertijdwisseling. Kies een ander tijdstip.";
    case "InvalidMoment":
      return "Dit tijdstip bestaat niet door de zomertijdwisseling.";
    case "MissingDish":
      return "Kies eerst een gerecht.";
    case "InvalidDishQuantity":
      return "Vul een hoeveelheid porties groter dan nul in.";
    case "MissingProduct":
      return "Kies eerst een product.";
    case "InvalidProductQuantity":
      return "Vul een hoeveelheid groter dan nul in.";
    case "MissingUnit":
      return "Kies een beschikbare eenheid.";
  }
}
