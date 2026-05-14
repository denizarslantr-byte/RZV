// ============================================================
//  Piano Deri V6.1 — ÖZEL SHEET YAPISI
//
//  REZERVASYON:  ID(0) TARIH(1) SAAT(2) CIKIS(3) OTEL(4)
//                YETISKIN(5) COCUK(6) UYRUK(7) NOT(8) DURUM(9)
//                KART(10) AYAK(11) T1(12) T2(13) T3(14) T4(15)
//                GIRDI(16) CIKTI(17) SATIS(18) CREATED_AT(19) UPDATED_AT(20)
//
//  PERSONEL:     ID(0) ADSOYAD(1) GRUP(2) AKTIF(3) CREATED_AT(4) UPDATED_AT(5)
//
//  IZIN:         ID(0) PERSONEL(1) TARIH(2) DURUM(3) ACIKLAMA(4) CREATED_AT(5)
//
//  OTELLER:      ID(0) OTELADI(1) ACENTAKOD(2) AKTIF(3)
//                CREATED_AT(4) UPDATED_AT(5)
//                KULLANICI_KODU(6) SIFRE(7)   ← Google Sheet'e ekleyin
//
//  AYARLAR:      ANAHTAR(0) DEGER(1)
//  LOGS:         ID(0) DATE(1) ACTION(2) USER(3) DETAILS(4)
// ============================================================

const API_SECRET  = "PIANO_DERI_SECRET_2025";
const DEFAULT_PIN = "1907";

const SH_REZ      = "REZERVASYON";
const SH_PERSONEL = "PERSONEL";
const SH_IZIN     = "IZIN";
const SH_OTELLER  = "OTELLER";
const SH_AYARLAR  = "AYARLAR";
const SH_LOGS     = "LOGS";

function jr(d){ return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON); }
function sh(n){ return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }
function ok(e){ return e&&e.parameter&&String(e.parameter.key)===API_SECRET; }
function no() { return jr({success:false,message:"Unauthorized"}); }

function getPin(){
  try{ return PropertiesService.getScriptProperties().getProperty("ADMIN_PIN")||DEFAULT_PIN; }
  catch(e){ return DEFAULT_PIN; }
}

// ── Tarih / Saat normalleştirme ──────────────────────────────
function td(v){
  if(!v) return "";
  if(Object.prototype.toString.call(v)==="[object Date]")
    return Utilities.formatDate(v,Session.getScriptTimeZone(),"yyyy-MM-dd");
  let s=String(v).trim();
  if(s.indexOf("GMT")>-1){ try{ return Utilities.formatDate(new Date(s),Session.getScriptTimeZone(),"yyyy-MM-dd"); }catch(e2){} }
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){ const p=s.split("/"); return p[2]+"-"+p[1]+"-"+p[0]; }
  if(s.includes(".")){ const p=s.split("."); if(p.length>=3) return p[2].slice(0,4)+"-"+p[1].padStart(2,"0")+"-"+p[0].padStart(2,"0"); }
  return s.slice(0,10);
}

function tt(v){
  if(!v) return "";
  if(Object.prototype.toString.call(v)==="[object Date]")
    return Utilities.formatDate(v,Session.getScriptTimeZone(),"HH:mm");
  let s=String(v).trim();
  if(s.indexOf("GMT")>-1){ try{ return Utilities.formatDate(new Date(s),Session.getScriptTimeZone(),"HH:mm"); }catch(e2){} }
  return s.slice(0,5);
}

function boolStr(v){
  // Boolean veya "TRUE"/"FALSE" string → "TRUE" / ""
  if(v===true||String(v).toUpperCase()==="TRUE") return "TRUE";
  return "";
}

function logA(a,u,d){
  const s=sh(SH_LOGS);
  if(s) s.appendRow([new Date().getTime(),new Date(),a,u,String(d||"").slice(0,300)]);
}

function ayarOku(anahtar){
  const s=sh(SH_AYARLAR);
  if(!s) return "";
  const d=s.getDataRange().getValues();
  for(let i=0;i<d.length;i++){
    if(String(d[i][0])===anahtar) return String(d[i][1]||"");
  }
  return "";
}

