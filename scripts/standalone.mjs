import {readFile,writeFile} from 'node:fs/promises';
let html=await readFile('dist/index.html','utf8');
for(const match of [...html.matchAll(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
 const js=await readFile('dist/'+match[1].replace(/^(?:\.\/|\/)/,''),'utf8');
 html=html.replace(match[0],()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
}
for(const match of [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
 const css=await readFile('dist/'+match[1].replace(/^(?:\.\/|\/)/,''),'utf8');
 html=html.replace(match[0],()=>'<style>'+css+'</style>');
}
html=html.replace('<head>','<head><script>window.__FAB_OFFLINE__=true</script>');
await writeFile('fab-reaction-timer.html',html);
