// Content store for `npm run dev`: reads and writes the files in this folder and rebuilds dist/
// after a save, so the local admin can be reviewed without touching GitHub.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const versionOf=text=>createHash('sha1').update(text).digest('hex');
const missing=()=>Object.assign(Error('missing'),{code:'missing'});
export function localContentFiles(root,{afterWrite=()=>{}}={}){
 // Only content/*.json and public/assets/uploads/* can be written.
 const resolve=file=>{
  const target=path.resolve(root,file);
  const inside=folder=>target.startsWith(path.join(root,folder)+path.sep);
  if(!inside('content')&&!inside('public/assets/uploads'))throw missing();
  return target;
 };
 return {
  source:'local',
  async read(_env,file){let text;try{text=await readFile(resolve(file),'utf8');}catch{throw missing();}return {text,version:versionOf(text)};},
  async commit(_env,changes){
   const versions={};
   for(const change of changes){
    const target=resolve(change.path);
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,change.bytes||change.text);
    if(change.text!=null)versions[change.path]=versionOf(change.text);
   }
   await afterWrite();
   return {versions,commit:''};
  }
 };
}