// ── Router GET ───────────────────────────────────────────────
function doGet(e){
  if(!ok(e)) return no();
  const a=e.parameter.action;
  if(a==="adminAuth")           return adminAuth(e);
  if(a==="login")               return login(e);
  if(a==="getHotels")           return getHotels();
  if(a==="deleteHotel")         return deleteHotel(e);
  if(a==="getReservations")     return getReservations(e);
  if(a==="cancelReservation")   return setStatus(e.parameter.id,"CANCELLED","USER");
  if(a==="getStaff")            return getStaff();
  if(a==="deleteStaff")         return deleteStaff(e);
  if(a==="getLogs")             return getLogs(e);
  if(a==="getStats")            return getStats(e);
  if(a==="getStaffPerformance") return getStaffPerformance(e);
  if(a==="searchReservations")  return searchReservations(e);
  return jr({success:true,message:"Piano Deri V6.1 API — Ozel yapı"});
}

// ── Router POST ──────────────────────────────────────────────
function doPost(e){
  if(!ok(e)) return no();
  const a=e.parameter.action;
  if(a==="addHotel")             return addHotel(e);
  if(a==="updateHotel")          return updateHotel(e);
  if(a==="addReservation")       return addRes(e);
  if(a==="updateReservation")    return updateRes(e);
  if(a==="updateReservationOps") return updateOps(e);
  if(a==="addStaff")             return addStaff(e);
  if(a==="updateStaff")          return updateStaff(e);
  if(a==="setStaffOff")          return setStaffOff(e);
  if(a==="changePin")            return changePin(e);
  return jr({success:false,message:"Unknown action"});
}

// ── Admin ────────────────────────────────────────────────────
function adminAuth(e){
  if(String(e.parameter.pin)===getPin()){
    logA("ADMIN_LOGIN","ADMIN","");
    return jr({success:true});
  }
  return jr({success:false,message:"Hatali PIN"});
}

function changePin(e){
  const b=JSON.parse(e.postData.contents);
  if(String(b.oldPin)!==getPin()) return jr({success:false,message:"Mevcut PIN hatali"});
  if(!b.newPin||String(b.newPin).length<4) return jr({success:false,message:"Yeni PIN en az 4 karakter"});
  PropertiesService.getScriptProperties().setProperty("ADMIN_PIN",String(b.newPin));
  logA("CHANGE_PIN","ADMIN","PIN degistirildi");
  return jr({success:true});
}

// ── Otel ─────────────────────────────────────────────────────
// OTELLER: ID(0) OTELADI(1) ACENTAKOD(2) AKTIF(3) CREATED_AT(4) UPDATED_AT(5) KULLANICI_KODU(6) SIFRE(7)
function login(e){
  const d=sh(SH_OTELLER).getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    const aktif = d[i][3]===true||String(d[i][3]).toUpperCase()==="TRUE";
    if(!aktif) continue;
    const code = String(d[i][6]||"").trim();
    const pass  = String(d[i][7]||"").trim();
    if(code.toLowerCase()===String(e.parameter.code||"").trim().toLowerCase() &&
       pass===String(e.parameter.password||"").trim()){
      logA("LOGIN",d[i][1],"Hotel login");
      return jr({success:true,hotel:d[i][1],code:d[i][6]});
    }
  }
  return jr({success:false,message:"Hatali kullanici kodu veya sifre"});
}

function getHotels(){
  const d=sh(SH_OTELLER).getDataRange().getValues();
  const r=[];
  for(let i=1;i<d.length;i++){
    if(!d[i][0]) continue;
    r.push({
      id:         d[i][0],
      hotel:      d[i][1],   // OTELADI
      acentaCode: d[i][2],   // ACENTAKOD
      status:     (d[i][3]===true||String(d[i][3]).toUpperCase()==="TRUE")?"ACTIVE":"INACTIVE",
      code:       d[i][6]||"", // KULLANICI_KODU
      password:   d[i][7]||""  // SIFRE
    });
  }
  return jr(r);
}

