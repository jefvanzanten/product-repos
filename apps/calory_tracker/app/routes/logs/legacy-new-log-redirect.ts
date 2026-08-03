import { redirect, type LoaderFunctionArgs } from "react-router";

/** Permanently redirect the former Dutch create segment to the canonical English route. */
export function loader({ request }: LoaderFunctionArgs): never {
  const url = new URL(request.url);
  throw redirect(`/logs/new${url.search}`, 308);
}
