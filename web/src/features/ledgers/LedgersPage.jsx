/* Ledgers / Owner ledgers (prototype viewLedgers). */
import { isOwner, useStore } from '../../store/store'
import { PageHead } from '../../components/ui/Layout'
import { SampleBanner } from '../../components/app/Banners'
import LedgersBody from './LedgersBody'

export default function LedgersPage() {
  useStore()
  const o = isOwner()
  return (
    <>
      <PageHead title={o ? 'Ledgers' : 'Owner ledgers'}
        sub={o ? 'Running statements of everything invoiced to TrustLab and paid to you — rent, electricity, maintenance and other payments — with TDS and balances. Select an entry to see the invoice.' : 'Owner-wise running statements for rent, electricity, maintenance and other payments, with TDS and balances payable.'} />
      <SampleBanner />
      <LedgersBody fixedPid={null} />
    </>
  )
}
