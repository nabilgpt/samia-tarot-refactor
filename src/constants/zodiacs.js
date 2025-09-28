export const ZODIAC_SIGNS = [
  { code: 'aries', name: 'Aries', symbol: '♈', emoji: '🐏' },
  { code: 'taurus', name: 'Taurus', symbol: '♉', emoji: '🐂' },
  { code: 'gemini', name: 'Gemini', symbol: '♊', emoji: '👯' },
  { code: 'cancer', name: 'Cancer', symbol: '♋', emoji: '🦀' },
  { code: 'leo', name: 'Leo', symbol: '♌', emoji: '🦁' },
  { code: 'virgo', name: 'Virgo', symbol: '♍', emoji: '👰' },
  { code: 'libra', name: 'Libra', symbol: '♎', emoji: '⚖️' },
  { code: 'scorpio', name: 'Scorpio', symbol: '♏', emoji: '🦂' },
  { code: 'sagittarius', name: 'Sagittarius', symbol: '♐', emoji: '🏹' },
  { code: 'capricorn', name: 'Capricorn', symbol: '♑', emoji: '🐐' },
  { code: 'aquarius', name: 'Aquarius', symbol: '♒', emoji: '🏺' },
  { code: 'pisces', name: 'Pisces', symbol: '♓', emoji: '🐟' }
]

export const getZodiacByCode = (code) => {
  return ZODIAC_SIGNS.find(z => z.code === code) || ZODIAC_SIGNS[0]
}

export const pickSix = (horoscopes) => {
  if (!horoscopes || horoscopes.length === 0) return []
  return horoscopes.slice(0, 6)
}