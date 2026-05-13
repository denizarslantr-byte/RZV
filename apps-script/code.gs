// ============================================================
//  Piano Deri — Apps Script Backend  V6.0
//  Reservations sütunlar (1-indexed):
//  ID(1) DATE(2) TIME(3) HOTEL(4) ADULT(5) CHILD(6)
//  NATION(7) NOTES(8) STATUS(9) KART(10) AYAK(11)
//  T1(12) T2(13) T3(14) T4(15) GIRDI(16) CIKTI(17)
//  CIKTI_SAATI(18) CREATED_AT(19) UPDATED_AT(20)
//
//  Hotels sütunlar (1-indexed):
//  ID(1) HOTEL_NAME(2) USER_CODE(3) PASSWORD(4)
//  STATUS(5) ACENTA_CODE(6) CREATED_AT(7)
// ============================================================

const API_SECRET  = "PIANO_DERI_SECRET_2025";
const DEFAULT_PIN = "1907";
const SH_HOTELS = "Hotels";
const SH_RES    = "Reservations";
const SH_STAFF  = "Staff";
const SH_LOGS   = "Logs";

function jr(d) { return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON); }
function sh(n) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }
function ok(e) { return e && e.parameter && String(e.parameter.key) === API_SECRET; }
function no()  { return jr({ success: false, message: "Unauthorized" }); }

function getPin() {
  try { return PropertiesService.getScriptProperties().getProperty("ADMIN_PIN") || DEFAULT_PIN; }
  catch(e) { return DEFAULT_PIN; }
}

function td(v) {
  if (!v) return "";
  if (Object.prototype.toString.call(v) === "[object Date]")
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  let s = String(v).trim();
  if (s.indexOf("GMT") > -1) {
    try { return Utilities.formatDate(new Date(s), Session.getScriptTimeZone(), "yyyy-MM-dd"); } catch(e2) {}
  }
  if (s.includes(".")) {
    const p = s.split(".");
    if (p.length >= 3) return p[2].slice(0,4)+"-"+p[1].padStart(2,"0")+"-"+p[0].padStart(2,"0");
  }
  return s.slice(0, 10);
}

function tt(v) {
  if (!v) return "";
  if (Object.prototype.toString.call(v) === "[object Date]")
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "HH:mm");
  let s = String(v).trim();
  if (s.indexOf("GMT") > -1) {
    try { return Utilities.formatDate(new Date(s), Session.getScriptTimeZone(), "HH:mm"); } catch(e2) {}
  }
  return s.slice(0, 5);
}

function logA(a, u, d) {
  const s = sh(SH_LOGS);
  if (s) s.appendRow([new Date().getTime(), new Date(), a, u, String(d || "").slice(0, 300)]);
}

// ── Router GET ───────────────────────────────────────────────
function doGet(e) {
  if (!ok(e)) return no();
  const a = e.parameter.action;
  if (a === "adminAuth")           return adminAuth(e);
  if (a === "login")               return login(e);
  if (a === "getHotels")           return getHotels();
  if (a === "deleteHotel")         return deleteHotel(e);
  if (a === "getReservations")     return getReservations(e);
  if (a === "cancelReservation")   return setStatus(e.parameter.id, "CANCELLED", "USER");
  if (a === "getStaff")            return getStaff();
  if (a === "deleteStaff")         return deleteStaff(e);
  if (a === "getLogs")             return getLogs(e);
  if (a === "getStats")            return getStats(e);
  if (a === "getStaffPerformance") return getStaffPerformance(e);
  if (a === "searchReservations")  return searchReservations(e);
  return jr({ success: true, message: "Piano Deri V6.0 API" });
}

// ── Router POST ──────────────────────────────────────────────
function doPost(e) {
  if (!ok(e)) return no();
  const a = e.parameter.action;
  if (a === "addHotel")             return addHotel(e);
  if (a === "updateHotel")          return updateHotel(e);
  if (a === "addReservation")       return addRes(e);
  if (a === "updateReservation")    return updateRes(e);
  if (a === "updateReservationOps") return updateOps(e);
  if (a === "addStaff")             return addStaff(e);
  if (a === "setStaffOff")          return setStaffOff(e);
  if (a === "changePin")            return changePin(e);
  return jr({ success: false, message: "Unknown action" });
}

// ── Admin Auth ────────────────────────────────────────────────
function adminAuth(e) {
  if (String(e.parameter.pin) === getPin()) {
    logA("ADMIN_LOGIN", "ADMIN", "Admin panel girisi");
    return jr({ success: true });
  }
  return jr({ success: false, message: "Hatali PIN" });
}

