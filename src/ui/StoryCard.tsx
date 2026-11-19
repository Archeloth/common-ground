import type { GameState } from '../game/types'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { parseStoryNoticeKey, residentById } from '../game/stories'
import ResidentAvatar from './ResidentAvatar'
import { t } from './i18n'
import './Journal.css'


interface StoryCardProps {
  state: GameState
  onShow: (neighborhood: string) => void
  onClose: (notice: string) => void
}

// A resident's postcard (citizen stories): the oldest unread note, in the
// bottom-left corner. It never pauses the game; closing it files it in the
// Journal's People tab.
export default function StoryCard({ state, onShow, onClose }: StoryCardProps) {
  const scenario = loadScenario()
  const key = state.storyNotices[0]
  const parsed = key ? parseStoryNoticeKey(key) : null
  const resident = parsed ? residentById(scenario, parsed.resident) : undefined
  const chapter = parsed && resident ? resident.chapters[parsed.chapter] : undefined
  if (!key || !resident || !chapter) return null
  const place = neighborhoodById(scenario, resident.neighborhood).name
  return (
    <aside className="story-card" aria-label={t('story.from', { name: resident.name })} key={key}>
      <ResidentAvatar avatar={resident.avatar} size={52} />
      <div className="story-body">
        <strong>{t('story.from', { name: resident.name })}</strong>
        <span className="story-where">{t('story.where', { role: resident.role, place })}</span>
        <p>{chapter.text}</p>
        <div className="story-actions">
          <button type="button" className="story-show" onClick={() => onShow(resident.neighborhood)}>
            {t('story.show')}
          </button>
          <button type="button" className="story-close" data-sound="close" onClick={() => onClose(key)}>
            {t('story.close')}
          </button>
        </div>
      </div>
    </aside>
  )
}