function addHotel(e){
  const b=JSON.parse(e.postData.contents);
  const id=new Date().getTime();
  // ID OTELADI ACENTAKOD AKTIF CREATED_AT UPDATED_AT KULLANICI_KODU SIFRE
  sh(SH_OTELLER).appendRow([id,b.hotel,b.acentaCode||"",true,new Date(),new Date(),b.code||"",b.password||""]);
  logA("ADD_HOTEL","ADMIN",b.hotel);
  return jr({success:true,id});
}

function updateHotel(e){
  const b=JSON.parse(e.postData.contents);
  const s=sh(SH_OTELLER),d=s.getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    if(String(d[i][0])===String(b.id)){
      if(b.hotel      !==undefined) s.getRange(i+1,2).setValue(b.hotel);
      if(b.acentaCode !==undefined) s.getRange(i+1,3).setValue(b.acentaCode);
      if(b.status     !==undefined) s.getRange(i+1,4).setValue(b.status==="ACTIVE");
      if(b.code       !==undefined) s.getRange(i+1,7).setValue(b.code);
      if(b.password   !==undefined) s.getRange(i+1,8).setValue(b.password);
      s.getRange(i+1,6).setValue(new Date()); // UPDATED_AT
      logA("UPDATE_HOTEL","ADMIN",b.hotel||b.id);
      return jr({success:true});
    }
  }
  return jr({success:false,message:"Otel bulunamadi"});
}

function deleteHotel(e){
  const s=sh(SH_OTELLER),d=s.getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    if(String(d[i][0])===String(e.parameter.id)){
      const name=d[i][1];
      s.deleteRow(i+1);
      logA("DELETE_HOTEL","ADMIN",name);
      return jr({success:true});
    }
  }
  return jr({success:false,message:"Otel bulunamadi"});
}

// ── Rezervasyon ──────────────────────────────────────────────
// REZERVASYON: ID(0) TARIH(1) SAAT(2) CIKIS(3) OTEL(4) YETISKIN(5) COCUK(6)
//              UYRUK(7) NOT(8) DURUM(9) KART(10) AYAK(11) T1(12) T2(13) T3(14) T4(15)
//              GIRDI(16) CIKTI(17) SATIS(18) CREATED_AT(19) UPDATED_AT(20)
function addRes(e){
  const b=JSON.parse(e.postData.contents);
  const id=new Date().getTime()+Math.floor(Math.random()*1000);
  sh(SH_REZ).appendRow([
    id,
    td(b.date),     // TARIH
    tt(b.time),     // SAAT
    b.ciktiSaati||"", // CIKIS
    b.hotel,        // OTEL
    Number(b.adult||0), // YETISKIN
    Number(b.child||0), // COCUK
    b.nation||"",   // UYRUK
    b.notes||"",    // NOT
    b.status||"PENDING", // DURUM
    b.kart||"",     // KART
    b.ayak||"",     // AYAK
    b.staff1||"", b.staff2||"", b.staff3||"", b.staff4||"", // T1-T4
    b.girdi?true:false,  // GIRDI (boolean)
    b.cikti?true:false,  // CIKTI (boolean)
    b.satis?true:false,  // SATIS (boolean)
    new Date(), new Date()
  ]);
  logA("ADD_RES",b.hotel||"CENTER",b.hotel+" "+b.date+" "+b.time);
  return jr({success:true,id});
}

function resRow(d){
  return{
    id:         d[0],
    date:       td(d[1]),
    time:       tt(d[2]),
    ciktiSaati: tt(d[3]),
    hotel:      String(d[4]||"").trim(),
    adult:      d[5],
    child:      d[6],
    nation:     d[7],
    notes:      d[8],
    status:     d[9],
    kart:       d[10],
    ayak:       d[11],
    staff1:     d[12], staff2: d[13], staff3: d[14], staff4: d[15],
    girdi:      boolStr(d[16]),
    cikti:      boolStr(d[17]),
    satis:      boolStr(d[18]),
    createdAt:  d[19],
    updatedAt:  d[20]
  };
}