function changePin(e) {
  const b = JSON.parse(e.postData.contents);
  if (String(b.oldPin) !== getPin()) return jr({ success: false, message: "Mevcut PIN hatali" });
  if (!b.newPin || String(b.newPin).length < 4) return jr({ success: false, message: "Yeni PIN en az 4 karakter olmali" });
  PropertiesService.getScriptProperties().setProperty("ADMIN_PIN", String(b.newPin));
  logA("CHANGE_PIN", "ADMIN", "PIN degistirildi");
  return jr({ success: true });
}

// ── Otel ─────────────────────────────────────────────────────
function login(e) {
  const d = sh(SH_HOTELS).getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][2]).trim().toLowerCase() === String(e.parameter.code).trim().toLowerCase() &&
        String(d[i][3]).trim() === String(e.parameter.password).trim() &&
        String(d[i][4]) === "ACTIVE") {
      logA("LOGIN", d[i][1], "Hotel login");
      return jr({ success: true, hotel: d[i][1], code: d[i][2] });
    }
  }
  return jr({ success: false, message: "Hatali kullanici kodu veya sifre" });
}

function getHotels() {
  const d = sh(SH_HOTELS).getDataRange().getValues();
  const r = [];
  for (let i = 1; i < d.length; i++) {
    if (d[i][0]) r.push({
      id: d[i][0], hotel: d[i][1], code: d[i][2],
      password: d[i][3], status: d[i][4], acentaCode: d[i][5] || ""
    });
  }
  return jr(r);
}

function addHotel(e) {
  const b = JSON.parse(e.postData.contents);
  const id = new Date().getTime();
  sh(SH_HOTELS).appendRow([id, b.hotel, b.code, b.password, b.status || "ACTIVE", b.acentaCode || "", new Date()]);
  logA("ADD_HOTEL", "ADMIN", b.hotel);
  return jr({ success: true, id });
}

function updateHotel(e) {
  const b = JSON.parse(e.postData.contents);
  const s = sh(SH_HOTELS), d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(b.id)) {
      s.getRange(i+1, 2).setValue(b.hotel);
      s.getRange(i+1, 3).setValue(b.code);
      s.getRange(i+1, 4).setValue(b.password);
      s.getRange(i+1, 5).setValue(b.status || "ACTIVE");
      s.getRange(i+1, 6).setValue(b.acentaCode || "");
      logA("UPDATE_HOTEL", "ADMIN", b.hotel);
      return jr({ success: true });
    }
  }
  return jr({ success: false, message: "Otel bulunamadi" });
}

function deleteHotel(e) {
  const s = sh(SH_HOTELS), d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(e.parameter.id)) {
      const name = d[i][1];
      s.deleteRow(i + 1);
      logA("DELETE_HOTEL", "ADMIN", name);
      return jr({ success: true });
    }
  }
  return jr({ success: false, message: "Otel bulunamadi" });
}

// ── Rezervasyon ──────────────────────────────────────────────
function addRes(e) {
  const b = JSON.parse(e.postData.contents);
  const id = new Date().getTime() + Math.floor(Math.random() * 1000);
  sh(SH_RES).appendRow([
    id, td(b.date), tt(b.time), b.hotel,
    Number(b.adult || 0), Number(b.child || 0),
    b.nation, b.notes || "", b.status || "PENDING",
    b.kart || "", b.ayak || "",
    b.staff1 || "", b.staff2 || "", b.staff3 || "", b.staff4 || "",
    b.girdi || "", b.cikti || "", b.ciktiSaati || "",
    new Date(), new Date()
  ]);
  logA("ADD_RES", b.hotel || "CENTER", b.hotel + " " + b.date + " " + b.time);
  return jr({ success: true, id });
}

function getReservations(e) {
  const date  = td(e.parameter.date  || "");
  const hotel = String(e.parameter.hotel || "").trim().toLowerCase();
  const d = sh(SH_RES).getDataRange().getValues();
  const r = [];
  for (let i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    if (date  && td(d[i][1]) !== date) continue;
    if (hotel && String(d[i][3] || "").trim().toLowerCase() !== hotel) continue;
    r.push(resRow(d[i]));
  }
  r.sort((a, b) => String(a.time).localeCompare(String(b.time)));
  return jr(r);
}

