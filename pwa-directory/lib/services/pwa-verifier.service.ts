import dns from "node:dns/promises";

// =============================================================================
// Interfaces & Types
// =============================================================================

export interface ManifestIcon {
  src: string;
  sizes?: string;
  type?: string;
  purpose?: string;
}

export interface ParsedManifest {
  name?: string;
  shortName?: string;
  description?: string;
  startUrl?: string;
  display?: string;
  scope?: string;
  themeColor?: string;
  backgroundColor?: string;
  icons: ManifestIcon[];
}

export interface PwaVerificationResult {
  ok: boolean;
  url: string;
  finalUrl: string;
  checks: {
    https: boolean;
    reachable: boolean;
    manifestFound: boolean;
    manifestValid: boolean;
    has192Icon: boolean;
    has512Icon: boolean;
    hasMaskableIcon: boolean;
    serviceWorkerDetected: boolean;
  };
  manifest?: ParsedManifest;
  warnings: string[];
  errors: string[];
}

// =============================================================================
// SSRF & IP Validation Utilities
// =============================================================================

/**
 * Converts an IPv4 string "a.b.c.d" into a 32-bit unsigned integer.
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = Number(parts[i]);
    if (isNaN(octet) || octet < 0 || octet > 255 || !Number.isInteger(octet)) {
      return null;
    }
    num = (num << 8) + octet;
  }
  return num >>> 0;
}

/**
 * Checks whether an IPv4 address falls within private, loopback, or reserved ranges.
 */
function isPrivateIPv4(ipStr: string): boolean {
  const ip = ipv4ToNumber(ipStr);
  if (ip === null) return true;

  return (
    (ip >= 0x00000000 && ip <= 0x00ffffff) || // 0.0.0.0/8 (Current network)
    (ip >= 0x0a000000 && ip <= 0x0affffff) || // 10.0.0.0/8 (Private)
    (ip >= 0x64400000 && ip <= 0x647fffff) || // 100.64.0.0/10 (Shared / CGNAT)
    (ip >= 0x7f000000 && ip <= 0x7fffffff) || // 127.0.0.0/8 (Loopback)
    (ip >= 0xa9fe0000 && ip <= 0xa9feffff) || // 169.254.0.0/16 (Link-local / Cloud metadata)
    (ip >= 0xac100000 && ip <= 0xac1fffff) || // 172.16.0.0/12 (Private)
    (ip >= 0xc0000000 && ip <= 0xc00000ff) || // 192.0.0.0/24 (IETF protocol)
    (ip >= 0xc0000200 && ip <= 0xc00002ff) || // 192.0.2.0/24 (TEST-NET-1)
    (ip >= 0xc0586300 && ip <= 0xc05863ff) || // 192.88.99.0/24 (6to4 Relay)
    (ip >= 0xc0a80000 && ip <= 0xc0a8ffff) || // 192.168.0.0/16 (Private)
    (ip >= 0xc6120000 && ip <= 0xc613ffff) || // 198.18.0.0/15 (Benchmarking)
    (ip >= 0xc6336400 && ip <= 0xc63364ff) || // 198.51.100.0/24 (TEST-NET-2)
    (ip >= 0xcb007100 && ip <= 0xcb0071ff) || // 203.0.113.0/24 (TEST-NET-3)
    (ip >= 0xe0000000 && ip <= 0xefffffff) || // 224.0.0.0/4 (Multicast)
    (ip >= 0xf0000000 && ip <= 0xffffffff) // 240.0.0.0/4 (Reserved / Broadcast)
  );
}

/**
 * Checks whether an IPv6 address is private, loopback, or reserved.
 */
function isPrivateIPv6(ipStr: string): boolean {
  const norm = ipStr.toLowerCase().trim();

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.1)
  if (norm.startsWith("::ffff:")) {
    const rawIpv4 = norm.replace("::ffff:", "");
    if (ipv4ToNumber(rawIpv4) !== null) {
      return isPrivateIPv4(rawIpv4);
    }
  }

  // Exact matches
  if (norm === "::" || norm === "::1") return true;

  // Prefix checks
  if (norm.startsWith("fe80:")) return true; // Link-local
  if (norm.startsWith("fc") || norm.startsWith("fd")) return true; // ULA / Unique local
  if (norm.startsWith("ff")) return true; // Multicast
  if (norm.startsWith("2001:db8:")) return true; // Documentation
  if (norm.startsWith("100::")) return true; // Discard-only
  if (norm.startsWith("64:ff9b:")) return true; // IPv4/IPv6 translation

  return false;
}

