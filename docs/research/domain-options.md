# Voxford: opcije domene (provjera 2026-11-10)

## 1. Dostupnost (dig @1.1.1.1 = NXDOMAIN + whois/RDAP "not found")

| Domena | Status | Dokaz |
|---|---|---|
| voxford.hr | slobodna | whois.dns.hr "No entries found", NXDOMAIN |
| voxford.com.hr | slobodna | isto |
| voxford.eu | slobodna | whois.eu "Status: AVAILABLE" |
| voxford.music | slobodna | RDAP "available for registration" |
| voxford.band, .live, .studio | slobodne (po RDAP 404 + NXDOMAIN) | Nisu provjerene kod registrara; premium cijena moguca |
| voxford.app | slobodna | Google Registry RDAP 404 |
| voxford.co | slobodna | whois.registry.co "DOMAIN NOT FOUND" |
| voxford.net, .org | slobodne | Verisign "No match"; PIR RDAP 404 |
| voxfordofficial.com, voxford-official.com, voxfordacappella.com | slobodne | Verisign "No match" |
| **voxford.com** | **zauzeta** | vidi dolje |

### voxford.com
- Registrar GoDaddy, registrirana 2007-07-03, istice 2027-07-03. Status: client delete/renew/transfer/update prohibited. Registrant skriven (privacy).
- NS ns57/58.domaincontrol.com (GoDaddy parking/forwarding). HTTP: frameset koji ucitava voxford.blogspot.com ("John Kelly's Voxford"), dakle neaktivni osobni blog. MX na secureserver.net (GoDaddy mail, vjerojatno nekoristen).
- "For sale" signal: nema javnog oglasa. dan.com/buy-domain/voxford.com vraca 200 ali to je generican shell, ne potvrda oglasa; Afternic 404; Sedo nisam mogao provjeriti. Nema "this domain is for sale" na stranici.
- Realisticna akvizicija: preko brokera (GoDaddy Domain Broker / Sedo) uz anonimni upit, bez otkrivanja da je kupac bend. Za 19 godina staru .com s 7 slova i spojenim "vox"+"ford" ocekuj 1.500-5.000 EUR; procjena, nemam izvor. Vlasnik moze i ne odgovoriti. Opcija: backorder (GoDaddy/DropCatch) na 2027-07-03; vlasnici neaktivnih blogova cesto propuste obnovu, ali GoDaddy autorenew/grace/redemption (cca 30+30 dana) znaci da se domena oslobada tek u kolovozu-rujnu 2027, ako uopce. Ne planirati oko toga.

## 2. .hr pravila (domene.hr / CARNET)
- Placena .hr: pravne osobe s poslovnim nastanom u EU, te fizicke osobe, drzavljani EU, s hrvatskim OIB-om. Bez ogranicenja imena, bez ogranicenja broja domena. Registracija iskljucivo preko ovlastenih registrara. (domene.hr/portal/register/info-paid-hr)
- Obrt (HEY) se na toj stranici ne spominje izricito; obrtnik je fizicka osoba s OIB-om pa uvjet ispunjava. Besplatna .hr (CARNET): pravne osobe i fizicke osobe s registriranom djelatnoscu (obrt), samo jedna domena i naziv mora odgovarati imenu/djelatnosti. Mogla bi biti opcija za voxford.hr na obrt HEY ako naziv obrta to dopusta; potvrditi na domene.hr (nisam uspio dohvatiti sluzbenu stranicu o besplatnoj).
- Cijene (godisnje, registracija = obnova, bez PDV-a ako nije drugacije):
  - Croadria: .hr 66,36 EUR (56,41 uz hosting); .com.hr 5,31 EUR (croadria.com, na dan 10.09.2026)
  - Pondi: .hr 60 EUR (pondi.hr/domena/cjenik; stranica ima tipfelere, provjeriti)
  - Domenar: .hr 55 EUR + PDV (domenar.hr)
  - ORBIS: 63,57 EUR bez PDV-a (orbis.hr)
  - Raspon: oko 55-66 EUR + PDV. wmd.hr tvrdi 15-30 EUR s PDV-om; nepotvrdeno i u sukobu s ostalima, ne osloniti se.
