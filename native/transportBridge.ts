import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { configureNativeTransportLookup } from "../app/transportData";

// Public provider requests run through native networking, never a private Site
// login page or a nonexistent /api route inside the bundled web view.
const nativeFetch: typeof fetch = async (input, init) => {
  init?.signal?.throwIfAborted();
  const url = input instanceof Request ? input.url : String(input);
  const headers = Object.fromEntries(new Headers(init?.headers).entries());
  const result = await CapacitorHttp.get({
    url,
    headers,
    connectTimeout: 12_000,
    readTimeout: 20_000,
    responseType: "json",
  });
  init?.signal?.throwIfAborted();
  return new Response(typeof result.data === "string" ? result.data : JSON.stringify(result.data), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
};

if (Capacitor.isNativePlatform()) {
  configureNativeTransportLookup(async (kind, params, signal) => {
    signal?.throwIfAborted();
    // This URL only supplies query parameters to the shared parser; it is not fetched.
    const request = new Request(`https://flighty.invalid/transport/${kind}?${params}`);
    const result = kind === "flight"
      ? await (await import("../app/api/transport/flight/route")).lookupFlight(request, nativeFetch)
      : await (await import("../app/api/transport/rail/route")).lookupRail(request, nativeFetch);
    signal?.throwIfAborted();
    return result;
  });
}
