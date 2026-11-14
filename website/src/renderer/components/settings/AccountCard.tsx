import { Cloud,LogOut,ShieldCheck } from 'lucide-react'
import { useAuth } from '@renderer/auth/AuthContext'
export function AccountCard():JSX.Element {
  const auth=useAuth()
  return <section className="wt-panel wt-stack wt-rise" style={{padding:24,gap:14}}><h2 className="wt-h3">Your online account</h2><span className="wt-sub">Signed in as <strong>{auth.state?.username}</strong>.</span><span className="wt-sub" style={{display:'flex',gap:8,alignItems:'center'}}><Cloud size={16}/>Your collection, ratings, notes, and episode progress sync across your devices.</span><span className="wt-sub" style={{display:'flex',gap:8,alignItems:'center'}}><ShieldCheck size={16}/>Sign-in is managed by ChatGPT. Your library belongs to this account.</span><button type="button" className="wt-ghost" style={{alignSelf:'flex-start',display:'inline-flex',gap:8,alignItems:'center'}} onClick={()=>void auth.signOut()}><LogOut size={14}/>Sign out</button></section>
}