function searchReservations(e) {
  const hotel     = e.parameter.hotel     || "";
  const nation    = e.parameter.nation    || "";
  const status    = e.parameter.status    || "";
  const startDate = e.parameter.startDate || "";
  const endDate   = e.parameter.endDate   || "";
  const staffF    = e.parameter.staff     || "";
  const d = sh(SH_RES).getDataRange().getValues();
  const r = [];
  for (let i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    const date = td(d[i][1]);
    if (startDate && date < startDate) continue;
    if (endDate   && date > endDate)   continue;
    if (hotel  && !String(d[i][3]).toLowerCase().includes(hotel.toLowerCase())) continue;
    if (nation && String(d[i][6]) !== nation) continue;
    if (status && String(d[i][8]) !== status) continue;
    if (staffF) {
      const arr = [d[i][11], d[i][12], d[i][13], d[i][14]].filter(Boolean);
      if (!arr.includes(staffF)) continue;
    }
    r.push(resRow(d[i]));
  }
  r.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.time).localeCompare(String(b.time)));
  return jr(r);
}

function resRow(d) {
  return {
    id: d[0], date: td(d[1]), time: tt(d[2]), hotel: String(d[3] || "").trim(),
    adult: d[4], child: d[5], nation: d[6], notes: d[7], status: d[8],
    kart: d[9], ayak: d[10], staff1: d[11], staff2: d[12], staff3: d[13], staff4: d[14],
    girdi: d[15], cikti: d[16], ciktiSaati: d[17] || "",
    createdAt: d[18], updatedAt: d[19]
  };
}

function updateRes(e) {
  const b = JSON.parse(e.postData.contents);
  const s = sh(SH_RES), d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(b.id)) {
      s.getRange(i+1,  2).setValue(td(b.date));
      s.getRange(i+1,  3).setValue(tt(b.time));
      s.getRange(i+1,  4).setValue(b.hotel || d[i][3]);
      s.getRange(i+1,  5).setValue(Number(b.adult || 0));
      s.getRange(i+1,  6).setValue(Number(b.child || 0));
      s.getRange(i+1,  7).setValue(b.nation);
      s.getRange(i+1,  8).setValue(b.notes || "");
      s.getRange(i+1,  9).setValue(b.status || "UPDATED");
      s.getRange(i+1, 20).setValue(new Date());
      logA("UPDATE_RES", "CENTER", b.id);
      return jr({ success: true });
    }
  }
  return jr({ success: false, message: "Rezervasyon bulunamadi" });
}

function updateOps(e) {
  const b = JSON.parse(e.postData.contents);
  const s = sh(SH_RES), d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(b.id)) {
      if (b.kart       !== undefined) s.getRange(i+1, 10).setValue(b.kart);
      if (b.ayak       !== undefined) s.getRange(i+1, 11).setValue(b.ayak);
      if (b.staff1     !== undefined) s.getRange(i+1, 12).setValue(b.staff1);
      if (b.staff2     !== undefined) s.getRange(i+1, 13).setValue(b.staff2);
      if (b.staff3     !== undefined) s.getRange(i+1, 14).setValue(b.staff3);
      if (b.staff4     !== undefined) s.getRange(i+1, 15).setValue(b.staff4);
      if (b.girdi      !== undefined) s.getRange(i+1, 16).setValue(b.girdi);
      if (b.cikti      !== undefined) s.getRange(i+1, 17).setValue(b.cikti);
      if (b.ciktiSaati !== undefined) s.getRange(i+1, 18).setValue(b.ciktiSaati);
      if (b.status     !== undefined) s.getRange(i+1,  9).setValue(b.status);
      s.getRange(i+1, 20).setValue(new Date());
      logA("UPDATE_OPS", "CENTER", b.id);
      return jr({ success: true });
    }
  }
  return jr({ success: false });
}

function setStatus(id, status, user) {
  const s = sh(SH_RES), d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) {
      s.getRange(i+1,  9).setValue(status);
      s.getRange(i+1, 20).setValue(new Date());
      logA("SET_STATUS", user, id + " => " + status);
      return jr({ success: true });
    }
  }
  return jr({ success: false });
}

// ── Personel ─────────────────────────────────────────────────
function getStaff() {
  const d = sh(SH_STAFF).getDataRange().getValues();
  const r = [];
  for (let i = 1; i < d.length; i++) {
    if (d[i][0]) r.push({ id: d[i][0], name: d[i][1], status: d[i][2], offDates: d[i][3] || "" });
  }
  r.sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
  return jr(r);
}

function addStaff(e) {
  const b = JSON.parse(e.postData.contents);
  const id = new Date().getTime();
  sh(SH_STAFF).appendRow([id, b.name, "ACTIVE", "", new Date()]);
  logA("ADD_STAFF", "ADMIN", b.name);
  return jr({ success: true, id });
}

