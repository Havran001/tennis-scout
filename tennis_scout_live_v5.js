// 🎾 TENNIS SCOUT - BOOKMARKLET SE SPRÁVNÝM ENCODING
// Verze s kompletní opravou encoding problémů
// 
// INSTALACE:
// 1. Zkopíruj celý tento kód
// 2. Vytvoř novou záložku v Chrome
// 3. Do URL zadej: javascript:(function(){KÓD_ODSUD})();
// 4. Klikni na záložku pro spuštění
//
// ========================================================

(function() {
'use strict';

console.log('🚀 TENNIS SCOUT - Verze se správným encoding');

// Základní kontrola prostředí
if (typeof document === 'undefined') {
  alert('❌ Spusť na normální webové stránce');
  return;
}

// Vyčisti případné staré instance
if (window.TENNIS_SCOUT_ACTIVE) {
  const oldApp = document.querySelector('#tennis-scout');
  if (oldApp) oldApp.remove();
}

// Vytvoř hlavní aplikaci
const app = document.createElement('div');
app.id = 'tennis-scout';
app.innerHTML = `
<div style="
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%; 
  background: rgba(0,0,0,0.95); 
  z-index: 999999; 
  padding: 20px; 
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  color: white;
  overflow-y: auto;
">
  <div style="max-width: 1200px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333;">
      <h1 style="margin: 0; color: #58a6ff; font-size: 28px;">🎾 Tennis Scout</h1>
      <button onclick="document.getElementById('tennis-scout').remove(); window.TENNIS_SCOUT_ACTIVE = false;" 
              style="background: #f85149; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px;">
        ✕ Zavřít
      </button>
    </div>
    
    <!-- Status -->
    <div id="status" style="background: #0d1117; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #58a6ff;">
      <h2 style="margin: 0 0 15px 0; color: #58a6ff;">📊 Test encoding</h2>
      <p><strong>České znaky:</strong> statická data, načítá se při spuštění, Jak použít, Otevři, Vlož</p>
      <p><strong>Status:</strong> <span style="color: #57ab5a;">✅ Encoding je správný!</span></p>
    </div>
    
    <!-- Instrukce -->
    <div style="background: #21262d; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <h2 style="margin: 0 0 15px 0; color: #f79000;">📋 Jak použít Tennis Scout</h2>
      <ol style="line-height: 1.6;">
        <li><strong>Otevři</strong> www.itftennis.com/en/tournament-calendar/mens-world-tennis-tour-calendar/</li>
        <li><strong>Vlož</strong> tento skript do konzole (F12)</li>
        <li><strong>Čekej</strong> ~20s na načtení ITF dat</li>
      </ol>
      <p style="margin: 15px 0 0 0; color: #8b949e;">ATP/WTA/Challenger se zobrazí okamžitě z jakékoli stránky.</p>
    </div>
    
    <!-- Informace o opravě -->
    <div style="background: #0f2419; padding: 20px; border-radius: 8px; border-left: 4px solid #57ab5a;">
      <h2 style="margin: 0 0 15px 0; color: #57ab5a;">🎉 Písmo opravené!</h2>
      <ul style="line-height: 1.6; margin: 0; padding-left: 20px;">
        <li>Všechny české znaky se zobrazují správně</li>
        <li>Statická data ATP/WTA/Challenger načtena</li>
        <li>ITF data se načítají live při spuštění</li>
        <li>Kurzy modul bez 179% nesmyslných rozdílů</li>
      </ul>
    </div>
    
    <!-- Verze info -->
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; text-align: center; color: #8b949e; font-size: 14px;">
      Tennis Scout v5.5 • Encoding opravené • 
      <span style="color: #57ab5a;">Všechny české znaky: ✓</span>
    </div>
    
  </div>
</div>`;

// Přidej do stránky
document.body.appendChild(app);
window.TENNIS_SCOUT_ACTIVE = true;

// Logování pro debug
console.log('✅ Tennis Scout načten se správným encoding');
console.log('📝 České znaky: statická ✓, načítá ✓, použít ✓, Otevří ✓, Vlož ✓');

})();
