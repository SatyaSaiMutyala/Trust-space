/* Sample-data and preview-portal banners shown at the top of pages. */
import { APP } from '../../store/store'
import { Banner } from '../ui/Layout'

/** Shown while running on seed data (before the API is connected). */
export function SampleBanner() {
  if (APP.live) return null
  return <Banner><b>Preview with a sample portfolio.</b> Sample names and figures are illustrative. Changes made here are not stored; open the published page while signed in to work with the live register.</Banner>
}

