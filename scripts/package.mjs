import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
const version=process.env.GITHUB_SHA||'local';
await mkdir('public',{recursive:true});
for(const file of ['index.html','style.css','app.js','engine.js']){
  let source=await readFile(file,'utf8');
  if(file==='index.html')source=source.replace('href="style.css"',`href="style.css?v=${version}"`).replace('src="app.js"',`src="app.js?v=${version}"`);
  if(file==='app.js')source=source.replace('__ARCADE_BUILD__',version).replace("'./engine.js'",`'./engine.js?v=${version}'`);
  await writeFile(`public/${file}`,source);
}

await cp('vendor','public/vendor',{recursive:true});
