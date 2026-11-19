import type { RegionTheme } from '../theme'
import { DEFAULT_TRACK } from '../../music'

// The Sahel oasis village's look (Milestone 10 preview): ochre and sand,
// earth walls, date palms and acacias, a sparse countryside, and a year of
// cool dry, hot dry, rains and harvest.

const OLIVE = { leaf: '#7f9a4a', leafLight: '#9fb565', leafDark: '#5f7a3a' }

export const SAHEL: RegionTheme = {
  id: 'sahel',
  palette: {
    wallCream: '#ead2a4',
    wallSand: '#dcb57f',
    wallPeach: '#e3a877',
    wallSky: '#d8c3a0',
    wallMint: '#cfa87a',
    trunk: '#8a6a48',
    door: '#5d6f8a',
    soil: '#b0855a',
  },
  colors: {
    ground: '#e3d0a0',
    riverBank: '#a8b46e',
  },
  kindColors: {
    ksar: '#c98f5a',
    palm_gardens: '#83a85a',
    new_quarter: '#d6b688',
    market_square: '#d98c5f',
    herders_edge: '#dcc792',
  },
  recipes: {
    ksar: {
      buildings: [
        { style: 'mudhouse', count: 10, size: 7 },
        { style: 'ksarTower', count: 2, size: 6 },
      ],
      greenery: [{ style: 'palm', count: 1, size: 5 }],
      cars: 1,
    },
    palm_gardens: {
      buildings: [{ style: 'mudhouse', count: 2, size: 7 }],
      greenery: [
        { style: 'palm', count: 9, size: 5 },
        { style: 'millet', count: 2, size: 11 },
      ],
      cars: 0,
    },
    new_quarter: {
      buildings: [
        { style: 'mudhouse', count: 8, size: 7 },
        { style: 'block', count: 1, size: 11 },
      ],
      greenery: [{ style: 'acacia', count: 2, size: 6 }],
      cars: 4,
    },
    market_square: {
      buildings: [
        { style: 'store', count: 2, size: 12 },
        { style: 'mudhouse', count: 5, size: 7 },
      ],
      greenery: [{ style: 'palm', count: 2, size: 5 }],
      cars: 3,
    },
    herders_edge: {
      buildings: [{ style: 'tent', count: 4, size: 8 }],
      greenery: [
        { style: 'acacia', count: 3, size: 6 },
        { style: 'millet', count: 1, size: 11 },
      ],
      cars: 0,
    },
  },
  seasonLooks: {
    cool_dry: {
      season: 'cool_dry',
      tint: '#efe4c8',
      amount: 0.1,
      leaves: OLIVE,
      conifer: '#5d8a4a',
      fields: { wheat: '#d9c08a', crop: '#b9a873' },
      snow: false,
      life: 0.8,
      birds: 1.2,
      water: 'low',
    },
    hot_dry: {
      season: 'hot_dry',
      tint: '#f2d9a2',
      amount: 0.18,
      leaves: { leaf: '#93985a', leafLight: '#aeb070', leafDark: '#737a45' },
      conifer: '#64814a',
      fields: { wheat: '#e3c88e', crop: '#c9b07a' },
      snow: false,
      life: 0.45,
      birds: 2.4,
      water: 'dry',
    },
    rains: {
      season: 'rains',
      tint: '#cfe3a2',
      amount: 0.12,
      leaves: { leaf: '#6aa84a', leafLight: '#8cc463', leafDark: '#4f8a3c' },
      conifer: '#4f8a4a',
      fields: { wheat: '#b9cf72', crop: '#8fbf5f' },
      snow: false,
      life: 1,
      birds: 0.8,
      water: 'high',
    },
    harvest: {
      season: 'harvest',
      tint: '#ead08a',
      amount: 0.1,
      leaves: { leaf: '#86a04a', leafLight: '#a6b865', leafDark: '#66803a' },
      conifer: '#5a8a48',
      fields: { wheat: '#dbb25a', crop: '#c99a4a' },
      snow: false,
      life: 0.9,
      birds: 1,
      water: 'normal',
    },
  },
  music: DEFAULT_TRACK,
  accent: { primary: '#9a5b25', strong: '#7d4a1d', soft: '#f3e2c8' },
  wilds: { density: 0.45, swap: { tree: 'acacia', conifer: 'palm' } },
}
