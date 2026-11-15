import { describe, expect, it } from 'vitest'
import { loadProjects } from './projects'
import { loadTechnologies } from './technologies'
import { loadMilestones } from './milestones'
import { loadKinds } from './kinds'
import { loadScenario } from './scenario'
import { messageCatalog } from './messages'

// Milestone 8.6 review: content is parsed and validated once, then shared.
// tick(), applyCommand() and every render call these, so re-validating each
// time was pure waste (a tick got ~10x cheaper).
describe('content loaders are cached', () => {
  it('return the same instance on every call', () => {
    expect(loadProjects()).toBe(loadProjects())
    expect(loadTechnologies()).toBe(loadTechnologies())
    expect(loadMilestones()).toBe(loadMilestones())
    expect(loadKinds()).toBe(loadKinds())
    expect(loadScenario()).toBe(loadScenario())
    expect(messageCatalog()).toBe(messageCatalog())
  })
})
