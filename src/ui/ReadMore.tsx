import type { ReadMoreLink } from '../game/readMore'
import { t } from './i18n'
import './ReadMore.css'

// "Read more on Wikipedia": further reading for a technology, an animal or a
// lexicon topic. Opens in a new tab; the game sends nothing anywhere.
export default function ReadMore({ links }: { links: readonly ReadMoreLink[] }) {
  if (links.length === 0) return null
  return (
    <p className="read-more">
      <span className="read-more-label">{t('readMore.label')}</span>
      {links.map((link, i) => (
        <span key={link.url}>
          {i > 0 && ' · '}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('readMore.aria', { title: link.title })}
          >
            {link.title}
            <span aria-hidden="true"> ↗</span>
          </a>
        </span>
      ))}
    </p>
  )
}
