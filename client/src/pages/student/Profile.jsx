// The student's profile: who they are, their buddy, and the settings that used to
// sit all over the app: language and colours (Auto, Light or Dark). Also the badges
// and the way to log out.

import { Link } from 'react-router-dom'
import Buddy from '../../Buddy'
import LanguagePicker from '../../i18n/LanguagePicker'
import { useT } from '../../i18n/t'
import { Bolt, Coin, Flame } from '../../Rewards'
import { useSession } from '../../session'
import { ThemeChoice } from '../../ThemeToggle'

export default function Profile() {
  const { user, progress, logout } = useSession()
  const t = useT()
  const earned = progress.badges.filter((b) => b.earned).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card flex items-center gap-4 p-4">
        <Buddy mascot={progress.mascot} size={110} label={t('home.buddyLabel')} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="text-3xl leading-tight">{user.name}</h1>
          <p className="text-lg text-muted">{t('profile.class', { name: user.className })}</p>
          <Link to="/student/shop" className="btn btn-primary mt-2 min-h-12 px-5">
            {t('profile.dress')}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: <Bolt size={30} />, value: progress.points, label: t('header.points') },
          { icon: <Coin size={30} />, value: progress.coins, label: t('profile.coins') },
          { icon: <Flame size={30} />, value: progress.streak, label: t('header.streak') },
        ].map((s) => (
          <div key={s.label} className="card flex flex-col items-center p-3">
            {s.icon}
            <span className="font-display text-3xl">{s.value}</span>
            <span className="text-base font-semibold text-muted">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="text-2xl">{t('profile.language')}</h2>
        <p className="mt-1 text-muted">{t('profile.languageHelp')}</p>
        <div className="mt-3">
          <LanguagePicker />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-2xl">{t('profile.theme')}</h2>
        <p className="mt-1 text-muted">{t('profile.themeHelp')}</p>
        <div className="mt-3">
          <ThemeChoice />
        </div>
      </section>

      <section>
        <h2 className="text-2xl">{t('home.badgesTitle')}</h2>
        <p className="text-muted">{t('home.badgesCount', { earned, total: progress.badges.length })}</p>
        <ul className="mt-3 space-y-2">
          {progress.badges.map((b) => (
            <li key={b.id} className={`flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[0_3px_0_var(--color-line)] ${b.earned ? '' : 'opacity-70'}`}>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{t(`badges.${b.id}.name`)}</span>
                <span className="block text-muted">{t(`badges.${b.id}.howTo`)}</span>
              </span>
              <span className={`font-bold ${b.earned ? 'text-good' : 'text-muted'}`}>{b.earned ? t('home.earned') : t('home.notYet')}</span>
            </li>
          ))}
        </ul>
      </section>

      <button onClick={logout} className="btn btn-secondary w-full text-lg">
        {t('common.logOut')}
      </button>

      <p className="text-center text-base text-muted">{t('profile.credits')}</p>
    </div>
  )
}