function getReservations(e){
  const date  = td(e.parameter.date||"");
  const hotel = String(e.parameter.hotel||"").trim().toLowerCase();
  const d=sh(SH_REZ).getDataRange().getValues();
  const r=[];
  for(let i=1;i<d.length;i++){
    if(!d[i][0]) continue;
    if(date  && td(d[i][1])!==date) continue;
    if(hotel && String(d[i][4]||"").trim().toLowerCase()!==hotel) continue;
    r.push(resRow(d[i]));
  }
  r.sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  return jr(r);
}

function searchReservations(e){
  const hotel=e.parameter.hotel||"",nation=e.parameter.nation||"",
        status=e.parameter.status||"",startDate=e.parameter.startDate||"",
        endDate=e.parameter.endDate||"",staffF=e.parameter.staff||"";
  const d=sh(SH_REZ).getDataRange().getValues();
  const r=[];
  for(let i=1;i<d.length;i++){
    if(!d[i][0]) continue;
    const date=td(d[i][1]);
    if(startDate&&date<startDate) continue;
    if(endDate  &&date>endDate)   continue;
    if(hotel  &&!String(d[i][4]).toLowerCase().includes(hotel.toLowerCase())) continue;
    if(nation &&String(d[i][7])!==nation) continue;
    if(status &&String(d[i][9])!==status) continue;
    if(staffF){
      const arr=[d[i][12],d[i][13],d[i][14],d[i][15]].filter(Boolean);
      if(!arr.includes(staffF)) continue;
    }
    r.push(resRow(d[i]));
  }
  r.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.time).localeCompare(String(b.time)));
  return jr(r);
}

function updateRes(e){
  const b=JSON.parse(e.postData.contents);
  const s=sh(SH_REZ),d=s.getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    if(String(d[i][0])===String(b.id)){
      s.getRange(i+1,2).setValue(td(b.date));
      s.getRange(i+1,3).setValue(tt(b.time));
      s.getRange(i+1,5).setValue(b.hotel||d[i][4]);
      s.getRange(i+1,6).setValue(Number(b.adult||0));
      s.getRange(i+1,7).setValue(Number(b.child||0));
      s.getRange(i+1,8).setValue(b.nation||"");
      s.getRange(i+1,9).setValue(b.notes||"");
      s.getRange(i+1,10).setValue(b.status||"UPDATED");
      s.getRange(i+1,21).setValue(new Date());
      logA("UPDATE_RES","CENTER",b.id);
      return jr({success:true});
    }
  }
  return jr({success:false,message:"Rezervasyon bulunamadi"});
}

function updateOps(e){
  const b=JSON.parse(e.postData.contents);
  const s=sh(SH_REZ),d=s.getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    if(String(d[i][0])===String(b.id)){
      if(b.kart       !==undefined) s.getRange(i+1,11).setValue(b.kart);
      if(b.ayak       !==undefined) s.getRange(i+1,12).setValue(b.ayak);
      if(b.staff1     !==undefined) s.getRange(i+1,13).setValue(b.staff1);
      if(b.staff2     !==undefined) s.getRange(i+1,14).setValue(b.staff2);
      if(b.staff3     !==undefined) s.getRange(i+1,15).setValue(b.staff3);
      if(b.staff4     !==undefined) s.getRange(i+1,16).setValue(b.staff4);
      if(b.girdi      !==undefined) s.getRange(i+1,17).setValue(b.girdi==="TRUE"||b.girdi===true);
      if(b.cikti      !==undefined) s.getRange(i+1,18).setValue(b.cikti==="TRUE"||b.cikti===true);
      if(b.ciktiSaati !==undefined) s.getRange(i+1,4).setValue(b.ciktiSaati);  // CIKIS sütunu
      if(b.satis      !==undefined) s.getRange(i+1,19).setValue(b.satis==="TRUE"||b.satis===true);
      if(b.status     !==undefined) s.getRange(i+1,10).setValue(b.status);
      s.getRange(i+1,21).setValue(new Date());
      logA("UPDATE_OPS","CENTER",b.id);
      return jr({success:true});
    }
  }
  return jr({success:false});
}

