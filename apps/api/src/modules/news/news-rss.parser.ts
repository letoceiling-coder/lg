import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';

const MAX_ITEMS = 50;
const MAX_BODY = 120_000;

export type ParsedNewsItem = {
  title: string;
  sourceUrl: string;
  body: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
};

function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function textContent(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim();
  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if ('#text' in o && o['#text'] != null) return String(o['#text']).trim();
    if ('__cdata' in o && o['__cdata'] != null) return String(o['__cdata']).trim();
  }
  return '';
}

function pickRssLink(item: Record<string, unknown>): string {
  const link = item.link;
  if (typeof link === 'string' && /^https?:\/\//i.test(link)) return link.trim();
  for (const el of asArray(link)) {
    if (typeof el === 'string' && /^https?:\/\//i.test(el)) return el.trim();
    if (el && typeof el === 'object') {
      const href = (el as Record<string, unknown>)['@_href'];
      if (typeof href === 'string' && /^https?:\/\//i.test(href)) return href.trim();
    }
  }
  const guid = item.guid;
  if (typeof guid === 'string' && /^https?:\/\//i.test(guid)) return guid.trim();
  const gText = textContent(guid);
  if (/^https?:\/\//i.test(gText)) return gText;
  return '';
}

function enclosureImage(item: Record<string, unknown>): string | null {
  for (const enc of asArray(item.enclosure)) {
    if (!enc || typeof enc !== 'object') continue;
    const o = enc as Record<string, unknown>;
    const type = String(o['@_type'] ?? '').toLowerCase();
    const url = o['@_url'];
    if (typeof url !== 'string') continue;
    if (type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return url;
    if (!type && /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return url;
  }
  return null;
}

function parseRfc822Like(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rssEncodedContent(item: Record<string, unknown>): string {
  const keys = Object.keys(item);
  for (const k of keys) {
    if (k === 'content:encoded' || k.endsWith(':encoded')) {
      return textContent(item[k]);
    }
  }
  return '';
}

function extractRssItems(doc: Record<string, unknown>): ParsedNewsItem[] {
  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (!channel) return [];
  const out: ParsedNewsItem[] = [];
  for (const raw of asArray(channel.item)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const title = textContent(item.title);
    const sourceUrl = pickRssLink(item);
    if (!title || !sourceUrl) continue;
    const desc = textContent(item.description);
    const encoded = rssEncodedContent(item);
    let body = (encoded || desc || null) as string | null;
    if (body && body.length > MAX_BODY) body = body.slice(0, MAX_BODY);
    const imageUrl = enclosureImage(item);
    let publishedAt: Date | null = null;
    if (typeof item.pubDate === 'string') publishedAt = parseRfc822Like(item.pubDate);
    if (!publishedAt && typeof item['dc:date'] === 'string') publishedAt = new Date(item['dc:date'] as string);
    out.push({ title: title.slice(0, 500), sourceUrl, body, imageUrl, publishedAt });
  }
  return out.slice(0, MAX_ITEMS);
}

function atomInnerHtml(entry: Record<string, unknown>, key: string): string {
  const node = entry[key];
  if (typeof node === 'string') return node.trim();
  if (!node || typeof node !== 'object') return '';
  const o = node as Record<string, unknown>;
  const type = String(o['@_type'] ?? '').toLowerCase();
  const inner = textContent(o);
  if (inner) return inner;
  if (type.includes('html') && typeof o['#text'] === 'string') return String(o['#text']).trim();
  return '';
}

function extractAtomEntries(doc: Record<string, unknown>): ParsedNewsItem[] {
  const feed = doc.feed as Record<string, unknown> | undefined;
  if (!feed) return [];
  const out: ParsedNewsItem[] = [];
  for (const raw of asArray(feed.entry)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const title = textContent(entry.title);
    let sourceUrl = '';
    for (const l of asArray(entry.link)) {
      if (!l || typeof l !== 'object') continue;
      const o = l as Record<string, unknown>;
      const href = o['@_href'];
      const rel = String(o['@_rel'] ?? '');
      if (typeof href === 'string' && /^https?:\/\//i.test(href) && (rel === 'alternate' || rel === '')) {
        sourceUrl = href.trim();
        break;
      }
    }
    if (!sourceUrl && typeof entry.id === 'string' && /^https?:\/\//i.test(entry.id)) sourceUrl = entry.id.trim();
    if (!title || !sourceUrl) continue;
    let body = atomInnerHtml(entry, 'content') || atomInnerHtml(entry, 'summary') || null;
    if (body && body.length > MAX_BODY) body = body.slice(0, MAX_BODY);
    let publishedAt: Date | null = null;
    if (typeof entry.updated === 'string') publishedAt = new Date(entry.updated);
    if ((!publishedAt || Number.isNaN(publishedAt.getTime())) && typeof entry.published === 'string') {
      publishedAt = new Date(entry.published);
    }
    if (publishedAt && Number.isNaN(publishedAt.getTime())) publishedAt = null;
    out.push({ title: title.slice(0, 500), sourceUrl, body, imageUrl: null, publishedAt });
  }
  return out.slice(0, MAX_ITEMS);
}

export function parseFeedXml(xml: string): ParsedNewsItem[] {
  const trimmed = xml.trim();
  if (!trimmed) return [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true,
  });
  const doc = parser.parse(trimmed) as Record<string, unknown>;
  if (doc.rss) return extractRssItems(doc);
  if (doc.feed) return extractAtomEntries(doc);
  return [];
}

export function slugFromSourceUrl(sourceUrl: string): string {
  const h = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
  return `rss-${h}`;
}
