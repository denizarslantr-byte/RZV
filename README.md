# Piano Deri V6.0 — Birleşik Sürüm

## Bu Sürümde Neler Var

### Yeni Özellikler
- **Çıkış saati** sütunu (tablo içinde, çıkış yapıldığında otomatik dolar)
- **Satır renklendirme**: sarı=içeride, yeşil=çıktı, kırmızı=iptal
- **ID sütunu kaldırıldı** (merkez ekran)
- **Dışa Aktar (.xls)** — Excel 97-2003, "sayfa1" adı, ACENTAKOD ilk sütun
- **Raporlar bölümü** (sol menü) — uyruk, otel yoğunluğu, saat, trend, personel
- **Admin raporlar** sekmesi — aynı raporlar + acenta kodu gösterimi
- **Admin ayarlar** sekmesi — PIN değiştirme (backend'de saklanır)
- **Acenta kodu** — otel ekleme/düzeltmede, raporlarda ve Excel export'ta
- **Otel silme** düzeltildi (gerçekten satır siliyor)
- **İzin girişi** düzeltildi — kayıt çalışıyor, anında listede görünüyor
- **Uyruk listesi** güncellendi (41 seçenek, D.xlsx'ten)
- **Admin PIN** artık backend'de (PropertiesService)

### Sheet Değişiklikleri
- `Reservations`: CIKTI_SAATI sütunu eklendi (18. sütun)
- `Hotels`: ACENTA_CODE sütunu eklendi (6. sütun)

### Sheet Başlıkları
**Reservations** (20 sütun):
ID | DATE | TIME | HOTEL | PAX_ADULT | PAX_CHILD | NATION | NOTES | STATUS |
KART | AYAK | TEZGAHTAR_1..4 | GIRDI | CIKTI | CIKTI_SAATI | CREATED_AT | UPDATED_AT

**Hotels** (7 sütun):
ID | HOTEL_NAME | USER_CODE | PASSWORD | STATUS | ACENTA_CODE | CREATED_AT

## V5.9'dan Güncelleme
1. `code.gs`'yi tamamen değiştir (re-deploy gerekli)
2. Hotels sheet'e 6. sütun olarak `ACENTA_CODE` başlığı ekle
3. Reservations sheet'e 18. sütun olarak `CIKTI_SAATI` başlığı ekle
4. HTML dosyalarını değiştir (config.js'yi koru — API_URL'yi tekrar yaz)
