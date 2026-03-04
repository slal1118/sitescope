const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^0\./,
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP metadata
]);

export interface ValidationResult {
  valid: boolean;
  url?: URL;
  error?: string;
}

export function validateAndNormalizeUrl(input: string): ValidationResult {
  let raw = input.trim();
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = 'https://' + raw;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed.' };
  }

  const { hostname } = parsed;

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: 'This hostname is not allowed.' };
  }

  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Private/internal IP addresses are not allowed.' };
    }
  }

  // Must have a valid TLD (at least one dot and chars after it)
  if (!hostname.includes('.') || hostname.endsWith('.')) {
    return { valid: false, error: 'URL must include a valid domain.' };
  }

  // Strip fragments, normalize
  parsed.hash = '';

  return { valid: true, url: parsed };
}

export function isSameOrigin(base: URL, link: string): boolean {
  try {
    const target = new URL(link, base.origin);
    return target.hostname === base.hostname;
  } catch {
    return false;
  }
}

export function normalizeLink(base: URL, href: string): string | null {
  try {
    const url = new URL(href, base.origin);
    url.hash = '';
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}
