// ================================================================
// 🎾 TENNIS SCOUT — LIVE CALENDAR v5.0
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
// ===============================================================

(async function TENNIS_SCOUT() {
'use strict';
const VERSION = '5.3';

// ATP Rankings - načítáno z GitHubu (stejně jako ITF data)
window.ATP_PLAYERS = [];

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

async function fetchPlayers(onProgress){
  try{
    onProgress&&onProgress('Načítám hráče ATP...');
    // Načti hráče s cache-bust
    const pr=await fetch('https://raw.githubusercontent.com/Havran001/tennis-scout/main/atp_players.json?v='+Date.now(),{cache:'no-store'});
    const pd=await pr.json();
    const players=(pd.items||pd);

    // Načti Sackmann CSV pro age/hand/height
    onProgress&&onProgress('Načítám statistiky...');
    const sr=await fetch('https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_players.csv');
    const stxt=await sr.text();
    const slines=stxt.trim().split('\n');
    const shdr=slines[0].split(',');
    const smap={};
    for(const line of slines.slice(1)){
      const cols=line.split(',');
      const obj=Object.fromEntries(shdr.map((h,i)=>[h,cols[i]||'']));
      const key=(obj.name_first+' '+obj.name_last).toLowerCase().trim();
      smap[key]={hand:obj.hand||'',dob:obj.dob||'',height:obj.height?parseInt(obj.height):null};
    }

    const today=new Date();
    window.ATP_PLAYERS=players.map(function(p){
      const sack=smap[(p.name||'').toLowerCase().trim()];
      let age=null;
      if(sack&&sack.dob&&sack.dob.length===8){
        const y=parseInt(sack.dob.slice(0,4)),m=parseInt(sack.dob.slice(4,6))-1,d=parseInt(sack.dob.slice(6,8));
        age=today.getFullYear()-y-(today<new Date(today.getFullYear(),m,d)?1:0);
      }
      return {
        rank:p.rank,name:p.name,
        country:(p.country||'').toUpperCase(),
        pts:p.pts,id:p.id,
        age:age,
        hand:(sack&&sack.hand&&sack.hand!=='U')?sack.hand:null,
        height:(sack&&sack.height)||null
      };
    });
    onProgress&&onProgress('Hráči ATP načteni: '+window.ATP_PLAYERS.length);
    // Načti WTA hráčky
    try{
      const wr=await fetch('https://raw.githubusercontent.com/Havran001/tennis-scout/main/wta_players.json?v='+Date.now(),{cache:'no-store'});
      const wd=await wr.json();
      window.WTA_PLAYERS=(wd.items||wd);
      onProgress&&onProgress('WTA hráčky načteny: '+window.WTA_PLAYERS.length);
    }catch(e){window.WTA_PLAYERS=[];}
    return window.ATP_PLAYERS.length;
  }catch(e){
    console.warn('fetchPlayers:',e.message);
    return 0;
  }
}

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
const CSS=`
:host{all:initial;}
*{box-sizing:border-box;margin:0;padding:0;}

/* ── SHELL ── */
#w{
  display:flex;flex-direction:row;
  width:100vw;height:100vh;overflow:hidden;
  background:#0d1117;
  font-family:'Söhne','Helvetica Neue','Arial',sans-serif;
  color:#e6edf3;font-size:13px;
}

/* ── SIDEBAR ── */
#sidebar{
  width:220px;flex-shrink:0;
  background:#161b22;
  border-right:1px solid rgba(255,255,255,0.06);
  display:flex;flex-direction:column;
  overflow:hidden;
}
#sb-logo{
  padding:20px 20px 16px;
  border-bottom:1px solid rgba(255,255,255,0.06);
  display:flex;align-items:center;gap:10px;
}
#sb-logo-icon{
  width:32px;height:32px;
  background:linear-gradient(135deg,#00C853,#00897B);
  border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:16px;flex-shrink:0;
}
#sb-logo-text{
  font-size:15px;font-weight:700;
  color:#fff;letter-spacing:-0.3px;
}
#sb-logo-text span{color:#00C853;}
#sb-badge{
  font-size:8px;padding:1px 5px;
  background:rgba(0,200,83,0.15);
  color:#00C853;border-radius:3px;
  font-weight:700;letter-spacing:1px;
  margin-left:auto;
}

/* NAV */
#sb-nav{
  flex:1;overflow-y:auto;
  padding:8px 0;
  scrollbar-width:none;
}
.nav-section{
  padding:14px 16px 4px;
  font-size:9px;font-weight:700;
  letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,0.2);
}
.nav-item{
  display:flex;align-items:center;gap:10px;
  padding:9px 16px;margin:1px 8px;
  border-radius:8px;cursor:pointer;
  color:rgba(255,255,255,0.5);
  font-size:12px;font-weight:500;
  transition:all .12s;
  position:relative;
}
.nav-item:hover{
  background:rgba(255,255,255,0.05);
  color:#e6edf3;
}
.nav-item.active{
  background:rgba(0,200,83,0.12);
  color:#00C853;font-weight:600;
}
.nav-item.active::before{
  content:'';position:absolute;
  left:-8px;top:50%;transform:translateY(-50%);
  width:3px;height:16px;border-radius:2px;
  background:#00C853;
}
.nav-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0;}
.nav-badge{
  margin-left:auto;font-size:8px;
  background:rgba(0,200,83,0.2);
  color:#00C853;padding:1px 6px;
  border-radius:10px;font-weight:700;
}
.nav-soon{
  margin-left:auto;font-size:8px;
  background:rgba(255,255,255,0.06);
  color:rgba(255,255,255,0.25);padding:1px 6px;
  border-radius:10px;
}

/* SIDEBAR FOOTER */
#sb-footer{
  padding:12px 16px;
  border-top:1px solid rgba(255,255,255,0.06);
}
#sb-reload{
  width:100%;padding:8px;
  background:rgba(0,200,83,0.1);
  border:1px solid rgba(0,200,83,0.2);
  color:#00C853;border-radius:8px;
  font-size:11px;font-weight:700;
  cursor:pointer;transition:all .12s;
  letter-spacing:0.3px;
}
#sb-reload:hover{background:rgba(0,200,83,0.2);}
#sb-close{
  width:100%;padding:6px;margin-top:6px;
  background:transparent;
  border:1px solid rgba(255,255,255,0.07);
  color:rgba(255,255,255,0.3);border-radius:8px;
  font-size:11px;cursor:pointer;transition:all .12s;
}
#sb-close:hover{color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.15);}

/* ── MAIN PANEL ── */
#main{
  flex:1;display:flex;flex-direction:column;
  overflow:hidden;background:#0d1117;
}

/* TOP BAR */
#topbar{
  height:52px;flex-shrink:0;
  background:#161b22;
  border-bottom:1px solid rgba(255,255,255,0.06);
  display:flex;align-items:center;
  padding:0 24px;gap:16px;
}
#topbar-title{
  font-size:14px;font-weight:700;color:#fff;
}
#topbar-sub{
  font-size:11px;color:rgba(255,255,255,0.3);
  margin-left:4px;
}
#topbar-stats{
  margin-left:auto;
  display:flex;gap:24px;align-items:center;
}
.ts-stat{
  text-align:right;
}
.ts-stat-val{
  font-size:16px;font-weight:800;color:#fff;
  letter-spacing:-0.5px;line-height:1;
}
.ts-stat-val.green{color:#00C853;}
.ts-stat-lbl{
  font-size:8px;color:rgba(255,255,255,0.25);
  letter-spacing:1.5px;text-transform:uppercase;
}

/* FILTER BAR */
#filterbar{
  flex-shrink:0;
  background:#161b22;
  border-bottom:1px solid rgba(255,255,255,0.06);
  padding:8px 24px;
  display:flex;gap:6px;align-items:center;
}
.fl{
  font-size:8px;color:rgba(255,255,255,0.2);
  text-transform:uppercase;letter-spacing:2px;
  margin-right:4px;flex-shrink:0;
}
.fb{
  background:transparent;
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,255,255,0.4);
  font-size:10px;font-weight:600;
  padding:4px 12px;border-radius:6px;
  cursor:pointer;transition:all .1s;
}
.fb:hover{border-color:rgba(255,255,255,0.2);color:#e6edf3;}
.fb.on{color:#0d1117!important;font-weight:700;}
.fb[data-c=ALL].on{background:#e6edf3;border-color:#e6edf3;}
.fb[data-c=ATP].on{background:#00C853;border-color:#00C853;}
.fb[data-c=WTA].on{background:#f472b6;border-color:#f472b6;}
.fb[data-c=CHALL].on{background:#38bdf8;border-color:#38bdf8;}
.fb[data-c=ITF].on{background:#fb923c;border-color:#fb923c;}
.sb{
  background:transparent;
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,255,255,0.3);
  font-size:9px;letter-spacing:1px;text-transform:uppercase;
  padding:3px 10px;border-radius:5px;cursor:pointer;transition:all .1s;
}
.sb:hover{color:#e6edf3;border-color:rgba(255,255,255,0.15);}
.sb.on[data-s=Antuka]{background:#c2410c;border-color:#c2410c;color:#fff!important;}
.sb.on[data-s=Tr\u00E1va]{background:#15803d;border-color:#15803d;color:#fff!important;}
.sb.on[data-s=Tvrd\u00FD]{background:#1d4ed8;border-color:#1d4ed8;color:#fff!important;}
.sb.on[data-s=Kryt\u00FD]{background:#6d28d9;border-color:#6d28d9;color:#fff!important;}
.sb.on[data-s=V\u0161echny]{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff!important;}
#srch{
  margin-left:auto;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  color:#e6edf3;font-size:11px;
  padding:5px 12px 5px 28px;
  border-radius:8px;outline:none;width:200px;
  transition:border-color .15s;
}
#srch:focus{border-color:rgba(0,200,83,0.4);}
#srch::placeholder{color:rgba(255,255,255,0.2);}

/* MONTH NAV */
#mnav{
  display:flex;gap:2px;
  padding:6px 24px;
  background:#0d1117;
  border-bottom:1px solid rgba(255,255,255,0.04);
  overflow-x:auto;flex-shrink:0;
  scrollbar-width:none;
}
.mb{
  background:none;border:none;
  color:rgba(255,255,255,0.2);
  font-size:9px;letter-spacing:2px;
  text-transform:uppercase;
  padding:4px 10px;border-radius:5px;
  cursor:pointer;transition:all .1s;white-space:nowrap;
}
.mb:hover{color:#e6edf3;background:rgba(255,255,255,0.04);}

/* CONTENT AREA */
#body{
  flex:1;overflow-y:auto;
  padding:0 24px 60px;
  scrollbar-width:thin;
  scrollbar-color:rgba(255,255,255,0.08) transparent;
  position:relative;
}

/* ── HOME VIEW ── */
#home-view{padding:28px 0;}
#home-greeting{
  font-size:22px;font-weight:800;
  color:#fff;letter-spacing:-0.5px;
  margin-bottom:4px;
}
#home-greeting span{color:#00C853;}
#home-sub{
  font-size:12px;color:rgba(255,255,255,0.3);
  margin-bottom:28px;
}
#home-cards{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:16px;
}
.home-card{
  background:#161b22;
  border:1px solid rgba(255,255,255,0.06);
  border-radius:12px;
  padding:20px 22px 22px;
  cursor:pointer;
  transition:all .15s;
  position:relative;
  overflow:hidden;
}
.home-card::before{
  content:'';position:absolute;
  top:0;left:0;right:0;height:2px;
  opacity:0;transition:opacity .15s;
}
.home-card:hover{
  border-color:rgba(255,255,255,0.12);
  background:#1c2128;
  transform:translateY(-2px);
  box-shadow:0 8px 32px rgba(0,0,0,0.4);
}
.home-card:hover::before{opacity:1;}
.home-card.green::before{background:linear-gradient(90deg,#00C853,#00897B);}
.home-card.blue::before{background:linear-gradient(90deg,#38bdf8,#6366f1);}
.home-card.pink::before{background:linear-gradient(90deg,#f472b6,#a855f7);}
.home-card.orange::before{background:linear-gradient(90deg,#fb923c,#f59e0b);}
.home-card.disabled{opacity:0.4;cursor:default;}
.home-card.disabled:hover{transform:none;box-shadow:none;}
.hc-icon{
  width:40px;height:40px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;margin-bottom:14px;
}
.hc-icon.green{background:rgba(0,200,83,0.12);}
.hc-icon.blue{background:rgba(56,189,248,0.12);}
.hc-icon.pink{background:rgba(244,114,182,0.12);}
.hc-icon.orange{background:rgba(251,146,60,0.12);}
.hc-title{
  font-size:14px;font-weight:700;color:#fff;
  margin-bottom:4px;
}
.hc-desc{
  font-size:11px;color:rgba(255,255,255,0.35);
  line-height:1.5;margin-bottom:14px;
}
.hc-meta{
  display:flex;gap:8px;align-items:center;
}
.hc-count{
  font-size:11px;font-weight:700;color:#00C853;
  font-variant-numeric:tabular-nums;
}
.hc-arrow{
  margin-left:auto;
  font-size:14px;color:rgba(255,255,255,0.2);
  transition:transform .12s;
}
.home-card:hover .hc-arrow{transform:translateX(3px);color:#00C853;}
.hc-tag{
  font-size:9px;padding:2px 7px;border-radius:4px;
  font-weight:700;letter-spacing:0.5px;
}
.hc-tag.soon{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.25);}

/* ── TABLES ── */
.mg{margin-top:24px;}
.mh{
  display:flex;align-items:baseline;gap:10px;
  margin-bottom:10px;padding-bottom:8px;
  border-bottom:1px solid rgba(255,255,255,0.04);
}
.mn{font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;}
.mc{font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1px;text-transform:uppercase;}
table{width:100%;border-collapse:collapse;}
th{
  font-size:8px;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,0.2);text-align:left;
  padding:6px 10px;
  border-bottom:1px solid rgba(255,255,255,0.04);font-weight:600;
}
td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.03);vertical-align:middle;}
.ct{font-size:8px;padding:2px 5px;border-radius:4px;font-weight:800;display:inline-block;}
.cATP{background:rgba(0,200,83,0.12);color:#00C853;}
.cWTA{background:rgba(244,114,182,0.12);color:#f472b6;}
.cCHALL{background:rgba(56,189,248,0.12);color:#38bdf8;}
.cITF{background:rgba(251,146,60,0.12);color:#fb923c;}
.tr{
  font-size:8px;color:rgba(255,255,255,0.2);
  padding:1px 5px;border:1px solid rgba(255,255,255,0.08);
  border-radius:3px;margin-left:3px;
}
.tGS{border-color:rgba(250,204,21,0.3);color:#fcd34d;}
.tM1{border-color:rgba(239,68,68,0.3);color:#f87171;}
.t5{border-color:rgba(99,102,241,0.3);color:#818cf8;}
.tCH175{border-color:rgba(34,211,238,0.3);color:#22d3ee;}
.tCH125{border-color:rgba(34,211,238,0.15);color:rgba(34,211,238,0.6);}
.nm{font-weight:600;font-size:12px;color:#e6edf3;display:block;margin-top:2px;line-height:1.3;}
.lc{font-size:10px;color:rgba(255,255,255,0.25);display:block;}
.dt{font-size:10px;color:rgba(255,255,255,0.35);white-space:nowrap;}
.sp{font-size:9px;font-weight:600;padding:2px 8px;border-radius:20px;display:inline-block;}
.sA{background:rgba(194,65,12,0.15);color:#fb923c;}
.sT{background:rgba(21,128,61,0.15);color:#4ade80;}
.sH{background:rgba(29,78,216,0.15);color:#60a5fa;}
.sK{background:rgba(109,40,217,0.15);color:#c084fc;}
tr.r{cursor:pointer;transition:background .07s;}
tr.r:hover td,tr.r.ex td{background:rgba(255,255,255,0.025);}
.cv{color:rgba(255,255,255,0.12);font-size:10px;transition:transform .15s;display:inline-block;width:14px;}
tr.ex .cv{transform:rotate(90deg);color:#00C853;}
.live{display:inline-block;width:5px;height:5px;background:#00C853;border-radius:50%;animation:p 1.2s infinite;margin-right:4px;vertical-align:middle;}
@keyframes p{0%,100%{opacity:1}50%{opacity:.2}}
tr.xr td{padding:0;background:rgba(0,200,83,0.02)!important;}
.xc{
  padding:14px 18px 18px;
  display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;
  border-bottom:2px solid rgba(0,200,83,0.15);
  animation:sd .12s ease;
}
@keyframes sd{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
.xc h4{
  font-size:7px;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,0.15);margin-bottom:8px;
  padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.04);
}
.ig{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
.ig label{display:block;font-size:7px;letter-spacing:1px;color:rgba(255,255,255,0.2);text-transform:uppercase;margin-bottom:2px;}
.ig span{font-size:11px;color:#e6edf3;font-weight:500;}

/* ── PLAYERS VIEW ── */
#pw{
  display:none;
  color:#e6edf3;
}

/* ── ERR / ITF STATUS / LOAD ── */
#err{display:none;background:rgba(239,68,68,0.08);border-bottom:1px solid rgba(239,68,68,0.15);padding:6px 24px;font-size:10px;color:#f87171;flex-shrink:0;}
#itfs{
  position:absolute;bottom:0;left:0;right:0;
  background:rgba(13,17,23,0.97);
  border-top:1px solid rgba(255,255,255,0.04);
  padding:5px 24px;font-size:9px;
  color:rgba(255,255,255,0.2);
  display:flex;align-items:center;gap:10px;letter-spacing:1px;
}
#itfb{height:2px;background:linear-gradient(90deg,#00C853,#00897B);transition:width .4s;flex-shrink:0;}
#itft{flex:1;}
#load{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
  background:#0d1117;color:rgba(255,255,255,0.25);
}
.spin{width:32px;height:32px;border:2px solid rgba(255,255,255,0.05);border-top-color:#00C853;border-radius:50%;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
#prog{font-size:11px;color:#00C853;font-weight:600;max-width:360px;text-align:center;line-height:1.6;}

/* ── SCROLLBARS ── */
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:3px;}
`;function surfSp(s){return s==='Antuka'?'sA':s==='Tráva'?'sT':s==='Krytý'?'sK':'sH';}
function tierCls(t){if(!t)return'';if(t==='Grand Slam')return'tGS';if(t==='Masters1000'||t==='WTA1000')return'tM1';if(t==='ATP500'||t==='WTA500')return't5';if(t==='CH175')return'tCH175';if(t==='CH125')return'tCH125';return'';}


// ── HRÁČI ──────────────────────────────────────────────────────────────────
function buildPlayersTab(sh){
  var wrap=document.createElement("div");
  wrap.id="pw";wrap.style.cssText="display:none;padding:0;";
  var pS="",pC="ALL",pO="rank",pP=0,PAGE=100;
  
  function countryFlag(cc){
    if(!cc||cc.length!==3)return '';
    // IOC 3-letter → ISO 2-letter mapa (hlavní země)
    var m={'ESP':'ES','ITA':'IT','SRB':'RS','GER':'DE','AUS':'AU','USA':'US','FRA':'FR',
      'GBR':'GB','ARG':'AR','JPN':'JP','RUS':'RU','CAN':'CA','NOR':'NO','CZE':'CZ',
      'GRE':'GR','CHI':'CL','DEN':'DK','SUI':'CH','BEL':'BE','GEO':'GE','KAZ':'KZ',
      'BUL':'BG','HUN':'HU','POL':'PL','NED':'NL','POR':'PT','CRO':'HR','SWE':'SE',
      'AUT':'AT','FIN':'FI','SLO':'SI','SVK':'SK','BRA':'BR','COL':'CO','URU':'UY',
      'PER':'PE','ECU':'EC','MEX':'MX','RSA':'ZA','EGY':'EG','MAR':'MA','TUN':'TN',
      'KOR':'KR','CHN':'CN','IND':'IN','THA':'TH','TPE':'TW','HKG':'HK','UKR':'UA',
      'MDA':'MD','ROU':'RO','SRB':'RS','BIH':'BA','MKD':'MK','ALB':'AL','TUR':'TR',
      'ISR':'IL','LIB':'LB','QAT':'QA','UAE':'AE','BAH':'BH','KUW':'KW','IRN':'IR',
      'PAK':'PK','SRI':'LK','BAN':'BD','UZB':'UZ','AZE':'AZ','ARM':'AM','BLR':'BY',
      'LAT':'LV','LTU':'LT','EST':'EE','ISL':'IS','IRL':'IE','PUR':'PR','DOM':'DO',
      'VEN':'VE','BOL':'BO','PAR':'PY','GUA':'GT','ESA':'SV','CRC':'CR','PAN':'PA',
      'JAM':'JM','TRI':'TT','HAI':'HT','CUB':'CU','NZL':'NZ','PHI':'PH','INA':'ID',
      'MAS':'MY','SIN':'SG','VIE':'VN','MON':'MC','LUX':'LU','MLT':'MT','CYP':'CY',
      'MRI':'MU','ZIM':'ZW','KEN':'KE','NGR':'NG','GHA':'GH','SEN':'SN','CMR':'CM'
    };
    var iso=m[cc]||cc.slice(0,2);
    if(iso.length!==2)return '';
    return iso.toUpperCase().split('').map(function(c){return String.fromCodePoint(c.charCodeAt(0)+127397);}).join('');
  }
  function hl(name,q){
    if(!q||!name)return name;
    var lo=name.toLowerCase(),qi=lo.indexOf(q);
    if(qi<0)return name;
    return name.slice(0,qi)+'<mark style="background:rgba(0,200,83,0.25);color:#00C853;border-radius:2px;padding:0 1px;">'+name.slice(qi,qi+q.length)+"</mark>"+name.slice(qi+q.length);
  }
  function rP(){
    var ATP=window.ATP_PLAYERS||[];
    if(!ATP.length){wrap.innerHTML='<div style="padding:60px;text-align:center;color:rgba(255,255,255,0.2);font-size:13px;">⏳ Načítám hráče...</div>';return;}
    var q=(pS||"").toLowerCase().trim();
    var f=ATP.filter(function(p){
      if(!p||!p.name)return false;
      if(pC!=="ALL"&&(p.country||"").toUpperCase()!==pC)return false;
      if(q){var n=(p.name||"").toLowerCase();var c=(p.country||"").toLowerCase();var rk=String(p.rank||"");if(!n.includes(q)&&!c.includes(q)&&!rk.startsWith(q))return false;}
      return true;
    });
    if(pO==="rank")f.sort(function(a,b){return(a.rank||9999)-(b.rank||9999);});
    else if(pO==="pts")f.sort(function(a,b){return(b.pts||0)-(a.pts||0);});
    else if(pO==="age")f.sort(function(a,b){return(a.age||99)-(b.age||99);});
    else if(pO==="height")f.sort(function(a,b){return(b.height||0)-(a.height||0);});
    else f.sort(function(a,b){return(a.name||"").localeCompare(b.name||"");});
    var total=f.length;
    if(pP>=Math.ceil(total/PAGE))pP=Math.max(0,Math.ceil(total/PAGE)-1);
    var pg=f.slice(pP*PAGE,pP*PAGE+PAGE),pages=Math.ceil(total/PAGE)||1;
    var cc={};ATP.forEach(function(p){var c=(p.country||"").toUpperCase();if(c)cc[c]=(cc[c]||0)+1;});
    var top10=Object.entries(cc).sort(function(a,b){return b[1]-a[1];}).slice(0,10).map(function(x){return x[0];});
    var h='<div style="padding:0 24px 60px;">';
    h+='<div style="padding:16px 0 12px;"><div style="position:relative;max-width:520px;">';
    var sv=pS.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
    h+='<input id="ps-i" type="text" autocomplete="off" placeholder="Hledej jméno, zemi nebo rank..." value="'+sv+'"';
    h+=' style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#e6edf3;font-size:14px;padding:10px 40px 10px 16px;border-radius:10px;outline:none;box-sizing:border-box;"/>';
    if(pS)h+='<button id="ps-x" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,0.3);font-size:18px;cursor:pointer;line-height:1;">×</button>';
    h+='</div>';
    if(q&&total>0)h+='<div style="margin-top:5px;font-size:11px;color:#00C853;">✓ Nalezeno '+total+' hráčů</div>';
    if(q&&total===0)h+='<div style="margin-top:5px;font-size:11px;color:rgba(255,100,100,0.7);">✗ Nic pro "'+pS+'"</div>';
    h+='</div>';
    h+='<div style="display:flex;gap:5px;align-items:center;padding:0 0 10px;border-bottom:1px solid rgba(255,255,255,0.06);flex-wrap:wrap;">';
    h+='<button data-cf="ALL" style="padding:4px 12px;border-radius:14px;border:1px solid '+(pC==="ALL"?"#00C853":"rgba(255,255,255,0.12)")+';background:'+(pC==="ALL"?"#00C853":"transparent")+';color:'+(pC==="ALL"?"#000":"rgba(255,255,255,0.5)")+';font-size:10px;cursor:pointer;font-weight:700;">Vše</button>';
    top10.forEach(function(c){var on=pC===c;h+='<button data-cf="'+c+'" style="padding:4px 10px;border-radius:14px;border:1px solid '+(on?"#00C853":"rgba(255,255,255,0.08)")+';background:'+(on?"rgba(0,200,83,0.15)":"transparent")+';color:'+(on?"#00C853":"rgba(255,255,255,0.35)")+';font-size:9px;cursor:pointer;font-weight:600;">'+countryFlag(c)+' '+c+'</button>';});
    h+='<div style="margin-left:auto;display:flex;align-items:center;gap:8px;">';
    h+='<select id="ps-s" style="background:#161b22;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-size:10px;padding:4px 8px;border-radius:6px;cursor:pointer;outline:none;">';
    [["rank","Ranking"],["pts","Body"],["age","Věk"],["height","Výška"],["name","Jméno"]].forEach(function(x){h+='<option value="'+x[0]+'"'+(pO===x[0]?" selected":"")+'>'+x[1]+'</option>';});
    h+='</select><span style="font-size:9px;color:rgba(255,255,255,0.2);">'+(q?total+"/":"")+ATP.length+' hráčů</span></div></div>';
    // Tabulka — nové sloupce
    h+='<table style="width:100%;border-collapse:collapse;margin-top:4px;"><thead><tr style="background:rgba(255,255,255,0.02);">';
    h+='<th style="padding:7px 8px;font-size:8px;color:rgba(255,255,255,0.2);text-align:left;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.06);width:40px;">#</th>';
    h+='<th style="padding:7px 8px;font-size:8px;color:rgba(255,255,255,0.2);text-align:left;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.06);">HRÁČ</th>';
    h+='<th style="padding:7px 8px;font-size:8px;color:rgba(255,255,255,0.2);text-align:center;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.06);width:50px;">ZEMĞ</th>';
    h+='<th style="padding:7px 8px;font-size:8px;color:rgba(255,255,255,0.2);text-align:center;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.06);width:40px;">VěK</th>';
    h+='<th style="padding:7px 8px;font-size:8px;color:rgba(255,255,255,0.2);text-align:center;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.06);width:50px;">RUKA</th>';
    h+='<th style="padding:7px 8px;font-size:8px;color:rgba(255,255,255,0.2);text-align:center;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.06);width:60px;">VÝŠKA</th>';
    h+='<th style="padding:7px 8px;font-size:8px;color:rgba(255,255,255,0.2);text-align:right;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.06);width:80px;">BODY</th>';
    h+='<th style="width:24px;border-bottom:1px solid rgba(255,255,255,0.06);"></th></tr></thead><tbody>';
    if(!pg.length)h+='<tr><td colspan="8" style="padding:40px;text-align:center;color:rgba(255,255,255,0.2);">Nic nenalezeno</td></tr>';
    pg.forEach(function(p,idx){
      var url=p.id?"https://www.atptour.com/en/players/p/"+p.id+"/overview":"#";
      var bg=idx%2===0?"transparent":"rgba(255,255,255,0.012)";
      var flag=countryFlag(p.country||"");
      var handIcon=p.hand==="L"?'🤚 L':'R';
      var handColor=p.hand==="L"?"#60a5fa":"rgba(255,255,255,0.35)";
      h+='<tr class="pr" style="background:'+bg+';border-bottom:1px solid rgba(255,255,255,0.03);cursor:pointer;" data-url="'+url+'">';
      h+='<td style="padding:7px 8px;font-size:11px;color:rgba(255,255,255,0.25);">'+p.rank+'</td>';
      h+='<td style="padding:7px 8px;font-size:12px;font-weight:600;color:#e6edf3;">'+(flag?flag+' ':'')+hl(p.name,q)+'</td>';
      h+='<td style="padding:7px 8px;text-align:center;font-size:16px;" title="'+(p.country||"")+'">'+flag+'<div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:1px;">'+(p.country||"-")+'</div></td>';
      h+='<td style="padding:7px 8px;font-size:12px;color:rgba(255,255,255,0.6);text-align:center;">'+(p.age||"-")+'</td>';
      h+='<td style="padding:7px 8px;text-align:center;font-size:11px;color:'+handColor+';font-weight:600;">'+(p.hand||"-")+'</td>';
      h+='<td style="padding:7px 8px;font-size:11px;color:rgba(255,255,255,0.5);text-align:center;">'+(p.height?p.height+" cm":"-")+'</td>';
      h+='<td style="padding:7px 8px;font-size:12px;color:#00C853;text-align:right;font-weight:700;">'+(p.pts?p.pts.toLocaleString("cs-CZ"):"-")+'</td>';
      h+='<td style="padding:7px 8px;text-align:center;font-size:10px;color:rgba(0,200,83,0.4);">↗</td>';
      h+='</tr>';
    });
    h+='</tbody></table>';
    if(pages>1){
      h+='<div style="display:flex;gap:4px;padding:14px 0;align-items:center;justify-content:center;flex-wrap:wrap;">';
      h+='<button data-pp="prev" style="padding:5px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:'+(pP===0?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.5)")+';font-size:13px;cursor:pointer;">←</button>';
      var s2=Math.max(0,pP-4),e2=Math.min(pages-1,pP+4);
      if(s2>0)h+='<button data-pp="0" style="padding:5px 9px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.35);font-size:11px;cursor:pointer;">1</button><span style="color:rgba(255,255,255,0.2);padding:0 2px;">&hellip;</span>';
      for(var pi=s2;pi<=e2;pi++){h+='<button data-pp="'+pi+'" style="padding:5px 10px;border-radius:6px;border:1px solid '+(pi===pP?"#00C853":"rgba(255,255,255,0.08)")+';background:'+(pi===pP?"rgba(0,200,83,0.15)":"transparent")+';color:'+(pi===pP?"#00C853":"rgba(255,255,255,0.35)")+';font-size:11px;cursor:pointer;font-weight:'+(pi===pP?"700":"400")+';">'+(pi+1)+'</button>';}
      if(e2<pages-1)h+='<span style="color:rgba(255,255,255,0.2);padding:0 2px;">&hellip;</span><button data-pp="'+(pages-1)+'" style="padding:5px 9px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.35);font-size:11px;cursor:pointer;">'+pages+'</button>';
      h+='<button data-pp="next" style="padding:5px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:'+(pP>=pages-1?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.5)")+';font-size:13px;cursor:pointer;">→</button>';
      h+='<span style="font-size:9px;color:rgba(255,255,255,0.15);margin-left:6px;">'+(pP*PAGE+1)+"-"+Math.min((pP+1)*PAGE,total)+" / "+total+'</span></div>';
    }
    h+='</div>';
    wrap.innerHTML=h;
var _f=JSON.parse(localStorage.getItem('ts_favs')||'[]');if(_f.length){wrap.querySelectorAll('button').forEach(function(_b){var _m=_b.getAttribute('onclick');if(!_m)return;var _i=_m.indexOf("id='")+4;var _j=_m.indexOf("'",_i);var _id=_m.substring(_i,_j);if(_f.indexOf(_id)>-1)_b.style.color='#FFD700';});}
    var inp=wrap.querySelector("#ps-i");
    if(inp){
      inp.addEventListener("input",function(e){
        pS=e.target.value;
        var pos=e.target.selectionStart;
        pP=0;rP();
        var ni=wrap.querySelector("#ps-i");
        if(ni){ni.focus();try{ni.setSelectionRange(pos,pos);}catch(x){}}
      });
      inp.addEventListener("focus",function(){this.style.borderColor="rgba(0,200,83,0.5)";this.style.boxShadow="0 0 0 3px rgba(0,200,83,0.1)";});
      inp.addEventListener("blur",function(){this.style.borderColor="rgba(255,255,255,0.12)";this.style.boxShadow="none";});
    }
    var clr=wrap.querySelector("#ps-x");
    if(clr)clr.addEventListener("click",function(){pS="";pP=0;rP();setTimeout(function(){var i=wrap.querySelector("#ps-i");if(i)i.focus();},30);});
    wrap.querySelectorAll("[data-cf]").forEach(function(btn){btn.addEventListener("click",function(){pC=btn.dataset.cf;pP=0;rP();});});
    var ss=wrap.querySelector("#ps-s");
    if(ss)ss.addEventListener("change",function(e){pO=e.target.value;pP=0;rP();});
    wrap.querySelectorAll("[data-pp]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var v=btn.dataset.pp;
        if(v==="prev"){if(pP>0){pP--;rP();}}
        else if(v==="next"){if(pP<pages-1){pP++;rP();}}
        else{pP=parseInt(v);rP();}
        wrap.parentElement&&wrap.parentElement.scrollTo&&wrap.parentElement.scrollTo(0,0);
      });
    });
    wrap.querySelectorAll("tr.pr").forEach(function(tr){
      tr.addEventListener("mouseover",function(){tr.style.background="rgba(0,200,83,0.05)";});
      tr.addEventListener("mouseout",function(){tr.style.background="";});
      tr.addEventListener("click",function(){if(tr.dataset.url&&tr.dataset.url!="#")window.open(tr.dataset.url,"_blank");});
    });
  }
  wrap.render=rP;
  return wrap;
}
function buildMatchesTab(sh){
  var wrap=document.createElement('div');
  wrap.id='mw';wrap.style.cssText='display:none;padding:0;';
  var activeDay=[0],activeFilter='all',activeSort='tournament',activeTier='all',activeFormat='all',activeTier='all',activeFormat='all',_interval=null,_lastData=null,_lastUpdated='';
  var isFS=location.hostname.includes('flashscore');

  var FLAGS={'USA':'🇺🇸','ESP':'🇪🇸','FRA':'🇫🇷','GER':'🇩🇪','ITA':'🇮🇹','GBR':'🇬🇧','AUS':'🇦🇺','ARG':'🇦🇷','JPN':'🇯🇵','CAN':'🇨🇦','BRA':'🇧🇷','NED':'🇳🇱','SUI':'🇨🇭','ROU':'🇷🇴','POL':'🇵🇱','CZE':'🇨🇿','AUT':'🇦🇹','GRE':'🇬🇷','BEL':'🇧🇪','SWE':'🇸🇪','NOR':'🇳🇴','DEN':'🇩🇰','SRB':'🇷🇸','KAZ':'🇰🇿','RUS':'🇷🇺','UKR':'🇺🇦','POR':'🇵🇹','CHI':'🇨🇱','MEX':'🇲🇽','RSA':'🇿🇦','IND':'🇮🇳','KOR':'🇰🇷','MAR':'🇲🇦','COL':'🇨🇴','CRO':'🇭🇷','GEO':'🇬🇪','QAT':'🇶🇦','UAE':'🇦🇪','CHN':'🇨🇳','SVK':'🇸🇰','UZB':'🇺🇿','MON':'🇲🇨','TUR':'🇹🇷','BUL':'🇧🇬','HUN':'🇭🇺','FIN':'🇫🇮','SLO':'🇸🇮','SVK':'🇸🇰','EST':'🇪🇪','LAT':'🇱🇻','LTU':'🇱🇹','NZL':'🇳🇿','AZE':'🇦🇿','ARM':'🇦🇲','GBR':'🇬🇧','MDA':'🇲🇩','BLR':'🇧🇾'};

  function tInfo(t){
    var u=t.toUpperCase();
    if(u.includes('ITF')) return{i:'🔵',l:'ITF',c:'rgba(255,255,255,.4)',bg:'rgba(255,255,255,.03)',b:'rgba(255,255,255,.1)'};
    if(u.includes('CHALLENGER')) return{i:'⚡',l:'Challenger',c:'#60a5fa',bg:'rgba(96,165,250,.1)',b:'rgba(96,165,250,.2)'};
    if(u.match(/AUSTRALIAN OPEN|ROLAND GARROS|WIMBLEDON|US OPEN/)) return{i:'🏆',l:'Grand Slam',c:'#FFD700',bg:'rgba(255,215,0,.12)',b:'rgba(255,215,0,.3)'};
    if(u.match(/ATP.*1000|MASTERS 1000|MIAMI|INDIAN WELLS|MADRID OPEN|ROME|MONTREAL|CINCINNATI|SHANGHAI|PARIS MASTERS|CANADIAN|MONTE.CARLO/)) return{i:'🥇',l:'ATP 1000',c:'#C0C0C0',bg:'rgba(192,192,192,.1)',b:'rgba(192,192,192,.2)'};
    if(u.match(/ATP.*500|ROTTERDAM|DUBAI|ACAPULCO|BARCELONA|HAMBURG|WASHINGTON|TOKYO|BEIJING|VIENNA|BASEL/)) return{i:'🥈',l:'ATP 500',c:'#CD7F32',bg:'rgba(205,127,50,.1)',b:'rgba(205,127,50,.2)'};
    if(u.match(/WTA.*1000/)) return{i:'🔴',l:'WTA 1000',c:'#e879f9',bg:'rgba(232,121,249,.1)',b:'rgba(232,121,249,.2)'};
    if(u.match(/WTA.*500/)) return{i:'🟣',l:'WTA 500',c:'#d946ef',bg:'rgba(217,70,239,.1)',b:'rgba(217,70,239,.2)'};
    if(u.match(/WTA.*SINGLES|WTA - /)) return{i:'🟣',l:'WTA 250',c:'#c084fc',bg:'rgba(192,132,252,.08)',b:'rgba(192,132,252,.15)'};
    return{i:'🎾',l:'ATP 250',c:'rgba(255,255,255,.55)',bg:'rgba(255,255,255,.05)',b:'rgba(255,255,255,.12)'};
  }
  function surfBg(s){if(!s)return '#555';s=s.toLowerCase();if(s.includes('hard'))return '#2563eb';if(s.includes('clay'))return '#ea580c';if(s.includes('grass'))return '#16a34a';return '#555';}
  function timeStr(ts){if(!ts)return '';return new Date(ts).toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'});}
  function pb(b){var o={};b.split('¬').forEach(function(f){var i=f.indexOf('÷');if(i>0)o[f.slice(0,i)]=f.slice(i+1);});return o;}

  function parseFeed(feedTxt){
    // KLÍČOVÁ OPRAVA: game score (WA/WB/WC) je přímo v f_2_0_1 bloku každého zápasu
    // NEPŘEPISUJEME r_2_1 — f_2_0_1 je aktuálnější a kompletní
    var blocks=feedTxt.split('~').map(pb);
    var tournament='',tcountry='',tsurface='';
    var matches=[],seen={};
    var reC=/(([A-Z]{2,3}))/;
    blocks.forEach(function(b){
      if(b.ZA){
        tournament=b.ZA;
        var mc=tournament.match(reC);
        tcountry=mc?mc[1]:'';
        tsurface=tournament.includes(',')?tournament.split(',').pop().trim():'';
        return;
      }
      if(!b.AA||!b.AE||!b.AF||seen[b.AA])return;
      seen[b.AA]=1;
      var ab=parseInt(b.AB||0);
      var isLive=ab===2;
      var sets1=[],sets2=[];
      [['BA','BB'],['BC','BD'],['BE','BF'],['BG','BH'],['BI','BJ']].forEach(function(kk){
        var v1=b[kk[0]]||'',v2=b[kk[1]]||'';
        if(v1!==''||v2!==''){sets1.push(v1||'0');sets2.push(v2||'0');}
      });
      var game1='',game2='',serving=0;
      if(isLive){
        // WA/WB/WC jsou game score přímo v f_2_0_1 — aktuální a přesné
        game1=b.WA||'0';
        game2=b.WB||'0';
        serving=parseInt(b.WC||0);
        if(!sets1.length){sets1=['0'];sets2=['0'];}
      }
      var ag=b.AG||'';
      matches.push({
        id:b.AA,tournament:tournament,tournament_country:tcountry,tournament_surface:tsurface,
        ts:parseInt(b.AD||0)*1000,p1:b.AE,p2:b.AF,
        status:ab,isLive:isLive,isFin:ab===3,isSch:ab===1,
        sets1:sets1,sets2:sets2,game1:game1,game2:game2,serving:serving,
        winner:ag==='0'?1:ag==='1'?2:0,
        url:'https://www.flashscore.com/match/'+b.AA+'/#/match-summary'
      });
    });
    return matches;
  }

  async function loadFromFS(day){
    var days=Array.isArray(day)?day:[day];
    var results=await Promise.all(days.map(function(d){return fetch('https://tennis-proxy.vavra-radovan.workers.dev/?day='+d+'&t='+Date.now()).then(function(r){return r.json();});}));
    var allMatches=[];results.forEach(function(d){(d.matches||[]).forEach(function(m){m.isLive=m.status===2;m.isFin=m.status===3;m.isSch=m.status===1;allMatches.push(m);});});
    return {matches:allMatches,updated:results[0].updated||'',src:'worker'};
  }
  async function loadFromGitHub(){return loadFromFS(activeDay);}
  async function loadData(){
    if(activeDay.length===1&&activeDay[0]==='fav'){
      var _favIds=JSON.parse(localStorage.getItem('ts_favs')||'[]');
      var _allData=await loadFromFS([-1,0,1]);
      _allData.matches=(_allData.matches||[]).filter(function(m){return _favIds.indexOf(m.id)>-1;});
      return _allData;
    }
    try{return await loadFromFS(activeDay);}catch(e){
      var d2=await(await fetch('https://api.github.com/repos/Havran001/tennis-scout/contents/matches.json',{headers:{'Accept':'application/vnd.github.raw'},cache:'no-store'})).json();
      var all=[];[-1,0,1].forEach(function(day){((d2.days||{})[String(day)]||[]).forEach(function(m){m.isLive=m.status===2;m.isFin=m.status===3;m.isSch=m.status===1;m.day=day;all.push(m);});});
      return {updated:d2.updated,src:'github',matches:all};
    }
  }

  function getMatches(data){
    // Worker a flashscore vrací data pro konkrétní den přímo
    return data.matches||[];
  }

  function _ioc2flag(c){if(!c)return '';var m={'USA':'US','ESP':'ES','FRA':'FR','GER':'DE','ITA':'IT','GBR':'GB','AUS':'AU','ARG':'AR','JPN':'JP','CAN':'CA','BRA':'BR','NED':'NL','SUI':'CH','ROU':'RO','POL':'PL','CZE':'CZ','AUT':'AT','GRE':'GR','BEL':'BE','SWE':'SE','NOR':'NO','DEN':'DK','SRB':'RS','KAZ':'KZ','RUS':'RU','UKR':'UA','POR':'PT','CHI':'CL','MEX':'MX','RSA':'ZA','IND':'IN','KOR':'KR','MAR':'MA','COL':'CO','CRO':'HR','GEO':'GE','QAT':'QA','UAE':'AE','CHN':'CN','SVK':'SK','MON':'MC','TUR':'TR','BUL':'BG','HUN':'HU','FIN':'FI','SLO':'SI','EST':'EE','LAT':'LV','LTU':'LT','NZL':'NZ','AZE':'AZ','ARM':'AM','MDA':'MD','BLR':'BY','ISR':'IL','TUN':'TN','EGY':'EG','KEN':'KE','SEN':'SN','PUR':'PR','DOM':'DO','VEN':'VE','BOL':'BO','PAR':'PY','URU':'UY','PER':'PE','ECU':'EC','GUA':'GT','PAN':'PA','PHI':'PH','THA':'TH','VIE':'VN','MAS':'MY','SIN':'SG','INA':'ID','TPE':'TW','HKG':'HK','UZB':'UZ','ISL':'IS','IRL':'IE','LUX':'LU','MLT':'MT','CYP':'CY','GBR':'GB','SCO':'GB','WAL':'GB','CMR':'CM','KEN':'KE','RSA':'ZA','ZIM':'ZW','NGR':'NG','GHA':'GH','SEN':'SN','ETH':'ET','UGA':'UG','TAN':'TZ','ZAM':'ZM','MRI':'MU','SEY':'SC','BOT':'BW','NAM':'NA','MAD':'MG','CIV':'CI','TUN':'TN','EGY':'EG','MAR':'MA','ALG':'DZ','LBA':'LY','NIG':'NE','MLI':'ML','SUD':'SD','RWA':'RW','PHI':'PH','INA':'ID','MAS':'MY','THA':'TH','VIE':'VN','SIN':'SG','TPE':'TW','HKG':'HK','MGL':'MN','PAK':'PK','SRI':'LK','BAN':'BD','IRI':'IR','LIB':'LB','JOR':'JO','KUW':'KW','BAH':'BH','OMA':'OM','QAT':'QA','UAE':'AE','YEM':'YE','IRQ':'IQ','SYR':'SY','PUR':'PR','DOM':'DO','JAM':'JM','TRI':'TT','HAI':'HT','CUB':'CU','GUA':'GT','ESA':'SV','CRC':'CR','PAN':'PA','HON':'HN','NCA':'NI','GUY':'GY','SUR':'SR','BOL':'BO','PAR':'PY','URU':'UY','PER':'PE','ECU':'EC','VEN':'VE','COL':'CO','CHI':'CL','ARG':'AR','BRA':'BR','MEX':'MX','CAN':'CA','USA':'US','BIH':'BA','MKD':'MK','ESA':'SV','ALB':'AL','BDI':'BI','NMI':'MP','PLE':'PS','MDV':'MV'};var iso=m[c]||null;if(!iso||iso.length!==2)return '';return iso.split('').map(function(x){return String.fromCodePoint(x.charCodeAt(0)+127397);}).join('');}
function _pf(n){var _key='_pfC_v5_'+(window.ATP_PLAYERS||[]).length+'_'+(window.WTA_PLAYERS||[]).length;if(!window[_key]){var _ex={'gauff':'USA','sabalenka':'BLR','swiatek':'POL','rybakina':'KAZ','pegula':'USA','keys':'USA','navarro':'USA','collins':'USA','parks':'USA','alexandrova':'RUS','kasatkina':'RUS','shnaider':'RUS','andreeva':'RUS','blinkova':'RUS','potapova':'RUS','samsonova':'RUS','pavlyuchenkova':'RUS','vesnina':'RUS','svitolina':'UKR','kostyuk':'UKR','tsurenko':'UKR','ostapenko':'LAT','kanepi':'EST','kontaveit':'EST','paolini':'ITA','bronzetti':'ITA','cocciaretto':'ITA','trevisan':'ITA','giorgi':'ITA','errani':'ITA','sakkari':'GRE','bouzkova':'CZE','vondrousova':'CZE','pliskova':'CZE','kvitova':'CZE','siniaková':'CZE','muchova':'CZE','krejcikova':'CZE','fruhvirtova':'CZE','strycova':'CZE','garcia':'FRA','burel':'FRA','ferro':'FRA','mladenovic':'FRA','cornet':'FRA','golubic':'SUI','bencic':'SUI','teichmann':'SUI','jabeur':'TUN','haddad':'BRA','sorribes':'ESP','muguruza':'ESP','badosa':'ESP','fernandez':'CAN','andreescu':'CAN','dabrowski':'CAN','watson':'GBR','raducanu':'GBR','boulter':'GBR','sherif':'EGY','azarenka':'BLR','sasnovich':'BLR','halep':'ROU','bogdan':'ROU','bara':'ROU','cristian':'ROU','cirstea':'ROU','ivanovic':'SRB','jovanovski':'SRB','danilovic':'SRB','stojanovic':'SRB','niculescu':'ROU','ruse':'ROU','hontama':'JPN','osaka':'JPN','doi':'JPN','aoyama':'JPN','lys':'GER','grabher':'AUT','viktoriya':'UKR','linette':'POL','zhu':'CHN','zheng':'CHN','wang':'CHN','zhang':'CHN','peng':'CHN','han':'CHN','lu':'CHN','liu':'CHN','shcherbakova':'RUS','kucova':'SVK','schmiedlova':'SVK','rybarkova':'SVK','lapko':'BLR','baptiste':'USA','townsend':'USA','mcnally':'USA','harrison':'USA','liu':'USA','stephens':'USA','venus':'USA','serena':'USA','vacherot':'MON','inglis':'AUS','peers':'AUS','tomljanovic':'AUS','stosur':'AUS','barty':'AUS','gavrilova':'AUS','escabias':'ESP','shelbayh':'JOR','hassan':'EGY','kirkin':'TUR','roncadelli':'ITA','gonzalez':'COL','barreto':'BRA','varillas':'PER','blanch':'USA','collignon':'BEL','landaluce':'ESP','berrettini':'ITA','sonego':'ITA','musetti':'ITA','cobolli':'ITA','nardi':'ITA','arnaldi':'ITA','vavassori':'ITA','darderi':'ITA','agamenone':'ITA','eala':'PHI','mboko':'CMR','fruhvirtova':'CZE','noskova':'CZE','siniaková':'CZE','krejcikova':'CZE','townsend':'USA','mcnally':'USA','harrison':'USA','brengle':'USA','brady':'USA','liu':'USA','kenin':'USA','stephens':'USA','williams':'USA','pegula':'USA','navarro':'USA','collins':'USA','anisimova':'USA','sherif':'EGY','yastremska':'UKR','melnyk':'UKR','kalinskaya':'RUS','rakhimova':'RUS','gasanova':'RUS','sizikova':'RUS','zvonareva':'RUS','vichka':'RUS','zhuk':'RUS','niemeier':'GER','grabher':'AUT','siegemund':'GER','golubic':'SUI','teichmann':'SUI','bencic':'SUI','korpatsch':'GER','lys':'GER','friedsam':'GER','ምbas':'BLR','sherif':'EGY','hontama':'JPN','doi':'JPN','aoyama':'JPN','hibino':'JPN','minnen':'BEL','flipkens':'BEL','mertens':'BEL','linette':'POL','swiatek':'POL','rogers':'USA','pegula':'USA','tauson':'DEN','wozniacki':'DEN','ruse':'ROU','bogdan':'ROU','bara':'ROU','cristian':'ROU','cirstea':'ROU','buzarnescu':'ROU','podoroska':'ARG','osorio':'COL','haddad':'BRA','sorribes':'ESP','badosa':'ESP','muguruza':'ESP','parrizas':'ESP','fernandez':'CAN','andreescu':'CAN','dabrowski':'CAN','inglis':'AUS','peers':'AUS','tomljanovic':'AUS','stosur':'AUS','barty':'AUS','gavrilova':'AUS','birrell':'AUS','puig':'PUR','stephens':'USA','tig':'ROU','niculescu':'ROU',
'demoliner':'BRA','matos':'BRA','faria':'BRA','melo':'BRA','soares':'BRA',
'krajicek':'USA','sock':'USA','ram':'USA','bryan':'USA','querrey':'USA','isner':'USA',
'nouza':'CZE','vesely':'CZE','machac':'CZE','lehecka':'CZE',
'arneodo':'MON','roger-vasselin':'FRA','reboul':'FRA','escoffier':'FRA','martin':'FRA',
'skupski':'GBR','salisbury':'GBR','jubb':'GBR','inglot':'GBR','ward':'GBR','patten':'GBR',
'heliovaara':'FIN','kontinen':'FIN',
'koolhof':'NED','rojer':'NED','middelkoop':'NED','haase':'NED',
'granollers':'ESP','davidovich':'ESP','ramos':'ESP','munar':'ESP','andujar':'ESP',
'zeballos':'ARG','gonzalez':'ARG','molteni':'ARG',
'brkic':'BIH','pavic':'CRO','mektic':'CRO','dodig':'CRO','skugor':'CRO',
'polasek':'SVK','liptak':'SVK',
'bopanna':'IND','bhambri':'IND','ramkumar':'IND',
'tabilo':'CHI','jarry':'CHI','barrios':'CHI',
'bolelli':'ITA','travaglia':'ITA','cecchinato':'ITA',
'kubot':'POL','przysiez':'POL','majchrzak':'POL','choinski':'POL',
'krawietz':'GER','puetz':'GER','struff':'GER','hanfmann':'GER','stebe':'GER',
'venus':'NZL','daniell':'NZL',
'ebden':'AUS','bolt':'AUS','reid':'AUS','duckworth':'AUS','hijikata':'AUS',
'shimabukuro':'JPN','uchiyama':'JPN',
'cabal':'COL','farah':'COL',
'tecau':'ROU','copil':'ROU',
'donskoy':'RUS','krutykh':'UKR',
'albot':'MDA'
,'arends':'NED','muhammad':'USA','jiang':'CHN','cash':'AUS'
,'mihalikova':'SVK','andreozzi':'ARG','kleiman':'ARG'
,'kittay':'FRA','nys':'BEL','erler':'AUT','arevalo':'ESA'
,'doumbia':'FRA','frantzen':'FRA','neel':'USA','kato':'JPN'
,'pinheiro':'BRA','tunas':'BRA','agostini':'ITA','maristany':'ARG'
,'tosetto':'BRA','braga':'BRA','rengifo':'COL','tammaro':'ITA'
,'nedic':'BIH','minaur':'AUS','serna':'ARG','alba':'MEX','vela':'ITA'
,'meli':'ARG','svrcina':'CZE','baez':'ARG','diallo':'FRA'
,'lhomme':'FRA','banes':'FRA','janvier':'FRA','Pinheiro':'BRA'
,'benchetrit':'FRA','roger':'FRA','riffice':'USA','schoolkate':'AUS'
,'erjavec':'SLO','salkova':'CZE','chwalinska':'POL','zidansek':'SLO'
,'radivojevic':'SRB','kabbaj':'MAR','lamens':'NED','koevermans':'NED'
,'ristic':'SRB','wuerth':'GER','hercog':'SLO','capurro':'ARG'
,'sieg':'GER','fullana':'ESP','topalova':'BUL','feistel':'GER'
,'quevedo':'COL','charaeva':'RUS','gjorcheska':'MKD','romero':'ESP','cristobal':'CHI','neos':'GRE'
,'toth':'HUN','noha':'GER','mdlulwa':'RSA','korpanec':'GER'
// new additions
,'valentova':'CZE','nicholls':'GBR'
// top missing players
,'gibson':'USA','arribage':'FRA','goransson':'SWE','bucsa':'ESP'
,'kichenok':'UKR','chan':'TPE','hunter':'USA','hozumi':'JPN'
,'siniakova':'CZE','melichar-martinez':'USA','krawczyk':'USA'
,'konjuh':'CRO','ivanisevic':'CRO','detiuc':'MDA','bassols':'ESP'
,'merino':'ESP','cervantes':'ESP','carou':'ESP','felguera':'ESP'
,'urrea':'COL','reyes-varela':'MEX','alcantara':'PHI'
,'gobbi':'ESP','martos':'ESP','palomar-marquina':'ESP'
,'hidalgo':'ESP','bofarull':'ESP','castellvi':'ESP'
,'naharro':'ESP','ferrer':'ESP'
,'trhac':'CZE','maleckova':'CZE','kucmova':'CZE','skoch':'CZE'
,'stollar':'HUN','vujic':'SRB','radisic':'SRB','radovanovic':'SRB'
,'kostovic':'CRO','ruzic':'CRO','sabanov':'BIH'
,'marcinko':'SVK','lukas':'SVK'
,'drzewiecki':'POL','pawlikowska':'POL','wygona':'POL'
,'piter':'POL','sitak':'NZL'
,'vandewinkel':'BEL','hermans':'BEL','vervoort':'BEL'
,'loof':'SWE','grevelius':'SWE','goransson':'SWE'
,'heinonen':'FIN','korhonen':'FIN'
,'kalinina':'UKR','zavatska':'UKR','lazarenko':'UKR','kozak':'UKR'
,'kucmova':'CZE','sidorova':'RUS','prozorova':'RUS','ivanova':'RUS'
,'khodzhaeva':'RUS','yashina':'RUS','pridankina':'RUS','laskutova':'RUS'
,'liutarevich':'BLR','kulambayeva':'KAZ','yuldasheva':'UZB'
,'nahimana':'BDI','rakotomanga':'MAD'
,'samir':'EGY','nagoudi':'MAR'
,'hsieh':'TPE','chan':'TPE','tjen':'TPE'
,'sutjiadi':'INA','nugroho':'INA','plipuech':'THA','sim':'MAS'
,'arakawa':'JPN','hozumi':'JPN','motoyama':'JPN','kozuma':'JPN'
,'saigo':'JPN','fukutani':'JPN','nayuki':'JPN','yamamoto':'JPN'
,'yamazaki':'JPN','uesugi':'JPN','niimi':'JPN','nishikawa':'JPN'
,'watanabe':'JPN','nakamura':'JPN','katsumi':'JPN','kobori':'JPN'
,'guo':'CHN','pan':'CHN','shi':'CHN','zhao':'CHN','luo':'CHN','ma':'CHN','ye':'CHN','wan':'CHN'
,'hahn':'KOR','back':'KOR'
,'kadhe':'IND','chandrasekar':'IND','bollipalli':'IND','shanmugam':'IND'
,'thakkar':'IND','kamath':'IND','rao':'IND','harsh':'IND'
,'patel':'IND','patil':'IND','adkar':'IND','ingale':'IND'
,'dandu':'IND','bhatia':'IND','behera':'IND','chilakalapudi':'IND'
,'anugonda':'IND','shroff':'IND','nitture':'IND','tamhankar':'IND'
,'warik':'IND','sahita':'IND','satara':'IND','paparkar':'IND'
,'raval':'IND','bista':'IND','prashanth':'IND','luikham':'IND'
,'vishal':'IND','dhandhukia':'IND','kashyap':'IND','kispotta':'IND'
,'chavda':'IND','gohil':'IND','vig':'IND','narayan':'IND'
,'lakshmanan':'IND'
,'xu':'CHN','li':'CHN','yu':'CHN'
,'joint':'AUS','schuurs':'NED','routliffe':'NZL'
,'barnett':'GBR','watson':'GBR','grey':'GBR'
,'gadecki':'AUS','birrell':'AUS','inglis':'AUS'
,'samson':'FRA','jeanjean':'FRA','niemeier':'GER'
,'ponchet':'FRA','burel':'FRA','tomova':'BUL'
,'fruhvirtova':'CZE','noskova':'CZE','pliskova':'CZE'
// doubles specialists & challengers
,'tracy':'USA','galloway':'USA','guinard':'FRA','rikl':'CZE'
,'withrow':'USA','lammons':'USA','nakashima':'USA','smith':'GBR'
,'behar':'ISR','bhambri':'IND','verbeek':'NED','jacq':'FRA'
,'miedler':'AUT','cabral':'POR','pavlasek':'CZE','schwartzman':'ARG'
,'vavassori':'ITA','bolelli':'ITA','johnson':'USA','king':'USA'
,'harrison':'USA','skupski':'GBR','glasspool':'GBR','peers':'AUS'
,'ebden':'AUS','purcell':'AUS','hijikata':'AUS','rinderknech':'FRA'
,'olivetti':'FRA','reboul':'FRA','jeanjean':'FRA','burel':'FRA'
,'wu':'CHN','zhang':'CHN','sun':'CHN','jiang':'CHN'
,'luz':'BRA','matos':'BRA','melo':'BRA','faria':'BRA'
,'perez':'AUS','sanders':'AUS','bolt':'AUS','duckworth':'AUS'
,'krajicek':'USA','sock':'USA','withrow':'USA','lammons':'USA'
,'behar':'ISR','gonzalez':'MEX','molteni':'ARG','zeballos':'ARG'
,'granollers':'ESP','puetz':'GER','krawietz':'GER'
// remaining missing players batch 2
,'pigato':'ITA','tubello':'ITA','ciocca':'ITA','candiotto':'BRA'
,'bonardi':'ITA','bulbarella':'ITA','giovannini':'ITA','osti':'ITA'
,'voelzke':'GER','gustin':'BEL','kempen':'BEL','costoulas':'BEL'
,'simes':'AUS','barclay':'AUS','coventry-searle':'AUS','mcfadzean':'AUS'
,'mcleod':'AUS','boyden':'AUS','cripps':'AUS','carbis':'AUS'
,'bond-scott':'AUS','adam-gedge':'AUS','simmons':'GBR','dudeney':'GBR'
,'cross':'GBR','hands':'GBR','barry':'GBR','freeman':'GBR'
,'stevens':'GBR','sinclair':'USA','kiger':'USA','goldhoff':'USA'
,'reynolds':'USA','duncan':'CAN','horst':'RSA','fuchs':'SUI'
,'jecan':'ROU','serban':'ROU','kotliar':'UKR','ibraimi':'MKD'
,'dodaj':'ALB','kastsiukevich':'BLR','karlovskiy':'RUS','danilova':'RUS'
,'zolotareva':'RUS','molchanov':'RUS','lansere':'RUS'
,'jamshidi':'IRI','cheung':'HKG','jorgensen':'DEN','hrastar':'SLO'
,'jermar':'SLO','ortenblad':'SWE','herberg':'ESP'
,'britto':'BRA','martins':'BRA','pinto':'BRA','dummer':'BRA'
,'bolivar':'COL','sau':'ESP','pareja':'ESP','urrutia':'CHI'
,'labrana':'CHI','cavalle-reimers':'USA','matoula':'GRE','eres':'ISR'
,'kubka':'POL','chabalgoity':'URU','berta':'ARG','nahimana':'BDI'
,'cilek':'TUR','alame':'ALG','monteleone':'ITA','bojicic':'SRB'
,'horst':'RSA','osti':'ITA','gustin':'BEL'
,'natour':'LIB','markus':'ARG'
,'stefani':'BRA','babos':'HUN','dabrowski':'CAN','schuurs':'NED'
,'melichar':'USA','krawczyk':'USA','pegula':'USA','townsend':'USA'
,'danilina':'KAZ','heliovaara':'FIN','patten':'GBR','ebden':'AUS'
};window[_key]={};(window.ATP_PLAYERS||[]).forEach(function(p){var parts=p.name.split(' ');var flag=_ioc2flag(p.country);if(parts.length<2)return;var sn=parts.slice(1).join(' ').toLowerCase();window[_key][sn]=flag;parts.slice(1).forEach(function(w){if(w.length>1)window[_key][w.toLowerCase()]=flag;});});(window.WTA_PLAYERS||[]).forEach(function(p){var parts=p.name.split(' ');var flag=_ioc2flag(p.country);if(parts.length<2)return;var sn=parts.slice(1).join(' ').toLowerCase();if(!window[_key][sn])window[_key][sn]=flag;parts.slice(1).forEach(function(w){if(w.length>2&&!window[_key][w.toLowerCase()])window[_key][w.toLowerCase()]=flag;});});Object.keys(_ex).forEach(function(k){if(!window[_key][k])window[_key][k]=_ioc2flag(_ex[k]);});Object.keys(window[_key]).forEach(function(k){if(k.includes(' ')){var hk=k.replace(/ /g,'-');if(!window[_key][hk])window[_key][hk]=window[_key][k];}});}var parts=(n||'').split(' ');var s=parts[0].toLowerCase();var s2=parts.length>1?parts[1].toLowerCase():'';var s3=parts.length>2?parts[2].toLowerCase():'';return window[_key][s]||window[_key][s.replace(/-/g,' ')]||window[_key][s2]||window[_key][s2.replace(/-/g,' ')]||'';}
function renderMatches(data){
    var all=getMatches(data);
    var mcEl=sh.getElementById('nav-matches-count');
    if(mcEl)mcEl.textContent=all.length;
    var hcm=sh.getElementById('hc-count-m');if(hcm)hcm.textContent=all.length+' zápasů';
    var live=all.filter(function(m){return m.isLive;});
    var fin=all.filter(function(m){return m.isFin;});
    var sch=all.filter(function(m){return m.isSch;});
    var shown=activeFilter==='live'?live:activeFilter==='finished'?fin:activeFilter==='scheduled'?sch:all;
    // Filter by tier
    if(activeTier!=='all'){shown=shown.filter(function(m){var ti=tInfo(m.tournament||'');var l=ti.l||'';if(activeTier==='GS')return l==='Grand Slam';if(activeTier==='M1000')return l==='ATP 1000'||l==='WTA 1000';if(activeTier==='ATP500')return l==='ATP 500'||l==='WTA 500';if(activeTier==='ATP250')return l==='ATP 250'||l==='WTA 250';if(activeTier==='WTA')return l.startsWith('WTA');if(activeTier==='CH')return l==='Challenger';if(activeTier==='ITF')return l==='ITF';return true;});}
    // Filter by format (singles/doubles)
    if(activeFormat==='singles')shown=shown.filter(function(m){return !(m.tournament||'').includes('DOUBLES');});
    if(activeFormat==='doubles')shown=shown.filter(function(m){return (m.tournament||'').includes('DOUBLES');});
    if(activeTier!=='all'){shown=shown.filter(function(m){var ti=tInfo(m.tournament||'');var l=ti.l||'';if(activeTier==='GS')return l==='Grand Slam';if(activeTier==='M1000')return l==='ATP 1000'||l==='WTA 1000';if(activeTier==='ATP500')return l==='ATP 500'||l==='WTA 500';if(activeTier==='ATP250')return l==='ATP 250'||l==='WTA 250';if(activeTier==='WTA')return l.startsWith('WTA');if(activeTier==='CH')return l==='Challenger';if(activeTier==='ITF')return l==='ITF';return true;});}
    if(activeFormat==='singles')shown=shown.filter(function(m){return !(m.tournament||'').toUpperCase().includes('DOUBLES');});
    if(activeFormat==='doubles')shown=shown.filter(function(m){return (m.tournament||'').toUpperCase().includes('DOUBLES');});
    if(activeSort==='time')shown=shown.slice().sort(function(a,b){return (a.ts||0)-(b.ts||0);});

    var h='<div style="padding:0 20px 60px;">';
    h+='<div style="display:flex;align-items:center;gap:6px;padding:12px 0 10px;border-bottom:1px solid rgba(255,255,255,.06);">';
    [{d:-1,l:'Včera'},{d:0,l:'Dnes'},{d:1,l:'Zítra'}].forEach(function(x){
      var on=activeDay.indexOf(x.d)>=0;
      h+='<button data-day="'+x.d+'" style="padding:5px 16px;border-radius:7px;border:1px solid '+(on?'#00C853':'rgba(255,255,255,.1)')+';background:'+(on?'rgba(0,200,83,.15)':'transparent')+';color:'+(on?'#00C853':'rgba(255,255,255,.4)')+';font-size:12px;cursor:pointer;font-weight:'+(on?700:400)+';">'+x.l+'</button>';
    });
    var _fo=(activeDay.indexOf('fav')>=0);
    h+='<button data-day="fav" style="padding:5px 16px;border-radius:7px;border:1px solid '+(_fo?'#FFD700':'rgba(255,255,255,.1)')+';background:'+(_fo?'rgba(255,215,0,.12)':'transparent')+';color:'+(_fo?'#FFD700':'rgba(255,255,255,.4)')+';font-size:12px;cursor:pointer;margin-left:4px;font-weight:'+(_fo?700:400)+';">&#9733; Obl&#237;ben&#233;</button>';
    h+='<div style="margin-left:auto;display:flex;align-items:center;gap:6px;">';
    if(data.src==='github'){var age=Math.round((Date.now()-new Date(data.updated).getTime())/1000);h+='<span style="font-size:9px;color:rgba(255,140,0,.7);">⚠️ '+age+'s stará data — live na flashscore.com</span>';}
    if(_lastUpdated)h+='<span style="font-size:9px;color:rgba(255,255,255,.2);">♥ '+_lastUpdated.slice(11,16)+'</span>';
    h+='<span style="width:6px;height:6px;background:#00C853;border-radius:50%;display:inline-block;"></span>';
    h+='</div></div>';
    h+='<div style="display:flex;gap:4px;padding:8px 0 6px;">';
    [['all','Vše',all.length],['live','LIVE 🔴',live.length],['finished','Konec',fin.length],['scheduled','Náplán.',sch.length]].forEach(function(f){
      var on=activeFilter===f[0];
      h+='<button data-filter="'+f[0]+'" style="padding:3px 9px;border-radius:10px;border:1px solid '+(on?'#00C853':'rgba(255,255,255,.08)')+';background:'+(on?'rgba(0,200,83,.15)':'transparent')+';color:'+(on?'#00C853':'rgba(255,255,255,.35)')+';font-size:9px;cursor:pointer;font-weight:'+(on?700:400)+';">'+f[1]+' <span style="opacity:.6;">'+f[2]+'</span></button>';
    });
    h+='<div style="display:flex;gap:4px;padding:4px 0 0;flex-wrap:wrap;align-items:center;">';
    [['all','Vše'],['GS','Grand Slam'],['M1000','ATP 1000'],['ATP500','ATP 500'],['ATP250','ATP 250'],['WTA','WTA'],['CH','Challenger'],['ITF','ITF']].forEach(function(t){var on=activeTier===t[0];h+='<button data-tier="'+t[0]+'" style="padding:2px 9px;border-radius:7px;border:1px solid '+(on?'#60a5fa':'rgba(255,255,255,.08)')+';background:'+(on?'rgba(96,165,250,.15)':'transparent')+';color:'+(on?'#60a5fa':'rgba(255,255,255,.3)')+';font-size:9px;font-weight:'+(on?700:400)+';cursor:pointer;">'+t[1]+'</button>';});
    h+='<div style="width:1px;height:14px;background:rgba(255,255,255,.1);margin:0 3px;flex-shrink:0;align-self:center;"></div>';
    [['all','Vše'],['singles','Dvouhra'],['doubles','Čtyřhra']].forEach(function(f){var on=activeFormat===f[0];h+='<button data-fmt="'+f[0]+'" style="padding:2px 9px;border-radius:7px;border:1px solid '+(on?'#f472b6':'rgba(255,255,255,.08)')+';background:'+(on?'rgba(244,114,182,.15)':'transparent')+';color:'+(on?'#f472b6':'rgba(255,255,255,.3)')+';font-size:9px;font-weight:'+(on?700:400)+';cursor:pointer;">'+f[1]+'</button>';});
    h+='</div>';
    h+='<div style="margin-left:auto;"><button data-sort="1" style="padding:3px 10px;border-radius:10px;border:1px solid '+(activeSort==='time'?'#00C853':'rgba(255,255,255,.15)')+';background:'+(activeSort==='time'?'rgba(0,200,83,.15)':'transparent')+';color:'+(activeSort==='time'?'#00C853':'rgba(255,255,255,.4)')+';font-size:9px;cursor:pointer;">⏱ Čas</button> <button data-sort="0" style="padding:3px 10px;border-radius:10px;border:1px solid '+(activeSort==='tournament'?'#00C853':'rgba(255,255,255,.15)')+';background:'+(activeSort==='tournament'?'rgba(0,200,83,.15)':'transparent')+';color:'+(activeSort==='tournament'?'#00C853':'rgba(255,255,255,.4)')+';font-size:9px;cursor:pointer;">🏆 Turnaj</button></div>';
    h+='</div>';
    if(!shown.length){h+='<div style="padding:60px;text-align:center;color:rgba(255,255,255,.2);">Žádné zápasy</div>';}
    else{
      if(activeSort==='time'){
        // Flat list sorted by time
        shown.forEach(function(m){
          var isLive=m.isLive;var ns=Math.max((m.sets1||[]).length,(m.sets2||[]).length);var _s1=(m.sets1||[]).reduce(function(a,v,i){return a+(parseInt(v)>parseInt((m.sets2||[])[i]||0)?1:0);},0),_s2=(m.sets2||[]).reduce(function(a,v,i){return a+(parseInt(v)>parseInt((m.sets1||[])[i]||0)?1:0);},0);var _hasSets=_s1>0||_s2>0;var w1=m.isFin&&(_hasSets?_s1>_s2:m.winner===1),w2=m.isFin&&(_hasSets?_s2>_s1:m.winner===2);
          var ti=tInfo(m.tournament||'');
          h+='<div class="mrow" data-url="'+m.url+'" style="border-left:3px solid '+(isLive?'#00C853':ti.c)+';background:'+(isLive?'rgba(0,200,83,.025)':'transparent')+';padding:7px 0 7px 10px;cursor:pointer;transition:background .1s;">';
          h+='<div style="display:flex;align-items:center;gap:8px;">';
          h+='<div style="min-width:44px;text-align:center;flex-shrink:0;">'+(isLive?'<span style="font-size:9px;font-weight:800;color:#00C853;background:rgba(0,200,83,.15);padding:2px 5px;border-radius:4px;">LIVE</span>':'<span style="font-size:13px;font-weight:600;color:'+('rgba(255,255,255,.35)')+';">'+(m.isFin?'Konec':timeStr(m.ts))+'</span>')+'</div>';
          h+='<button onclick="var f=JSON.parse(localStorage.getItem(\x27ts_favs\x27)||\x27[]\x27);var id=\x27'+m.id+'\x27;var i=f.indexOf(id);if(i>-1)f.splice(i,1);else f.push(id);localStorage.setItem(\x27ts_favs\x27,JSON.stringify(f));var on=f.indexOf(id)>-1;this.style.color=on?\x27#FFD700\x27:\x27rgba(255,255,255,0.3)\x27;event.stopPropagation()" style="background:none;border:none;cursor:pointer;padding:0 5px;flex-shrink:0;color:rgba(255,255,255,0.3);align-self:stretch;display:flex;align-items:center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" style="display:block;fill:currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></button>';
          h+='<div style="flex:1;min-width:0;">';
          h+='<div style="font-size:9px;color:'+ti.c+';margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.8;">'+m.tournament+'</div>';
          h+='<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;"><span style="font-size:12px;font-weight:'+(w1||m.serving===1?700:500)+';color:'+(w1?'#e6edf3':'rgba(255,255,255,.35)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">'+(m.p1.includes('/')?m.p1.split('/').map(function(n){return _pf(n.trim())+' '+n.trim();}).join(' / '):_pf(m.p1)+' '+m.p1)+'</span>'+(m.serving===1&&isLive?'<span style="font-size:10px;line-height:1;">🎾</span>':'')+'</div>';
          h+='<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:12px;font-weight:'+(w2||m.serving===2?700:500)+';color:'+(w2?'#e6edf3':'rgba(255,255,255,.35)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">'+(m.p2.includes('/')?m.p2.split('/').map(function(n){return _pf(n.trim())+' '+n.trim();}).join(' / '):_pf(m.p2)+' '+m.p2)+'</span>'+(m.serving===2&&isLive?'<span style="font-size:10px;line-height:1;">🎾</span>':'')+'</div>';
          h+='</div>';
          // Score
          var scoreH='';if(ns>0){var setsStr='';var _sc1=0,_sc2=0;for(var si=0;si<ns;si++){var sv1=parseInt(m.sets1[si]||0),sv2=parseInt(m.sets2[si]||0);if(sv1>sv2)_sc1++;else if(sv2>sv1)_sc2++;if(setsStr)setsStr+=' ';setsStr+=sv1+':'+sv2;}if(m.isFin&&(_sc1>0||_sc2>0)){h+='<div style="display:flex;flex-direction:column;gap:1px;margin-left:4px;"><span style="font-size:15px;font-weight:700;color:#fff;line-height:1.3;">'+_sc1+'</span><span style="font-size:15px;font-weight:700;color:#fff;line-height:1.3;">'+_sc2+'</span></div>';}}
          if(isLive&&m.game1!=='')h+='<div style="display:flex;flex-direction:column;gap:1px;margin-left:2px;"><div style="font-size:11px;color:#00C853;font-weight:700;line-height:1.3;">'+m.game1+'</div><div style="font-size:11px;color:#00C853;font-weight:700;line-height:1.3;">'+m.game2+'</div></div>';
          h+='<a href="'+m.url+'" target="_blank" onclick="event.stopPropagation()" style="margin-left:6px;flex-shrink:0;display:block;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28" style="display:block;border-radius:7px"><rect width="100" height="100" fill="#28a428"/><circle cx="50" cy="58" r="27" fill="none" stroke="white" stroke-width="10" stroke-dasharray="15 12" stroke-linecap="round" stroke-dashoffset="8"/><polygon points="67,13 83,40 51,40" fill="#e8192c"/></svg></a>';
          h+='</div></div>';
        });
      } else {
      var byT={},tOrd=[];
      shown.forEach(function(m){if(!byT[m.tournament]){byT[m.tournament]=[];tOrd.push(m.tournament);}byT[m.tournament].push(m);});
      tOrd=tOrd.filter(function(v,i,a){return a.indexOf(v)===i;});
      tOrd.forEach(function(t){
        var sample=byT[t][0];
        var ti=tInfo(t);
        var flag=FLAGS[sample.tournament_country||'']||'';if(!flag){var _m=t.match(/\(([^)]+)\)/);if(_m){var _cn={'Spain':'🇪🇸','USA':'🇺🇸','Japan':'🇯🇵','France':'🇫🇷','Italy':'🇮🇹','Germany':'🇩🇪','Australia':'🇦🇺','Argentina':'🇦🇷','Canada':'🇨🇦','Brazil':'🇧🇷','Netherlands':'🇳🇱','Switzerland':'🇨🇭','Romania':'🇷🇴','Poland':'🇵🇱','Czech Republic':'🇨🇿','Austria':'🇦🇹','Greece':'🇬🇷','Belgium':'🇧🇪','Sweden':'🇸🇪','Norway':'🇳🇴','Denmark':'🇩🇰','Serbia':'🇷🇸','Croatia':'🇭🇷','Hungary':'🇭🇺','Portugal':'🇵🇹','Colombia':'🇨🇴','Chile':'🇨🇱','Mexico':'🇲🇽','Morocco':'🇲🇦','Turkey':'🇹🇷','China':'🇨🇳','India':'🇮🇳','South Korea':'🇰🇷','Ecuador':'🇪🇨','Peru':'🇵🇪','Uruguay':'🇺🇾','Paraguay':'🇵🇾','Bolivia':'🇧🇴','Guatemala':'🇬🇹','Kazakhstan':'🇰🇿','Tunisia':'🇹🇳','Egypt':'🇪🇬','South Africa':'🇿🇦','Kenya':'🇰🇪','Great Britain':'🇬🇧','United Kingdom':'🇬🇧','Ireland':'🇮🇪','Slovakia':'🇸🇰','Bulgaria':'🇧🇬','Finland':'🇫🇮','Estonia':'🇪🇪','Lithuania':'🇱🇹','Latvia':'🇱🇻','Slovenia':'🇸🇮'};var _k=_m[1].trim();flag=_cn[_k]||FLAGS[_k]||''}};
        var surf=sample.tournament_surface||'';
        h+='<div style="display:flex;align-items:center;gap:8px;padding:7px 12px;margin-top:10px;background:rgba(255,255,255,.045);border-radius:8px;border-left:3px solid '+ti.c+';">';
        h+='<span style="font-size:15px;">'+flag+'</span>';
        h+='<div style="flex:1;min-width:0;"><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+t+'</div>';
        if(surf)h+='<div style="margin-top:2px;"><span style="font-size:8px;font-weight:700;color:#fff;background:'+surfBg(surf)+';padding:1px 5px;border-radius:3px;">'+surf.toUpperCase()+'</span></div>';
        h+='</div>';
        if(ti.l)h+='<span style="font-size:11px;font-weight:700;color:'+ti.c+';background:'+ti.bg+';border:1px solid '+ti.b+';padding:3px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0;">'+ti.l+'</span>';
        h+='</div>';
        byT[t].forEach(function(m){
          var isLive=m.isLive;
          var ns=Math.max((m.sets1||[]).length,(m.sets2||[]).length);
          var _s1=(m.sets1||[]).reduce(function(a,v,i){return a+(parseInt(v)>parseInt((m.sets2||[])[i]||0)?1:0);},0),_s2=(m.sets2||[]).reduce(function(a,v,i){return a+(parseInt(v)>parseInt((m.sets1||[])[i]||0)?1:0);},0);var _hasSets=_s1>0||_s2>0;var w1=m.isFin&&(_hasSets?_s1>_s2:m.winner===1),w2=m.isFin&&(_hasSets?_s2>_s1:m.winner===2);
          h+='<div class="mrow" data-url="'+m.url+'" style="border-left:3px solid '+(isLive?'#00C853':'transparent')+';background:'+(isLive?'rgba(0,200,83,.025)':'transparent')+';padding:7px 0 7px 10px;cursor:pointer;transition:background .1s;">';
          h+='<div style="display:flex;align-items:center;gap:8px;">';
          h+='<div style="min-width:44px;text-align:center;flex-shrink:0;">'+(isLive?'<span style="font-size:9px;font-weight:800;color:#00C853;background:rgba(0,200,83,.15);padding:2px 5px;border-radius:4px;">LIVE</span>':'<span style="font-size:13px;font-weight:600;color:'+('rgba(255,255,255,.35)')+';">'+(m.isFin?'Konec':timeStr(m.ts))+'</span>')+'</div>';
          h+='<button onclick="var f=JSON.parse(localStorage.getItem(\x27ts_favs\x27)||\x27[]\x27);var id=\x27'+m.id+'\x27;var i=f.indexOf(id);if(i>-1)f.splice(i,1);else f.push(id);localStorage.setItem(\x27ts_favs\x27,JSON.stringify(f));var on=f.indexOf(id)>-1;this.style.color=on?\x27#FFD700\x27:\x27rgba(255,255,255,0.3)\x27;event.stopPropagation()" style="background:none;border:none;cursor:pointer;padding:0 5px;flex-shrink:0;color:rgba(255,255,255,0.3);align-self:stretch;display:flex;align-items:center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" style="display:block;fill:currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></button>';
          h+='<div style="flex:1;min-width:0;">';
          h+='<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;"><span style="font-size:12px;font-weight:'+(w1||m.serving===1?700:500)+';color:'+(w1?'#e6edf3':'rgba(255,255,255,.35)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">'+(m.p1.includes('/')?m.p1.split('/').map(function(n){return _pf(n.trim())+' '+n.trim();}).join(' / '):_pf(m.p1)+' '+m.p1)+'</span>'+(m.serving===1&&isLive?'<span style="font-size:10px;line-height:1;">🎾</span>':'')+'</div>';
          h+='<div style="display:flex;align-items:center;gap:4px;"><span style="font-size:12px;font-weight:'+(w2||m.serving===2?700:500)+';color:'+(w2?'#e6edf3':'rgba(255,255,255,.35)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">'+(m.p2.includes('/')?m.p2.split('/').map(function(n){return _pf(n.trim())+' '+n.trim();}).join(' / '):_pf(m.p2)+' '+m.p2)+'</span>'+(m.serving===2&&isLive?'<span style="font-size:10px;line-height:1;">🎾</span>':'')+'</div>';
          h+='</div>';
          if(m.isFin){var _sc1t=0,_sc2t=0;for(var sit=0;sit<ns;sit++){var sv1t=parseInt((m.sets1||[])[sit]||0),sv2t=parseInt((m.sets2||[])[sit]||0);if(sv1t>sv2t)_sc1t++;else if(sv2t>sv1t)_sc2t++;}if(_sc1t>0||_sc2t>0){h+='<div style="display:flex;flex-direction:column;gap:1px;margin-right:4px;"><span style="font-size:15px;font-weight:700;color:#fff;line-height:1.3;">'+_sc1t+'</span><span style="font-size:15px;font-weight:700;color:#fff;line-height:1.3;">'+_sc2t+'</span></div>';}}
          h+='<div style="display:flex;gap:2px;align-items:center;flex-shrink:0;">';
          function isSetDone(a,b){var x=parseInt(a),y=parseInt(b);if(isNaN(x)||isNaN(y))return false;if(x===7||y===7)return true;return(x>=6||y>=6)&&Math.abs(x-y)>=2;}
          var maxSi=isLive?ns-1:ns;
          for(var si=0;si<maxSi;si++){
            var v1=(m.sets1||[])[si]||'0',v2=(m.sets2||[])[si]||'0';
            if(isLive&&!isSetDone(v1,v2))continue;
            var b1=parseInt(v1)>parseInt(v2),b2v=parseInt(v2)>parseInt(v1);
            // Dokonceny set — maly, sedy, bez pozadi
            h+='<div style="text-align:center;min-width:14px;padding:1px 2px;opacity:0.55;">';
            h+='<div style="font-size:15px;line-height:1.3;font-weight:'+(b1?700:400)+';color:'+(b1?'#ccc':'rgba(255,255,255,.35)')+';">'+v1+'</div>';
            h+='<div style="font-size:15px;line-height:1.3;font-weight:'+(b2v?700:400)+';color:'+(b2v?'#ccc':'rgba(255,255,255,.35)')+';">'+v2+'</div>';
            h+='</div>';
          }
          if(isLive){
            var cv1=(m.sets1||[])[ns-1]||'0',cv2=(m.sets2||[])[ns-1]||'0';
            var isZero=m.game1==='0'&&m.game2==='0'||m.game1===''||m.game2==='';
            if(ns>1)h+='<div style="width:1px;background:rgba(255,255,255,.2);align-self:stretch;margin:0 1px;flex-shrink:0;"></div>';
            h+='<div style="text-align:center;min-width:28px;background:rgba(0,200,83,.15);border:1px solid rgba(0,200,83,.3);border-radius:4px;padding:2px 4px;margin-left:1px;">';
            h+='<div style="font-size:14px;line-height:1.3;font-weight:700;color:#ffffff;">'+cv1+'</div>';
            h+='<div style="font-size:14px;line-height:1.3;font-weight:700;color:#ffffff;">'+cv2+'</div>';
            h+='</div>';
            if(m.game1!==''&&m.game2!==''){
              h+='<div style="text-align:center;min-width:28px;background:'+(isZero?'rgba(255,255,255,.05)':'rgba(0,200,83,.25)')+';border:1px solid '+(isZero?'rgba(255,255,255,.1)':'rgba(0,200,83,.5)')+';border-radius:4px;padding:1px 4px;margin-left:2px;">';
              h+='<div style="font-size:12px;line-height:1.3;font-weight:800;color:'+(isZero?'rgba(255,255,255,.3)':'#00C853')+';">'+m.game1+'</div>';
              h+='<div style="font-size:12px;line-height:1.3;font-weight:800;color:'+(isZero?'rgba(255,255,255,.3)':'#00C853')+';">'+m.game2+'</div>';
              h+='</div>';
            }
          }
          h+='</div>';
          h+='<a href="'+m.url+'" target="_blank" onclick="event.stopPropagation()" title="Flashscore" style="flex-shrink:0;margin:0 8px;width:28px;height:28px;border-radius:7px;overflow:hidden;display:block;text-decoration:none;">';
          h+='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28" style="display:block"><rect width="100" height="100" rx="16" fill="#28a428"/><circle cx="50" cy="58" r="27" fill="none" stroke="white" stroke-width="10" stroke-dasharray="15 12" stroke-linecap="round" stroke-dashoffset="8"/><polygon points="67,13 83,40 51,40" fill="#e8192c"/></svg></a>';
          h+='</div></div>';
        });
      });
      } // end else tournament sort
    }
    h+='</div>';
    wrap.innerHTML=h;
var _f=JSON.parse(localStorage.getItem('ts_favs')||'[]');if(_f.length){wrap.querySelectorAll('button').forEach(function(_b){var _m=_b.getAttribute('onclick');if(!_m)return;var _i=_m.indexOf("id='")+4;var _j=_m.indexOf("'",_i);var _id=_m.substring(_i,_j);if(_f.indexOf(_id)>-1)_b.style.color='#FFD700';});}
    wrap.querySelectorAll('[data-day]').forEach(function(btn){btn.addEventListener('click',function(){var _dv=btn.dataset.day,_d=(_dv==='fav'?'fav':parseInt(_dv));var _i=activeDay.indexOf(_d);if(_i>=0){if(activeDay.length>1)activeDay.splice(_i,1);}else{if(_dv==='fav'){activeDay=['fav'];}else{var _fi=activeDay.indexOf('fav');if(_fi>=0)activeDay.splice(_fi,1);activeDay.push(_d);}}render();});});
    wrap.querySelectorAll('[data-tier]').forEach(function(btn){btn.addEventListener('click',function(){activeTier=btn.dataset.tier;if(_lastData)renderMatches(_lastData);});});
    wrap.querySelectorAll('[data-fmt]').forEach(function(btn){btn.addEventListener('click',function(){activeFormat=btn.dataset.fmt;if(_lastData)renderMatches(_lastData);});});
    wrap.querySelectorAll('[data-sort]').forEach(function(btn){btn.addEventListener('click',function(){activeSort=btn.dataset.sort==='1'?'time':'tournament';if(_lastData)renderMatches(_lastData);});});
    wrap.querySelectorAll('[data-tier]').forEach(function(btn){btn.addEventListener('click',function(){activeTier=btn.dataset.tier;if(_lastData)renderMatches(_lastData);});});
    wrap.querySelectorAll('[data-fmt]').forEach(function(btn){btn.addEventListener('click',function(){activeFormat=btn.dataset.fmt;if(_lastData)renderMatches(_lastData);});});
    wrap.querySelectorAll('[data-filter]').forEach(function(btn){btn.addEventListener('click',function(){activeFilter=btn.dataset.filter;if(_lastData)renderMatches(_lastData);});});
    wrap.querySelectorAll('.mrow').forEach(function(row){
      row.addEventListener('mouseover',function(){row.style.background='rgba(255,255,255,.04)';});
      row.addEventListener('mouseout',function(){row.style.background='transparent';});
      row.addEventListener('click',function(){if(row.dataset.url)window.open(row.dataset.url,'_blank');});
    });
  }

  async function tick(){
    try{
      var data=await loadData();
      _lastUpdated=data.updated||new Date().toISOString();
      _lastData=data;
      renderMatches(data);
    }catch(e){
      if(!_lastUpdated)wrap.innerHTML='<div style="padding:60px;text-align:center;color:rgba(255,255,255,.2);">⚠️ '+e.message+'</div>';
    }
  }
  function render(){wrap.innerHTML='<div style="padding:60px;text-align:center;color:rgba(255,255,255,.2);">⏳ Načítám...</div>';tick();}
  wrap.render=function(){if(wrap.style.display==='none')return;if(_interval)clearInterval(_interval);render();_interval=setInterval(tick,1000);};
  wrap.destroy=function(){if(_interval){clearInterval(_interval);_interval=null;}};
  return wrap;
}

function buildUI(){
  document.getElementById('ts-host')?.remove();
  const host=document.createElement('div');host.id='ts-host';
  host.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;';
  document.body.appendChild(host);
  const sh=host.attachShadow({mode:'open'});
  const style=document.createElement('style');style.textContent=CSS;sh.appendChild(style);

  const w=document.createElement('div');w.id='w';sh.appendChild(w);
  function el(tag,id,cls,html){const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;if(html)e.innerHTML=html;return e;}

  // ── SIDEBAR ──
  const sidebar=el('div','sidebar');
  sidebar.innerHTML=`
    <div id="sb-logo">
      <div id="sb-logo-icon">🎾</div>
      <div id="sb-logo-text">Tennis<span>Scout</span></div>
      <div id="sb-badge">v${VERSION}</div>
    </div>
    <nav id="sb-nav">
      <div class="nav-section">Přehled</div>
      <div class="nav-item active" data-view="home" id="nav-home">
        <span class="nav-icon">⊞</span> Rozcestník
      </div>
      <div class="nav-section">Moduly</div>
      <div class="nav-item" data-view="tournaments" id="nav-tournaments">
        <span class="nav-icon">🏆</span> Turnaje
        <span class="nav-badge" id="nav-count">795</span>
      </div>
      <div class="nav-item" data-view="matches" id="nav-matches"><span class="nav-icon">🎾</span> Zápasy
        <span class="nav-badge" id="nav-matches-count"></span>
      </div><div class="nav-item" data-view="players" id="nav-players">
        <span class="nav-icon">👤</span> Hráči ATP
        <span class="nav-badge" id="nav-players-count">1454</span>
      </div>
      <div class="nav-item disabled">
        <span class="nav-icon">📊</span> Kurzy
        <span class="nav-soon">brzy</span>
      </div>
      <div class="nav-item disabled">
        <span class="nav-icon">⚡</span> Live zápasy
        <span class="nav-soon">brzy</span>
      </div>
      <div class="nav-item disabled">
        <span class="nav-icon">📈</span> Statistiky
        <span class="nav-soon">brzy</span>
      </div>
    </nav>
    <div id="sb-footer">
      <button id="sb-reload">↻ Reload dat</button>
      <button id="sb-close">✕ Zavřít</button>
    </div>
  `;
  w.appendChild(sidebar);

  // ── MAIN PANEL ──
  const main=el('div','main');

  // TOP BAR
  const topbar=el('div','topbar');
  topbar.innerHTML=`
    <div id="topbar-title">Rozcestník</div>
    <div id="topbar-sub">Tennis Scout</div>
    <div id="topbar-stats">
      <div class="ts-stat">
        <div class="ts-stat-val" id="nt">–</div>
        <div class="ts-stat-lbl">Turnajů</div>
      </div>
      <div class="ts-stat">
        <div class="ts-stat-val green" id="ns">–</div>
        <div class="ts-stat-lbl">Zobrazeno</div>
      </div>
    </div>
  `;
  main.appendChild(topbar);

  // FILTER BAR (turnaje view)
  const filterbar=el('div','filterbar');
  filterbar.style.display='none';
  const fr1=el('div',null,'fr');
  fr1.innerHTML=`<span class="fl">Okruh</span>`;
  [['ALL','Vše',true],['ATP','ATP'],['WTA','WTA'],['CHALL','Challenger'],['ITF','ITF']].forEach(([c,t,on])=>{
    const b=el('button',null,'fb'+(on?' on':''));b.dataset.c=c;b.textContent=t;fr1.appendChild(b);
  });
  const srch=el('input','srch');srch.placeholder='🔍  Hledat...';fr1.appendChild(srch);
  filterbar.appendChild(fr1);
  const fr2=el('div',null,'fr');
  fr2.style.paddingBottom='10px';
  fr2.innerHTML=`<span class="fl">Povrch</span>`;
  [['Všechny',true],['Tvrdý'],['Antuka'],['Tráva'],['Krytý']].forEach(([s,on])=>{
    const b=el('button',null,'sb'+(on?' on':''));b.dataset.s=s;b.textContent=s;fr2.appendChild(b);
  });
  filterbar.appendChild(fr2);
  main.appendChild(filterbar);

  // ERR
  main.appendChild(el('div','err'));

  // MONTH NAV
  const mnav=el('nav','mnav');mnav.style.display='none';main.appendChild(mnav);

  // BODY
  const body=el('div','body');
  // ITF status
  const itfs=el('div','itfs');
  const itfb=el('div','itfb');itfb.style.width='0';itfs.appendChild(itfb);
  const itft=el('div','itft');itft.textContent='Načítám ITF data...';itfs.appendChild(itft);
  body.appendChild(itfs);
  // Loader
  const load=el('div','load');
  load.style.display='none';
  load.innerHTML=`<div class="spin"></div><div id="prog">ATP/WTA/Challenger: načteno ✓ – čekám na ITF API...</div>`;
  body.appendChild(load);
  main.appendChild(body);

  w.appendChild(main);

  // ── HOME VIEW ──
  const homeView=el('div','home-view');
  homeView.innerHTML=`
    <div id="home-greeting">V\u00EDtej, <span>Scoute</span> \uD83D\uDC4B</div>
    <div id="home-sub">Tenisov\u00FD analytick\u00FD n\u00E1stroj pro profesion\u00E1ln\u00ED s\u00E1zen\u00ED</div>
    <div id="home-cards">
      <div class="home-card green" data-goto="tournaments" style="padding:0;overflow:hidden;">
        <div style="background:linear-gradient(135deg,rgba(0,200,83,0.12),rgba(0,200,83,0.04));padding:28px 24px 20px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(0,200,83,0.12);">
          <span style="font-size:72px;line-height:1;filter:drop-shadow(0 4px 16px rgba(0,200,83,0.35))">\uD83C\uDFC6</span>
        </div>
        <div style="padding:18px 22px 20px;">
          <div class="hc-title">Turnaje 2026</div>
          <div class="hc-desc">ATP, WTA, Challenger a ITF turnaje s detailn\u00EDmi informacemi o povrchu, losov\u00E1n\u00ED a prize money.</div>
          <div class="hc-meta"><span class="hc-count" id="hc-count-t">795 turnaj\u016F</span><span class="hc-arrow">\u2192</span></div>
        </div>
      </div>
      <div class="home-card green" data-goto="matches" style="padding:0;overflow:hidden;">
        <div style="background:linear-gradient(135deg,rgba(0,200,83,0.12),rgba(0,200,83,0.04));padding:28px 24px 20px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(0,200,83,0.12);">
          <span style="font-size:72px;line-height:1;">&#127934;</span>
        </div>
        <div style="padding:18px 22px 20px;">
          <div class="hc-title">Z&#225;pasy</div>
          <div class="hc-desc">Live v&#253;sledky, dne&#353;n&#237; a pl&#225;novan&#233; z&#225;pasy ATP, WTA, Challenger a ITF.</div>
          <div class="hc-meta"><span class="hc-count" id="hc-count-m"></span><span class="hc-arrow">&#8594;</span></div>
        </div>
      </div>
      <div class="home-card blue" data-goto="players" style="padding:0;overflow:hidden;">
        <div style="position:relative;height:200px;overflow:hidden;background:#050d1a;">
          <img id="player-photo" src="" style="width:100%;height:100%;object-fit:contain;object-position:center center;background:#050d1a;" />


        </div>
        <div style="padding:18px 22px 20px;">
          <div class="hc-title">Hr\u00E1\u010Di ATP</div>
          <div class="hc-desc">Aktu\u00E1ln\u00ED ATP ranking s filtrova\u00EDm podle zem\u011B, \u0159azen\u00EDm podle bod\u016F a odkazem na ATP profil.</div>
          <div class="hc-meta"><span class="hc-count">998 hr\u00E1\u010D\u016F</span><span class="hc-arrow">\u2192</span></div>
        </div>
      </div>
      <div class="home-card orange disabled" style="padding:0;overflow:hidden;opacity:0.4;">
        <div style="background:linear-gradient(135deg,rgba(251,146,60,0.1),rgba(251,146,60,0.03));padding:28px 24px 20px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(251,146,60,0.1);">
          <span style="font-size:72px;line-height:1;">\uD83D\uDCCA</span>
        </div>
        <div style="padding:18px 22px 20px;">
          <div class="hc-title">Kurzy</div>
          <div class="hc-desc">Kurzy z Tipsportu a Pinnacle pro tenis v re\u00E1ln\u00E9m \u010Dase.</div>
          <div class="hc-meta"><span class="hc-tag soon">P\u0159ipravujeme</span><span class="hc-arrow">\u2192</span></div>
        </div>
      </div>
      <div class="home-card pink disabled" style="padding:0;overflow:hidden;opacity:0.4;">
        <div style="background:linear-gradient(135deg,rgba(244,114,182,0.1),rgba(244,114,182,0.03));padding:28px 24px 20px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(244,114,182,0.1);">
          <span style="font-size:72px;line-height:1;">\u26A1</span>
        </div>
        <div style="padding:18px 22px 20px;">
          <div class="hc-title">Live z\u00E1pasy</div>
          <div class="hc-desc">V\u00FDsledky a statistiky \u017Eiv\u00FDch z\u00E1pas\u016F s kurzy a predikc\u00ED.</div>
          <div class="hc-meta"><span class="hc-tag soon">P\u0159ipravujeme</span><span class="hc-arrow">\u2192</span></div>
        </div>
      </div>
    </div>
  `;
  // Insert homeView FIRST in body (before load)
  body.appendChild(homeView);
  // PLAYERS TAB
  const _pw=buildPlayersTab(sh);
  body.appendChild(_pw);
  var _mwEl=buildMatchesTab(sh);if(_mwEl){var _mainBody=sh.getElementById('body')||body;_mainBody.appendChild(_mwEl);}
  var _mwEl=buildMatchesTab(sh);body.appendChild(_mwEl);

  // ── NAVIGACE ──
  function goView(view){
    if(view==='matches'){sh.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));sh.getElementById('nav-matches')?.classList.add('active');sh.querySelectorAll('.mg').forEach(m=>m.style.display='none');['pw','home-view','filterbar','mnav'].forEach(id=>{var e=sh.getElementById(id);if(e)e.style.display='none';});var mwx=sh.getElementById('mw');if(mwx){mwx.style.display='block';if(mwx.render)mwx.render();}return;}
    // Update sidebar
    var _mw=sh.getElementById('mw');if(_mw)_mw.style.display='none';var _mn=sh.getElementById('main');if(_mn)_mn.style.overflow='hidden';
    sh.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    sh.getElementById('nav-'+view)?.classList.add('active');
    // Topbar title
    const titles={home:'Rozcestník',tournaments:'Turnaje 2026',players:'Hráči ATP'};
    sh.getElementById('topbar-title').textContent=titles[view]||view;
    // Visibility
    homeView.style.display=view==='home'?'block':'none';
    filterbar.style.display=view==='tournaments'?'flex':'none';
    filterbar.style.flexDirection='column';
    mnav.style.display=view==='tournaments'?'flex':'none';
    _pw.style.display=view==='players'?'block':'none';
    // Turnaje - vyčisti/zobraz
    const mgs=sh.querySelectorAll('.mg');
    mgs.forEach(m=>m.style.display=view==='tournaments'?'':'none');
    if(view==='players'&&_pw.render)_pw.render();
    // btn-p styl
    const bp=sh.getElementById('nav-players');
    if(bp)bp.classList.toggle('active',view==='players');
  }

  // Nav item clicks
  sh.querySelectorAll('.nav-item[data-view]').forEach(item=>{
    item.addEventListener('click',()=>{
      if(item.classList.contains('disabled'))return;
      goView(item.dataset.view);
    });
  });

  // Home cards
  sh.querySelectorAll('.home-card[data-goto]').forEach(card=>{
    card.addEventListener('click',()=>{
      if(card.classList.contains('disabled'))return;
      goView(card.dataset.goto);
    });
  });

  // Reload + Close
  sh.getElementById('sb-reload').addEventListener('click',()=>{document.getElementById('ts-host')?.remove();TENNIS_SCOUT();});
  sh.getElementById('sb-close').addEventListener('click',()=>document.getElementById('ts-host')?.remove());

  // Players toggle pro zpětnou kompatibilitu
  var _bp=sh.getElementById('nav-players');
  if(_bp){_bp.onclick=function(){goView('players');};}

  return{host,sh,body,mnav,goView};
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

    if(!ts.length){[...body.children].forEach(el=>{if(el.id!=='pw'&&el.id!=='home-view')el.remove()});const e=document.createElement('div');e.style.cssText='text-align:center;padding:60px;color:#5a6070;';e.textContent='Žádné turnaje.';body.appendChild(e);return;}

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
    [...body.children].forEach(el=>{if(el.id!=='pw'&&el.id!=='home-view')el.remove()});body.appendChild(frag);
    body.querySelectorAll('tr.r').forEach(row=>row.addEventListener('click',()=>{exId=exId===row.dataset.uid?null:row.dataset.uid;render();}));
  }

  sh.querySelectorAll('.fb[data-c]').forEach(b=>b.addEventListener('click',()=>{sh.querySelectorAll('.fb[data-c]').forEach(x=>x.classList.remove('on'));b.classList.add('on');aC=b.dataset.c;exId=null;render();}));
  sh.querySelectorAll('.sb[data-s]').forEach(b=>b.addEventListener('click',()=>{sh.querySelectorAll('.sb[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');aS=b.dataset.s;exId=null;render();}));
  sh.getElementById('srch')?.addEventListener('input',e=>{sq=e.target.value;exId=null;render();});
  sh.getElementById('btn-c')?.addEventListener('click',()=>document.getElementById('ts-host')?.remove());
    return render;
}

// ── MAIN ────────────────────────────────────────────────────
window._tsData=[];
const{host,sh,body,mnav,goView}=buildUI();
  
// Djokovic photo from Wikipedia API
(async()=>{try{
  const _wr=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/Rafael_Nadal');
  const _wd=await _wr.json();
  const _tu=_wd.thumbnail?.source;if(!_tu)return;
  const _ir=await fetch(_tu);const _blob=await _ir.blob();
  const _du=await new Promise(_r=>{const _fr=new FileReader();_fr.onload=()=>_r(_fr.result);_fr.readAsDataURL(_blob);});
  const _pi=sh.getElementById('player-photo');if(_pi)_pi.src=_du;
}catch(_e){}})();
// Přidej homeView do body
const _homeViewEl=sh.getElementById('home-view');
if(_homeViewEl&&!_homeViewEl.parentElement)body.insertBefore(_homeViewEl,body.firstChild);
const render=setupRender({sh,body,mnav});
window._tsRender=render;
const setP=t=>{const e=sh.getElementById('itft');if(e)e.textContent=t;};
const addErr=m=>{const e=sh.getElementById('err');if(e){e.textContent=(e.textContent?e.textContent+' | ':'')+m;e.style.display='block';}};


// 1. Statická data — okamžitě
window._tsData.push(...mkAtp(ATP),...mkWta(WTA),...mkChall(CHALL));
sh.getElementById('load')?.remove();
sh.getElementById('itfs')?.remove();
goView('home');
render();
// .mg jsou nyní v DOM — skryj je, home view je aktivní
sh.querySelectorAll('.mg').forEach(m=>m.style.display='none');
// Update home counts
const _hcT=sh.getElementById('hc-count-t');
if(_hcT)_hcT.textContent=window._tsData.length+' turnájů';
const _ncEl=sh.getElementById('nav-count');
if(_ncEl)_ncEl.textContent=window._tsData.length;
const _mcEl=sh.getElementById('nav-matches-count');
if(_mcEl){var _mc=((window._lastMatches||{}).matches||[]).length;if(_mc>0)_mcEl.textContent=_mc;}

// 2. ITF + Players paralelně na pozadí
fetchPlayers(txt=>console.log('Players:',txt)).then(count=>{
  console.log('✅ ATP hráči načteni:',count);
}).catch(e=>console.warn('ATP players:',e.message));

fetchITF(txt=>{setP(txt);}).then(itfItems=>{
  window._tsData.push(...itfItems);
  // PYidej Z�pasy panel  po settlenut� DOM
  setTimeout(function(){
    var _sh2=document.getElementById('ts-host')?.shadowRoot;
    var _body2=_sh2?.getElementById('body');
    if(_body2&&!_sh2.getElementById('mw')){
      var _mwEl2=buildMatchesTab(_sh2);
      if(_mwEl2)_body2.appendChild(_mwEl2);
    }
  },500);
  // Re-render jen pokud jsme na turnaje view
  const activeNav=sh.querySelector('.nav-item.active');
  if(activeNav&&activeNav.dataset.view==='tournaments'){
    render();
  }else{
    render();
    sh.querySelectorAll('.mg').forEach(m=>m.style.display='none');
  }
  // Update counts
  const hcT=sh.getElementById('hc-count-t');
  if(hcT)hcT.textContent=window._tsData.length+' turnájů';
  const ncEl=sh.getElementById('nav-count');
  if(ncEl)ncEl.textContent=window._tsData.length;
  const mcEl=sh.getElementById('nav-matches-count');
  if(mcEl){var mc=((window._lastMatches||{}).matches||[]).length;if(mc>0)mcEl.textContent=mc;}
  console.log('🎾 Tennis Scout v'+VERSION+' — '+window._tsData.length+' turnájů');
}).catch(e=>{addErr('ITF: '+e.message);});

})();
