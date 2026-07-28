/* ==========================================================
   Galería flotante — motor de fotos + corazones
   ========================================================== */

(() => {
  'use strict';

  // ---------- Ajustes ----------
  const CFG = {
    maxTarjetasEscritorio: 22,
    maxTarjetasMovil: 12,
    coberturaPantalla: 0.52,   // proporción de pantalla ocupada por fotos
    ladoMin: 74,
    ladoMax: 250,
    velMin: 7,                 // px/segundo
    velMax: 24,
    relevoMs: 6500,            // cada cuánto una tarjeta cambia de foto
    corazonesMs: 750,          // cada cuánto nace un corazón
    corazonesMax: 30
  };

  const CORAZONES = [
    '❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💖','💗','💓','💞','💕',
    '💘','💝','💟','❣️','💌','♥️','❤️‍🔥','❤️‍🩹','🫶','💑','😻','🥰'
  ];

  const EXT = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
  const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Elementos ----------
  const $escena     = document.getElementById('escena');
  const $corazones  = document.getElementById('corazones');
  const $carga      = document.getElementById('carga');
  const $contador   = document.getElementById('contador');
  const $btnPausa   = document.getElementById('btnPausa');
  const $btnMezclar = document.getElementById('btnMezclar');
  const $btnPantalla= document.getElementById('btnPantalla');
  const $visor      = document.getElementById('visor');
  const $visorImg   = document.getElementById('visorImg');
  const $visorPie   = document.getElementById('visorPie');

  // ---------- Estado ----------
  let fotos      = [];      // rutas de todas las fotos
  let tarjetas   = [];      // tarjetas vivas en pantalla
  let cola       = [];      // orden barajado para repartir fotos
  let punteroCola= 0;
  let W = innerWidth, H = innerHeight;
  let ladoActual = 0;       // tamaño base común a todas las tarjetas
  let enPausa = false;
  let ultimoT = 0;
  let rafId = 0;
  let temporizadorRelevo = 0;
  let temporizadorCorazones = 0;
  let indiceVisor = -1;

  const azar     = (a, b) => a + Math.random() * (b - a);
  const azarEnt  = (a, b) => Math.floor(azar(a, b + 1));
  const elige    = arr => arr[Math.floor(Math.random() * arr.length)];
  const limita   = (v, a, b) => Math.min(b, Math.max(a, v));

  // ==========================================================
  //  1. Obtener la lista de fotos
  // ==========================================================

  const ordena = lista => [...new Set(lista)].sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }));

  /** Lista incrustada por generar-lista.ps1 (funciona incluso sin servidor). */
  function listaIncrustada() {
    return Array.isArray(self.FOTOS_INICIALES) ? self.FOTOS_INICIALES.filter(p => EXT.test(p)) : [];
  }

  /** photos.json, por si se ha regenerado después del último despliegue. */
  async function listaDelJson() {
    try {
      const r = await fetch('photos.json?v=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d.fotos) ? d.fotos.filter(p => EXT.test(p)) : [];
    } catch { return []; }
  }

  /**
   * Pregunta a la API pública de GitHub qué hay en la carpeta "fotos".
   * Así, si mañana subes fotos nuevas, aparecen sin tocar nada más.
   */
  async function listaDeGitHub() {
    const host = location.hostname;
    if (!host.endsWith('github.io')) return [];
    const duenyo = host.split('.')[0];
    const trozos = location.pathname.split('/').filter(Boolean);
    const repo = trozos.length ? trozos[0] : host;
    try {
      const r = await fetch(`https://api.github.com/repos/${duenyo}/${repo}/contents/fotos`,
                            { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) return [];
      const d = await r.json();
      if (!Array.isArray(d)) return [];
      return d.filter(x => x.type === 'file' && EXT.test(x.name)).map(x => 'fotos/' + x.name);
    } catch { return []; }
  }

  // ==========================================================
  //  2. Tarjetas flotantes
  // ==========================================================

  function cuantasTarjetas() {
    const tope = W < 720 ? CFG.maxTarjetasMovil : CFG.maxTarjetasEscritorio;
    return Math.max(1, Math.min(fotos.length, tope));
  }

  function recalcularLado() {
    const n = Math.max(cuantasTarjetas(), 1);
    const lado = Math.sqrt((W * H * CFG.coberturaPantalla) / n);
    ladoActual = limita(lado, CFG.ladoMin, Math.min(CFG.ladoMax, Math.min(W, H) * 0.7));
    return ladoActual;
  }

  function siguienteFoto() {
    if (punteroCola >= cola.length) {
      cola = barajar(fotos.map((_, i) => i));
      punteroCola = 0;
    }
    return cola[punteroCola++];
  }

  function barajar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function crearTarjeta(indiceFoto) {
    const el = document.createElement('div');
    el.className = 'tarjeta tarjeta--entrando';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');

    const img = document.createElement('img');
    img.decoding = 'async';
    img.alt = 'Foto de la galería';
    el.appendChild(img);

    const t = {
      el, img,
      foto: indiceFoto,
      x: 0, y: 0, vx: 0, vy: 0,
      w: 100, h: 100,
      z: Math.random(),
      giro: azar(-9, 9),
      giroVel: azar(-4, 4),
      fase: azar(0, Math.PI * 2),
      ratio: 1
    };

    aplicarProfundidad(t);
    ponerFoto(t, indiceFoto, true);

    el.addEventListener('click', ev => {
      estallidoCorazones(ev.clientX, ev.clientY);
      abrirVisor(t.foto);
    });
    el.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrirVisor(t.foto); }
    });

    $escena.appendChild(el);
    return t;
  }

  function aplicarProfundidad(t) {
    t.escala   = 0.62 + t.z * 0.52;
    t.el.style.zIndex  = String(Math.round(t.z * 100));
    t.el.style.opacity = String(0.55 + t.z * 0.45);
    t.el.style.filter  = (W > 720 && t.z < 0.4) ? `blur(${(0.4 - t.z) * 3.4}px)` : '';
  }

  function ponerFoto(t, indiceFoto, inmediato) {
    t.foto = indiceFoto;
    const ruta = fotos[indiceFoto];
    const cargar = () => {
      const previa = new Image();
      previa.onload = () => {
        t.ratio = previa.naturalWidth / Math.max(previa.naturalHeight, 1) || 1;
        t.img.src = previa.src;
        medirTarjeta(t);
        t.el.classList.remove('tarjeta--cambiando');
      };
      previa.onerror = () => { t.el.classList.remove('tarjeta--cambiando'); };
      previa.src = encodeURI(ruta);
    };
    if (inmediato) cargar();
    else { t.el.classList.add('tarjeta--cambiando'); setTimeout(cargar, 700); }
  }

  function medirTarjeta(t) {
    const base = (ladoActual || recalcularLado()) * t.escala;
    if (t.ratio >= 1) { t.w = base; t.h = base / t.ratio; }
    else              { t.h = base; t.w = base * t.ratio; }
    t.w = Math.round(t.w); t.h = Math.round(t.h);
    t.el.style.width  = t.w + 'px';
    t.el.style.height = t.h + 'px';
    t.x = limita(t.x, 0, Math.max(0, W - t.w));
    t.y = limita(t.y, 0, Math.max(0, H - t.h));
  }

  function darVelocidad(t) {
    const ang = azar(0, Math.PI * 2);
    const vel = azar(CFG.velMin, CFG.velMax) * (0.55 + t.z * 0.75) * (menosMovimiento ? 0.25 : 1);
    t.vx = Math.cos(ang) * vel;
    t.vy = Math.sin(ang) * vel;
  }

  /**
   * Reparte las tarjetas en una cuadrícula barajada con un empujón al azar,
   * para que desde el primer instante cubran la pantalla sin amontonarse.
   */
  function repartir() {
    const n = tarjetas.length;
    if (!n) return;
    const cols   = Math.max(1, Math.round(Math.sqrt(n * (W / H))));
    const filas  = Math.ceil(n / cols);
    const celdas = barajar([...Array(cols * filas).keys()]).slice(0, n);
    const anchoC = W / cols, altoC = H / filas;

    tarjetas.forEach((t, i) => {
      const col = celdas[i] % cols;
      const fil = Math.floor(celdas[i] / cols);
      const holguraX = Math.max(0, anchoC - t.w);
      const holguraY = Math.max(0, altoC - t.h);
      t.x = limita(col * anchoC + azar(0, holguraX) - holguraX / 2, 0, Math.max(0, W - t.w));
      t.y = limita(fil * altoC + azar(0, holguraY) - holguraY / 2, 0, Math.max(0, H - t.h));
      darVelocidad(t);
    });
  }

  function construirEscena() {
    $escena.textContent = '';
    tarjetas = [];
    cola = barajar(fotos.map((_, i) => i));
    punteroCola = 0;
    recalcularLado();

    const n = cuantasTarjetas();
    for (let i = 0; i < n; i++) {
      const t = crearTarjeta(siguienteFoto());
      tarjetas.push(t);
      medirTarjeta(t);
    }
    repartir();
    tarjetas.forEach(t => pintar(t, 0));
  }

  function pintar(t, tiempo) {
    const vaiven = menosMovimiento ? 0 : Math.sin(tiempo * 0.0006 + t.fase) * 5;
    t.el.style.transform =
      `translate3d(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px, 0) rotate(${(t.giro + vaiven).toFixed(2)}deg)`;
  }

  function bucle(ahora) {
    rafId = requestAnimationFrame(bucle);
    if (!ultimoT) ultimoT = ahora;
    const dt = Math.min((ahora - ultimoT) / 1000, 0.05);
    ultimoT = ahora;
    if (enPausa) return;

    for (const t of tarjetas) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;

      const maxX = Math.max(0, W - t.w);
      const maxY = Math.max(0, H - t.h);

      if (t.x <= 0)    { t.x = 0;    t.vx = Math.abs(t.vx); t.giroVel = azar(-6, 6); }
      if (t.x >= maxX) { t.x = maxX; t.vx = -Math.abs(t.vx); t.giroVel = azar(-6, 6); }
      if (t.y <= 0)    { t.y = 0;    t.vy = Math.abs(t.vy); t.giroVel = azar(-6, 6); }
      if (t.y >= maxY) { t.y = maxY; t.vy = -Math.abs(t.vy); t.giroVel = azar(-6, 6); }

      t.giro += t.giroVel * dt;
      if (t.giro >  14) t.giroVel = -Math.abs(t.giroVel);
      if (t.giro < -14) t.giroVel =  Math.abs(t.giroVel);

      pintar(t, ahora);
    }
  }

  /** Si hay más fotos que tarjetas, se van turnando para que salgan todas. */
  function iniciarRelevos() {
    clearInterval(temporizadorRelevo);
    if (fotos.length <= tarjetas.length) return;
    temporizadorRelevo = setInterval(() => {
      if (enPausa || document.hidden || !$visor.hidden || !tarjetas.length) return;
      const t = elige(tarjetas);
      const enPantalla = new Set(tarjetas.map(x => x.foto));
      let intentos = 0, nueva = siguienteFoto();
      while (enPantalla.has(nueva) && intentos++ < fotos.length) nueva = siguienteFoto();
      ponerFoto(t, nueva, false);
    }, CFG.relevoMs);
  }

  // ==========================================================
  //  3. Corazones
  // ==========================================================

  function nacerCorazon() {
    if (document.hidden || $corazones.childElementCount >= CFG.corazonesMax) return;
    const c = document.createElement('span');
    c.className = 'corazon';
    c.textContent = elige(CORAZONES);
    const tam = azar(14, 42);
    c.style.fontSize = tam.toFixed(0) + 'px';
    c.style.left = azar(-2, 98).toFixed(2) + 'vw';
    c.style.setProperty('--vaiven', azar(-9, 9).toFixed(1) + 'vw');
    c.style.setProperty('--op', azar(0.45, 0.95).toFixed(2));
    c.style.zIndex = Math.random() < 0.5 ? '0' : '2';
    c.style.animationDuration = azar(9, 19).toFixed(1) + 's';
    c.addEventListener('animationend', () => c.remove());
    $corazones.appendChild(c);
  }

  function estallidoCorazones(x, y) {
    const n = azarEnt(7, 12);
    for (let i = 0; i < n; i++) {
      const c = document.createElement('span');
      c.className = 'corazon corazon--estallido';
      c.textContent = elige(CORAZONES);
      c.style.fontSize = azar(16, 34).toFixed(0) + 'px';
      c.style.left = x + 'px';
      c.style.top  = y + 'px';
      const ang = azar(0, Math.PI * 2), dist = azar(60, 210);
      c.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
      c.style.setProperty('--dy', (Math.sin(ang) * dist - 40).toFixed(0) + 'px');
      c.style.setProperty('--giro', azar(-140, 140).toFixed(0) + 'deg');
      c.style.animationDuration = azar(0.9, 1.6).toFixed(2) + 's';
      c.addEventListener('animationend', () => c.remove());
      $corazones.appendChild(c);
    }
  }

  // ==========================================================
  //  4. Visor
  // ==========================================================

  function abrirVisor(i) {
    indiceVisor = i;
    $visor.hidden = false;
    requestAnimationFrame(() => $visor.classList.add('visor--abierto'));
    mostrarEnVisor();
    document.getElementById('visorCerrar').focus({ preventScroll: true });
  }

  function mostrarEnVisor() {
    if (!fotos.length) return;
    indiceVisor = (indiceVisor + fotos.length) % fotos.length;
    $visorImg.src = encodeURI(fotos[indiceVisor]);
    $visorImg.alt = `Foto ${indiceVisor + 1} de ${fotos.length}`;
    $visorPie.textContent = `${indiceVisor + 1} / ${fotos.length}`;
  }

  function cerrarVisor() {
    $visor.classList.remove('visor--abierto');
    setTimeout(() => { $visor.hidden = true; $visorImg.removeAttribute('src'); }, 320);
  }

  const mueveVisor = paso => { indiceVisor += paso; mostrarEnVisor(); };

  // ==========================================================
  //  5. Controles y eventos
  // ==========================================================

  function conectarEventos() {
    $btnPausa.addEventListener('click', () => {
      enPausa = !enPausa;
      $btnPausa.setAttribute('aria-pressed', String(enPausa));
      $btnPausa.querySelector('.ctrl__icono').textContent = enPausa ? '▶' : '⏸';
      $btnPausa.querySelector('.ctrl__txt').textContent   = enPausa ? 'Seguir' : 'Pausar';
    });

    $btnMezclar.addEventListener('click', ev => {
      cola = barajar(fotos.map((_, i) => i));
      punteroCola = 0;
      const usadas = new Set();
      for (const t of tarjetas) {
        t.z = Math.random();
        t.giro = azar(-9, 9);
        aplicarProfundidad(t);
        let nueva = siguienteFoto(), intentos = 0;
        while (usadas.has(nueva) && intentos++ < fotos.length) nueva = siguienteFoto();
        usadas.add(nueva);
        ponerFoto(t, nueva, true);
        medirTarjeta(t);
      }
      repartir();
      estallidoCorazones(ev.clientX || W / 2, ev.clientY || H / 2);
    });

    $btnPantalla.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    });

    document.getElementById('visorCerrar').addEventListener('click', cerrarVisor);
    document.getElementById('visorPrev').addEventListener('click', () => mueveVisor(-1));
    document.getElementById('visorNext').addEventListener('click', () => mueveVisor(1));
    $visor.addEventListener('click', ev => { if (ev.target === $visor) cerrarVisor(); });

    document.addEventListener('keydown', ev => {
      if ($visor.hidden) return;
      if (ev.key === 'Escape')     cerrarVisor();
      if (ev.key === 'ArrowLeft')  mueveVisor(-1);
      if (ev.key === 'ArrowRight') mueveVisor(1);
    });

    // Deslizar en el visor (móvil)
    let x0 = null, y0 = null;
    $visor.addEventListener('touchstart', ev => {
      x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY;
    }, { passive: true });
    $visor.addEventListener('touchend', ev => {
      if (x0 === null) return;
      const dx = ev.changedTouches[0].clientX - x0;
      const dy = ev.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) mueveVisor(dx < 0 ? 1 : -1);
      else if (dy > 80) cerrarVisor();
      x0 = y0 = null;
    }, { passive: true });

    // Corazones al tocar el fondo
    document.addEventListener('pointerdown', ev => {
      if (ev.target.closest('.tarjeta, .ctrl, .visor__cerrar, .visor__nav')) return;
      estallidoCorazones(ev.clientX, ev.clientY);
    });

    let tempo;
    addEventListener('resize', () => {
      clearTimeout(tempo);
      tempo = setTimeout(() => {
        const anchoAntes = W;
        W = innerWidth; H = innerHeight;
        const cambioDeTope = (anchoAntes < 720) !== (W < 720);
        if (cambioDeTope && fotos.length) { construirEscena(); iniciarRelevos(); }
        else { recalcularLado(); tarjetas.forEach(medirTarjeta); }
      }, 220);
    });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) ultimoT = 0; });
  }

  // ==========================================================
  //  6. Arranque
  // ==========================================================

  function actualizarContador() {
    $contador.textContent = String(fotos.length);
  }

  function fallo(mensaje) {
    $carga.querySelector('.carga__texto').className = 'carga__texto carga__texto--error';
    $carga.querySelector('.carga__texto').textContent = mensaje;
  }

  async function arrancar() {
    conectarEventos();
    temporizadorCorazones = setInterval(nacerCorazon, menosMovimiento ? CFG.corazonesMs * 3 : CFG.corazonesMs);
    for (let i = 0; i < 8; i++) setTimeout(nacerCorazon, i * 420);

    // 1) Lista rápida (incrustada) → 2) photos.json → así arranca aunque no haya red.
    fotos = ordena(listaIncrustada());
    if (!fotos.length) fotos = ordena(await listaDelJson());

    if (!fotos.length) {
      fallo('No he encontrado fotos. Mete imágenes en la carpeta «fotos» y ejecuta ACTUALIZAR.bat.');
      return;
    }

    actualizarContador();
    construirEscena();
    iniciarRelevos();
    rafId = requestAnimationFrame(bucle);
    setTimeout(() => $carga.classList.add('carga--fuera'), 350);

    // 3) En segundo plano: preguntar a GitHub si hay fotos nuevas.
    const [delJson, deGitHub] = await Promise.all([listaDelJson(), listaDeGitHub()]);
    const completa = ordena([...fotos, ...delJson, ...deGitHub]);
    if (completa.length !== fotos.length) {
      const eraMenorQueTope = fotos.length < cuantasTarjetas();
      fotos = completa;
      actualizarContador();
      if (eraMenorQueTope) { construirEscena(); }
      iniciarRelevos();
    }
  }

  arrancar();
})();
