import { Aperture, Clapperboard, Disc3, Orbit, Play, Radio, Ticket, Waves } from 'lucide-react'
import type { VisualStyle } from '@renderer/lib/visualStyle'

const ARTWORK = {
  neon: { Icon: Radio, eyebrow: 'THE AFTER HOURS CLUB', title: 'ONE MORE', subtitle: 'EPISODE.', detail: 'PLAY IT LOUD / STAY A WHILE', side: 'ON AIR', coordinate: 'VOL. 08 / GOOD STORIES ONLY' },
  'old-school': { Icon: Ticket, eyebrow: 'THE PERSONAL PICTURE HOUSE', title: 'A story', subtitle: 'worth keeping.', detail: 'ADMIT ONE / KEEP THIS MEMORY', side: 'No. 001', coordinate: 'YOUR VIEWING JOURNAL / EST. TODAY' },
  cinema: { Icon: Clapperboard, eyebrow: 'A PRIVATE SCREENING', title: 'The feature', subtitle: 'is you.', detail: 'TAKE YOUR SEAT / ENJOY THE STORY', side: 'PREMIERE', coordinate: 'PICTURE / SOUND / A LITTLE MAGIC' },
  minimal: { Icon: Play, eyebrow: 'A MOMENT FOR YOURSELF', title: 'Less noise.', subtitle: 'More story.', detail: 'YOUR COLLECTION, BEAUTIFULLY SIMPLE', side: 'Now playing', coordinate: 'WATCH / ENJOY / REPEAT' },
  aurora: { Icon: Orbit, eyebrow: 'SOMEWHERE BEYOND THE ORDINARY', title: 'Meet your', subtitle: 'next universe.', detail: 'LET A LITTLE WONDER IN', side: 'IN ORBIT', coordinate: 'A NEW WORLD / ONE PLAY AWAY' },
  sunset: { Icon: Disc3, eyebrow: 'THE GOLDEN HOUR SESSIONS', title: 'Good stories.', subtitle: 'On repeat.', detail: 'SIDE A / THE EVENING IS YOURS', side: 'SIDE B', coordinate: 'SLOW DOWN / TUNE IN / STAY LATE' },
  ocean: { Icon: Waves, eyebrow: 'JUST BELOW THE SURFACE', title: 'Stories', subtitle: 'run deep.', detail: 'FIND SOMETHING TO GET LOST IN', side: 'DEEP CUT', coordinate: 'DIVE IN / DRIFT A LITTLE' },
  carbon: { Icon: Aperture, eyebrow: 'PERSONAL ARCHIVE / ONLINE', title: 'EVERY FRAME.', subtitle: 'ACCOUNTED FOR.', detail: 'STATUS: READY FOR YOUR NEXT STORY', side: 'REC / 01', coordinate: 'COLLECT / TRACK / DISCOVER' }
} satisfies Record<VisualStyle, { Icon: typeof Play; eyebrow: string; title: string; subtitle: string; detail: string; side: string; coordinate: string }>

/** A small CSS illustration. The same artwork appears in the chooser and welcome screen. */
export function AtmosphereArtwork({ style }: { style: VisualStyle }): JSX.Element {
  const art = ARTWORK[style]
  return <span className={`wt-scene wt-scene-${style}`} aria-hidden="true">
    <span className="wt-scene-halo" />
    <span className="wt-scene-sparks"><i /><i /><i /><i /><i /></span>
    <span className="wt-scene-orbit"><i /><i /><i /></span>
    <span className="wt-scene-object">
      <span className="wt-scene-eyebrow">{art.eyebrow}</span>
      <art.Icon className="wt-scene-symbol" strokeWidth={1.4} />
      <strong>{art.title}<br /><em>{art.subtitle}</em></strong>
      <span className="wt-scene-detail">{art.detail}</span>
    </span>
    <span className="wt-scene-satellite"><Play strokeWidth={1.3} /><b>{art.side}</b><span><i /></span></span>
    <span className="wt-scene-lines"><i /><i /><i /><i /><i /></span>
    <span className="wt-scene-coordinate">{art.coordinate}</span>
    <span className="wt-scene-glint" />
  </span>
}
