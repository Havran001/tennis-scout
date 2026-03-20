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

async function fetchPlayers(onProg) {
  const GH_URL = 'https://raw.githubusercontent.com/Havran001/tennis-scout/main/atp_players.json';
  onProg('Načítám ATP hráče z GitHub cache...');
  const resp = await fetch(GH_URL);
  if (!resp.ok) throw new Error(`ATP players cache: HTTP ${resp.status}`);
  const data = await resp.json();
  // Převeď objekty na arrays pro efektivitu
  window.ATP_PLAYERS = (data.items || []).map(p => [p.rank, p.name, p.country, p.pts, p.id]);
  onProg(`ATP hráči: ${ATP_PLAYERS.length} (aktualizováno ${data.updated?.slice(0,10)||'?'})`);
  return ATP_PLAYERS.length;
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
function buildPlayersTab(sh) {
  var pS="",pC="ALL",pO="rank",pP=0;
  var PG=50, wrap=document.createElement("div");
  wrap.id="pw";
  wrap.style.cssText="display:none;color:#e8eaf0;font-family:\"DM Sans\",\"Segoe UI\",sans-serif;font-size:14px;";
  function rP(){
    var ATP=window.ATP_PLAYERS||[];
    var sq=pS.toLowerCase();
    var f=ATP.filter(function(p){
      var c=p[2],n=p[1];
      if(pC!=="ALL"&&c!==pC)return false;
      if(sq&&n.toLowerCase().indexOf(sq)===-1&&c.toLowerCase().indexOf(sq)===-1)return false;
      return true;
    });
    if(pO==="name")f.sort(function(a,b){return a[1].localeCompare(b[1]);});
    else if(pO==="pts")f.sort(function(a,b){return b[3]-a[3];});
    else f.sort(function(a,b){return a[0]-b[0];});
    var tot=f.length,pg=f.slice(pP*PG,(pP+1)*PG),mxP=Math.ceil(tot/PG)-1;
    var cc={};ATP.forEach(function(p){var c=p[2];cc[c]=(cc[c]||0)+1;});
    var tops=Object.entries(cc).sort(function(a,b){return b[1]-a[1];}).slice(0,10).map(function(e){return e[0];});
    wrap.innerHTML="";
    var tb=document.createElement("div");
    tb.style.cssText="padding:10px 0 8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #1e2330;margin-bottom:6px;";
    var si=document.createElement("input");
    si.placeholder="\uD83D\uDD0D Hledat hr\u00E1\u010De...";si.value=pS;
    si.style.cssText="background:#181c23;border:1px solid #1e2330;color:#e8eaf0;font-size:12px;padding:4px 10px;border-radius:14px;outline:none;width:170px;";
    si.oninput=function(e){pS=e.target.value;pP=0;rP();};tb.appendChild(si);
    ["ALL"].concat(tops).forEach(function(c){
      var on=pC===c,b=document.createElement("button");
      b.textContent=c==="ALL"?"V\u0161e":c;
      b.style.cssText="background:"+(on?"#c8f135":"none")+";color:"+(on?"#0a0c0f":"#5a6070")+";border:1px solid "+(on?"#c8f135":"#1e2330")+";font-size:10px;padding:2px 7px;border-radius:3px;cursor:pointer;font-weight:"+(on?700:400)+";";
      b.onclick=function(){pC=c;pP=0;rP();};tb.appendChild(b);
    });
    var ss=document.createElement("select");
    ss.style.cssText="margin-left:auto;background:#181c23;border:1px solid #1e2330;color:#5a6070;font-size:10px;padding:2px 6px;border-radius:3px;";
    [["rank","Ranking"],["pts","Body"],["name","Jm\u00E9no"]].forEach(function(vt){
      var o=document.createElement("option");o.value=vt[0];o.textContent=vt[1];if(pO===vt[0])o.selected=true;ss.appendChild(o);
    });
    ss.onchange=function(e){pO=e.target.value;rP();};tb.appendChild(ss);
    var sc=document.createElement("span");sc.style.cssText="font-size:9px;color:#5a6070;font-family:monospace;";
    sc.textContent=tot+" hr\u00E1\u010D\u016F";tb.appendChild(sc);wrap.appendChild(tb);
    var tbl=document.createElement("table");tbl.style.cssText="width:100%;border-collapse:collapse;";
    tbl.innerHTML="<thead><tr><th style=\"width:40px;text-align:right;padding:4px 8px;font-size:9px;color:#5a6070;font-family:monospace;border-bottom:1px solid #1e2330\">#</th><th style=\"text-align:left;padding:4px 8px;font-size:9px;color:#5a6070;font-family:monospace;border-bottom:1px solid #1e2330\">HR\u00C1\u010C</th><th style=\"padding:4px 8px;font-size:9px;color:#5a6070;font-family:monospace;border-bottom:1px solid #1e2330\">ZEM\u011a</th><th style=\"text-align:right;padding:4px 8px;font-size:9px;color:#5a6070;font-family:monospace;border-bottom:1px solid #1e2330\">BODY</th><th style=\"padding:4px 8px;font-size:9px;color:#5a6070;font-family:monospace;border-bottom:1px solid #1e2330\">ATP</th></tr></thead>";
    var tb2=document.createElement("tbody");
    pg.forEach(function(item){
      var rank=item[0],name=item[1],country=item[2],pts=item[3],id=item[4];
      var rc=rank<=10?"#c8a020":rank<=50?"#c8f135":rank<=100?"#35c8f1":"#5a6070";
      var slug=name.toLowerCase().replace(/[\s]+/g,"-").replace(/[^a-z0-9-]/g,"");
      var tr=document.createElement("tr");tr.style.cssText="cursor:pointer;";
      tr.onmouseover=function(){tr.style.background="#111318";};tr.onmouseout=function(){tr.style.background="";};
      tr.onclick=function(){window.open("https://www.atptour.com/en/players/"+slug+"/"+id+"/overview","_blank");};
      tr.innerHTML="<td style=\"text-align:right;padding:5px 8px;font-family:monospace;font-size:11px;color:"+rc+";font-weight:"+(rank<=10?700:400)+"\">" +rank+"</td>"
        +"<td style=\"padding:5px 8px;font-size:12px;font-weight:600;color:#e8eaf0\">"+name+"</td>"
        +"<td style=\"padding:5px 8px\"><span style=\"font-size:9px;padding:1px 5px;border:1px solid #1e2330;border-radius:3px;color:#5a6070;font-family:monospace\">"+country+"</span></td>"
        +"<td style=\"padding:5px 8px;text-align:right;font-family:monospace;font-size:11px;color:#e8eaf0\">"+pts.toLocaleString()+"</td>"
        +"<td style=\"padding:5px 8px\"><a href=\"https://www.atptour.com/en/players/"+slug+"/"+id+"/overview\" target=\"_blank\" onclick=\"event.stopPropagation()\" style=\"color:#c8f135;font-size:10px;font-family:monospace;text-decoration:none\">ATP \u2192</a></td>";
      tb2.appendChild(tr);
    });
    tbl.appendChild(tb2);wrap.appendChild(tbl);
    if(mxP>0){
      var pv=document.createElement("div");pv.style.cssText="display:flex;gap:8px;justify-content:center;padding:12px 0;align-items:center;";
      function mkB(txt,en,fn){var b=document.createElement("button");b.textContent=txt;b.style.cssText="background:none;border:1px solid #1e2330;color:"+(en?"#5a6070":"#2a2f3a")+";font-size:10px;padding:3px 10px;border-radius:3px;cursor:"+(en?"pointer":"default")+";";if(en)b.onclick=fn;return b;}
      pv.appendChild(mkB("\u2190 P\u0159edchoz\u00ED",pP>0,function(){pP--;rP();wrap.scrollTop=0;}));
      var pi=document.createElement("span");pi.style.cssText="font-size:10px;color:#5a6070;font-family:monospace;";
      pi.textContent=(pP*PG+1)+"\u2013"+Math.min((pP+1)*PG,tot)+" z "+tot;pv.appendChild(pi);
      pv.appendChild(mkB("Dal\u0161\u00ED \u2192",pP<mxP,function(){pP++;rP();wrap.scrollTop=0;}));
      wrap.appendChild(pv);
    }
  }
  wrap.render=rP;
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
      <div class="nav-item" data-view="players" id="nav-players">
        <span class="nav-icon">👤</span> Hráči ATP
        <span class="nav-badge">998</span>
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
      <div class="home-card blue" data-goto="players" style="padding:0;overflow:hidden;">
        <div style="position:relative;height:160px;overflow:hidden;background:#050d1a;">
          <img id="player-photo" src="" style="width:100%;height:100%;object-fit:cover;object-position:center top;" />


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

  // ── NAVIGACE ──
  function goView(view){
    // Update sidebar
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
  const _wr=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/Novak_Djokovic');
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
render();
// .mg jsou nyní v DOM — skryj je, home view je aktivní
sh.querySelectorAll('.mg').forEach(m=>m.style.display='none');
// Update home counts
const _hcT=sh.getElementById('hc-count-t');
if(_hcT)_hcT.textContent=window._tsData.length+' turnájů';
const _ncEl=sh.getElementById('nav-count');
if(_ncEl)_ncEl.textContent=window._tsData.length;

// 2. ITF + Players paralelně na pozadí
fetchPlayers(txt=>console.log('Players:',txt)).then(count=>{
  console.log('✅ ATP hráči načteni:',count);
}).catch(e=>console.warn('ATP players:',e.message));

fetchITF(txt=>{setP(txt);}).then(itfItems=>{
  window._tsData.push(...itfItems);
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
  console.log('🎾 Tennis Scout v'+VERSION+' — '+window._tsData.length+' turnájů');
}).catch(e=>{addErr('ITF: '+e.message);});

})();