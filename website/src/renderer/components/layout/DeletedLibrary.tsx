import { useState } from 'react'
import { cloudCall } from '../../../transport'
export function DeletedLibrary():JSX.Element {
  const [error,setError]=useState('')
  const [pending,setPending]=useState(false)
  return <main className="wt-stack" style={{maxWidth:560,margin:'12vh auto',padding:24,gap:20}}>
    <h1 className="wt-h2">Your cloud library was deleted</h1>
    <p className="wt-sub">Sync is paused so a connected desktop cannot upload your old library again. Your ChatGPT account and downloaded backups are kept.</p>
    <button className="wt-btn" disabled={pending} onClick={async()=>{setPending(true);try{const result=await cloudCall('account:startFresh');if(!result.ok)throw new Error(result.error);window.location.reload()}catch(reason){setError(reason instanceof Error?reason.message:'Try again');setPending(false)}}}>Start a new empty cloud library</button>
    <a className="wt-ghost" href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
    {error&&<p role="alert">{error}</p>}
  </main>
}
