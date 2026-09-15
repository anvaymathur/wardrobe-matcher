import type { ReactNode } from "react";
import { urlKey } from "@/lib/ai/products";

// **bold**, [label](https://…), or a bare https://… link.
const INLINE = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]+)/g;

function Anchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
      {children}
    </a>
  );
}

function inline(text: string, allowed: Set<string> | undefined): ReactNode[] {
  // A link is clickable only if it's allowed (e.g. came from a real search);
  // otherwise its text is shown plainly, so made-up URLs aren't one tap away.
  const link = (key: number, href: string, label: string) => {
    const k = urlKey(href);
    return !allowed || (k && allowed.has(k)) ? <Anchor key={key} href={href}>{label}</Anchor> : label;
  };
  return text.split(INLINE).map((chunk, i) => {
    if (!chunk) return null;
    if (chunk.startsWith("**") && chunk.endsWith("**")) return <strong key={i}>{chunk.slice(2, -2)}</strong>;
    const md = chunk.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (md) return link(i, md[2], md[1]);
    if (/^https?:\/\//.test(chunk)) return link(i, chunk, chunk.replace(/^https?:\/\/(www\.)?/, ""));
    return chunk;
  });
}

/** Renders the stylist's reply: paragraphs, bullet/numbered lists, bold and
 * links. Built from React elements only — no raw HTML — so model output can't
 * inject markup. Pass `allowedLinks` (URL keys) to only link verified URLs. */
export function ChatText({ text, allowedLinks }: { text: string; allowedLinks?: Set<string> }) {
  const inlineAllowed = (s: string) => inline(s, allowedLinks);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={blocks.length}>{inlineAllowed(paragraph.join(" "))}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((item, i) => <li key={i}>{inlineAllowed(item)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={blocks.length} className="list-decimal space-y-1 pl-5">{items}</ol>
        ) : (
          <ul key={blocks.length} className="list-disc space-y-1 pl-5">{items}</ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (!line) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.replace(/^#{1,4}\s+/, ""));
    }
  }
  flushParagraph();
  flushList();

  return <div className="space-y-2 text-sm leading-relaxed">{blocks}</div>;
}
