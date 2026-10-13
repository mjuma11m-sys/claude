import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'

/* Who sees this: a fan or player account while the fan zone is off. Not an error, so say plainly what the app is for right now. */
export function ClubsOnly() {
  return (
    <section className="mx-auto max-w-lg space-y-5 py-6">
      <PageTitle>التطبيق للأندية والاتحاد حالياً</PageTitle>
      <p className="glass flex items-start gap-3 p-4 text-sm">
        <Icon name="hub" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>Sports Hub حالياً غرف عمل لإدارات الأندية والاتحاد. زاوية الجمهور قريباً 👀 وما عندها موعد. حسابك محفوظ، وتقدر تشوف ترتيب الدوريات.</span>
      </p>
      <Link to="/standings" className="btn-skew grid min-h-11 place-items-center px-6 font-bold text-pulse-ink">ترتيب الدوريات</Link>
    </section>
  )
}