/**
 * Validates a single IP address string (v4 or v6).
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  if (ip.includes(":")) {
    return isPrivateIPv6(ip);
  }
  return isPrivateIPv4(ip);
}

/**
 * Performs strict syntactic & semantic SSRF checks on a target URL before fetching.
 */
export async function validateUrlForSSRF(rawUrl: string): Promise<{ valid: boolean; error?: string; urlObj?: URL }> {
  let urlObj: URL;
  try {
    urlObj = new URL(rawUrl);
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }

  // 1. Enforce HTTPS only
  if (urlObj.protocol !== "https:") {
    return { valid: false, error: "Only HTTPS URLs (https://) are permitted." };
  }

  // 2. Reject userinfo tricks (e.g. https://user:pass@host)
  if (urlObj.username || urlObj.password) {
    return { valid: false, error: "URLs containing userinfo credentials are not permitted." };
  }

  // 3. Port restrictions (Must be standard 443 or default)
  if (urlObj.port && urlObj.port !== "443") {
    return { valid: false, error: "Non-standard network ports are not permitted." };
  }

  const hostname = urlObj.hostname.toLowerCase();

  // 4. Reject local/internal hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".arpa") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".example") ||
    !hostname.includes(".")
  ) {
    return { valid: false, error: "Access to local, internal, or test domains is prohibited." };
  }

  // 5. If hostname is directly an IP literal, validate immediately
  if (ipv4ToNumber(hostname) !== null) {
    if (isPrivateIPv4(hostname)) {
      return { valid: false, error: "Access to private or reserved IP addresses is prohibited." };
    }
  }

  // 6. Perform DNS Resolution and verify all returned addresses
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { valid: false, error: "Could not resolve domain hostname via DNS." };
    }

    for (const record of lookupResults) {
      if (isPrivateOrReservedIP(record.address)) {
        return { valid: false, error: "Domain resolves to a prohibited private/internal network address." };
      }
    }
  } catch {
    return { valid: false, error: "DNS resolution failed for the specified host." };
  }

  return { valid: true, urlObj };
}

// =============================================================================
// Safe HTTP Fetcher with Redirect & Size Bounds
// =============================================================================

const MAX_HTML_SIZE_BYTES = 512 * 1024; // 512 KB
const MAX_MANIFEST_SIZE_BYTES = 256 * 1024; // 256 KB
const REQUEST_TIMEOUT_MS = 6000; // 6 seconds
const MAX_REDIRECTS = 3;

/**
 * Fetches text content from a URL safely with strict SSRF re-validation on every redirect hop.
 */
async function safeFetchText(
  targetUrl: string,
  maxSizeBytes: number = MAX_HTML_SIZE_BYTES
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string; error?: string }> {
  let currentUrl = targetUrl;
  let hops = 0;

  while (hops <= MAX_REDIRECTS) {
    const validation = await validateUrlForSSRF(currentUrl);
    if (!validation.valid || !validation.urlObj) {
      return { ok: false, status: 400, text: "", finalUrl: currentUrl, error: validation.error };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": "LikhaAppsPwaVerifier/1.0 (+https://likha-apps.web.app)",
          Accept: "text/html,application/json,application/manifest+json,*/*",
        },
        signal: controller.signal,
        redirect: "manual", // Handle redirects manually to re-verify destination
      });

      clearTimeout(timeoutId);

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        hops++;
        if (hops > MAX_REDIRECTS) {
          return { ok: false, status: 508, text: "", finalUrl: currentUrl, error: "Too many redirects." };
        }

        const locationHeader = response.headers.get("location");
        if (!locationHeader) {
          return { ok: false, status: 400, text: "", finalUrl: currentUrl, error: "Redirect missing Location header." };
        }

        // Resolve relative redirect against current URL
        try {
          const nextUrl = new URL(locationHeader, currentUrl).toString();
          currentUrl = nextUrl;
          continue;
        } catch {
          return { ok: false, status: 400, text: "", finalUrl: currentUrl, error: "Invalid redirect Location URL." };
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          text: "",
          finalUrl: currentUrl,
          error: `HTTP response ${response.status}`,
        };
      }

      // Stream response with size cap
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return { ok: true, status: response.status, text: text.slice(0, maxSizeBytes), finalUrl: currentUrl };
      }

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > maxSizeBytes) {
            reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }

      const totalBuffer = new Uint8Array(Math.min(receivedBytes, maxSizeBytes));
      let offset = 0;
      for (const chunk of chunks) {
        const slice = chunk.slice(0, totalBuffer.length - offset);
        totalBuffer.set(slice, offset);
        offset += slice.length;
        if (offset >= totalBuffer.length) break;
      }

      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(totalBuffer);

      return { ok: true, status: response.status, text, finalUrl: currentUrl };
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (fetchErr as Error)?.name === "AbortError";
      return {
        ok: false,
        status: 504,
        text: "",
        finalUrl: currentUrl,
        error: isAbort ? "Request timed out." : "Unable to reach destination host.",
      };
    }
  }

  return { ok: false, status: 508, text: "", finalUrl: currentUrl, error: "Max redirect limit reached." };
}

