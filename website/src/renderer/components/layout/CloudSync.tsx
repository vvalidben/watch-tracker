import { useEffect,useState } from 'react'
import { Cloud,CloudOff,LoaderCircle } from 'lucide-react'
import { pollCloud,getSyncState,reportSync } from '../../../transport'
import { invalidateWatchLog } from '@renderer/hooks/useWatchLog'
let consumers=0
let stopPolling=()=>{}
export function CloudSync():JSX.Element {
  const [state,setState]=useState(getSyncState)
  useEffect(()=>{
    const sync=()=>setState(getSyncState())
    const refresh=()=>{void pollCloud()}
    const log=()=>invalidateWatchLog()
    window.addEventListener('watch-tracker-sync',sync)
    if(++consumers===1){
      window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('watch-tracker-cloud-change',log)
      const offline=()=>reportSync('offline')
      window.addEventListener('offline',offline)
      const timer=setInterval(refresh,30000)
      stopPolling=()=>{clearInterval(timer);window.removeEventListener('offline',offline);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('watch-tracker-cloud-change',log)}
    }
    return ()=>{window.removeEventListener('watch-tracker-sync',sync);if(--consumers===0)stopPolling()}
  },[])
  const label=state==='saving'?'Syncing…':state==='offline'?'Offline · connection needed':state==='error'?'Could not sync · retry the action':'Cloud synced'
  return <span className={`wt-cloud-sync is-${state}`} role="status">{state==='saving'?<LoaderCircle size={12}/>:state==='offline'||state==='error'?<CloudOff size={12}/>:<Cloud size={12}/>}<span>{label}</span></span>
}
