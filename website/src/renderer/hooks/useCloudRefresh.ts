import { useEffect } from 'react'
export function useCloudRefresh(refresh:()=>Promise<void>):void {
  useEffect(()=>{
    const listener=()=>{void refresh().catch(()=>{})}
    window.addEventListener('watch-tracker-cloud-change',listener)
    return ()=>window.removeEventListener('watch-tracker-cloud-change',listener)
  },[refresh])
}
