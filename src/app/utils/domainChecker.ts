import { publisherDomains, legitimateSellers, socialMediaDomains } from './officialDomains';

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function isOfficialDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace('www.', '');
  return publisherDomains.some(d => normalizedDomain.includes(d)) ||
         legitimateSellers.some(d => normalizedDomain.includes(d));
}

export function isSocialMedia(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace('www.', '');
  return socialMediaDomains.some(d => normalizedDomain.includes(d));
}

export function classifyDomain(url: string): 'official' | 'social' | 'unofficial' {
  const domain = extractDomain(url);

  if (isOfficialDomain(domain)) {
    return 'official';
  } else if (isSocialMedia(domain)) {
    return 'social';
  } else {
    return 'unofficial';
  }
}