import { ArrowRight,Cloud,Film,LockKeyhole,Sparkles,Tv } from 'lucide-react'
import { AppearanceMenu } from '@renderer/components/settings/AppearanceCard'
import { AtmosphereArtwork } from '@renderer/components/layout/AtmosphereArtwork'
import { Petals } from '@renderer/components/layout/Ambience'
import { useVisualStyle,VISUAL_STYLES } from '@renderer/lib/visualStyle'
import { useAuth } from '@renderer/auth/AuthContext'
const STORIES={neon:['Great stories.','Good company.','Your watchlist.'],'old-school':['A good story.','A quiet evening.','Well remembered.'],cinema:['Your seat.','Your stories.','Now showing.'],minimal:['Less scrolling.','More watching.','Simply yours.'],aurora:['A world away.','A little wonder.','All yours.'],sunset:['Slow evenings.','Good stories.','Stay a while.'],ocean:['New depths.','Great discoveries.','Your collection.'],carbon:['Find your next.','Track every frame.','Make it count.']}
export function Login():JSX.Element {
  const style=useVisualStyle();const lines=STORIES[style];const auth=useAuth()
  const selected=VISUAL_STYLES.find(choice=>choice.id===style)??VISUAL_STYLES[0]
  return <div className="wt-auth"><Petals />
    <header className="wt-auth-header"><span className="wt-brand">WATCH TRACKER</span><div className="wt-auth-header-actions"><span className="wt-auth-local"><Cloud size={13}/>Your library. On every device.</span><AppearanceMenu /></div></header>
    <main className="wt-auth-layout"><section className="wt-auth-story" aria-label="Welcome to Watch Tracker"><div className="wt-auth-kicker"><span className="wt-auth-number">YOUR WATCH SPACE / {selected.name.toUpperCase()}</span><Sparkles size={22}/></div><h1>{lines[0]}<br/>{lines[1]}<br/><span>{lines[2]}</span></h1><p>The films you loved. The series you&apos;re halfway through. The anime you can&apos;t stop thinking about. Keep them all here.</p><div className="wt-auth-genres"><span><Film size={15}/>Films</span><span><Tv size={15}/>Series</span><span><Sparkles size={15}/>Anime</span></div><div className="wt-auth-art"><AtmosphereArtwork key={style} style={style}/></div><span className="wt-auth-story-foot">COLLECT MOMENTS, NOT OPEN TABS.</span></section>
    <section className="wt-auth-form-side" aria-label="Sign in"><div className="wt-auth-card wt-rise"><span className="wt-auth-card-icon"><LockKeyhole size={25}/></span><span className="wt-auth-eyebrow">YOUR STORIES, EVERYWHERE</span><h2>Welcome to your space.</h2><p className="wt-auth-intro">Sign in to keep your collection, episode progress, notes, and ratings together across your devices.</p><a className="wt-btn wt-btn-pink wt-web-signin" href="/signin-with-chatgpt?return_to=%2F" target="_top">Continue with ChatGPT<ArrowRight size={18}/></a>{auth.error && <p role="alert" className="wt-auth-error">{auth.error}</p>}<div className="wt-auth-local-note"><Cloud size={15}/><span>Your own account. Your own cloud library.</span></div></div><p className="wt-auth-footer-note">The same Watch Tracker. A little closer, everywhere.</p></section></main>
    <footer className="wt-auth-footer"><span>MADE FOR YOUR NEXT “JUST ONE MORE.”</span><span>WATCH · RATE · REMEMBER</span></footer>
  </div>
}
