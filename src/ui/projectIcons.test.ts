import { describe, expect, it } from 'vitest'
import { loadProjects } from '../game/projects'
import { PROJECT_ICONS } from './projectIcons'

describe('project icons', () => {
  it('has an icon for every project visual', () => {
    for (const p of loadProjects()) expect(PROJECT_ICONS[p.visual], p.id).toBeTruthy()
  })
})
