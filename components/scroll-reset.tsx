/**
 * Remet la page en haut au rechargement.
 *
 * Par défaut le navigateur restaure la position de défilement quand on
 * recharge : on retombe au milieu de la page, sur une section dont les
 * animations d'entrée, les mesures de scroll et les images n'ont pas encore
 * eu lieu. Sur une landing page ce n'est pas la bonne lecture — on veut
 * repartir du hero.
 *
 * Trois précautions :
 *
 * 1. Le script est en ligne, donc exécuté à l'analyse du document, bien avant
 *    l'hydratation. `history.scrollRestoration = "manual"` n'a d'effet que s'il
 *    est posé avant la tentative de restauration du navigateur ; un `useEffect`
 *    arriverait trop tard et produirait un saut visible.
 * 2. Seuls les rechargements sont concernés. Une navigation arrière garde sa
 *    restauration (on remet `auto` dès la fenêtre de chargement passée), et une
 *    URL avec ancre (`/lptest#contact`) est laissée tranquille.
 * 3. Certains navigateurs mobiles restaurent après l'événement `load`. On
 *    maintient donc le haut de page pendant la fin du chargement, en
 *    abandonnant immédiatement au premier geste de l'utilisateur : s'il scrolle
 *    pendant ce temps, c'est lui qui décide.
 */
const SCRIPT = `(function(){try{
if(location.hash)return;
var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];
var reload=n?n.type==="reload":!!(performance.navigation&&performance.navigation.type===1);
if(!reload)return;
var manual="scrollRestoration" in history;
if(manual)history.scrollRestoration="manual";
var done=false;
var events=["wheel","touchstart","keydown","pointerdown"];
function finish(){if(done)return;done=true;if(manual)history.scrollRestoration="auto";
for(var i=0;i<events.length;i++)window.removeEventListener(events[i],finish);}
for(var i=0;i<events.length;i++)window.addEventListener(events[i],finish,{passive:true});
var soft=Date.now()+600,hard=Date.now()+2500;
(function pin(){if(done)return;
if(window.scrollY!==0)window.scrollTo(0,0);
if(Date.now()<soft||(document.readyState!=="complete"&&Date.now()<hard))requestAnimationFrame(pin);
else finish();})();
}catch(e){}})();`;

export function ScrollReset() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
