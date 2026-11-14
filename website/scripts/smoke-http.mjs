const origin='http://127.0.0.1:5175'
const root=await fetch(origin)
const html=await root.text()
if(root.status!==200 || !html.includes('Watch Tracker'))throw new Error('Website failed to serve')
const asset=html.match(/src="([^"]+\.js)"/)[1]
const script=await fetch(origin+asset)
if(script.status!==200 || !(await script.text()).includes('Continue with ChatGPT'))throw new Error('Compiled interface failed')
const sign=await fetch(origin+'/signin-with-chatgpt',{redirect:'manual'})
const cookie=sign.headers.get('set-cookie').split(';')[0]
const auth=await fetch(origin+'/api/auth',{headers:{cookie}})
if(!(await auth.json()).data.authenticated)throw new Error('Local preview sign-in failed')
const result=await fetch(origin+'/api/rpc',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({channel:'library:list',request:{}})})
if(result.status!==200 || !Array.isArray((await result.json()).result.items))throw new Error('Cloud API failed')
console.log('HTTP checks passed: page, compiled interface, local sign-in, and cloud library API.')