function setStatus(id,status,user){
  const s=sh(SH_REZ),d=s.getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    if(String(d[i][0])===String(id)){
      s.getRange(i+1,10).setValue(status); // DURUM
      s.getRange(i+1,21).setValue(new Date());
      logA("SET_STATUS",user,id+" => "+status);
      return jr({success:true});
    }
  }
  return jr({success:false});
}

// ── Personel ─────────────────────────────────────────────────
// PERSONEL: ID(0) ADSOYAD(1) GRUP(2) AKTIF(3) CREATED_AT(4) UPDATED_AT(5)
// IZIN: ID(0) PERSONEL(1) TARIH(2) DURUM(3) ACIKLAMA(4) CREATED_AT(5)

function getOffDatesForStaff(staffName){
  const s=sh(SH_IZIN);
  if(!s) return "";
  const d=s.getDataRange().getValues();
  const dates=[];
  for(let i=1;i<d.length;i++){
    if(String(d[i][1])===String(staffName)){
      const t=td(d[i][2]);
      if(t&&!dates.includes(t)) dates.push(t);
    }
  }
  return dates.join(",");
}

function getStaff(){
  const d=sh(SH_PERSONEL).getDataRange().getValues();
  const r=[];
  for(let i=1;i<d.length;i++){
    if(!d[i][0]) continue;
    const aktif=d[i][3]===true||String(d[i][3]).toUpperCase()==="TRUE";
    r.push({
      id:       d[i][0],
      name:     d[i][1],         // ADSOYAD
      grup:     d[i][2]||"",     // GRUP
      status:   aktif?"ACTIVE":"INACTIVE",
      offDates: getOffDatesForStaff(d[i][1])
    });
  }
  r.sort((a,b)=>String(a.name).localeCompare(String(b.name),"tr"));
  return jr(r);
}

function addStaff(e){
  const b=JSON.parse(e.postData.contents);
  const id=new Date().getTime();
  // ID ADSOYAD GRUP AKTIF CREATED_AT UPDATED_AT
  sh(SH_PERSONEL).appendRow([id,b.name,b.grup||"",true,new Date(),new Date()]);
  logA("ADD_STAFF","CENTER",b.name);
  return jr({success:true,id});
}

function updateStaff(e){
  const b=JSON.parse(e.postData.contents);
  const s=sh(SH_PERSONEL),d=s.getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    if(String(d[i][0])===String(b.id)){
      if(b.name  !==undefined) s.getRange(i+1,2).setValue(b.name);
      if(b.grup  !==undefined) s.getRange(i+1,3).setValue(b.grup);
      if(b.status!==undefined) s.getRange(i+1,4).setValue(b.status==="ACTIVE");
      s.getRange(i+1,6).setValue(new Date());
      logA("UPDATE_STAFF","CENTER",b.name||b.id);
      return jr({success:true});
    }
  }
  return jr({success:false});
}

function setStaffOff(e){
  const b=JSON.parse(e.postData.contents);
  const off = b.off===true||b.off==="true"||b.off===1;

  // Personel adını bul
  const pd=sh(SH_PERSONEL).getDataRange().getValues();
  let staffName="";
  for(let i=1;i<pd.length;i++){
    if(String(pd[i][0])===String(b.id)){staffName=pd[i][1];break;}
  }
  if(!staffName) return jr({success:false,message:"Personel bulunamadi"});

  const date=td(b.date);
  const si=sh(SH_IZIN);
  const id=sh(SH_IZIN);
  const d=si.getDataRange().getValues();

  if(off){
    // Zaten var mı?
    for(let i=1;i<d.length;i++){
      if(String(d[i][1])===staffName&&td(d[i][2])===date) return jr({success:true});
    }
    si.appendRow([new Date().getTime(),staffName,date,"AKTIF","",new Date()]);
    logA("STAFF_OFF","CENTER",staffName+" "+date);
  } else {
    // Sil
    for(let i=d.length-1;i>=1;i--){
      if(String(d[i][1])===staffName&&td(d[i][2])===date){
        si.deleteRow(i+1);
        break;
      }
    }
    logA("STAFF_OFF_REMOVE","CENTER",staffName+" "+date);
  }
  return jr({success:true});
}

