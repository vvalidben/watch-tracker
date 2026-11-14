const options:Record<string,readonly string[]>={
  'watch-tracker-visual-style':['neon','old-school','cinema','minimal','aurora','sunset','ocean','carbon'],
  'watch-tracker-motion':['full','reduced','off'],
  'watch-tracker-theme':['light','dark','system'],
  'watch-tracker-rating-precision':['whole','half'],
  'watch-tracker-japanese-labels':['shown','hidden']
}
export function validPreferences(value:unknown):Record<string,string> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid display preferences')
  const result:Record<string,string>={}
  for(const [key,item] of Object.entries(value)){
    if(!options[key]?.includes(item as string))throw new Error('Invalid display preference')
    result[key]=item as string
  }
  return result
}
