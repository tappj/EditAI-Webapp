import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
await mkdir('public/ffmpeg',{recursive:true});
const source='node_modules/@ffmpeg/core/dist/esm/';
const bytes=await readFile(source+'ffmpeg-core.wasm');
await writeFile('public/ffmpeg/core-part-1.bin',bytes.subarray(0,20*1024*1024));
await writeFile('public/ffmpeg/core-part-2.bin',bytes.subarray(20*1024*1024));
await copyFile(source+'ffmpeg-core.js','public/ffmpeg/ffmpeg-core.js');
for(const name of ['worker.js','const.js','errors.js'])await copyFile('node_modules/@ffmpeg/ffmpeg/dist/esm/'+name,'public/ffmpeg/'+name);
console.log('Prepared single-threaded video engine assets.');
