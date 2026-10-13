/* Contactos Comerciales Construcción — lógica de la app. Los datos se guardan solo en este móvil (almacenamiento del navegador). */
(function () {
  "use strict";
  var KEY = "co.contactos.v1", META = "co.meta.v1";
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var norm = function (s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); };

  /* ---------- Almacenamiento ---------- */
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(contacts)); return true; }
    catch (e) { toast("No se pudo guardar: el almacenamiento del móvil está lleno o bloqueado."); return false; }
  }
  function setMeta(patch) { meta = Object.assign({}, meta, patch); try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) {} }
  var contacts = load(KEY, []);
  var meta = load(META, {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  var query = "", openId = null, confirmDel = null, toastTimer = null, dupAsked = false;

  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("Copiado"); return; } catch (e) {}
    try {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove();
      toast(ok ? "Copiado" : "No se pudo copiar");
    } catch (e) { toast("No se pudo copiar"); }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- Lista y búsqueda ---------- */
  function fullName(c) { return [c.nombre, c.apellidos].filter(Boolean).join(" ") || c.empresa || "Sin nombre"; }
  function initials(c) { return ((c.nombre || c.empresa || "?").trim().charAt(0) + (c.apellidos || "").trim().charAt(0)).toUpperCase(); }
  function haystack(c) {
    var ph = [c.movil, c.telefono].filter(Boolean).join(" ");
    return norm([c.nombre, c.apellidos, c.empresa, c.cargo, c.email, c.evento, c.notas, c.direccion, ph, ph.replace(/\D/g, "")].join(" "));
  }
  function hl(text, toks) {
    var s = esc(text); if (!toks.length) return s;
    var n = norm(text), marks = [];
    toks.forEach(function (t) { var i = n.indexOf(t); if (i >= 0) marks.push([i, i + t.length]); });
    if (!marks.length) return s;
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = "", pos = 0;
    marks.forEach(function (m) { if (m[0] < pos) return; out += esc(text.slice(pos, m[0])) + "<mark>" + esc(text.slice(m[0], m[1])) + "</mark>"; pos = m[1]; });
    return out + esc(text.slice(pos));
  }
  function telHref(v) { return "tel:" + String(v).replace(/[^\d+]/g, ""); }
  function waHref(v) { var d = String(v).replace(/\D/g, ""); if (d.length === 9) d = "34" + d; if (d.indexOf("00") === 0) d = d.slice(2); return "https://wa.me/" + d; }
  function webHref(v) { return /^https?:\/\//i.test(v) ? v : "https://" + v; }
  var ROWS = [["cargo", "Cargo"], ["empresa", "Empresa"], ["movil", "Móvil", 1], ["telefono", "Teléfono", 1], ["email", "Correo", 1], ["web", "Web", 1], ["direccion", "Dirección", 1], ["evento", "Conocido en"], ["notas", "Notas"]];

  function render() {
    var toks = norm(query).split(/\s+/).filter(Boolean);
    var items = contacts.map(function (c) { return { c: c, h: haystack(c) }; });
    if (toks.length) items = items.filter(function (x) { return toks.every(function (t) { return x.h.indexOf(t) !== -1; }); });
    var key = function (c) { return norm(c.apellidos || c.nombre || c.empresa || ""); };
    items.sort(function (a, b) { return key(a.c).localeCompare(key(b.c), "es"); });
    if (toks.length && items.length === 1) openId = items[0].c.id;

    var total = contacts.length;
    $("#count").textContent = total === 0 ? "Aún sin contactos" : (toks.length ? items.length + " de " + total + " contactos" : total + (total === 1 ? " contacto" : " contactos"));
    var list = $("#list");
    if (!items.length) {
      list.innerHTML = toks.length
        ? '<div class="empty"><strong>Sin resultados</strong>Ningún contacto coincide con «' + esc(query.trim()) + '».</div>'
        : '<div class="empty"><strong>Tu agenda está vacía</strong>Pulsa «Añadir tarjeta» y haz una foto a la primera tarjeta de visita.</div>';
      renderBanner(); return;
    }
    list.innerHTML = items.map(function (x) {
      var c = x.c, open = openId === c.id, sub = [c.cargo ? c.cargo.split(". ")[0] : "", c.empresa].filter(Boolean).join(" · ");
      var h = '<article class="card"><button class="head" type="button" data-act="toggle" data-id="' + esc(c.id) + '" aria-expanded="' + open + '">' +
        '<span class="avatar" aria-hidden="true">' + esc(initials(c)) + '</span><span class="who"><div class="name">' + hl(fullName(c), toks) + "</div>" +
        (sub ? '<div class="sub">' + hl(sub, toks) + "</div>" : "") + "</span></button>";
      if (open) {
        h += '<div class="detail"><div class="quick">';
        if (c.movil) h += '<a href="' + esc(telHref(c.movil)) + '">Llamar móvil</a><a href="' + esc(waHref(c.movil)) + '" target="_blank" rel="noopener">WhatsApp</a>';
        if (c.telefono) h += '<a href="' + esc(telHref(c.telefono)) + '">Llamar fijo</a>';
        if (c.email) h += '<a href="mailto:' + esc(c.email) + '">Correo</a>';
        h += '</div><dl style="margin:0">';
        ROWS.forEach(function (r) {
          if (!c[r[0]]) return;
          var v = String(c[r[0]]);
          var shown = r[0] === "web" ? '<a href="' + esc(webHref(v)) + '" target="_blank" rel="noopener">' + esc(v) + "</a>" : esc(v);
          h += '<div class="row"><dt>' + r[1] + "</dt><dd>" + shown + "</dd>" + (r[2] ? '<button class="mini" type="button" data-act="copy" data-v="' + esc(v) + '">Copiar</button>' : "<span></span>") + "</div>";
        });
        h += "</dl>";
        if (c.creado) h += '<p class="date">Añadido el ' + esc(new Date(c.creado).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })) + "</p>";
        h += '<div class="actions"><button class="btn" type="button" data-act="edit" data-id="' + esc(c.id) + '">Editar</button>' +
          '<button class="btn" type="button" data-act="vcf" data-id="' + esc(c.id) + '">Pasar a la agenda</button>';
        h += confirmDel === c.id
          ? '<button class="btn danger" type="button" data-act="del-yes" data-id="' + esc(c.id) + '">Sí, eliminar</button><button class="btn" type="button" data-act="del-no">No</button>'
          : '<button class="btn danger" type="button" data-act="del" data-id="' + esc(c.id) + '">Eliminar</button>';
        h += "</div></div>";
      }
      return h + "</article>";
    }).join("");
    renderBanner();
  }

  function renderBanner() {
    var b = $("#banner"), changed = meta.changedSinceBackup || 0;
    var days = meta.lastBackup ? (Date.now() - new Date(meta.lastBackup).getTime()) / 864e5 : 999;
    if (contacts.length && changed >= 5 && days > 7) {
      b.innerHTML = "<span>Tienes " + changed + " cambios sin copia de seguridad.</span>" + '<button class="btn" type="button" id="b-export">Guardar copia</button>';
      b.hidden = false; $("#b-export").onclick = exportBackup;
    } else b.hidden = true;
  }

  $("#q").addEventListener("input", function (e) { query = e.target.value; openId = null; confirmDel = null; render(); });
  $("#list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act"), id = b.getAttribute("data-id");
    var c = contacts.find(function (x) { return x.id === id; });
    if (act === "toggle") { openId = openId === id ? null : id; confirmDel = null; render(); }
    else if (act === "copy") copy(b.getAttribute("data-v"));
    else if (act === "edit" && c) openForm(c, { id: id });
    else if (act === "vcf" && c) download(fullName(c).replace(/[^\wÁÉÍÓÚÑáéíóúñ -]/g, "") + ".vcf", vcard(c), "text/vcard");
    else if (act === "del") { confirmDel = id; render(); }
    else if (act === "del-no") { confirmDel = null; render(); }
    else if (act === "del-yes") {
      contacts = contacts.filter(function (x) { return x.id !== id; });
      if (persist()) { setMeta({ changedSinceBackup: (meta.changedSinceBackup || 0) + 1 }); openId = null; confirmDel = null; render(); toast("Contacto eliminado"); }
    }
  });

  function vcard(c) {
    var e = function (s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1"); };
    var L = ["BEGIN:VCARD", "VERSION:3.0", "N:" + e(c.apellidos) + ";" + e(c.nombre) + ";;;", "FN:" + e(fullName(c))];
    if (c.empresa) L.push("ORG:" + e(c.empresa));
    if (c.cargo) L.push("TITLE:" + e(c.cargo));
    if (c.movil) L.push("TEL;TYPE=CELL:" + c.movil);
    if (c.telefono) L.push("TEL;TYPE=WORK:" + c.telefono);
    if (c.email) L.push("EMAIL;TYPE=WORK:" + c.email);
    if (c.web) L.push("URL:" + webHref(c.web));
    if (c.direccion) L.push("ADR;TYPE=WORK:;;" + e(c.direccion) + ";;;;");
    var note = [c.evento ? "Conocido en: " + c.evento : "", c.notas].filter(Boolean).join(" — ");
    if (note) L.push("NOTE:" + e(note));
    L.push("END:VCARD");
    return L.join("\r\n");
  }

  /* ---------- Búsqueda por voz ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    var mic = $("#mic"), rec = null; mic.hidden = false;
    mic.onclick = function () {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = "es-ES"; rec.interimResults = false; rec.maxAlternatives = 1;
      mic.classList.add("live"); toast("Di el nombre, el apellido o la empresa");
      rec.onresult = function (ev) {
        var t = ev.results[0][0].transcript.replace(/[.,]/g, "").trim();
        $("#q").value = t; query = t; openId = null; render();
      };
      rec.onerror = function (ev) { if (ev.error === "not-allowed") toast("Permite el micrófono para buscar por voz."); else if (ev.error !== "aborted" && ev.error !== "no-speech") toast("No te he entendido. Prueba otra vez."); };
      rec.onend = function () { mic.classList.remove("live"); rec = null; };
      try { rec.start(); } catch (e) { mic.classList.remove("live"); rec = null; }
    };
  }

  /* ---------- Formulario ---------- */
  var FIELDS = [["nombre", "Nombre", "text"], ["apellidos", "Apellidos", "text"], ["cargo", "Cargo", "text"], ["empresa", "Empresa", "text"],
    ["movil", "Móvil", "tel"], ["telefono", "Teléfono fijo", "tel"], ["email", "Correo electrónico", "email"], ["web", "Web", "url"],
    ["direccion", "Dirección", "text"], ["evento", "Evento donde lo conocí", "text"]];
  function openForm(data, opts) {
    opts = opts || {}; dupAsked = false;
    var d = data || {}, check = d.revisar || [];
    var h = '<div class="panel"><h2>' + (opts.id ? "Editar contacto" : "Nuevo contacto") + "</h2>";
    if (opts.scan) h += "<p>Revisa lo que se ha leído de la tarjeta y corrige lo que haga falta.</p>";
    if (opts.photo) h += '<img class="photo" src="' + opts.photo + '" alt="Foto de la tarjeta">';
    h += '<div class="form">';
    for (var i = 0; i < FIELDS.length; i += 2) {
      h += '<div class="pair">';
      for (var j = i; j < i + 2 && j < FIELDS.length; j++) {
        var f = FIELDS[j], chk = check.indexOf(f[0]) >= 0 && d[f[0]];
        h += '<div class="field' + (chk ? " check" : "") + '"><label for="f-' + f[0] + '">' + f[1] + '</label><input id="f-' + f[0] + '" type="' + f[2] + '" autocomplete="off" value="' + esc(d[f[0]] || "") + '">' +
          (chk ? '<span class="hint">Comprueba este dato: se ha reconstruido.</span>' : "") + "</div>";
      }
      h += "</div>";
    }
    h += '<div class="field"><label for="f-notas">Notas</label><textarea id="f-notas" placeholder="De qué hablamos, qué quedó pendiente...">' + esc(d.notas || "") + "</textarea></div></div>";
    if (opts.raw) h += '<details class="raw"><summary>Ver el texto leído de la tarjeta</summary><pre>' + esc(opts.raw) + "</pre></details>";
    h += '<div id="warn" class="warn" hidden></div><div class="bar"><button class="btn" type="button" id="s-cancel">Cancelar</button><button class="btn primary" type="button" id="s-save">Guardar</button></div></div>';
    var sh = $("#sheet"); sh.innerHTML = h; sh.hidden = false; sh.scrollTop = 0;
    $("#s-cancel").onclick = closeForm;
    $("#s-save").onclick = function () { save(opts.id, d); };
  }
  function closeForm() { $("#sheet").hidden = true; $("#sheet").innerHTML = ""; }
  function val(k) { var el = $("#f-" + k); return el ? el.value.trim() : ""; }
  function save(id, prev) {
    var data = {};
    FIELDS.forEach(function (f) { data[f[0]] = val(f[0]); });
    data.notas = val("notas");
    var w = $("#warn");
    if (!data.nombre && !data.apellidos && !data.empresa) { w.textContent = "Escribe al menos un nombre, unos apellidos o una empresa."; w.hidden = false; return; }
    var key = norm([data.nombre, data.apellidos, data.empresa].join("|"));
    var dup = contacts.find(function (c) { return c.id !== id && ((data.email && norm(c.email) === norm(data.email)) || norm([c.nombre, c.apellidos, c.empresa].join("|")) === key); });
    if (dup && !dupAsked) {
      dupAsked = true;
      w.textContent = "Ya tienes un contacto parecido: " + fullName(dup) + (dup.empresa ? " (" + dup.empresa + ")" : "") + ". Pulsa Guardar otra vez para añadirlo igualmente.";
      w.hidden = false; return;
    }
    var now = new Date().toISOString();
    data.creado = (prev && prev.creado) || now; data.actualizado = now;
    var backup = contacts.slice();
    if (id) { data.id = id; contacts = contacts.map(function (c) { return c.id === id ? data : c; }); }
    else { data.id = uid(); contacts.push(data); }
    if (!persist()) { contacts = backup; return; }
    if (data.evento) setMeta({ evento: data.evento });
    setMeta({ changedSinceBackup: (meta.changedSinceBackup || 0) + 1 });
    openId = data.id; confirmDel = null; query = ""; $("#q").value = "";
    closeForm(); render(); toast("Contacto guardado");
  }

  /* ---------- Menús ---------- */
  $("#add").onclick = function () { $("#addmenu").hidden = false; };
  $("#m-close").onclick = function () { $("#addmenu").hidden = true; };
  $("#m-man").onclick = function () { $("#addmenu").hidden = true; openForm({ evento: meta.evento || "" }, {}); };
  ["#file-cam", "#file-gal"].forEach(function (s) {
    $(s).addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ""; $("#addmenu").hidden = true; if (f) scan(f); });
  });
  $("#more").onclick = function () {
    $("#o-last").textContent = meta.lastBackup ? "Última copia: " + new Date(meta.lastBackup).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + "." : "Todavía no has guardado ninguna copia.";
    $("#optmenu").hidden = false;
  };
  $("#o-close").onclick = function () { $("#optmenu").hidden = true; };
  $("#o-export").onclick = exportBackup;
  function exportBackup() {
    var d = new Date(), stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    download("contactos-comerciales-construccion-" + stamp + ".json", JSON.stringify({ app: "contactos-comerciales-construccion", version: 1, fecha: d.toISOString(), contactos: contacts }, null, 1), "application/json");
    setMeta({ lastBackup: d.toISOString(), changedSinceBackup: 0 });
    $("#optmenu").hidden = true; renderBanner(); toast("Copia descargada. Guárdala en Drive.");
  }
  $("#file-import").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result), list = Array.isArray(j) ? j : j.contactos;
        if (!Array.isArray(list)) throw 0;
        var byId = {}; contacts.forEach(function (c) { byId[c.id] = c; });
        var added = 0, updated = 0;
        list.forEach(function (c) {
          if (!c || typeof c !== "object") return;
          var x = {}; FIELDS.forEach(function (fl) { x[fl[0]] = String(c[fl[0]] || ""); });
          x.notas = String(c.notas || ""); x.creado = c.creado || new Date().toISOString(); x.actualizado = c.actualizado || x.creado; x.id = String(c.id || uid());
          if (!x.nombre && !x.apellidos && !x.empresa) return;
          if (byId[x.id]) updated++; else added++;
          byId[x.id] = x;
        });
        var backup = contacts; contacts = Object.keys(byId).map(function (k) { return byId[k]; });
        if (!persist()) { contacts = backup; return; }
        $("#optmenu").hidden = true; render();
        toast("Copia restaurada: " + added + " nuevos, " + updated + " actualizados.");
      } catch (err) { toast("Ese archivo no es una copia de Contactos Comerciales Construcción."); }
    };
    r.readAsText(f);
  });

  /* ---------- Lectura de la tarjeta ---------- */
  var worker = null, workerReady = null, progressCb = null;
  function loadScript(src) { return new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
  function getWorker() {
    if (workerReady) return workerReady;
    var base = new URL(".", location.href).href;
    workerReady = (window.Tesseract ? Promise.resolve() : loadScript("vendor/tesseract.min.js")).then(function () {
      return Tesseract.createWorker("spa", 1, {
        workerPath: base + "vendor/worker.min.js", corePath: base + "vendor/core/", langPath: base + "lang", gzip: true,
        logger: function (m) { if (progressCb) progressCb(m); }
      });
    }).then(function (w) { worker = w; return w; });
    workerReady.catch(function () { workerReady = null; });
    return workerReady;
  }
  function busy(html) { $("#busy-body").innerHTML = html; $("#busy").hidden = false; }
  function setProgress(label, pct) {
    var l = $("#p-label"), b = $("#p-bar");
    if (l) l.textContent = label;
    if (b) b.style.width = Math.max(4, Math.min(100, pct)) + "%";
  }
  async function toCanvas(file) {
    var bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { bmp = await new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = ko; i.src = URL.createObjectURL(file); }); }
    var w = bmp.width, h = bmp.height, k = Math.min(1, 1800 / Math.max(w, h));
    var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
    var g = c.getContext("2d"); g.drawImage(bmp, 0, 0, c.width, c.height);
    var img = g.getImageData(0, 0, c.width, c.height), p = img.data;
    for (var i = 0; i < p.length; i += 4) { var y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = y; }
    g.putImageData(img, 0, 0);
    return c;
  }
  function rotated(src, deg) {
    if (!deg) return src;
    var c = document.createElement("canvas"), side = deg % 180 !== 0;
    c.width = side ? src.height : src.width; c.height = side ? src.width : src.height;
    var g = c.getContext("2d"); g.translate(c.width / 2, c.height / 2); g.rotate(deg * Math.PI / 180); g.drawImage(src, -src.width / 2, -src.height / 2);
    return c;
  }
  function thumb(src) {
    var k = Math.min(1, 600 / Math.max(src.width, src.height)), c = document.createElement("canvas");
    c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  }
  var cancelled = false;
  async function scan(file) {
    cancelled = false;
    busy('<h2>Leyendo la tarjeta</h2><p id="p-label">Preparando la foto…</p><div class="progress"><i id="p-bar"></i></div><button class="btn" type="button" id="b-cancel">Cancelar</button>');
    $("#b-cancel").onclick = function () { cancelled = true; $("#busy").hidden = true; };
    try {
      var base = await toCanvas(file);
      var first = !worker;
      setProgress(first ? "Preparando el lector (solo la primera vez, unos segundos)…" : "Leyendo…", 8);
      progressCb = function (m) {
        if (m.status === "recognizing text") setProgress(stage + " " + Math.round(m.progress * 100) + "%", 20 + m.progress * 75 * share + done * 75);
        else if (first && m.status) setProgress("Preparando el lector (solo la primera vez, unos segundos)…", 8 + (m.progress || 0) * 10);
      };
      var w = await getWorker();
      if (cancelled) return;
      // Las tarjetas son apaisadas: si la foto es vertical, está girada.
      var tries = base.height > base.width ? [90, 270] : [0, 180];
      var share = 1 / tries.length, done = 0, stage = "Leyendo…", best = null;
      for (var t = 0; t < tries.length; t++) {
        if (cancelled) return;
        stage = tries.length > 1 ? "Leyendo (" + (t + 1) + " de " + tries.length + ")…" : "Leyendo…";
        var cv = rotated(base, tries[t]);
        var r = (await w.recognize(cv)).data;
        if (!best || r.confidence > best.data.confidence) best = { data: r, canvas: cv };
        done = (t + 1) * share;
        if (tries[t] === 0 && r.confidence >= 70) break;
      }
      if (cancelled) return;
      var lines = (best.data.lines || []).map(function (l) { return { text: l.text, h: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0 }; });
      if (!lines.length) lines = String(best.data.text || "").split("\n");
      var parsed = parseCard(lines);
      $("#busy").hidden = true;
      var found = ["nombre", "apellidos", "empresa", "movil", "telefono", "email"].some(function (k) { return parsed[k]; });
      parsed.evento = meta.evento || "";
      openForm(parsed, { scan: true, photo: thumb(best.canvas), raw: best.data.text });
      if (!found) toast("No he podido leer bien la tarjeta. Completa los datos a mano.");
    } catch (err) {
      if (cancelled) return;
      busy('<h2>No se pudo leer</h2><p>' + (navigator.onLine === false && !worker
        ? "La primera lectura necesita conexión a internet para preparar el lector. Conéctate y vuelve a probar."
        : "Ha fallado la lectura de la foto. Prueba con otra foto o introduce los datos a mano.") +
        '</p><button class="btn primary" type="button" id="b-man">Introducir a mano</button><button class="btn" type="button" id="b-close">Cerrar</button>');
      $("#b-man").onclick = function () { $("#busy").hidden = true; openForm({ evento: meta.evento || "" }, {}); };
      $("#b-close").onclick = function () { $("#busy").hidden = true; };
    } finally { progressCb = null; }
  }

  /* ---------- Arranque ---------- */
  render();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  window.__co = { parseCard: window.parseCard, count: function () { return contacts.length; } };
})();