- Cloudflare Registrar: .hr NIJE potvrden kao podrzan (nisam nasao nista; docs ne spominju). Tretiraj kao nepodrzan. Rjesenje: registrirati kod hrvatskog registrara, dodati domenu u Cloudflare (free plan, full setup), te kod registrara promijeniti NS na dva Cloudflare nameservera. .hr dopusta promjenu NS-a (standardno kod registrara, potvrditi s odabranim). Zatim Workers custom domain na toj zoni. DNSSEC: DS zapis kod registrara, provjeriti podrsku.

## 3. Cloudflare Registrar
- Model: po cijeni registra bez marze, plus ICANN naknada (~0,18 USD). ~400+ TLD-ova.
- .eu: nije podrzan (Cloudflare Community, listopad 2025; nema dokaza o promjeni u 2026). Moze se DNS-om drzati na Cloudflareu uz registraciju drugdje (.eu i hr registrari: EURid ovlasteni, cca 8-15 EUR/god, procjena).
- Cijene s tldprice.org (USD, bez ICANN naknade): .org 8,50 reg / 11,20 obnova; .com 10,46; .net 11,86; .co 15,00. .band/.music/.live/.studio/.app cijene nisam uspio potvrditi (nisu na dohvacenoj stranici). Za tocne cijene i podrsku: dashboard domain search ili https://www.cloudflare.com/tld-policies/ (nisam mogao ucitati).
- Napomena: voxford.com alternativa .co/.net/.org su slobodne.

## 4. Preporuka

**Primarna: voxford.hr.**
- Klijenti su primarno hrvatski; .hr je ccTLD koji Google koristi kao geo-signal za Hrvatsku (jaci lokalni ranking, povjerenje hrvatskih naruciteljica, vjenceva, firmi). .hr je i najprirodnija adresa u mailu/vizitki.
- Medunarodni doseg: hreflang (hr/en/de...) radi na bilo kojem TLD-u; ccTLD se ne smije geo-ciljati drugdje, ali en stranica na voxford.hr/en normalno rankira za strane goste u Dalmaciji jer je upit vezan uz lokaciju (Dalmatia wedding singers) a ne uz TLD. Hrvatska je i dalje u EU, .hr ne djeluje sumnjivo strancima.
- Brand entitet: domena = voxford; handle @voxford.official. Jedna kanonska domena, sve ostale 301 na nju, `sameAs` u JSON-LD prema Instagramu/YouTubeu, isti naziv "Voxford" posvuda. Ime je jedinstveno, pa ne treba .com da bi se entitet prepoznao.
- Trosak: ~65-80 EUR/god s PDV-om je najskuplja stavka; usporediti s besplatnom CARNET varijantom (ako HEY obrt kvalificira) pa to prvo provjeriti.

**Defenzivno (jeftino, redom prioriteta):**
1. voxford.com.hr (~5-7 EUR + PDV kod Croadria; jeftin, ali nije nuzan) ili preskoci
2. voxford.eu (regionalni/EU signal, ~10 EUR, ne na Cloudflareu)
3. voxford.org ili .net na Cloudflareu (~9-12 USD) ako zelis "neutralan" backup; .music/.band samo ako su cijene pristojne (nepotvrdeno)
4. voxfordofficial.com (.com sufiks za brand + "official" upit); ostale varijante (voxford-official.com, voxfordacappella.com) nisu potrebne.
Minimalni set: voxford.hr + voxford.eu + voxfordofficial.com.

**Redirecti:** sve defenzivne 301 na https://voxford.hr (Cloudflare Redirect Rules, zona po domeni), bez hreflang trika na njima. www -> apex 301.

**voxford.com:** ne cekati. Ako se ikad kupuje, preko brokera, tek kad ima budzeta; onda .com postane primarna ili redirect na .hr (ne dvije kopije).

## Otvoreno / neprovjereno
- Sluzbeni uvjeti besplatne .hr i prihvaca li je HEY.
- Cloudflare podrska i cijene za .band/.music/.live/.studio/.app/.eu/.hr (dashboard).
- Premium cijene novih gTLD-ova kod registrara.
- Dostupnost voxford.com na Sedu.
