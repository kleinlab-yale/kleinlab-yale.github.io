import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.join(root,'release','Chessmate');
await fs.access(path.join(root,'dist','index.html'));
await fs.rm(destination,{recursive:true,force:true});
await fs.mkdir(destination,{recursive:true});
await fs.cp(path.join(root,'dist'),destination,{recursive:true});
// Keep the shared invitation's original query string as its identity instead of
// suggesting that a message preview replace it with the generic homepage URL.
const landing=await fs.readFile(path.join(destination,'index.html'),'utf8');
await fs.writeFile(path.join(destination,'room.html'),landing.replace(/\s*<link rel="canonical"[^>]*>/g,'').replace(/\s*<meta property="og:url"[^>]*>/g,''));
await fs.writeFile(path.join(destination,'version.json'),JSON.stringify({version:'2.3.2',edition:'Your chess home · Sculpted knights',builtAt:new Date().toISOString()},null,2));
await fs.writeFile(path.join(destination,'README.md'),(await fs.readFile(path.join(root,'README.md'),'utf8')).replaceAll('(supabase/','(_source/supabase/'));
const source=path.join(destination,'_source');await fs.mkdir(source,{recursive:true});
for(const file of ['src','public','tests','scripts','supabase','package.json','pnpm-lock.yaml','vite.config.js','index.html','README.md','.gitignore','.github'])await fs.cp(path.join(root,file),path.join(source,file),{recursive:true});
await fs.mkdir(path.join(source,'design'),{recursive:true});await fs.copyFile(path.join(root,'design','asset-prompt.md'),path.join(source,'design','asset-prompt.md'));
let notices='Chessmate third-party notices\n\nThe following libraries are used by this application.\n\n';
for(const name of ['react','react-dom','chess.js','three','@supabase/supabase-js','lucide-react']){
 const dir=path.join(root,'node_modules',name),files=await fs.readdir(dir);const license=files.find(f=>/^licen[cs]e(?:\.|$)/i.test(f));
 if(license)notices+=`${'='.repeat(72)}\n${name}\n${'='.repeat(72)}\n\n${await fs.readFile(path.join(dir,license),'utf8')}\n\n`;
}
await fs.writeFile(path.join(destination,'THIRD_PARTY_NOTICES.txt'),notices);
console.log(`Ready to publish: ${destination}`);
