import { useEffect } from 'react'
export function EpisodeReminders():null {
  useEffect(()=>{
    let stopped=false
    let running=false
    const check=async()=>{
      if(running||localStorage.getItem('watch-tracker-reminders')!=='on'||!('Notification'in window)||Notification.permission!=='granted'||!navigator.onLine)return
      running=true
      try{
        const result=await window.api.getUpcomingEpisodes()
        if(!result.ok||stopped)return
        const now=new Date();const day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        // sessionStorage prevents old notifications carrying across sign-ins.
        const seen=JSON.parse(sessionStorage.getItem('watch-tracker-reminder-seen')??'{}') as {day?:string;keys?:string[]}
        const keys=new Set(seen.day===day?seen.keys:[])
        const fresh=result.data.filter(episode=>episode.airDate.slice(0,10)===day&&!keys.has(`${episode.source}:${episode.externalId}:${episode.seasonNumber}:${episode.episodeNumber}`))
        if(!fresh.length)return
        const first=fresh[0]
        const body=fresh.length===1?`${first.title} · S${first.seasonNumber} E${first.episodeNumber}`:`${fresh.length} episodes air today, including ${first.title}.`
        const registration='serviceWorker'in navigator?await navigator.serviceWorker.getRegistration():undefined
        if(stopped)return
        if(registration?.active)await registration.showNotification('On your watchlist today',{body,icon:'/icons/icon-192.png',tag:`watch-tracker-${day}`,data:{url:'/#/upcoming'}})
        else new Notification('On your watchlist today',{body,tag:`watch-tracker-${day}`})
        fresh.forEach(episode=>keys.add(`${episode.source}:${episode.externalId}:${episode.seasonNumber}:${episode.episodeNumber}`))
        sessionStorage.setItem('watch-tracker-reminder-seen',JSON.stringify({day,keys:[...keys].slice(-1000)}))
      }catch{/* Reminders must never interrupt tracking. */}finally{running=false}
    }
    void check()
    const timer=setInterval(()=>void check(),15*60*1000)
    const refresh=()=>void check()
    window.addEventListener('watch-tracker-reminders-change',refresh)
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener('watch-tracker-reminders-change',refresh)}
  },[])
  return null
}
