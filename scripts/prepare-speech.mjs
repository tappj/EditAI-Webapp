import "./prepare-ocr.mjs";
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/speech',{recursive:true});
await copyFile('node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx','public/speech/silero_vad_legacy.onnx');
for(const name of ['ort-wasm-simd-threaded.wasm','ort-wasm-simd-threaded.mjs'])await copyFile('node_modules/onnxruntime-web/dist/'+name,'public/speech/'+name);
