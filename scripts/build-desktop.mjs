import {build as viteBuild} from 'vite';
import {build} from 'esbuild';
import {mkdir,copyFile,writeFile,readFile,cp,chmod} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,dirname,join} from 'node:path';
const require=createRequire(import.meta.url),root=resolve('.'),out=join(root,'desktop/dist');
await mkdir(out,{recursive:true});await mkdir('desktop/bin',{recursive:true});
await viteBuild({configFile:resolve('desktop/vite.config.mjs')});
await build({entryPoints:['desktop/main.mjs'],outfile:join(out,'main.mjs'),bundle:true,platform:'node',target:'node24',format:'esm',external:['electron'],banner:{js:"import {createRequire} from 'node:module';const require=createRequire(import.meta.url);"}});
await copyFile('desktop/preload.cjs',join(out,'preload.cjs'));
for(const name of ['gate.html','gate.js'])await copyFile('desktop/renderer/'+name,join(out,'renderer',name));
await cp('drizzle',join(out,'migrations'),{recursive:true});
const ffmpeg=require('ffmpeg-static'),ffprobe=require('ffprobe-static').path;
for(const [name,path] of [['ffmpeg',ffmpeg],['ffprobe',ffprobe]]){const target=join(root,'desktop/bin',name+(process.platform==='win32'?'.exe':''));await copyFile(path,target);await chmod(target,0o755);}
const token=process.env.PUBLIK_APP_TOKEN || await readFile('desktop/publik-app-token.txt','utf8').catch(()=>null);
if(token)await writeFile(join(out,'publik-app-token.txt'),token.trim(),{mode:0o600});
await writeFile(join(out,'package.json'),JSON.stringify({name:'editai-desktop',version:'0.2.0',type:'module',main:'main.mjs',description:'EditAI local video editing studio',author:'Jadon Tapp',private:true},null,2));
console.log('Desktop assets and native services built. No credentials were printed.');
