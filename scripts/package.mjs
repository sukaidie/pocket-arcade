import {mkdir,readFile,writeFile} from 'node:fs/promises';
const version=process.env.GITHUB_SHA||'local';
await mkdir('public',{recursive:true});
for(const file of ['index.html','style.css','app.js','engine.js']){
  let source=await readFile(file,'utf8');
  if(file==='index.html')source=source.replace('href="style.css"',`href="style.css?v=${version}"`).replace('src="app.js"',`src="app.js?v=${version}"`);
  if(file==='app.js')source=source.replace("'./engine.js'",`'./engine.js?v=${version}'`);
  await writeFile(`public/${file}`,source);
}
