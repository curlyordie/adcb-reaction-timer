import {readFile,writeFile,readdir} from 'node:fs/promises';
let html=await readFile('dist/index.html','utf8');
for(const match of [...html.matchAll(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
 const js=await readFile('dist/'+match[1].replace(/^(?:\.\/|\/)/,''),'utf8');
 html=html.replace(match[0],()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
}
for(const match of [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
 let css=await readFile('dist/'+match[1].replace(/^(?:\.\/|\/)/,''),'utf8');
 for(const asset of [...css.matchAll(/url\((?:"|')?(\/assets\/[^)"']+)(?:"|')?\)/g)]){const bytes=await readFile('dist'+asset[1]);const mime=asset[1].endsWith('.woff')?'font/woff':'application/octet-stream';css=css.replaceAll(asset[1],'data:'+mime+';base64,'+bytes.toString('base64'));}
 html=html.replace(match[0],()=>'<style>'+css+'</style>');
}
const artwork={};
for(const name of await readdir('public/brand')){if(!/\.(png|webp)$/.test(name))continue;const data=await readFile('public/brand/'+name);artwork['/brand/'+name]='data:image/'+(name.endsWith('.png')?'png':'webp')+';base64,'+data.toString('base64');}
html=html.replace('<head>','<head><script>window.__ADCB_OFFLINE__=true;window.__ADCB_ARTWORK__='+JSON.stringify(artwork)+'</script>');
await writeFile('adcb-reaction-timer.html',html);
