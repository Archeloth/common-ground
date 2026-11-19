import type { Command } from '../game/types'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { loadProjects, projectById } from '../game/projects'
import { loadTechnologies, technologyById } from '../game/technologies'
import { t } from './i18n'
import { transportText } from './transportText'

// What the undo toast says about the action it can take back.
export function undoText(command: Command, projectAtSlot?: string | null): string {
  const scenario = loadScenario()
  const place = (id: string) => neighborhoodById(scenario, id).name
  const project = (id: string) => projectById(loadProjects(), id).name
  switch (command.type) {
    case 'startProject':
      return t('undo.started', { project: project(command.project), neighborhood: place(command.neighborhood) })
    case 'removeProject':
      return t('undo.removed', { project: projectAtSlot ? project(projectAtSlot) : t('undo.aProject'), neighborhood: place(command.neighborhood) })
    case 'renewProject':
      return t('undo.renewed', { neighborhood: place(command.neighborhood) })
    case 'renewAll':
      return t('undo.renewedAll')
    case 'research':
      return t('undo.researched', { tech: technologyById(loadTechnologies(), command.tech).name })
    case 'startBusLine':
      return transportText('undo', { from: place(command.from), to: place(command.to) })
    case 'townMeeting':
      return t('undo.meeting', { neighborhood: place(command.neighborhood) })
    default:
      return t('undo.action')
  }
}