// =============================================================================
// Manifest & Service Worker Extractors
// =============================================================================

/**
 * Extracts manifest URL reference from HTML <head>.
 */
function extractManifestHrefFromHtml(html: string): string | null {
  const match = html.match(/<link[^>]+rel=["']?(?:manifest|web-app-manifest)["']?[^>]*>/i);
  if (!match) return null;

  const tag = match[0];
  const hrefMatch = tag.match(/href=["']?([^"'>\s]+)["']?/i);
  return hrefMatch ? hrefMatch[1] : null;
}

/**
 * Heuristically inspects HTML for client-side service worker registration keywords.
 */
function detectServiceWorkerInHtml(html: string): boolean {
  return /serviceWorker\.register\s*\(/i.test(html) || /navigator\.serviceWorker/i.test(html);
}

/**
 * Safely parses and normalizes manifest JSON payload.
 */
function parseAndValidateManifest(
  rawJson: string,
  manifestBaseUrl: string
): { valid: boolean; data?: ParsedManifest; warnings: string[] } {
  const warnings: string[] = [];
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { valid: false, warnings: ["Manifest JSON root is not an object."] };
    }
  } catch {
    return { valid: false, warnings: ["Manifest content is not valid JSON."] };
  }

  // Extract Icons
  const icons: ManifestIcon[] = [];
  if (Array.isArray(parsed.icons)) {
    for (const item of parsed.icons) {
      if (item && typeof item === "object" && typeof item.src === "string") {
        try {
          const resolvedSrc = new URL(item.src, manifestBaseUrl).toString();
          icons.push({
            src: resolvedSrc,
            sizes: typeof item.sizes === "string" ? item.sizes : undefined,
            type: typeof item.type === "string" ? item.type : undefined,
            purpose: typeof item.purpose === "string" ? item.purpose : undefined,
          });
        } catch {
          // Ignore unresolvable icon URLs
        }
      }
    }
  }

  const result: ParsedManifest = {
    name: typeof parsed.name === "string" ? parsed.name : undefined,
    shortName: typeof parsed.short_name === "string" ? parsed.short_name : undefined,
    description: typeof parsed.description === "string" ? parsed.description : undefined,
    startUrl: typeof parsed.start_url === "string" ? parsed.start_url : undefined,
    display: typeof parsed.display === "string" ? parsed.display : undefined,
    scope: typeof parsed.scope === "string" ? parsed.scope : undefined,
    themeColor: typeof parsed.theme_color === "string" ? parsed.theme_color : undefined,
    backgroundColor: typeof parsed.background_color === "string" ? parsed.background_color : undefined,
    icons,
  };

  if (!result.name && !result.shortName) {
    warnings.push("Manifest does not specify 'name' or 'short_name'.");
  }
  if (!result.startUrl) {
    warnings.push("Manifest does not specify 'start_url'.");
  }
  if (!result.display) {
    warnings.push("Manifest does not specify 'display' (e.g. 'standalone').");
  }

  return { valid: true, data: result, warnings };
}

// =============================================================================
// Main Verification Engine
// =============================================================================

/**
 * Core PWA verification service.
 * Inspects a target HTTPS URL for reachability, web app manifest, icon requirements, and service worker.
 */
export async function verifyPwaUrl(targetUrl: string): Promise<PwaVerificationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const baseResult: PwaVerificationResult = {
    ok: false,
    url: targetUrl,
    finalUrl: targetUrl,
    checks: {
      https: false,
      reachable: false,
      manifestFound: false,
      manifestValid: false,
      has192Icon: false,
      has512Icon: false,
      hasMaskableIcon: false,
      serviceWorkerDetected: false,
    },
    warnings,
    errors,
  };

  // 1. Initial Syntactic & SSRF Check
  const validation = await validateUrlForSSRF(targetUrl);
  if (!validation.valid || !validation.urlObj) {
    errors.push(validation.error || "Prohibited or invalid URL.");
    return baseResult;
  }

  baseResult.checks.https = true;

  // 2. Fetch Base HTML Page
  const htmlRes = await safeFetchText(targetUrl, MAX_HTML_SIZE_BYTES);
  if (!htmlRes.ok) {
    errors.push(`Could not reach web app: ${htmlRes.error || "Connection failed"}`);
    return baseResult;
  }

  baseResult.checks.reachable = true;
  baseResult.finalUrl = htmlRes.finalUrl;

  // 3. Service Worker Detection in HTML
  baseResult.checks.serviceWorkerDetected = detectServiceWorkerInHtml(htmlRes.text);
  if (!baseResult.checks.serviceWorkerDetected) {
    warnings.push("Service worker registration was not detected in the root HTML markup (may be dynamically loaded).");
  }

  // 4. Discover Manifest URL
  const manifestHref = extractManifestHrefFromHtml(htmlRes.text);
  let manifestTargetUrl: string | null = null;

  if (manifestHref) {
    try {
      manifestTargetUrl = new URL(manifestHref, htmlRes.finalUrl).toString();
    } catch {
      warnings.push("Found manifest tag with unparseable href.");
    }
  }

  // Fallback to conventional /manifest.json if none in HTML
  if (!manifestTargetUrl) {
    try {
      manifestTargetUrl = new URL("/manifest.json", htmlRes.finalUrl).toString();
    } catch {
      manifestTargetUrl = null;
    }
  }

  if (!manifestTargetUrl) {
    errors.push("Web app manifest not found.");
    return baseResult;
  }

  // 5. Fetch Manifest
  const manifestRes = await safeFetchText(manifestTargetUrl, MAX_MANIFEST_SIZE_BYTES);
  if (!manifestRes.ok) {
    errors.push("Web app manifest could not be retrieved from the host.");
    return baseResult;
  }

  baseResult.checks.manifestFound = true;

  // 6. Parse and Validate Manifest JSON
  const manifestParse = parseAndValidateManifest(manifestRes.text, manifestRes.finalUrl);
  if (!manifestParse.valid || !manifestParse.data) {
    errors.push("Web app manifest contains invalid JSON.");
    return baseResult;
  }

  baseResult.checks.manifestValid = true;
  baseResult.manifest = manifestParse.data;
  warnings.push(...manifestParse.warnings);

  // 7. Inspect Icons
  for (const icon of manifestParse.data.icons) {
    const sizes = icon.sizes || "";
    if (sizes.includes("192x192") || sizes === "any" || sizes === "192x192 512x512") {
      baseResult.checks.has192Icon = true;
    }
    if (sizes.includes("512x512") || sizes === "any" || sizes === "192x192 512x512") {
      baseResult.checks.has512Icon = true;
    }
    if (icon.purpose && (icon.purpose.includes("maskable") || icon.purpose === "any maskable")) {
      baseResult.checks.hasMaskableIcon = true;
    }
  }

  if (!baseResult.checks.has192Icon) {
    warnings.push("Manifest is missing a 192x192 PNG icon recommended for mobile home screens.");
  }
  if (!baseResult.checks.has512Icon) {
    warnings.push("Manifest is missing a 512x512 PNG icon recommended for splash screens.");
  }

  baseResult.ok = true;
  return baseResult;
}
