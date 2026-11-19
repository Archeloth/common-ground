import type { RegionTheme } from '../theme'
import { DEFAULT_TRACK } from '../../music'

// The Amazon river town's look (Milestone 10 preview): painted wooden houses
// and zinc roofs, houses on stilts, thatched huts, kapok giants and açaí
// palms on lush green ground, a dense forest beyond, and a year of high and
// low water.

const LUSH = { leaf: '#3f9a4a', leafLight: '#62b85e', leafDark: '#2c7a3a' }

export const AMAZON: RegionTheme = {
  id: 'amazon',
  palette: {
    wallCream: '#f2e2b8',
    wallSand: '#5fa8c8',
    wallPeach: '#e8826a',
    wallSky: '#7ac0a0',
    wallMint: '#f2c94c',
    roofRed: '#9aa3ab',
    roofTerracotta: '#b07a4a',
    roofSlate: '#8a949c',
    roofMoss: '#a88b5a',
    roofPlum: '#c06a4a',
    trunk: '#6e5040',
    door: '#4a5f7a',
    soil: '#a0603a',
  },
  colors: {
    ground: '#a9c98a',
    riverBank: '#7f9f5c',
    river: '#86a2a6', // silty river water
  },
  kindColors: {
    riverfront: '#8fbfa8',
    floodplain_village: '#b9c97a',
    town_center: '#d9b88a',
    forest_community: '#3f7f4a',
    agroforest: '#6aa65a',
  },
  recipes: {
    riverfront: {
      buildings: [{ style: 'stilt', count: 7, size: 7 }],
      greenery: [{ style: 'acai', count: 2, size: 4 }],
      cars: 0,
    },
    floodplain_village: {
      buildings: [
        { style: 'stilt', count: 3, size: 7 },
        { style: 'thatchHut', count: 1, size: 7 },
      ],
      greenery: [
        { style: 'manioc', count: 2, size: 11 },
        { style: 'acai', count: 2, size: 4 },
      ],
      cars: 0,
    },
    town_center: {
      buildings: [
        { style: 'paintedHouse', count: 7, size: 7 },
        { style: 'store', count: 1, size: 11 },
      ],
      greenery: [
        { style: 'kapok', count: 1, size: 7 },
        { style: 'acai', count: 1, size: 4 },
      ],
      cars: 2,
    },
    forest_community: {
      buildings: [{ style: 'thatchHut', count: 3, size: 7 }],
      greenery: [
        { style: 'kapok', count: 3, size: 7 },
        { style: 'tree', count: 4, size: 6 },
        { style: 'acai', count: 2, size: 4 },
      ],
      cars: 0,
    },
    agroforest: {
      buildings: [{ style: 'paintedHouse', count: 1, size: 7 }],
      greenery: [
        { style: 'acai', count: 4, size: 4 },
        { style: 'tree', count: 2, size: 6 },
        { style: 'manioc', count: 1, size: 11 },
        { style: 'kapok', count: 1, size: 7 },
      ],
      cars: 0,
    },
  },
  seasonLooks: {
    high_water: {
      season: 'high_water',
      tint: '#cfe8c0',
      amount: 0.08,
      leaves: LUSH,
      conifer: '#2f7a42',
      fields: { wheat: '#8fbf5f', crop: '#6aa84a' },
      snow: false,
      life: 1,
      birds: 0.7,
      water: 'high',
    },
    low_water: {
      season: 'low_water',
      tint: '#e6e0a8',
      amount: 0.08,
      leaves: { leaf: '#4f9a4a', leafLight: '#72b862', leafDark: '#357a3a' },
      conifer: '#357a42',
      fields: { wheat: '#b9c46a', crop: '#8fb55a' },
      snow: false,
      life: 0.95,
      birds: 0.9,
      water: 'low',
    },
  },
  music: DEFAULT_TRACK,
  accent: { primary: '#1f7a5a', strong: '#18624a', soft: '#d4eee2' },
  wilds: { density: 1.5, swap: { conifer: 'acai' } },
}
