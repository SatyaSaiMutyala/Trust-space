/* Visually hidden <label> — gives a bare control an accessible name without showing text. */
export default function SrLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
      {children}
    </label>
  )
}
