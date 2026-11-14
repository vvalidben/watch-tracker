import { useState } from 'react'
import { cloudCall } from '../../../transport'
export function CloudDataCard():JSX.Element {
  const [confirmation,setConfirmation]=useState('')
  const [pending,setPending]=useState(false)
  const [error,setError]=useState<string|null>(null)
  return <section className="wt-panel wt-stack" style={{padding:24,gap:14}}>
    <h2 className="wt-h3">Your cloud data</h2>
    <p className="wt-sub">Your collection is private to your account. The cloud keeps your current library and ten recent recovery snapshots. Expired import previews and abandoned uploads are cleaned up during use.</p>
    <p className="wt-sub">Export a backup above before deleting. Deletion removes your library, snapshots, saved API key, and cloud display preferences. It does not delete your ChatGPT account or backups you downloaded. Connected desktops stop syncing until you explicitly start a new cloud library.</p>
    <details><summary>Delete all cloud data</summary>
      <form className="wt-stack" style={{gap:12,marginTop:14}} onSubmit={async event=>{
        event.preventDefault();if(confirmation!=='DELETE MY CLOUD DATA')return
        if(!window.confirm('Permanently delete your cloud library and all recovery snapshots? Downloaded backups and the desktop library are kept.'))return
        setPending(true);setError(null)
        try{const result=await cloudCall('account:delete',{confirmation});if(!result.ok)throw new Error(result.error);window.dispatchEvent(new Event('watch-tracker-account-deleted'))}
        catch(reason){setError(reason instanceof Error?reason.message:'Deletion failed. Try again.')}finally{setPending(false)}
      }}>
        <label className="wt-sub" htmlFor="delete-cloud-confirm">Type DELETE MY CLOUD DATA to confirm</label>
        <input id="delete-cloud-confirm" autoComplete="off" className="wt-input" value={confirmation} onChange={event=>setConfirmation(event.target.value)}/>
        <button type="submit" className="wt-btn" disabled={pending||confirmation!=='DELETE MY CLOUD DATA'}>{pending?'Deleting…':'Permanently delete cloud data'}</button>
        {error&&<p role="alert">{error}</p>}
      </form>
    </details>
  </section>
}