function setStaffOff(e) {
  const b = JSON.parse(e.postData.contents);
  const s = sh(SH_STAFF), d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(b.id)) {
      let dates = String(d[i][3] || "").split(",").map(x => x.trim()).filter(Boolean);
      if (b.off === true || b.off === "true" || b.off === 1) {
        if (!dates.includes(b.date)) dates.push(b.date);
      } else {
        dates = dates.filter(x => x !== b.date);
      }
      s.getRange(i+1, 4).setValue(dates.join(","));
      logA(b.off ? "STAFF_OFF" : "STAFF_OFF_REMOVE", "CENTER", d[i][1] + " " + b.date);
      return jr({ success: true, dates: dates.join(",") });
    }
  }
  return jr({ success: false, message: "Personel bulunamadi" });
}

function deleteStaff(e) {
  const s = sh(SH_STAFF), d = s.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(e.parameter.id)) {
      const name = d[i][1];
      s.deleteRow(i + 1);
      logA("DELETE_STAFF", "ADMIN", name);
      return jr({ success: true });
    }
  }
  return jr({ success: false });
}

// ── İstatistik ───────────────────────────────────────────────
function getStats(e) {
  const startDate = e.parameter.startDate || "";
  const endDate   = e.parameter.endDate   || "";
  const d = sh(SH_RES).getDataRange().getValues();
  let totalRes = 0, totalPax = 0;
  const byStatus = {}, byNation = {}, byHotel = {}, byDay = {}, byHour = {};
  for (let i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    const date = td(d[i][1]);
    if (startDate && date < startDate) continue;
    if (endDate   && date > endDate)   continue;
    const adult = Number(d[i][4]) || 0, child = Number(d[i][5]) || 0;
    const hour  = String(d[i][2] || "").slice(0, 2) || "??";
    const stat  = String(d[i][8] || "PENDING");
    const nation= String(d[i][6] || "Diger");
    const hotel = String(d[i][3] || "");
    totalRes++;
    totalPax += adult + child;
    byStatus[stat]   = (byStatus[stat]   || 0) + 1;
    byNation[nation] = (byNation[nation] || 0) + 1;
    byHotel[hotel]   = (byHotel[hotel]   || 0) + 1;
    byDay[date]      = (byDay[date]      || 0) + 1;
    byHour[hour]     = (byHour[hour]     || 0) + 1;
  }
  return jr({ success: true, totalRes, totalPax, byStatus, byNation, byHotel, byDay, byHour });
}

function getStaffPerformance(e) {
  const startDate = e.parameter.startDate || "";
  const endDate   = e.parameter.endDate   || "";
  const d = sh(SH_RES).getDataRange().getValues();
  const perf = {};
  for (let i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    const date = td(d[i][1]);
    if (startDate && date < startDate) continue;
    if (endDate   && date > endDate)   continue;
    if (String(d[i][8]) === "CANCELLED") continue;
    const pax = (Number(d[i][4]) || 0) + (Number(d[i][5]) || 0);
    [d[i][11], d[i][12], d[i][13], d[i][14]].filter(Boolean).forEach(name => {
      if (!perf[name]) perf[name] = { count: 0, pax: 0 };
      perf[name].count++;
      perf[name].pax += pax;
    });
  }
  return jr(Object.entries(perf)
    .map(([name, v]) => ({ name, count: v.count, pax: v.pax }))
    .sort((a, b) => b.count - a.count));
}

// ── Log ──────────────────────────────────────────────────────
function getLogs(e) {
  const limit     = Math.min(Number(e.parameter.limit || 200), 500);
  const actionF   = e.parameter.action_filter || "";
  const userF     = e.parameter.user_filter   || "";
  const startDate = e.parameter.startDate     || "";
  const endDate   = e.parameter.endDate       || "";
  const d = sh(SH_LOGS).getDataRange().getValues();
  const r = [];
  for (let i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    const logDate = String(d[i][1]).slice(0, 10);
    if (startDate && logDate < startDate) continue;
    if (endDate   && logDate > endDate)   continue;
    if (actionF && String(d[i][2]) !== actionF) continue;
    if (userF   && !String(d[i][3]).toLowerCase().includes(userF.toLowerCase())) continue;
    r.push({ id: d[i][0], date: d[i][1], action: d[i][2], user: d[i][3], details: d[i][4] });
  }
  return jr(r.slice(-limit).reverse());
}
