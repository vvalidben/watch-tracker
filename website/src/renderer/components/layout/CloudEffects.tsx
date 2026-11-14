import { useEffect } from 'react'
import { cloudCall } from '../../../transport'
export function CloudEffects():null {
  useEffect(()=>{
    let stopped=false
    let timer:ReturnType<typeof setTimeout>|undefined
    let changes:Record<string,string>={}
    const apply=(values:Record<string,string>)=>{
      const clean=Object.fromEntries(Object.entries(values).filter(([key])=>!(key in changes)))
      window.dispatchEvent(new CustomEvent('watch-tracker-preferences',{detail:clean}))
    }
    const save=async()=>{
      const pending=changes;changes={}
      try{
        const response=await cloudCall('preferences:set',pending)
        if(!response.ok)throw new Error(response.error)
      }catch{changes={...pending,...changes}}
    }
    const local=(event:Event)=>{
      const {key,value}=(event as CustomEvent).detail
      changes[key]=value;clearTimeout(timer);timer=setTimeout(()=>void save(),800)
    }
    const remote=(event:Event)=>apply((event as CustomEvent).detail)
    const online=()=>{if(Object.keys(changes).length)void save()}
    window.addEventListener('watch-tracker-preference-local',local)
    window.addEventListener('watch-tracker-preferences-remote',remote)
    window.addEventListener('online',online)
    void cloudCall('preferences:get').then(result=>{if(!stopped&&result.ok)apply(result.data)}).catch(()=>{})
    return()=>{stopped=true;clearTimeout(timer);window.removeEventListener('watch-tracker-preference-local',local);window.removeEventListener('watch-tracker-preferences-remote',remote);window.removeEventListener('online',online)}
  },[])
  return null
}
