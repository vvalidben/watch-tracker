import { useEffect,useState } from 'react'
type InstallEvent=Event&{prompt():Promise<void>;userChoice:Promise<{outcome:string}>}
export function WebFeaturesCard():JSX.Element {
  const [install,setInstall]=useState<InstallEvent|null>(null)
  const [reminders,setReminders]=useState(()=>localStorage.getItem('watch-tracker-reminders')==='on')
  const [message,setMessage]=useState('')
  useEffect(()=>{
    const offered=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent)}
    const installed=()=>{setInstall(null);setMessage('Watch Tracker is installed.')}
    window.addEventListener('beforeinstallprompt',offered);window.addEventListener('appinstalled',installed)
    return()=>{window.removeEventListener('beforeinstallprompt',offered);window.removeEventListener('appinstalled',installed)}
  },[])
  return <section className="wt-panel wt-stack" style={{padding:24,gap:14}}>
    <h2 className="wt-h3">Install &amp; episode reminders</h2>
    <p className="wt-sub">Install Watch Tracker from your browser menu using “Install app” or “Add to Home Screen”. Your library stays synced through your account. A connection is required to open and update the cloud library; desktop tracking also works offline.</p>
    {install&&<button className="wt-btn wt-btn-cyan" onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null)}}>Install Watch Tracker</button>}
    <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={reminders} onChange={async event=>{
      const enabled=event.target.checked
      if(enabled){
        if(!('Notification'in window)){setMessage('This browser does not support notifications.');return}
        const permission=await Notification.requestPermission()
        if(permission!=='granted'){setMessage('Notifications were not enabled. You can change permission in browser settings.');return}
      }
      localStorage.setItem('watch-tracker-reminders',enabled?'on':'off');setReminders(enabled);setMessage('')
      window.dispatchEvent(new Event('watch-tracker-reminders-change'))
    }}/>Remind me about episodes airing today</label>
    <p className="wt-sub">Reminders use your saved schedule and run while Watch Tracker is open. Refresh schedules for current air dates. Notification support depends on your browser; no paid notification service is used.</p>
    {message&&<p role="status" className="wt-sub">{message}</p>}
  </section>
}
