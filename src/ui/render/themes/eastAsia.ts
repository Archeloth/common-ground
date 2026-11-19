import type { RegionTheme } from '../theme'
import { DEFAULT_TRACK } from '../../music'

// The East Asian mountain village's look (Milestone 10 preview): plaster and
// dark timber, grey tiled and thatched roofs, pines, cherries and bamboo on
// green slopes, rice terraces, and a year of four seasons plus the early
// summer rains.

const SUMMER = { leaf: '#5f9a52', leafLight: '#7fb468', leafDark: '#457a42' }

export const EAST_ASIA: RegionTheme = {
  id: 'east_asia',
  palette: {
    wallCream: '#efe7d6',
    wallSand: '#8a6a4a',
    wallPeach: '#d9cdb6',
    wallSky: '#e6e0d2',
    wallMint: '#a07a55',
    roofRed: '#5b5f66',
    roofTerracotta: '#6e6a62',
    roofSlate: '#4a5058',
    roofMoss: '#646a5a',
    roofPlum: '#5f5a55',
    roofCosy: '#7a4a3a',
    trunk: '#6e5040',
    door: '#4a3a2e',
  },
  colors: {
    ground: '#c3d3a6',
    riverBank: '#9fb486',
    river: '#7fb0c8',
  },
  kindColors: {
    village_core: '#bca07e',
    rice_terraces: '#a2c76c',
    satoyama: '#5f8f5a',
    river_hamlet: '#aab9a0',
  },
  recipes: {
    village_core: {
      buildings: [
        { style: 'minka', count: 4, size: 8 },
        { style: 'tiledHouse', count: 4, size: 7 },
        { style: 'kura', count: 2, size: 5 },
      ],
      greenery: [
        { style: 'pine', count: 2, size: 5 },
        { style: 'cherry', count: 1, size: 5 },
      ],
      cars: 2,
    },
    rice_terraces: {
      buildings: [{ style: 'minka', count: 1, size: 8 }],
      greenery: [
        { style: 'paddy', count: 4, size: 12 },
        { style: 'cherry', count: 1, size: 5 },
      ],
      cars: 0,
    },
    satoyama: {
      buildings: [{ style: 'minka', count: 1, size: 8 }],
      greenery: [
        { style: 'pine', count: 4, size: 5 },
        { style: 'tree', count: 3, size: 6 },
        { style: 'bamboo', count: 3, size: 4 },
      ],
      cars: 0,
    },
    river_hamlet: {
      buildings: [
        { style: 'tiledHouse', count: 6, size: 7 },
        { style: 'store', count: 1, size: 11 },
      ],
      greenery: [{ style: 'cherry', count: 2, size: 5 }],
      cars: 3,
    },
  },
  seasonLooks: {
    winter: {
      season: 'winter',
      tint: '#f1f5f7',
      amount: 0.5,
      leaves: { leaf: '#9a8c7e', leafLight: '#b2a698', leafDark: '#827466' },
      conifer: '#3f6a52',
      fields: { wheat: '#eef1f2', crop: '#e2e8e8' },
      snow: true,
      life: 0.2,
      birds: 3.5,
      water: 'normal',
      blossom: '#9a8c7e',
    },
    spring: {
      season: 'spring',
      tint: '#e3f0c8',
      amount: 0.1,
      leaves: { leaf: '#7dbd62', leafLight: '#a4d67e', leafDark: '#5e9f55' },
      conifer: '#3f7d55',
      fields: { wheat: '#b9cfa0', crop: '#9fc4b0' },
      snow: false,
      life: 1,
      birds: 0.8,
      water: 'normal',
      blossom: '#f4bccb',
    },
    rainy: {
      season: 'rainy',
      tint: '#cfdcd6',
      amount: 0.14,
      leaves: SUMMER,
      conifer: '#3a7550',
      fields: { wheat: '#a8cf7a', crop: '#8fc46a' },
      snow: false,
      life: 0.9,
      birds: 1.1,
      water: 'high',
    },
    summer: {
      season: 'summer',
      tint: '#d9e8a0',
      amount: 0.06,
      leaves: SUMMER,
      conifer: '#3f7d55',
      fields: { wheat: '#9fcf62', crop: '#86c25a' },
      snow: false,
      life: 1,
      birds: 1,
      water: 'normal',
    },
    autumn: {
      season: 'autumn',
      tint: '#e0a868',
      amount: 0.1,
      leaves: { leaf: '#d0603a', leafLight: '#e8a03f', leafDark: '#a8423a' },
      conifer: '#3e7653',
      fields: { wheat: '#dcc06a', crop: '#c9a84f' },
      snow: false,
      life: 0.6,
      birds: 1.6,
      water: 'normal',
      blossom: '#d0603a',
    },
  },
  music: DEFAULT_TRACK,
  accent: { primary: '#8a3b2e', strong: '#6e2f24', soft: '#f2dcd6' },
  wilds: { density: 1.1, swap: { conifer: 'pine', bush: 'bamboo' } },
}
