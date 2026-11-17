import type { Avatar } from '../game/stories'

// A small, friendly portrait drawn from the resident's avatar data (citizen
// stories): skin, hair and shirt colours plus one accessory. Decorative only.
export default function ResidentAvatar({ avatar, size = 48 }: { avatar: Avatar; size?: number }) {
  const { skin, hair, shirt, accessory } = avatar
  return (
    <svg className="resident-avatar" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#eef2e6" />
      {accessory === 'scarf' && <path d="M10 46 Q24 30 38 46 Z" fill="#c75b8f" />}
      <path d="M9 47 Q9 32 24 32 Q39 32 39 47 Z" fill={shirt} />
      {accessory === 'apron' && <path d="M17 47 L18 35 L30 35 L31 47 Z" fill="#fbfcf7" opacity="0.92" />}
      {accessory === 'scarf' && <path d="M15 34 Q24 39 33 34 L33 37 Q24 42 15 37 Z" fill="#e8873a" />}
      <rect x="20.5" y="27" width="7" height="6" rx="2" fill={skin} />
      <circle cx="24" cy="21" r="9" fill={skin} />
      <path d="M15 20 Q15 10 24 10 Q33 10 33 20 Q30 15 24 15 Q18 15 15 20 Z" fill={hair} />
      <circle cx="20.6" cy="21.5" r="1.1" fill="#2d3929" />
      <circle cx="27.4" cy="21.5" r="1.1" fill="#2d3929" />
      <path d="M21 25.4 Q24 27.6 27 25.4" stroke="#2d3929" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {accessory === 'glasses' && (
        <g stroke="#2d3929" strokeWidth="1" fill="none">
          <circle cx="20.6" cy="21.5" r="2.7" />
          <circle cx="27.4" cy="21.5" r="2.7" />
          <path d="M23.3 21.5 H24.7" />
        </g>
      )}
      {accessory === 'cap' && <path d="M14.5 17 Q15 9 24 9 Q33 9 33.5 17 Z M30 15.5 L38 17 L33 17.5 Z" fill="#3f6a3a" />}
      {accessory === 'hat' && (
        <g fill="#c8a25a">
          <ellipse cx="24" cy="14.5" rx="13" ry="2.6" />
          <path d="M17 14.5 Q17 6 24 6 Q31 6 31 14.5 Z" />
        </g>
      )}
      {accessory === 'helmet' && <path d="M14 18 Q14 8 24 8 Q34 8 34 18 Z" fill="#f2c94c" stroke="#2d3929" strokeWidth="0.6" />}
    </svg>
  )
}
