export function createBookingStore(db){
 return {
  get:id=>db.prepare('SELECT * FROM booking_requests WHERE id=?').bind(id).first(),
  async busy(start,end,now){const data=await db.prepare("SELECT start_ms AS start,end_ms AS end FROM booking_requests WHERE kind='meeting' AND start_ms<? AND end_ms>? AND (status IN ('creating','uncertain') OR (status='confirmed' AND lock_until>?))").bind(end,start,now).all();return data.results;},
  async reserve({id,fingerprint,kind,start,end,eventId,now,buffer}){
   const result=await db.prepare("INSERT INTO booking_requests(id,fingerprint,kind,start_ms,end_ms,status,event_id,created_at,updated_at) SELECT ?,?,?,?,?,'creating',?,?,? WHERE NOT EXISTS (SELECT 1 FROM booking_requests WHERE kind='meeting' AND start_ms<? AND end_ms>? AND (status IN ('creating','uncertain') OR (status='confirmed' AND lock_until>?))) ON CONFLICT(id) DO NOTHING").bind(id,fingerprint,kind,start,end,eventId,now,now,kind==='meeting'?end+buffer:0,kind==='meeting'?start-buffer:0,now).run();return Number(result.meta?.changes||0)>0;
  },
  async finish(id,status,result,now){await db.prepare('UPDATE booking_requests SET status=?,result_json=?,updated_at=?,lock_until=? WHERE id=?').bind(status,result?JSON.stringify(result):null,now,status==='confirmed'?now+120000:0,id).run();},
  async limit(bucket,now){const row=await db.prepare('INSERT INTO booking_limits(bucket,hits,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits<5 RETURNING hits').bind(bucket,now+7200000).first();return Boolean(row);},
  async cleanup(now){await db.batch([db.prepare('DELETE FROM booking_limits WHERE expires_at<?').bind(now),db.prepare("DELETE FROM booking_requests WHERE status IN ('confirmed','failed') AND updated_at<?").bind(now-30*86400000)]);}
 };
}
