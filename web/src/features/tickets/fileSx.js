/* Native file inputs in the ticket forms: keep them inside the drawer and give the picker button a finger-sized target on touch screens. */
export const fileSx = {
  maxWidth: '100%', font: 'inherit', fontSize: 13,
  '@media (pointer:coarse)': { '&::file-selector-button': { minHeight: 40, px: 1.75, mr: 1.25, borderRadius: '6px', border: '1px solid var(--line)', bgcolor: 'var(--surface)', color: 'var(--ink)', font: 'inherit', fontWeight: 500 } },
}
