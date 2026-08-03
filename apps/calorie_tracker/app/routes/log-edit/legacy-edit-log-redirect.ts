import { redirect, type LoaderFunctionArgs } from "react-router";

/** Permanently redirect the former Dutch edit segment to the canonical English route. */
export function loader({ params, request }: LoaderFunctionArgs): never {
  const url = new URL(request.url);
  throw redirect(`/logs/${encodeURIComponent(params.logId ?? "")}/edit${url.search}`, 308);
}
