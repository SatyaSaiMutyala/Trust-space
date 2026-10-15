/** Same id format as the web app (time-based + random). */
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
