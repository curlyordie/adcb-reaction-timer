import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/bundle-idle-video.mjs /path/to/optimised.mp4');
const bytes=await readFile(input);
if(bytes.length>25*1024*1024)throw Error('Optimise the video to under 25 MiB for Cloudflare Pages.');
const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,pix_fmt,width,height','-of','json',resolve(input)],{encoding:'utf8'});
if(probe.status!==0)throw Error('ffprobe could not validate the video.');
const stream=JSON.parse(probe.stdout).streams?.[0];
if(stream?.codec_name!=='h264'||stream?.pix_fmt!=='yuv420p')throw Error('Use H.264 / yuv420p MP4 for browser playback.');
const sha256=createHash('sha256').update(bytes).digest('hex');
const name='adcb-aaihex-idle-'+sha256.slice(0,12)+'.mp4';
await mkdir('public/media',{recursive:true});
await copyFile(input,'public/media/'+name);
await writeFile('shared/idle-video.json',JSON.stringify({src:'/media/'+name,mime:'video/mp4',bytes:bytes.length,sha256},null,2)+'\n');
console.log(`Bundled ${name}: ${(bytes.length/1024/1024).toFixed(2)} MiB, ${stream.width} × ${stream.height}`);