function deleteStaff(e){
  const s=sh(SH_PERSONEL),d=s.getDataRange().getValues();
  for(let i=1;i<d.length;i++){
    if(String(d[i][0])===String(e.parameter.id)){
      const name=d[i][1];
      s.deleteRow(i+1);
      logA("DELETE_STAFF","CENTER",name);
      return jr({success:true});
    }
  }
  return jr({success:false});
}

// ── İstatistik ───────────────────────────────────────────────
function getStats(e){
  const startDate=e.parameter.startDate||"",endDate=e.parameter.endDate||"";
  const d=sh(SH_REZ).getDataRange().getValues();
  let totalRes=0,totalPax=0;
  const byStatus={},byNation={},byHotel={},byDay={},byHour={};
  for(let i=1;i<d.length;i++){
    if(!d[i][0]) continue;
    const date=td(d[i][1]);
    if(startDate&&date<startDate) continue;
    if(endDate  &&date>endDate)   continue;
    const adult=Number(d[i][5])||0,child=Number(d[i][6])||0;
    const hour=String(d[i][2]||"").slice(0,2)||"??";
    const status=String(d[i][9]||"PENDING");
    const nation=String(d[i][7]||"Diger");
    const hotel =String(d[i][4]||"");
    totalRes++; totalPax+=adult+child;
    byStatus[status]=(byStatus[status]||0)+1;
    byNation[nation]=(byNation[nation]||0)+1;
    byHotel[hotel]  =(byHotel[hotel]  ||0)+1;
    byDay[date]     =(byDay[date]     ||0)+1;
    byHour[hour]    =(byHour[hour]    ||0)+1;
  }
  return jr({success:true,totalRes,totalPax,byStatus,byNation,byHotel,byDay,byHour});
}

function getStaffPerformance(e){
  const startDate=e.parameter.startDate||"",endDate=e.parameter.endDate||"";
  const d=sh(SH_REZ).getDataRange().getValues();
  const perf={};
  for(let i=1;i<d.length;i++){
    if(!d[i][0]) continue;
    const date=td(d[i][1]);
    if(startDate&&date<startDate) continue;
    if(endDate  &&date>endDate)   continue;
    if(String(d[i][9])==="CANCELLED") continue;
    const pax=(Number(d[i][5])||0)+(Number(d[i][6])||0);
    [d[i][12],d[i][13],d[i][14],d[i][15]].filter(Boolean).forEach(name=>{
      if(!perf[name]) perf[name]={count:0,pax:0};
      perf[name].count++; perf[name].pax+=pax;
    });
  }
  return jr(Object.entries(perf).map(([name,v])=>({name,count:v.count,pax:v.pax})).sort((a,b)=>b.count-a.count));
}

// ── Log ──────────────────────────────────────────────────────
function getLogs(e){
  const limit=Math.min(Number(e.parameter.limit||200),500);
  const actionF=e.parameter.action_filter||"";
  const userF  =e.parameter.user_filter  ||"";
  const startDate=e.parameter.startDate  ||"";
  const endDate  =e.parameter.endDate    ||"";
  const s=sh(SH_LOGS);
  if(!s) return jr([]);
  const d=s.getDataRange().getValues();
  const r=[];
  for(let i=1;i<d.length;i++){
    if(!d[i][0]) continue;
    const logDate=String(d[i][1]).slice(0,10);
    if(startDate&&logDate<startDate) continue;
    if(endDate  &&logDate>endDate)   continue;
    if(actionF&&String(d[i][2])!==actionF) continue;
    if(userF  &&!String(d[i][3]).toLowerCase().includes(userF.toLowerCase())) continue;
    r.push({id:d[i][0],date:d[i][1],action:d[i][2],user:d[i][3],details:d[i][4]});
  }
  return jr(r.slice(-limit).reverse());
}
