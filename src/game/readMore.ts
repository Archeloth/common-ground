// "Read more" links (post-Milestone 9): Wikipedia articles a player can open
// to read further about a technology, an animal or a lexicon topic. They are
// further reading, not citations - the fact-check sources live in `sources`.
// Every article was checked against the Wikipedia API when it was added
// (DECISIONS.md); only English Wikipedia article URLs are accepted.

export interface ReadMoreLink {
  title: string // the article's title, shown as the link text
  url: string
}

const WIKIPEDIA_ARTICLE = /^https:\/\/en\.wikipedia\.org\/wiki\/[^\s?#/]+$/

export function readMoreProblems(links: unknown): string[] {
  if (!Array.isArray(links)) return ['readMore must be a list']
  const problems: string[] = []
  links.forEach((link, i) => {
    const l = link as Partial<ReadMoreLink> | null
    if (!l || typeof l.title !== 'string' || !l.title.trim()) problems.push(`readMore[${i}] needs a title`)
    if (!l || typeof l.url !== 'string' || !WIKIPEDIA_ARTICLE.test(l.url)) {
      problems.push(`readMore[${i}] must be an English Wikipedia article URL`)
    }
  })
  return problems
}

export function wikipedia(title: string, article = title): ReadMoreLink {
  return { title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.replaceAll(' ', '_'))}` }
}
