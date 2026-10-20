// The buddy shop. Coins (1 for every point earned) buy friends, hats, glasses,
// neckwear and scenes for the buddy. A few special items are free gifts at point
// milestones. Points never go down: buying only spends coins, and the leaderboard
// uses points.
//
// The server does the buying and keeps it safe: tapping Buy twice quickly can never
// spend the same coins twice. This page also switches the buttons off while a
// request is on its way, so it shouldn't even try.

import { useEffect, useState } from 'react'
import { buyItem, getShop, setMascot, useData } from '../../api'
import Buddy from '../../Buddy'
import { useT } from '../../i18n/t'
import { Coin, Confetti } from '../../Rewards'
import { useSession } from '../../session'

const SLOTS = ['buddy', 'hat', 'face', 'neck', 'background']

export default function Shop() {
  const t = useT()
  const { reloadProgress } = useSession()
  const { data: first, error, reload } = useData(() => getShop(), [])
  const [shop, setShop] = useState(null)
  const [slot, setSlot] = useState('hat')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null) // { kind: 'good' | 'warn', text }
  const [party, setParty] = useState(0) // changes to replay the confetti

  useEffect(() => {
    if (first) setShop(first)
  }, [first])

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={reload} className="btn btn-primary mt-4">
          {t('common.tryAgain')}
        </button>
      </div>
    )
  }
  if (!shop) return <p className="text-muted">{t('common.loading')}</p>

  const items = shop.items.filter((i) => i.slot === slot)
  const nameOf = (item) => t(`shop.item.${item.slot}.${item.id}`)

  async function run(action, onDone) {
    if (busy) return
    setBusy(true)
    setNote(null)
    try {
      const next = await action()
      setShop(next)
      await reloadProgress() // the coins and buddy in the header and elsewhere
      onDone?.(next)
    } catch (err) {
      setNote({ kind: 'warn', text: err.message })
    }
    setBusy(false)
  }

  const wear = (item) => run(() => setMascot({ ...shop.mascot, [item.slot]: item.id }))
  const takeOff = () => run(() => setMascot({ ...shop.mascot, [slot]: null }))

  // Buying also puts the new thing straight on the buddy.
  function buy(item) {
    run(
      () => buyItem(item.key),
      () => {
        setParty((n) => n + 1)
        setNote({ kind: 'good', text: t('shop.bought', { name: nameOf(item) }) })
        setMascot({ ...shop.mascot, [item.slot]: item.id })
          .then(setShop)
          .then(reloadProgress)
          .catch(() => {})
      }
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {party > 0 && <Confetti key={party} count={30} />}
      <h1 className="text-4xl">{t('shop.title')}</h1>

      <section className="card mt-3 flex items-center gap-4 p-4">
        <Buddy mascot={shop.mascot} size={150} label={t('home.buddyLabel')} className="float shrink-0" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-3xl leading-tight">
            <Coin size={34} />
            {shop.coins}
          </p>
          <p className="text-lg text-muted">{t('shop.coinsHelp')}</p>
        </div>
      </section>

      <div role="radiogroup" aria-label={t('shop.tabsLabel')} className="mt-4 flex flex-wrap gap-2">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={slot === s}
            onClick={() => setSlot(s)}
            className={`min-h-12 rounded-full px-4 text-lg font-bold ${slot === s ? 'bg-accent text-on-accent shadow-[0_4px_0_color-mix(in_srgb,var(--color-accent)_55%,black)]' : 'bg-surface text-ink shadow-[0_3px_0_var(--color-line)]'}`}
          >
            {t(`shop.tabs.${s}`)}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {note && (
          <p role="status" className={`mt-3 rounded-2xl p-3 text-lg font-bold ${note.kind === 'good' ? 'bg-good-soft text-good' : 'bg-warn-soft text-warn'}`}>
            {note.text}
          </p>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {['hat', 'face', 'neck'].includes(slot) && (
          <li className="card flex flex-col items-center p-3 text-center">
            <Buddy mascot={{ ...shop.mascot, [slot]: null }} size={92} />
            <p className="mt-1 text-lg font-bold">{t(`shop.none.${slot}`)}</p>
            <button type="button" disabled={busy || shop.mascot[slot] === null} onClick={takeOff} className="btn btn-secondary mt-2 w-full">
              {shop.mascot[slot] === null ? t('shop.wearing') : t('shop.wear')}
            </button>
          </li>
        )}
        {items.map((item) => {
          const name = nameOf(item)
          const wearing = shop.mascot[item.slot] === item.id
          const missing = item.price !== null && item.price - shop.coins
          return (
            <li key={item.key} className={`card flex flex-col items-center p-3 text-center ${wearing ? 'outline outline-4 outline-accent' : ''}`}>
              <Buddy mascot={{ ...shop.mascot, [item.slot]: item.id }} size={92} />
              <p className="mt-1 text-lg font-bold leading-tight">{name}</p>
              {item.owned ? (
                <button type="button" disabled={busy || wearing} onClick={() => wear(item)} className="btn btn-primary mt-2 w-full">
                  {wearing ? t('shop.wearing') : t('shop.wear')}
                </button>
              ) : item.milestone !== null ? (
                <p className="mt-2 rounded-xl bg-accent-soft px-2 py-2 text-base font-bold text-accent">{t('shop.milestone', { points: item.milestone })}</p>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy || missing > 0}
                    onClick={() => buy(item)}
                    aria-label={t('shop.buyLabel', { name, price: item.price })}
                    className="btn btn-primary mt-2 w-full gap-2"
                  >
                    <Coin size={22} />
                    {item.price}
                  </button>
                  {missing > 0 && <p className="mt-1 text-base text-muted">{t('shop.needMore', { count: missing })}</p>}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
