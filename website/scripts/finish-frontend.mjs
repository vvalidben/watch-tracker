import fs from 'node:fs'
for (const name of ['useLibrary','useStatistics','useDashboard']) {
  const file=`src/renderer/hooks/${name}.ts`
  let code=fs.readFileSync(file,'utf8')
  code="import { useCloudRefresh } from './useCloudRefresh'\n"+code
  const marker=code.lastIndexOf('\n  return ')
  code=code.slice(0,marker)+'\n  useCloudRefresh(load)\n'+code.slice(marker)
  fs.writeFileSync(file,code)
}
let shell=fs.readFileSync('src/renderer/components/layout/AppShell.tsx','utf8')
shell="import { CloudSync } from './CloudSync'\nimport { AppearanceMenu } from '@renderer/components/settings/AppearanceCard'\n"+shell
shell=shell.replace('<Ticker />','<div className="wt-web-topbar"><strong>WATCH TRACKER</strong><span><CloudSync /><AppearanceMenu iconOnly /></span></div>\n          <Ticker />')
fs.writeFileSync('src/renderer/components/layout/AppShell.tsx',shell)
let sidebar=fs.readFileSync('src/renderer/components/layout/Sidebar.tsx','utf8')
sidebar="import { CloudSync } from './CloudSync'\n"+sidebar
sidebar=sidebar.replace("v{version} · local library","v{version} · web")
sidebar=sidebar.replace('<small>Local account</small>','<small><CloudSync /></small>')
sidebar=sidebar.replace('Sign out and lock library','Sign out')
fs.writeFileSync('src/renderer/components/layout/Sidebar.tsx',sidebar)
const copies={
 'src/renderer/components/settings/BackupCard.tsx':[['One dated JSON file, kept on this computer. Restoring replaces the whole library.','Download a desktop-compatible JSON backup. Restoring replaces your online library.'],['The app will restart automatically in a moment.','The page will reload in a moment.'],['then restarts the app','then reloads the page']],
 'src/renderer/components/settings/AutomaticBackupsCard.tsx':[['Keeps the 10 most recent snapshots: daily while the app is in use, and before migrations, CSV imports, or restores.','Browse recent cloud safety snapshots saved with library updates. Restoring keeps a new snapshot of your current library.'],['Your first daily snapshot will be created at the next launch.','Snapshots appear after your library starts changing.'],["backup.name.split('-')[2]","'Cloud snapshot'"]],
 'src/renderer/components/settings/ApiConfigCard.tsx':[['Saved. Restart the app for the new key to take effect.','Saved securely. Film and series search is ready.'],['Key removed. Restart the app for this to take effect.','Key removed. The change takes effect immediately.'],['this machine’s environment','the server configuration']],
 'src/renderer/components/settings/AppearanceCard.tsx':[['stay saved on this computer','stay saved in this browser']]
}
for(const [file,replacements] of Object.entries(copies)){let code=fs.readFileSync(file,'utf8');for(const [from,to] of replacements)code=code.replaceAll(from,to);fs.writeFileSync(file,code)}
