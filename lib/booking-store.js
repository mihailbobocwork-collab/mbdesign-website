// A meeting row moves creating → requested (waiting for the owner) → approving → confirmed,
// or requested → declining → declined. Requests keep their slot until the owner decides.
// No schema change: request details and decisions live in result_json next to the receipt.
const HOLDING="status IN ('creating','uncertain','requested','approving','declining') OR (status='confirmed' AND lock_until>?)";
const parse=row=>{if(!row)return row;let stored={};try{stored=JSON.parse(row.result_json||'{}')||{};}catch{}return {...row,stored};};
export const publicReceipt=stored=>stored?.receipt||stored;
export function createBookingStore(db){
 return {
  get:id=>db.prepare('SELECT * FROM booking_requests WHERE id=?').bind(id).first(),
  async busy(start,end,now){const data=await db.prepare(`SELECT start_ms AS start,end_ms AS end FROM booking_requests WHERE kind='meeting' AND start_ms<? AND end_ms>? AND (${HOLDING})`).bind(end,start,now).all();return data.results;},
  async reserve({id,fingerprint,kind,start,end,eventId,now,buffer}){
   const result=await db.prepare(`INSERT INTO booking_requests(id,fingerprint,kind,start_ms,end_ms,status,event_id,created_at,updated_at) SELECT ?,?,?,?,?,'creating',?,?,? WHERE NOT EXISTS (SELECT 1 FROM booking_requests WHERE kind='meeting' AND start_ms<? AND end_ms>? AND (${HOLDING})) ON CONFLICT(id) DO NOTHING`).bind(id,fingerprint,kind,start,end,eventId,now,now,kind==='meeting'?end+buffer:0,kind==='meeting'?start-buffer:0,now).run();return Number(result.meta?.changes||0)>0;
  },
  async finish(id,status,result,now){await db.prepare('UPDATE booking_requests SET status=?,result_json=?,updated_at=?,lock_until=? WHERE id=?').bind(status,result?JSON.stringify(result):null,now,status==='confirmed'?now+120000:0,id).run();},
  async limit(bucket,now){const row=await db.prepare('INSERT INTO booking_limits(bucket,hits,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits<5 RETURNING hits').bind(bucket,now+7200000).first();return Boolean(row);},
  async cleanup(now){await db.batch([db.prepare('DELETE FROM booking_limits WHERE expires_at<?').bind(now),db.prepare("DELETE FROM booking_requests WHERE (status='failed' OR (kind='message' AND status<>'confirmed')) AND updated_at<?").bind(now-30*86400000),db.prepare("DELETE FROM booking_requests WHERE kind='message' AND status='confirmed' AND updated_at<?").bind(now-90*86400000),db.prepare("DELETE FROM booking_requests WHERE kind='meeting' AND status IN ('confirmed','declined') AND end_ms<? AND updated_at<?").bind(now-90*86400000,now-90*86400000)]);},
  // Admin
  async meetings(){const data=await db.prepare("SELECT * FROM booking_requests WHERE kind='meeting' AND status IN ('requested','approving','declining','confirmed','declined','uncertain') ORDER BY start_ms ASC").all();return data.results.map(parse);},
  async meeting(id){return parse(await db.prepare("SELECT * FROM booking_requests WHERE id=? AND kind='meeting'").bind(id).first());},
  // Messages: newest first. Their answers, read state and replies live in result_json.
  async messages(){const data=await db.prepare("SELECT * FROM booking_requests WHERE kind='message' AND status='confirmed' ORDER BY created_at DESC").all();return data.results.map(parse);},
  async message(id){return parse(await db.prepare("SELECT * FROM booking_requests WHERE id=? AND kind='message' AND status='confirmed'").bind(id).first());},
  async saveMessage(id,stored,now){await db.prepare("UPDATE booking_requests SET result_json=?,updated_at=? WHERE id=? AND kind='message'").bind(JSON.stringify(stored),now,id).run();},
  async removeMessage(id){const result=await db.prepare("DELETE FROM booking_requests WHERE id=? AND kind='message'").bind(id).run();return Number(result.meta?.changes||0)>0;},
  // Claim a request for one decision at a time; a second click or tab sees it already taken.
  async claim(id,from,to,now){const result=await db.prepare('UPDATE booking_requests SET status=?,updated_at=? WHERE id=? AND status=?').bind(to,now,id,from).run();return Number(result.meta?.changes||0)>0;}
 };
}
