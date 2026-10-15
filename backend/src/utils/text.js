/** Small wording helpers so messages read naturally. */
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
export const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`
export const named = (word, label) => label ? `${cap(word)} “${label}”` : cap(word)
export const article = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w
