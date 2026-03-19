// ================================================================
// 🎾 TENNIS SCOUT — LIVE CALENDAR v5.0
// ================================================================
// ATP/WTA/Challenger: statická data 2026 (z atptour.com PDF + wtatennis.com)
// ITF M15/M25/W15/W35+: live API itftennis.com (načítá se při spuštění)
//
// Jak použít:
//   1. Otevři www.itftennis.com/en/tournament-calendar/mens-world-tennis-tour-calendar/
//   2. Cmd + Option + J → konzole
//   3. Vlož skript → Enter → čekej ~20s na ITF data
//
//   ATP/WTA/Challenger se zobrazí okamžitě z jakékoli stránky.
//   ITF data se načtou pouze ze stránky itftennis.com.
// ================================================================

(async function TENNIS_SCOUT() {
'use strict';
const VERSION = '5.2';

// Kontrola CSP
{
  const url = location.href;
  if (url.startsWith('chrome://')||url.startsWith('about:')||url.startsWith('edge://')) {
    alert('⛔ Spusť skript na normální stránce — např. otevři wikipedia.org'); return;
  }
  if (window.trustedTypes) {
    try { window.trustedTypes.createPolicy('ts-probe-'+Date.now(),{createHTML:s=>s}); }
    catch(e) { if(e.message.includes('disallowed')) { alert('⛔ Tato stránka blokuje skript (CSP).\n✅ Otevři wikipedia.org a spusť tam.'); return; } }
  }
}

// ── STATICKÁ DATA 2026 ────────────────────────────────────────
// Formát: [name, loc, tier, surf, io, alt_m, start, end, sgl, dbl, prize, {a:winners_ATP, w:winners_WTA}]
// io: "O"=outdoor, "I"=indoor
// alt_m: nadmořská výška v metrech (0 = u moře / neuvedeno)
// prize: prize money pro singla vítěze v USD (ATP pokud combined, jinak M/W)
// winners: poslední 3 roky [2025, 2024, 2023]

const ATP = [
  // LEDEN
  ["United Cup","Perth/Sydney, AUS","Tým.event","Tvrdý","O",15,"2026-01-02","2026-01-11",0,0,"—",{w:["Polsko","Polsko","USA"]}],
  ["Brisbane International","Brisbane, AUS","ATP250","Tvrdý","O",27,"2026-01-04","2026-01-11",32,24,"$604k",{w:["Rune","Fonseca","Shelton"]}],
  ["Bank of China Hong Kong Open","Hong Kong","ATP250","Tvrdý","O",10,"2026-01-05","2026-01-11",28,16,"$604k",{w:["Bublik","Bublik","Bublik"]}],
  ["Adelaide International","Adelaide, AUS","ATP250","Tvrdý","O",48,"2026-01-12","2026-01-17",28,24,"$604k",{w:["Machac","Korda","Rublev"]}],
  ["ASB Classic","Auckland, NZL","ATP250","Tvrdý","O",25,"2026-01-12","2026-01-17",28,16,"$604k",{w:["Mensik","Paul","Cressy"]}],
  ["Australian Open","Melbourne, AUS","Grand Slam","Tvrdý","O",31,"2026-01-18","2026-02-01",128,64,"$2,9M AUD",{w:["Alcaraz","Sinner","Djokovic"]}],
  // ÚNOR
  ["Open Occitanie","Montpellier, FRA","ATP250","Tvrdý","I",1,"2026-02-02","2026-02-08",28,16,"$604k",{w:["Humbert","Humbert","Bublik"]}],
  ["Nexo Dallas Open","Dallas, USA","ATP500","Tvrdý","I",139,"2026-02-09","2026-02-15",32,16,"$1,96M",{w:["Draper","Fritz","Opelka"]}],
  ["ABN AMRO Open","Rotterdam, NED","ATP500","Tvrdý","I",1,"2026-02-09","2026-02-15",32,16,"$1,96M",{w:["Medvedev","Sinner","Rublev"]}],
  ["IEB+ Argentina Open","Buenos Aires, ARG","ATP250","Antuka","O",25,"2026-02-09","2026-02-15",28,16,"$604k",{w:["Cerundolo","Cerundolo","Djokovic"]}],
  ["Qatar ExxonMobil Open","Doha, QAT","ATP500","Tvrdý","O",11,"2026-02-16","2026-02-22",32,16,"$1,96M",{w:["Rublev","Medvedev","Djokovic"]}],
  ["Rio Open","Rio de Janeiro, BRA","ATP500","Antuka","O",10,"2026-02-16","2026-02-22",32,16,"$1,96M",{w:["Fonseca","Cerundolo","Tsitsipas"]}],
  ["Delray Beach Open","Delray Beach, USA","ATP250","Tvrdý","O",3,"2026-02-16","2026-02-22",28,16,"$604k",{w:["Paul","Korda","Tiafoe"]}],
  ["Mubadala Citi DC Open","Washington DC, USA","ATP500","Tvrdý","O",7,"2026-02-23","2026-03-01",48,16,"$1,96M",{w:["Fritz","Fritz","Zverev"]}],
  ["Mexican Open","Acapulco, MEX","ATP500","Tvrdý","O",3,"2026-02-23","2026-03-01",32,16,"$1,96M",{w:["Alcaraz","Alcaraz","Alcaraz"]}],
  ["Dubai Duty Free Championships","Dubai, UAE","ATP500","Tvrdý","O",5,"2026-02-23","2026-03-01",32,16,"$1,96M",{w:["Medvedev","Djokovic","Rublev"]}],
  ["Movistar Chile Open","Santiago, CHI","ATP250","Antuka","O",520,"2026-02-23","2026-03-01",28,16,"$604k",{w:["Jarry","Tabilo","Jarry"]}],
  // BŘEZEN
  ["BNP Paribas Open","Indian Wells, USA","Masters1000","Tvrdý","O",485,"2026-03-04","2026-03-15",96,32,"$1,15M",{w:["Draper","Alcaraz","Alcaraz"]}],
  ["Miami Open","Miami, USA","Masters1000","Tvrdý","O",2,"2026-03-18","2026-03-29",96,32,"$1,2M",{w:["Sinner","Sinner","Alcaraz"]}],
  ["Tiriac Open","Bucharest, ROU","ATP250","Antuka","O",85,"2026-03-30","2026-04-05",28,16,"$604k",{w:["Rune","Rune","Hanfmann"]}],
  ["U.S. Men's Clay Court Championship","Houston, USA","ATP250","Antuka","O",38,"2026-03-30","2026-04-05",28,16,"$604k",{w:["Fonseca","Paul","Fognini"]}],
  ["Grand Prix Hassan II","Marrakech, MAR","ATP250","Antuka","O",454,"2026-03-30","2026-04-05",28,16,"$604k",{w:["Mensik","Sonego","Munar"]}],
  // DUBEN
  ["Rolex Monte-Carlo Masters","Monte Carlo, MON","Masters1000","Antuka","O",20,"2026-04-06","2026-04-12",56,24,"$857k",{w:["Alcaraz","Tsitsipas","Rune"]}],
  ["Barcelona Open Banc Sabadell","Barcelona, ESP","ATP500","Antuka","O",12,"2026-04-13","2026-04-19",48,16,"$1,13M",{w:["Alcaraz","Tsitsipas","Alcaraz"]}],
  ["BMW Open","Munich, GER","ATP500","Antuka","O",519,"2026-04-13","2026-04-19",32,16,"$704k",{w:["Zverev","Zverev","Zverev"]}],
  ["Mutua Madrid Open","Madrid, ESP","Masters1000","Antuka","O",667,"2026-04-22","2026-05-03",96,32,"$1,12M",{w:["Alcaraz","Zverev","Alcaraz"]}],
  // KVĚTEN
  ["Internazionali BNL d'Italia","Rome, ITA","Masters1000","Antuka","O",23,"2026-05-06","2026-05-17",96,32,"$857k",{w:["Alcaraz","Zverev","Rune"]}],
  ["Hamburg Open","Hamburg, GER","ATP500","Antuka","O",6,"2026-05-17","2026-05-23",32,16,"$1,13M",{w:["Zverev","Zverev","Zverev"]}],
  ["Gonet Geneva Open","Geneva, SUI","ATP250","Antuka","O",375,"2026-05-17","2026-05-23",28,16,"$604k",{w:["Djokovic","Dimitrov","Musetti"]}],
  ["Roland Garros","Paris, FRA","Grand Slam","Antuka","O",35,"2026-05-24","2026-06-07",128,64,"$2,4M EUR",{w:["Alcaraz","Sinner","Nole"]}],
  // ČERVEN
  ["Libema Open","'s-Hertogenbosch, NED","ATP250","Tráva","O",5,"2026-06-08","2026-06-14",28,16,"$604k",{w:["Rune","Griekspoor","Bublik"]}],
  ["BOSS Open","Stuttgart, GER","ATP250","Tráva","O",226,"2026-06-08","2026-06-14",28,16,"$604k",{w:["Ruud","Rune","Auger-Aliassime"]}],
  ["Terra Wortmann Open","Halle, GER","ATP500","Tráva","O",65,"2026-06-15","2026-06-21",32,16,"$1,96M",{w:["Sinner","Sinner","Rublev"]}],
  ["HSBC Championships","London, GBR","ATP500","Tráva","O",11,"2026-06-15","2026-06-21",32,16,"$1,96M",{w:["Djokovic","Fritz","Paul"]}],
  ["Mallorca Championships","Mallorca, ESP","ATP250","Tráva","O",14,"2026-06-21","2026-06-27",28,16,"$604k",{w:["Ruusuvuori","Fognini","Fognini"]}],
  ["Rothesay International","Eastbourne, GBR","ATP250","Tráva","O",5,"2026-06-22","2026-06-28",28,16,"$604k",{w:["Norrie","Norrie","Norrie"]}],
  ["Wimbledon","London, GBR","Grand Slam","Tráva","O",43,"2026-06-29","2026-07-12",128,64,"$2,9M GBP",{w:["Alcaraz","Alcaraz","Alcaraz"]}],
  // ČERVENEC
  ["Nordea Open","Båstad, SWE","ATP250","Antuka","O",12,"2026-07-13","2026-07-19",28,16,"$604k",{w:["Ruud","Rune","Rune"]}],
  ["EFG Swiss Open Gstaad","Gstaad, SUI","ATP250","Antuka","O",1050,"2026-07-13","2026-07-19",28,16,"$604k",{w:["Struff","Struff","Struff"]}],
  ["Plava Laguna Croatia Open Umag","Umag, CRO","ATP250","Antuka","O",7,"2026-07-13","2026-07-19",28,16,"$604k",{w:["Rune","Musetti","Sinner"]}],
  ["Generali Open","Kitzbühel, AUT","ATP250","Antuka","O",762,"2026-07-19","2026-07-25",28,16,"$604k",{w:["Altmaier","Struff","Struff"]}],
  ["Millennium Estoril Open","Estoril, POR","ATP250","Antuka","O",149,"2026-07-20","2026-07-26",28,16,"$604k",{w:["Rune","Monfils","Norrie"]}],
  ["Mifel Tennis Open","Los Cabos, MEX","ATP250","Tvrdý","O",14,"2026-07-20","2026-07-26",28,16,"$604k",{w:["Rune","Fonseca","Zverev"]}],
  ["Mubadala Citi DC Open","Washington DC, USA","ATP500","Tvrdý","O",7,"2026-07-27","2026-08-02",48,16,"$1,96M",{w:["Shelton","Fritz","Shelton"]}],
  // SRPEN
  ["National Bank Open","Montreal/Toronto, CAN","Masters1000","Tvrdý","O",30,"2026-08-03","2026-08-16",96,32,"$857k",{w:["Sinner","Sinner","Alcaraz"]}],
  ["Cincinnati Open","Cincinnati, USA","Masters1000","Tvrdý","O",226,"2026-08-17","2026-08-23",96,32,"$857k",{w:["Sinner","Djokovic","Alcaraz"]}],
  ["Winston-Salem Open","Winston-Salem, USA","ATP250","Tvrdý","O",270,"2026-08-23","2026-08-29",48,16,"$604k",{w:["Paul","Mannarino","Cressy"]}],
  ["US Open","New York, USA","Grand Slam","Tvrdý","O",6,"2026-08-31","2026-09-13",128,64,"$3,6M",{w:["Sinner","Sinner","Medvedev"]}],
  // ZÁŘÍ
  ["Chengdu Open","Chengdu, CHN","ATP250","Tvrdý","O",500,"2026-09-21","2026-09-27",28,16,"$604k",{w:["Sinner","Medvedev","Wu"]}],
  ["Hangzhou Open","Hangzhou, CHN","ATP250","Tvrdý","O",7,"2026-09-21","2026-09-27",28,16,"$604k",{w:["Bublik","Zverev","Davidovich"]}],
  ["Laver Cup","London, GBR","Exhibice","Tvrdý","I",43,"2026-09-25","2026-09-27",0,0,"—",{w:["Evropa","Svět","Evropa"]}],
  ["Kinoshita Japan Open","Tokyo, JPN","ATP500","Tvrdý","O",40,"2026-09-28","2026-10-04",32,16,"$1,96M",{w:["Rune","Paul","Tsitsipas"]}],
  ["China Open","Beijing, CHN","ATP500","Tvrdý","O",43,"2026-09-28","2026-10-04",32,16,"$1,96M",{w:["Sinner","Sinner","Alcaraz"]}],
  // ŘÍJEN
  ["Rolex Shanghai Masters","Shanghai, CHN","Masters1000","Tvrdý","O",4,"2026-10-05","2026-10-18",96,32,"$1,12M",{w:["Sinner","Djokovic","Medvedev"]}],
  ["Almaty Open","Almaty, KAZ","ATP250","Tvrdý","I",775,"2026-10-19","2026-10-25",28,16,"$604k",{w:["Rune","Rublev","Bublik"]}],
  ["European Open","Antwerp, BEL","ATP250","Tvrdý","I",12,"2026-10-19","2026-10-25",28,16,"$604k",{w:["Paul","Rublev","Sinner"]}],
  ["Grand Prix Auvergne-Rhône-Alpes","Lyon, FRA","ATP250","Tvrdý","I",173,"2026-10-19","2026-10-25",28,16,"$604k",{w:["Tiafoe","Fils","Mannarino"]}],
  ["Swiss Indoors Basel","Basel, SUI","ATP500","Tvrdý","I",260,"2026-10-26","2026-11-01",28,16,"$1,96M",{w:["Sinner","Sinner","Djokovic"]}],
  ["Erste Bank Open","Vienna, AUT","ATP500","Tvrdý","I",171,"2026-10-26","2026-11-01",32,16,"$1,96M",{w:["Draper","Sinner","Rublev"]}],
  // LISTOPAD
  ["Rolex Paris Masters","Paris, FRA","Masters1000","Tvrdý","I",35,"2026-11-02","2026-11-08",48,24,"$857k",{w:["Zverev","Djokovic","Djokovic"]}],
  ["BNP Paribas Nordic Open","Stockholm, SWE","ATP250","Tvrdý","I",28,"2026-11-09","2026-11-15",28,16,"$604k",{w:["Rune","Rune","Nishioka"]}],
  ["Nitto ATP Finals","Turin, ITA","Finals","Tvrdý","I",239,"2026-11-15","2026-11-22",8,8,"$2,6M",{w:["Sinner","Sinner","Djokovic"]}],
  ["Next Gen ATP Finals","Jeddah, KSA","NextGen","Tvrdý","I",612,"2026-12-16","2026-12-20",8,0,"$1,8M",{w:["Fonseca","Mensik","Fils"]}],
];

const WTA = [
  // LEDEN
  ["United Cup","Perth/Sydney, AUS","Tým.event","Tvrdý","O",15,"2026-01-02","2026-01-11",0,0,"—",{w:["Polsko","Polsko","USA"]}],
  ["Brisbane International","Brisbane, AUS","WTA500","Tvrdý","O",27,"2026-01-04","2026-01-11",32,16,"$235k",{w:["Sabalenka","Gauff","Azarenka"]}],
  ["Adelaide International","Adelaide, AUS","WTA500","Tvrdý","O",48,"2026-01-05","2026-01-11",32,16,"$235k",{w:["Svitolina","Rybakina","Barty"]}],
  ["ASB Classic","Auckland, NZL","WTA250","Tvrdý","O",25,"2026-01-05","2026-01-11",32,16,"$235k",{w:["Svitolina","Osaka","Vandeweghe"]}],
  ["Hobart International","Hobart, AUS","WTA250","Tvrdý","O",54,"2026-01-12","2026-01-18",32,16,"$235k",{w:["Cocciaretto","Kvitova","Stosur"]}],
  ["Australian Open","Melbourne, AUS","Grand Slam","Tvrdý","O",31,"2026-01-18","2026-02-01",128,64,"$2,9M AUD",{w:["Rybakina","Sabalenka","Sabalenka"]}],
  // ÚNOR
  ["Thames International","London, GBR","WTA500","Tvrdý","I",11,"2026-02-02","2026-02-08",28,16,"$235k",{w:["Andreeva","Rybakina","—"]}],
  ["Cali Open","Cali, COL","WTA250","Antuka","O",995,"2026-02-02","2026-02-08",32,16,"$115k",{w:["Sorribes Tormo","Sorribes Tormo","Osorio"]}],
  ["Abu Dhabi Open","Abu Dhabi, UAE","WTA500","Tvrdý","O",27,"2026-02-02","2026-02-08",28,16,"$235k",{w:["Muchova","Rybakina","—"]}],
  ["Qatar TotalEnergies Open","Doha, QAT","WTA1000","Tvrdý","O",11,"2026-02-09","2026-02-15",56,28,"$665k",{w:["Muchova","Swiatek","Swiatek"]}],
  ["Dubai Duty Free Championships","Dubai, UAE","WTA1000","Tvrdý","O",5,"2026-02-16","2026-02-22",56,28,"$665k",{w:["Pegula","Svitolina","Swiatek"]}],
  ["Rio Open","Rio de Janeiro, BRA","WTA250","Antuka","O",10,"2026-02-16","2026-02-22",32,16,"$115k",{w:["Sorribes Tormo","Sorribes Tormo","Osorio"]}],
  ["Abierto Mexicano Telcel","Acapulco, MEX","WTA250","Tvrdý","O",3,"2026-02-23","2026-03-01",32,16,"$115k",{w:["Samsonova","Osaka","Haddad Maia"]}],
  // BŘEZEN
  ["BNP Paribas Open","Indian Wells, USA","WTA1000","Tvrdý","O",485,"2026-03-04","2026-03-15",96,32,"$1,15M",{w:["Andreeva","Sabalenka","Swiatek"]}],
  ["Miami Open","Miami, USA","WTA1000","Tvrdý","O",2,"2026-03-18","2026-03-29",96,32,"$1,2M",{w:["Gauff","Swiatek","Swiatek"]}],
  ["Credit One Charleston Open","Charleston, USA","WTA500","Antuka","O",10,"2026-03-23","2026-03-29",48,16,"$235k",{w:["Swiatek","Swiatek","Swiatek"]}],
  // DUBEN
  ["Porsche Tennis Grand Prix","Stuttgart, GER","WTA500","Antuka","I",245,"2026-04-06","2026-04-12",28,14,"$235k",{w:["Swiatek","Swiatek","Swiatek"]}],
  ["Upper Austria Ladies Linz","Linz, AUT","WTA500","Tvrdý","I",266,"2026-04-06","2026-04-12",28,16,"$235k",{w:["Rybakina","Rybakina","Bencic"]}],
  ["Barcelona Open","Barcelona, ESP","WTA500","Antuka","O",12,"2026-04-13","2026-04-19",32,16,"$235k",{w:["Swiatek","Swiatek","Muguruza"]}],
  ["Mutua Madrid Open","Madrid, ESP","WTA1000","Antuka","O",667,"2026-04-27","2026-05-03",96,32,"$1,12M",{w:["Sabalenka","Swiatek","Swiatek"]}],
  ["Grand Prix Hassan II","Marrakech, MAR","WTA250","Antuka","O",454,"2026-04-27","2026-05-03",32,16,"$115k",{w:["Sorribes Tormo","Sorribes Tormo","Bogdan"]}],
  // KVĚTEN
  ["Internazionali BNL d'Italia","Rome, ITA","WTA1000","Antuka","O",23,"2026-05-04","2026-05-10",96,32,"$857k",{w:["Gauff","Swiatek","Swiatek"]}],
  ["Internationaux de Strasbourg","Strasbourg, FRA","WTA250","Antuka","O",142,"2026-05-11","2026-05-17",32,16,"$115k",{w:["Svitolina","Bouzkova","Kvitova"]}],
  ["Roland Garros","Paris, FRA","Grand Slam","Antuka","O",35,"2026-05-24","2026-06-07",128,64,"$2,4M EUR",{w:["Gauff","Swiatek","Swiatek"]}],
  // ČERVEN
  ["Libema Open","'s-Hertogenbosch, NED","WTA500","Tráva","O",5,"2026-06-08","2026-06-14",28,16,"$235k",{w:["Rybakina","Vondrousova","Kontaveit"]}],
  ["Rothesay Open Nottingham","Nottingham, GBR","WTA250","Tráva","O",28,"2026-06-08","2026-06-14",32,16,"$115k",{w:["Paolini","Bouzkova","Brengle"]}],
  ["Bad Homburg Open","Bad Homburg, GER","WTA250","Tráva","O",149,"2026-06-15","2026-06-21",32,16,"$115k",{w:["Rybakina","Vondrousova","Kerber"]}],
  ["Berlin Ladies Open","Berlin, GER","WTA500","Tráva","O",34,"2026-06-15","2026-06-21",28,16,"$235k",{w:["Swiatek","Swiatek","Kvitova"]}],
  ["Rothesay International Eastbourne","Eastbourne, GBR","WTA250","Tráva","O",5,"2026-06-22","2026-06-28",32,16,"$115k",{w:["Rybakina","Gauff","Jabeur"]}],
  ["Wimbledon","London, GBR","Grand Slam","Tráva","O",43,"2026-06-29","2026-07-12",128,64,"$2,9M GBP",{w:["Rybakina","Vondrousova","Rybakina"]}],
  // ČERVENEC
  ["Palermo International","Palermo, ITA","WTA250","Antuka","O",36,"2026-07-13","2026-07-19",32,16,"$115k",{w:["Paolini","Paolini","Bronzetti"]}],
  ["Prague Open","Prague, CZE","WTA250","Antuka","O",190,"2026-07-13","2026-07-19",32,16,"$115k",{w:["Kvitova","Bouzkova","Kvitova"]}],
  ["IWC Budapest Grand Prix","Budapest, HUN","WTA250","Antuka","O",102,"2026-07-20","2026-07-26",32,16,"$115k",{w:["Siegemund","Parrizas Diaz","Bogdan"]}],
  ["Mubadala Citi DC Open","Washington DC, USA","WTA500","Tvrdý","O",7,"2026-07-20","2026-07-26",28,16,"$235k",{w:["Gauff","Gauff","Kontaveit"]}],
  // SRPEN
  ["National Bank Open","Toronto/Montreal, CAN","WTA1000","Tvrdý","O",105,"2026-08-03","2026-08-09",96,32,"$857k",{w:["Sabalenka","Swiatek","Swiatek"]}],
  ["Western & Southern Open","Cincinnati, USA","WTA1000","Tvrdý","O",226,"2026-08-10","2026-08-17",96,32,"$857k",{w:["Swiatek","Swiatek","Swiatek"]}],
  ["US Open","New York, USA","Grand Slam","Tvrdý","O",6,"2026-08-31","2026-09-13",128,64,"$3,6M",{w:["Sabalenka","Sabalenka","Swiatek"]}],
  // ZÁŘÍ
  ["Singapore Open","Singapore, SIN","WTA500","Tvrdý","I",15,"2026-09-21","2026-09-27",28,16,"$235k",{w:["—","—","—"]}],
  ["Guangzhou Open","Guangzhou, CHN","WTA250","Tvrdý","O",11,"2026-09-21","2026-09-27",32,16,"$115k",{w:["Zhu","Zheng","Zhu"]}],
  ["China Open","Beijing, CHN","WTA1000","Tvrdý","O",43,"2026-09-28","2026-10-04",96,32,"$857k",{w:["Sabalenka","Swiatek","Swiatek"]}],
  ["Wuhan Open","Wuhan, CHN","WTA1000","Tvrdý","O",23,"2026-09-28","2026-10-11",96,32,"$857k",{w:["Swiatek","Rybakina","Swiatek"]}],
  // ŘÍJEN
  ["Korea Open","Seoul, KOR","WTA250","Tvrdý","O",38,"2026-10-19","2026-10-25",32,16,"$115k",{w:["Osaka","Osaka","Azarenka"]}],
  ["Jiangxi Open","Nanchang, CHN","WTA250","Tvrdý","O",46,"2026-10-19","2026-10-25",32,16,"$115k",{w:["Zheng","Zheng","Kvitova"]}],
  ["Rolex Paris Masters","Paris, FRA","WTA1000","Tvrdý","I",35,"2026-10-26","2026-11-01",56,28,"$857k",{w:["Sabalenka","Swiatek","—"]}],
  // LISTOPAD
  ["Merida Open","Merida, MEX","WTA250","Tvrdý","O",9,"2026-11-02","2026-11-08",32,16,"$115k",{w:["Osorio","Osorio","—"]}],
  ["WTA Finals","Riyadh, KSA","Finals","Tvrdý","I",612,"2026-11-06","2026-11-14",8,8,"$2,2M",{w:["Sabalenka","Swiatek","Swiatek"]}],
];

const CHALL = [
  // LEDEN
  ["Bengaluru Open","Bengaluru, IND","CH125","Tvrdý","O",920,"2026-01-05","2026-01-10",32,16,"$175k",{w:["Martinez",""]}],
  ["Canberra International","Canberra, AUS","CH125","Tvrdý","O",578,"2026-01-05","2026-01-10",32,16,"$175k",{w:["Blockx",""]}],
  ["BNC Tennis Open","Noumea, NCL","CH75","Tvrdý","O",2,"2026-01-05","2026-01-10",32,16,"$100k",{w:["Gea",""]}],
  ["Bangkok Open 1","Nonthaburi, THA","CH50","Tvrdý","O",3,"2026-01-05","2026-01-10",32,16,"$65k",{w:["—",""]}],
  ["Lexus Nottingham Challenger","Nottingham, GBR","CH50","Tvrdý","I",28,"2026-01-05","2026-01-10",32,16,"$65k",{w:["—",""]}],
  ["Bangkok Open 2","Nonthaburi, THA","CH75","Tvrdý","O",3,"2026-01-12","2026-01-17",32,16,"$100k",{w:["—",""]}],
  ["Challenger AAT","Itajaí, BRA","CH50","Antuka","O",3,"2026-01-12","2026-01-17",32,16,"$65k",{w:["—",""]}],
  ["Glasgow Challenger","Glasgow, GBR","CH50","Tvrdý","I",8,"2026-01-12","2026-01-17",32,16,"$65k",{w:["—",""]}],
  ["Indoor Oeiras Open 1","Oeiras, POR","CH100","Tvrdý","I",36,"2026-01-19","2026-01-25",32,16,"$140k",{w:["—",""]}],
  ["Itajaí Open","Itajaí, BRA","CH75","Antuka","O",3,"2026-01-19","2026-01-25",32,16,"$100k",{w:["—",""]}],
  ["Indoor Oeiras Open 2","Oeiras, POR","CH100","Tvrdý","I",36,"2026-01-26","2026-02-01",32,16,"$140k",{w:["—",""]}],
  ["Medellin Open","Medellín, COL","CH75","Antuka","O",1495,"2026-01-26","2026-02-01",32,16,"$100k",{w:["—",""]}],
  // ÚNOR
  ["Rosario Challenger","Rosario, ARG","CH125","Antuka","O",25,"2026-02-02","2026-02-08",32,16,"$175k",{w:["—",""]}],
  ["Brisbane Challenger","Brisbane, AUS","CH75","Tvrdý","O",27,"2026-02-02","2026-02-08",32,16,"$100k",{w:["—",""]}],
  ["Cleveland Challenger","Cleveland, USA","CH75","Tvrdý","I",183,"2026-02-02","2026-02-08",32,16,"$100k",{w:["—",""]}],
  ["Pau Challenger","Pau, FRA","CH125","Tvrdý","I",210,"2026-02-09","2026-02-15",32,16,"$175k",{w:["—",""]}],
  ["Chennai Open","Chennai, IND","CH50","Tvrdý","O",6,"2026-02-09","2026-02-15",32,16,"$65k",{w:["—",""]}],
  ["Tenerife Challenger","Tenerife, ESP","CH75","Tvrdý","O",682,"2026-02-09","2026-02-15",32,16,"$100k",{w:["—",""]}],
  ["Szczecin Challenger","Szczecin, POL","CH75","Tvrdý","I",1,"2026-02-09","2026-02-15",32,16,"$100k",{w:["—",""]}],
  ["Lille Challenger","Lille, FRA","CH125","Tvrdý","I",20,"2026-02-16","2026-02-22",32,16,"$175k",{w:["—",""]}],
  ["Delhi Open","New Delhi, IND","CH75","Tvrdý","O",216,"2026-02-16","2026-02-22",32,16,"$100k",{w:["—",""]}],
  ["Liberec Challenger","Liberec, CZE","CH75","Tvrdý","I",399,"2026-02-16","2026-02-22",32,16,"$100k",{w:["—",""]}],
  ["Heilbronn Challenger","Heilbronn, GER","CH75","Tvrdý","I",155,"2026-02-16","2026-02-22",32,16,"$100k",{w:["—",""]}],
  ["Maha Open Pune","Pune, IND","CH75","Tvrdý","O",554,"2026-02-23","2026-03-01",32,16,"$100k",{w:["—",""]}],
  ["Lugano Challenger","Lugano, SUI","CH75","Tvrdý","I",274,"2026-02-23","2026-03-01",32,16,"$100k",{w:["—",""]}],
  // BŘEZEN
  ["Thionville Challenger","Thionville, FRA","CH100","Tvrdý","I",175,"2026-03-02","2026-03-08",32,16,"$140k",{w:["—",""]}],
  ["Kigali Challenger","Kigali, RWA","CH75","Antuka","O",1567,"2026-03-02","2026-03-08",32,16,"$100k",{w:["—",""]}],
  ["Arizona Tennis Classic","Phoenix, USA","CH175","Tvrdý","O",331,"2026-03-09","2026-03-15",28,16,"$245k",{w:["—",""]}],
  ["Copa Cap Cana","Cap Cana, DOM","CH175","Tvrdý","O",15,"2026-03-09","2026-03-15",28,16,"$245k",{w:["—",""]}],
  ["Murcia Challenger","Murcia, ESP","CH75","Antuka","O",43,"2026-03-16","2026-03-22",32,16,"$100k",{w:["—",""]}],
  ["Morelia Open","Morelia, MEX","CH125","Tvrdý","O",1909,"2026-03-23","2026-03-29",32,16,"$175k",{w:["—",""]}],
  ["Naples Challenger","Naples, ITA","CH125","Antuka","O",17,"2026-03-23","2026-03-29",32,16,"$175k",{w:["—",""]}],
  // DUBEN
  ["Mexico City Open","Mexico City, MEX","CH125","Antuka","O",2240,"2026-04-06","2026-04-12",32,16,"$175k",{w:["—",""]}],
  ["Advantage Cars Prague Open","Prague, CZE","CH75","Antuka","O",190,"2026-04-06","2026-04-12",32,16,"$100k",{w:["—",""]}],
  ["Prostějov Challenger","Prostějov, CZE","CH125","Antuka","O",225,"2026-04-13","2026-04-19",32,16,"$175k",{w:["—",""]}],
  ["Busan Challenger","Busan, KOR","CH125","Tvrdý","O",40,"2026-04-13","2026-04-19",32,16,"$175k",{w:["—",""]}],
  ["Oeiras Challenger","Oeiras, POR","CH125","Antuka","O",36,"2026-04-13","2026-04-19",32,16,"$175k",{w:["—",""]}],
  ["Aix-en-Provence Challenger","Aix-en-Provence, FRA","CH175","Antuka","O",183,"2026-04-27","2026-05-03",28,16,"$245k",{w:["—",""]}],
  ["Marrakech Challenger","Marrakech, MAR","CH75","Antuka","O",454,"2026-04-27","2026-05-03",32,16,"$100k",{w:["—",""]}],
  // KVĚTEN
  ["Wuxi Open","Wuxi, CHN","CH100","Tvrdý","O",7,"2026-05-04","2026-05-10",32,16,"$140k",{w:["—",""]}],
  ["BNP Paribas Primrose Bordeaux","Bordeaux, FRA","CH175","Antuka","O",6,"2026-05-11","2026-05-17",28,16,"$245k",{w:["—",""]}],
  ["Valencia Challenger","Valencia, ESP","CH175","Antuka","O",13,"2026-05-11","2026-05-17",28,16,"$245k",{w:["—",""]}],
  ["Lyon Challenger","Lyon, FRA","CH125","Antuka","O",173,"2026-05-18","2026-05-24",32,16,"$175k",{w:["—",""]}],
  ["Geneva Challenger","Geneva, SUI","CH100","Antuka","O",375,"2026-05-18","2026-05-24",32,16,"$140k",{w:["—",""]}],
  ["Istanbul Challenger","Istanbul, TUR","CH75","Antuka","O",39,"2026-05-18","2026-05-24",32,16,"$100k",{w:["—",""]}],
  // ČERVEN
  ["Birmingham Challenger","Birmingham, GBR","CH125","Tráva","O",140,"2026-06-01","2026-06-07",32,16,"$175k",{w:["—",""]}],
  ["Surbiton Trophy","London, GBR","CH75","Tráva","O",11,"2026-06-01","2026-06-07",32,16,"$100k",{w:["—",""]}],
  ["Ilkley Trophy","Ilkley, GBR","CH125","Tráva","O",246,"2026-06-08","2026-06-14",32,16,"$175k",{w:["—",""]}],
  ["Nottingham Challenger (Grass)","Nottingham, GBR","CH125","Tráva","O",28,"2026-06-15","2026-06-21",32,16,"$175k",{w:["—",""]}],
  ["Mallorca Challenger","Mallorca, ESP","CH75","Tráva","O",14,"2026-06-22","2026-06-28",32,16,"$100k",{w:["—",""]}],
  // ČERVENEC
  ["Braunschweig Challenger","Braunschweig, GER","CH125","Antuka","O",72,"2026-07-06","2026-07-12",32,16,"$175k",{w:["—",""]}],
  ["Newport Challenger","Newport, USA","CH125","Tráva","O",7,"2026-07-06","2026-07-12",32,16,"$175k",{w:["—",""]}],
  ["Båstad Challenger","Båstad, SWE","CH100","Antuka","O",12,"2026-07-06","2026-07-12",32,16,"$140k",{w:["—",""]}],
  ["Zug Challenger","Zug, SUI","CH125","Antuka","O",425,"2026-07-20","2026-07-26",32,16,"$175k",{w:["—",""]}],
  ["Vancouver Challenger","Vancouver, CAN","CH125","Tvrdý","O",12,"2026-07-27","2026-08-02",32,16,"$175k",{w:["—",""]}],
  ["San Marino Challenger","San Marino, SMR","CH125","Antuka","O",672,"2026-07-27","2026-08-02",32,16,"$175k",{w:["—",""]}],
  // SRPEN
  ["Granby Challenger","Granby, CAN","CH100","Tvrdý","O",180,"2026-08-03","2026-08-09",32,16,"$140k",{w:["—",""]}],
  ["Lexington Challenger","Lexington, USA","CH75","Tvrdý","O",290,"2026-08-03","2026-08-09",32,16,"$100k",{w:["—",""]}],
  ["Indianapolis Challenger","Indianapolis, USA","CH75","Tvrdý","O",220,"2026-08-10","2026-08-16",32,16,"$100k",{w:["—",""]}],
];

// ── HELPERS ───────────────────────────────────────────────────
const MCS=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const MSH=['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];

function surfCS(s){const l=(s||'').toLowerCase();if(l.includes('indoor')||l.includes('carpet'))return'Krytý';if(l.includes('clay'))return'Antuka';if(l.includes('grass'))return'Tráva';return'Tvrdý';}
function fmtRange(s,e){if(!s)return'—';const a=new Date(s+'T00:00:00'),b=e?new Date(e+'T00:00:00'):a;const sd=a.getDate(),sm=a.getMonth(),ed=b.getDate(),em=b.getMonth();return sm===em?`${sd}–${ed}. ${MSH[sm]}`:`${sd}. ${MSH[sm]} – ${ed}. ${MSH[em]}`;}
function getMonth(s){return s?new Date(s+'T00:00:00').getMonth():0;}
function isLive(s,e){const n=new Date();return!!(s&&e&&new Date(s+'T00:00:00')<=n&&new Date(e+'T00:00:00')>=n);}

// Převod arrays na objekty
function mkAtp(arr){return arr.map(([n,loc,tier,surf,io,alt,s,e,sgl,dbl,prize,wins])=>({name:n,loc,cat:'ATP',tier,surf,io:io||'O',alt:alt||0,start:s,end:e,sgl,dbl,prize:prize||'—',winners:wins?.w||[],src:'atptour.com'}));}
function mkWta(arr){return arr.map(([n,loc,tier,surf,io,alt,s,e,sgl,dbl,prize,wins])=>({name:n,loc,cat:'WTA',tier,surf,io:io||'O',alt:alt||0,start:s,end:e,sgl,dbl,prize:prize||'—',winners:wins?.w||[],src:'wtatennis.com'}));}
function mkChall(arr){return arr.map(([n,loc,tier,surf,io,alt,s,e,sgl,dbl,prize,wins])=>({name:n,loc,cat:'CHALL',tier,surf,io:io||'O',alt:alt||0,start:s,end:e,sgl,dbl,prize:prize||'—',winners:wins?.w||[],src:'atptour.com'}));}

// ── ITF API ───────────────────────────────────────────────────
async function fetchITF(onProg){
  // Data jsou každý den automaticky aktualizována GitHub Actions
  // z itftennis.com a uložena do raw.githubusercontent.com (prochází sítí)
  const GH_URL = 'https://raw.githubusercontent.com/Hacran001/tennis-scout/main/itf_data.json';
  onProg('Načítám ITF z GitHub cache...');
  const resp = await fetch(GH_URL);
  if(!resp.ok) throw new Error(`GitHub ITF cache: HTTP ${resp.status}`);
  const data = await resp.json();
  const items = (data.items||[]).map(item=>({
    name:    item.name,
    loc:     item.loc||'',
    country: item.country||'',
    cat:     'ITF',
    tier:    item.tier||'',
    surf:    surfCS(item.surf||''),
    start:   item.start,
    end:     item.end||'',
    sgl:32, dbl:16,
    src:     'itftennis.com (cache '+data.updated?.slice(0,10)+')',
  }));
  onProg(`ITF: ${items.length} turnajů (aktualizováno ${data.updated?.slice(0,10)||'?'})`);
  return items;
}

// ── CSS ───────────────────────────────────────────────────────
const CSS=`:host{all:initial;}#w{background:#0a0c0f;color:#e8eaf0;font-family:"DM Sans","Segoe UI",sans-serif;font-size:14px;width:100vw;height:100vh;display:flex;flex-direction:column;overflow:hidden;}*{box-sizing:border-box;margin:0;padding:0;}#hdr{background:#111318;border-bottom:1px solid #1e2330;padding:14px 24px 0;flex-shrink:0;}#top{display:flex;align-items:center;gap:12px;margin-bottom:10px;}#logo{font-family:Georgia,serif;font-size:20px;letter-spacing:2px;color:#c8f135;font-weight:700;}#logo span{color:#5a6070;}.badge{background:#1e2330;color:#5a6070;font-size:9px;padding:2px 6px;border-radius:3px;font-family:monospace;}#stats{margin-left:auto;display:flex;gap:16px;font-size:9px;color:#5a6070;text-transform:uppercase;letter-spacing:1px;}#stats b{display:block;font-size:18px;color:#c8f135;font-weight:700;letter-spacing:0;}#btn-r{background:#c8f135;color:#0a0c0f;border:none;cursor:pointer;padding:5px 11px;border-radius:5px;font-size:11px;font-weight:700;}#btn-c{background:none;border:1px solid #1e2330;color:#5a6070;cursor:pointer;padding:5px 10px;border-radius:5px;font-size:11px;}#btn-c:hover{background:#1e2330;color:#e8eaf0;}.fr{display:flex;gap:6px;padding-bottom:8px;flex-wrap:wrap;align-items:center;}.fl{font-size:9px;color:#5a6070;text-transform:uppercase;letter-spacing:1px;margin-right:2px;flex-shrink:0;}.fb{background:none;border:1px solid #1e2330;color:#5a6070;font-size:11px;padding:3px 9px;border-radius:14px;cursor:pointer;transition:all .12s;}.fb:hover{border-color:#e8eaf0;color:#e8eaf0;}.fb.on{color:#0a0c0f!important;font-weight:700;}.fb[data-c=ALL].on{background:#c8f135;border-color:#c8f135;}.fb[data-c=ATP].on{background:#c8f135;border-color:#c8f135;}.fb[data-c=WTA].on{background:#f170c8;border-color:#f170c8;}.fb[data-c=CHALL].on{background:#35c8f1;border-color:#35c8f1;}.fb[data-c=ITF].on{background:#f1a035;border-color:#f1a035;}#srch{background:#181c23;border:1px solid #1e2330;color:#e8eaf0;font-size:12px;padding:3px 10px;border-radius:14px;outline:none;width:200px;margin-left:auto;}#srch:focus{border-color:#c8f135;}.sb{background:none;border:1px solid #1e2330;color:#5a6070;font-size:9px;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:3px;cursor:pointer;}.sb:hover{color:#e8eaf0;border-color:#e8eaf0;}.sb.on[data-s=Antuka]{background:#c84a00;border-color:#c84a00;color:#fff!important;}.sb.on[data-s=Tráva]{background:#2d7a3a;border-color:#2d7a3a;color:#fff!important;}.sb.on[data-s=Tvrdý]{background:#1a4a8a;border-color:#1a4a8a;color:#fff!important;}.sb.on[data-s=Krytý]{background:#5a3a8a;border-color:#5a3a8a;color:#fff!important;}.sb.on[data-s=Všechny]{background:#c8f135;border-color:#c8f135;color:#0a0c0f!important;}#mnav{display:flex;gap:2px;padding:6px 24px;background:#0a0c0f;border-bottom:1px solid #1e2330;overflow-x:auto;flex-shrink:0;scrollbar-width:thin;}.mb{background:none;border:none;color:#5a6070;font-size:9px;letter-spacing:1px;text-transform:uppercase;padding:4px 7px;border-radius:3px;cursor:pointer;white-space:nowrap;}.mb:hover{color:#e8eaf0;background:#111318;}#body{flex:1;overflow-y:auto;padding:0 24px 40px;scrollbar-width:thin;position:relative;}.mg{margin-top:20px;}.mh{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #1e2330;}.mn{font-family:Georgia,serif;font-size:24px;color:#e8eaf0;line-height:1;font-weight:700;}.mc{font-size:9px;color:#5a6070;font-family:monospace;}table{width:100%;border-collapse:collapse;}th{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#5a6070;text-align:left;padding:4px 8px;border-bottom:1px solid #1e2330;font-weight:400;font-family:monospace;white-space:nowrap;}td{padding:6px 8px;border-bottom:1px solid #1e2330;vertical-align:middle;}tr.r{cursor:pointer;transition:background .08s;}tr.r:hover td,tr.r.ex td{background:#111318;}.ct{font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700;font-family:monospace;display:inline-block;}.cATP{background:rgba(200,241,53,.15);color:#c8f135;}.cWTA{background:rgba(241,112,200,.15);color:#f170c8;}.cCHALL{background:rgba(53,200,241,.15);color:#35c8f1;}.cITF{background:rgba(241,160,53,.15);color:#f1a035;}.tr{font-size:9px;color:#5a6070;padding:1px 5px;border:1px solid #1e2330;border-radius:3px;margin-left:3px;font-family:monospace;}.tGS{border-color:#c8a020!important;color:#c8a020!important;}.tM1{border-color:#c84020!important;color:#c84020!important;}.t5{border-color:#4080d0!important;color:#4080d0!important;}.tCH175{border-color:#35c8f1!important;color:#35c8f1!important;}.tCH125{border-color:rgba(53,200,241,.5)!important;color:rgba(53,200,241,.8)!important;}.nm{font-weight:600;font-size:12px;color:#e8eaf0;display:block;margin-top:2px;line-height:1.3;}.lc{font-size:10px;color:#5a6070;display:block;}.dt{font-family:monospace;font-size:10px;color:#e8eaf0;white-space:nowrap;}.sp{font-size:9px;font-weight:500;padding:1px 6px;border-radius:3px;display:inline-block;}.sA{background:rgba(200,74,0,.2);color:#e06030;}.sT{background:rgba(45,122,58,.2);color:#50c060;}.sH{background:rgba(26,74,138,.2);color:#4080d0;}.sK{background:rgba(90,58,138,.2);color:#9060d0;}.live{display:inline-block;width:5px;height:5px;background:#f13570;border-radius:50%;animation:p 1.2s infinite;margin-right:3px;vertical-align:middle;}@keyframes p{0%,100%{opacity:1;}50%{opacity:.3;}}.cv{color:#5a6070;font-size:10px;transition:transform .15s;display:inline-block;width:12px;}tr.ex .cv{transform:rotate(90deg);}tr.xr td{padding:0;background:#181c23!important;}.xc{padding:10px 14px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;border-bottom:2px solid #c8f135;animation:sd .15s ease;}@keyframes sd{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}.xc h4{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#5a6070;margin-bottom:5px;font-family:monospace;padding-bottom:3px;border-bottom:1px solid #1e2330;}.ig{display:grid;grid-template-columns:1fr 1fr;gap:5px;}.ig label{display:block;font-size:8px;letter-spacing:1px;color:#5a6070;text-transform:uppercase;margin-bottom:1px;font-family:monospace;}.ig span{font-size:11px;color:#e8eaf0;font-weight:500;}#load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#5a6070;background:#0a0c0f;}.spin{width:36px;height:36px;border:3px solid #1e2330;border-top-color:#c8f135;border-radius:50%;animation:spin 1s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}#prog{font-size:11px;color:#c8f135;font-family:monospace;max-width:400px;text-align:center;line-height:1.6;}#err{display:none;background:#1a0808;border-bottom:1px solid #f13570;padding:5px 24px;font-size:10px;color:#f17070;flex-shrink:0;font-family:monospace;}#itfs{position:absolute;bottom:0;left:0;right:0;background:#0a0c0f;border-top:1px solid #1e2330;padding:4px 24px;font-size:9px;color:#5a6070;font-family:monospace;display:flex;align-items:center;gap:8px;}#itfb{height:2px;background:#f1a035;transition:width .4s;flex-shrink:0;}#itft{flex:1;}::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#1e2330;border-radius:3px;}`;

function surfSp(s){return s==='Antuka'?'sA':s==='Tráva'?'sT':s==='Krytý'?'sK':'sH';}
function tierCls(t){if(!t)return'';if(t==='Grand Slam')return'tGS';if(t==='Masters1000'||t==='WTA1000')return'tM1';if(t==='ATP500'||t==='WTA500')return't5';if(t==='CH175')return'tCH175';if(t==='CH125')return'tCH125';return'';}

// ── UI ────────────────────────────────────────────────────────
function buildUI(){
  document.getElementById('ts-host')?.remove();
  const host=document.createElement('div');
  host.id='ts-host';
  host.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;';
  document.body.appendChild(host);
  const sh=host.attachShadow({mode:'open'});
  const style=document.createElement('style');
  style.textContent=CSS;
  sh.appendChild(style);
  const w=document.createElement('div');w.id='w';sh.appendChild(w);

  function el(tag,id,cls,html){const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;if(html)e.innerHTML=html;return e;}

  const hdr=el('div','hdr');w.appendChild(hdr);
  const top=el('div','top');
  const logo=el('div','logo');logo.innerHTML=`Tennis<span>Scout</span>`;top.appendChild(logo);
  const ver=el('span',null,'badge');ver.textContent=`v${VERSION}`;top.appendChild(ver);
  const stats=el('div','stats');stats.innerHTML=`<div><b id="nt">—</b>Celkem</div><div><b id="ns">—</b>Zobrazeno</div>`;top.appendChild(stats);
  const btnR=el('button','btn-r');btnR.textContent='↻ Reload';top.appendChild(btnR);
  const btnC=el('button','btn-c');btnC.textContent='✕ Zavřít';top.appendChild(btnC);
  hdr.appendChild(top);
  const fr1=el('div',null,'fr');
  const fl1=el('span',null,'fl');fl1.textContent='Okruh';fr1.appendChild(fl1);
  [['ALL','Vše',true],['ATP','ATP'],['WTA','WTA'],['CHALL','Challenger'],['ITF','ITF']].forEach(([c,t,on])=>{
    const b=el('button',null,'fb'+(on?' on':''));b.dataset.c=c;b.textContent=t;fr1.appendChild(b);
  });
  const srch=el('input','srch');srch.placeholder='🔍 Hledat...';fr1.appendChild(srch);
  hdr.appendChild(fr1);
  const fr2=el('div',null,'fr');fr2.style.paddingBottom='10px';
  const fl2=el('span',null,'fl');fl2.textContent='Povrch';fr2.appendChild(fl2);
  [['Všechny',true],['Tvrdý'],['Antuka'],['Tráva'],['Krytý']].forEach(([s,on])=>{
    const b=el('button',null,'sb'+(on?' on':''));b.dataset.s=s;b.textContent=s;fr2.appendChild(b);
  });
  hdr.appendChild(fr2);

  w.appendChild(el('div','err'));
  const mnav=el('nav','mnav');w.appendChild(mnav);
  const body=el('div','body');w.appendChild(body);
  const itfs=el('div','itfs');
  const itfb=el('div','itfb');itfb.style.width='0';itfs.appendChild(itfb);
  const itft=el('div','itft');itft.textContent='Načítám ITF data...';itfs.appendChild(itft);
  w.appendChild(itfs);

  const load=el('div','load');
  const spin=el('div',null,'spin');load.appendChild(spin);
  const loadTxt=el('div');loadTxt.style.cssText='font-size:13px;color:#e8eaf0';loadTxt.textContent='Načítám ITF data...';load.appendChild(loadTxt);
  const prog=el('div','prog');prog.textContent='ATP/WTA/Challenger: načteno ✓ — čekám na ITF API...';load.appendChild(prog);
  body.appendChild(load);
  return{host,sh,body,mnav};
}

// ── RENDER ────────────────────────────────────────────────────
function setupRender({sh,body,mnav}){
  let aC='ALL',aS='Všechny',sq='',exId=null;

  function filtered(){
    return(window._tsData||[]).filter(t=>{
      if(aC!=='ALL'&&t.cat!==aC)return false;
      if(aS!=='Všechny'&&t.surf!==aS)return false;
      if(sq){const s=sq.toLowerCase();if(!t.name.toLowerCase().includes(s)&&!(t.loc||'').toLowerCase().includes(s)&&!(t.country||'').toLowerCase().includes(s))return false;}
      return true;
    });
  }

  function render(){
    const total=(window._tsData||[]).length,ts=filtered();
    const ntEl=sh.getElementById('nt'),nsEl=sh.getElementById('ns');
    if(ntEl)ntEl.textContent=total;if(nsEl)nsEl.textContent=ts.length;
    const byM={};ts.forEach(t=>{const m=getMonth(t.start);if(!byM[m])byM[m]=[];byM[m].push(t);});

    mnav.textContent='';
    Object.keys(byM).sort((a,b)=>+a-+b).forEach(m=>{
      const b=document.createElement('button');b.className='mb';
      b.textContent=MCS[m]+' ';
      const cnt=document.createElement('span');cnt.style.cssText='font-size:8px;opacity:.6;';cnt.textContent=byM[m].length;
      b.appendChild(cnt);b.onclick=()=>sh.getElementById('m'+m)?.scrollIntoView({behavior:'smooth',block:'start'});
      mnav.appendChild(b);
    });

    if(!ts.length){body.textContent='';const e=document.createElement('div');e.style.cssText='text-align:center;padding:60px;color:#5a6070;';e.textContent='Žádné turnaje.';body.appendChild(e);return;}

    let html='';
    Object.keys(byM).sort((a,b)=>+a-+b).forEach(m=>{
      const arr=byM[m];
      html+=`<div class="mg" id="m${m}"><div class="mh"><div class="mn">${MCS[m]}</div><div class="mc">${arr.length} turnajů</div></div><table><thead><tr><th style="width:18px"></th><th>Turnaj</th><th>Datum</th><th>Povrch</th><th>Los</th></tr></thead><tbody>`;
      arr.forEach((t,i)=>{
        const uid=`${m}_${i}`,ex=exId===uid,live=isLive(t.start,t.end);
        html+=`<tr class="r${ex?' ex':''}" data-uid="${uid}"><td><span class="cv">›</span></td><td><span class="ct c${t.cat}">${t.cat}</span><span class="tr ${tierCls(t.tier)}">${t.tier||'—'}</span><span class="nm">${live?'<span class="live"></span>':''}${t.name}</span><span class="lc">${t.loc}${t.country?' ('+t.country+')':''}</span></td><td class="dt">${fmtRange(t.start,t.end)}</td><td><span class="sp ${surfSp(t.surf)}">${t.surf}</span></td><td style="font-family:monospace;font-size:10px;color:#5a6070">${t.sgl>0?t.sgl:'—'}</td></tr>`;
        if(ex){
          const altLabel=t.alt>0?`${t.alt} m n.m.${t.alt>1000?' 🔴':t.alt>500?' 🟡':''}`:t.cat==='ITF'?'—':'0 m';
        const ioLabel=t.io==='I'?'🏠 Krytá hala':'☀️ Venkovní';
        const winnersHtml=(t.winners&&t.winners.length>0&&t.winners[0]!=='—')?t.winners.slice(0,3).map((w,i)=>`<div style="font-size:9px;color:#5a6070;font-family:monospace">${2025-i}: <span style="color:#e8eaf0;font-weight:600">${w}</span></div>`).join(''):'<span style="color:#5a6070;font-size:10px">—</span>';
        html+=`<tr class="xr"><td colspan="5"><div class="xc" style="grid-template-columns:1fr 1fr 1fr 1fr"><div><h4>Info</h4><div class="ig"><div><label>Okruh</label><span>${t.cat}</span></div><div><label>Tier</label><span>${t.tier||'—'}</span></div><div><label>Povrch</label><span>${t.surf}</span></div><div><label>Lokace</label><span>${ioLabel}</span></div><div><label>Los SGL</label><span>${t.sgl>0?t.sgl+' hr':'—'}</span></div><div><label>Los DBL</label><span>${t.dbl>0?t.dbl+' párů':'—'}</span></div></div></div><div><h4>Lokalita & výška</h4><div style="font-size:12px;color:#e8eaf0;font-weight:600;margin-bottom:4px">${t.name}</div><div style="font-size:10px;color:#5a6070">${t.loc}${t.country?' ('+t.country+')':''}</div><div style="font-size:10px;color:#c8f135;margin-top:6px;font-family:monospace;font-weight:600">${altLabel}</div><div style="font-size:9px;color:#5a6070;margin-top:2px;font-family:monospace">${t.start||'?'} → ${t.end||'?'}</div></div><div><h4>Prize money</h4><div style="font-size:16px;color:#c8f135;font-weight:700;font-family:monospace">${t.prize||'—'}</div><div style="font-size:9px;color:#5a6070;margin-top:2px">Vítěz singlu</div><div style="margin-top:8px;font-size:9px;color:#5a6070;text-transform:uppercase;letter-spacing:1px">Stav</div><div style="color:${live?'#f13570':'#5a6070'};font-size:${live?12:11}px;font-weight:${live?700:400};margin-top:2px">${live?'🔴 Probíhá':'Nadcházející'}</div></div><div><h4>Vítězové (2025–2023)</h4>${winnersHtml}</div></div></td></tr>`;
        }
      });
      html+='</tbody></table></div>';
    });

    const tmp=new DOMParser().parseFromString(`<div>${html}</div>`,'text/html');
    const frag=document.createDocumentFragment();
    [...tmp.body.firstChild.childNodes].forEach(n=>frag.appendChild(document.adoptNode(n)));
    body.textContent='';body.appendChild(frag);
    body.querySelectorAll('tr.r').forEach(row=>row.addEventListener('click',()=>{exId=exId===row.dataset.uid?null:row.dataset.uid;render();}));
  }

  sh.querySelectorAll('.fb[data-c]').forEach(b=>b.addEventListener('click',()=>{sh.querySelectorAll('.fb[data-c]').forEach(x=>x.classList.remove('on'));b.classList.add('on');aC=b.dataset.c;exId=null;render();}));
  sh.querySelectorAll('.sb[data-s]').forEach(b=>b.addEventListener('click',()=>{sh.querySelectorAll('.sb[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');aS=b.dataset.s;exId=null;render();}));
  sh.getElementById('srch').addEventListener('input',e=>{sq=e.target.value;exId=null;render();});
  sh.getElementById('btn-c').addEventListener('click',()=>document.getElementById('ts-host')?.remove());
  sh.getElementById('btn-r').addEventListener('click',()=>{document.getElementById('ts-host')?.remove();TENNIS_SCOUT();});
  return render;
}

// ── MAIN ──────────────────────────────────────────────────────
window._tsData=[];
const{host,sh,body,mnav}=buildUI();
const render=setupRender({sh,body,mnav});
const setP=t=>{const e=sh.getElementById('itft');if(e)e.textContent=t;const m=t.match(/(\d+)\/(\d+)/);if(m){const b=sh.getElementById('itfb');if(b)b.style.width=(+m[1]/+m[2]*100)+'%';}};
const addErr=m=>{const e=sh.getElementById('err');if(e){e.textContent=(e.textContent?e.textContent+' | ':'')+m;e.style.display='block';}};

// 1. Statická data — okamžitě
window._tsData.push(...mkAtp(ATP),...mkWta(WTA),...mkChall(CHALL));
sh.getElementById('load')?.remove();
render();

// 2. ITF live API — funguje pouze z itftennis.com
console.log('🎾 Spouštím ITF fetch z GitHub cache...');
setP('Načítám ITF data...');
fetchITF(txt=>{
  setP(txt);
}).then(itfItems=>{
  window._tsData.push(...itfItems);
  render();
  const s=sh.getElementById('itfs');if(s)s.style.display='none';
  const total=window._tsData.length;
  console.log(`%c🎾 Tennis Scout v${VERSION} — ${total} turnajů`,'color:#c8f135;font-weight:bold;font-size:14px;');
  console.table({ATP:ATP.length,WTA:WTA.length,Challenger:CHALL.length,'ITF M+W':itfItems.length,CELKEM:total});
}).catch(e=>{addErr('ITF: '+e.message);});

})();
