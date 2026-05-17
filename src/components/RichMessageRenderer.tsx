"use client";

import React from 'react';
import { ExternalLink, Tag, ShoppingBag } from 'lucide-react';

// --- Types ---
interface ProductCard {
  name: string;
  price: string;
  description: string;
  imageUrl?: string;
  badge?: string;
}

// --- Product Card Component ---
function ProductCardComponent({ card }: { card: ProductCard }) {
  return (
    <div className="rich-product-card">
      {card.imageUrl && (
        <div className="rich-product-img-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imageUrl} alt={card.name} className="rich-product-img" />
        </div>
      )}
      <div className="rich-product-body">
        <div className="rich-product-header">
          <ShoppingBag className="rich-product-icon" size={14} />
          {card.badge && <span className="rich-product-badge">{card.badge}</span>}
        </div>
        <h4 className="rich-product-name">{card.name}</h4>
        <p className="rich-product-desc">{card.description}</p>
        <div className="rich-product-price">
          <Tag size={12} className="rich-price-icon" />
          <span>{card.price}</span>
        </div>
      </div>
    </div>
  );
}

// --- Inline Markdown Parser ---
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Patterns: **bold**, *italic*, `code`, [text](url)
  const parts: React.ReactNode[] = [];
  // Combined regex for inline elements
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((https?:\/\/[^\s)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={key++} className="rich-bold">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={key++} className="rich-italic">{match[3]}</em>);
    } else if (match[4]) {
      // `code`
      parts.push(<code key={key++} className="rich-inline-code">{match[4]}</code>);
    } else if (match[5] && match[6]) {
      // [text](url)
      parts.push(
        <a key={key++} href={match[6]} target="_blank" rel="noopener noreferrer" className="rich-link">
          {match[5]} <ExternalLink size={10} className="inline ml-0.5" />
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// --- Block-level Markdown Parser ---
function parseBlocks(rawText: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  // Split into lines for block-level parsing
  const lines = rawText.split('\n');
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <pre key={key++} className="rich-code-block">
          {lang && <div className="rich-code-lang">{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++; // skip closing ```
      continue;
    }

    // Heading: ## or ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
      blocks.push(
        <Tag key={key++} className={`rich-heading rich-h${level}`}>
          {parseInlineMarkdown(text)}
        </Tag>
      );
      i++;
      continue;
    }

    // Horizontal rule: ---
    if (line.trim() === '---' || line.trim() === '***') {
      blocks.push(<hr key={key++} className="rich-hr" />);
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*•]\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*•]\s+/)) {
        listItems.push(lines[i].replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="rich-ul">
          {listItems.map((item, idx) => (
            <li key={idx} className="rich-li">{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="rich-ol">
          {listItems.map((item, idx) => (
            <li key={idx} className="rich-li">{parseInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="rich-blockquote">
          {parseInlineMarkdown(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Empty line => spacing
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push(
      <p key={key++} className="rich-p">
        {parseInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return blocks;
}

// --- Product Card Parser ---
// Expects format:
// [PRODUCT_CARD]
// name: Nama Produk
// price: Rp 150.000
// description: Deskripsi singkat produk
// imageUrl: https://... (optional)
// badge: TERLARIS (optional)
// [/PRODUCT_CARD]
function parseProductCards(text: string): { cards: ProductCard[]; cleanText: string } {
  const cards: ProductCard[] = [];
  const cardRegex = /\[PRODUCT_CARD\]([\s\S]*?)\[\/PRODUCT_CARD\]/g;
  
  const cleanText = text.replace(cardRegex, (_, inner) => {
    const lines = inner.trim().split('\n');
    const card: Partial<ProductCard> = {};
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();
      if (key === 'name') card.name = value;
      else if (key === 'price') card.price = value;
      else if (key === 'description') card.description = value;
      else if (key === 'imageurl') card.imageUrl = value;
      else if (key === 'badge') card.badge = value;
    }
    if (card.name && card.price) {
      cards.push(card as ProductCard);
    }
    return ''; // Remove the block from clean text
  });

  return { cards, cleanText: cleanText.trim() };
}

// --- Main Renderer ---
interface RichMessageRendererProps {
  content: string;
  isUser?: boolean;
}

export default function RichMessageRenderer({ content, isUser = false }: RichMessageRendererProps) {
  if (isUser) {
    // User messages: plain text, preserve line breaks
    return (
      <span className="rich-user-content">
        {content.split('\n').map((line, i, arr) => (
          <React.Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  }

  // AI messages: parse product cards first, then parse markdown blocks
  const { cards, cleanText } = parseProductCards(content);
  const blocks = cleanText ? parseBlocks(cleanText) : [];

  return (
    <div className="rich-message-body">
      {blocks.length > 0 && <div className="rich-blocks">{blocks}</div>}
      {cards.length > 0 && (
        <div className="rich-cards-grid">
          {cards.map((card, idx) => (
            <ProductCardComponent key={idx} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
