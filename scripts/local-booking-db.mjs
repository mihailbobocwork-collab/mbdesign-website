import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
export function localBookingDB(root,{memory=false}={}){
 if(!memory)mkdirSync(path.join(root,'.local'),{recursive:true});const sqlite=new DatabaseSync(memory?':memory:':path.join(root,'.local/bookings.sqlite'));
 sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');sqlite.exec(readFileSync(path.join(root,'migrations/0001_bookings.sql'),'utf8'));
 const wrap=(query,values=[])=>({bind:(...v)=>wrap(query,v),async first(){return sqlite.prepare(query).get(...values)||null;},async all(){return {results:sqlite.prepare(query).all(...values)};},async run(){const r=sqlite.prepare(query).run(...values);return {meta:{changes:Number(r.changes)}};}});
 return {prepare:query=>wrap(query),async batch(items){sqlite.exec('BEGIN');try{const out=[];for(const item of items)out.push(await item.run());sqlite.exec('COMMIT');return out;}catch(error){sqlite.exec('ROLLBACK');throw error;}},close:()=>sqlite.close()};
}
