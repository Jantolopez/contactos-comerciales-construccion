/* Contactos Comerciales Construcción — interpreta el texto leído de una tarjeta de visita.
   Entrada: lista de líneas [{text, h}] (h = altura de la línea en píxeles, opcional).
   Salida: {nombre, apellidos, cargo, empresa, movil, telefono, email, web, direccion}. */
(function (root) {
  "use strict";

  var SMALL = { de: 1, del: 1, la: 1, las: 1, los: 1, el: 1, y: 1, e: 1, en: 1, para: 1, por: 1, a: 1, al: 1, o: 1, u: 1 };
  var FREE_MAIL = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|telefonica|movistar|orange|vodafone|aol|proton|protonmail|gmx)$/i;
  var CARGO = /\b(ingenier[oa]s?|director[a]?|directores|delegad[oa]|gerente|jef[ea]|responsable|manager|t[eé]cnic[oa]|arquitect[oa]|consejer[oa]|president[ea]|ceo|cfo|coo|cto|administrador[a]?|comercial|ventas|soci[oa]|abogad[oa]|economista|licenciad[oa]|coordinador[a]?|encargad[oa]|departamento|dpto|account|sales|engineer|head|officer|business|desarrollo|asesor[a]?|consultor[a]?|ejecutiv[oa]|secretari[oa]|propietari[oa]|fundador[a]?|founder|partner|executive|ingeniero de caminos|canales y puertos|area|[aá]rea|zona|regional|nacional|division|divisi[oó]n|operaciones|producci[oó]n|obra|obras p[uú]blicas|licitaciones|estudios|compras|calidad|prevenci[oó]n|recursos humanos|rrhh|marketing|financier[oa]|administraci[oó]n|perito|mediador[a]?|dr\.?|dra\.?)\b/i;
  var COMPANY = /(\bs\.?\s?a\.?\s?u?\.?$|\bs\.?\s?l\.?\s?u?\.?$|\bs\.?\s?a\.?\b|\bs\.?\s?l\.?\b|\bing(enier[ií]a)?\b.*\b(s\.?a|s\.?l)\b|\bconstrucciones\b|\bconstructora\b|\bgrupo\b|\bconsulting\b|\bconsultores\b|\binfraestructuras\b|\bute\b|\basociados\b|\bltd\b|\bgmbh\b|\binc\b|\bcorporaci[oó]n\b|\bholding\b|\bservicios\b|\bestudio de\b|\bayuntamiento\b|\bjunta de\b|\bdiputaci[oó]n\b|\bministerio\b|\bconsejer[ií]a\b|\buniversidad\b|\bcolegio de\b|\bfundaci[oó]n\b|\bautoridad portuaria\b|\badif\b|\baena\b)/i;
  var ADDRESS = /\b(avda|avd|av|avenida|calle|c\/|cl|plaza|pza|pl|paseo|pso|p[ºo]|ctra|carretera|pol[ií]gono|pol|parque|edificio|edif|planta|m[oó]dulo|camino|ronda|glorieta|urb|urbanizaci[oó]n|local|oficina|ofic|piso|puerta|bloque|nave|parcela|apartado|torre|centro empresarial|c\.p\.|cp)\b|\b\d{5}\b|\bc\/\s?\w/i;
  var LABEL = /^(e-?mail|correo|mail|web|tel[eé]?f?o?n?o?|tlf|tfno|telf|m[oó]vil|movil|m[oó]v|cel|celular|fax|direcci[oó]n|dir)\s*[:.]?\s*/i;

  function clean(s) {
    return String(s || "")
      .replace(/[|¦_~`´^"“”«»]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function upperRatio(s) {
    var l = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
    if (!l) return 0;
    return l.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "").length / l.length;
  }
  /* Quita restos de lectura en los extremos de la línea: "AAA", "—", "e", "De." en una línea en mayúsculas... */
  function trimJunk(s) {
    var t = s.split(" ").filter(Boolean);
    var caps = upperRatio(s) > 0.8;
    function junk(w) {
      if (/^[A-Za-zÁÉÍÓÚ][\/.]$|[\/ºª@]/.test(w)) return false;
      var core = w.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9@]/g, "");
      if (!core) return true;
      if (/^(.)\1{2,}$/i.test(core)) return true;
      if (core.length <= 6 && caps && core !== core.toUpperCase() && !/\d/.test(core)) return true;
      if (core.length === 1 && !/^[YyEeOoUuAa\d]$/.test(core)) return true;
      return false;
    }
    // El símbolo de un icono (teléfono, sobre, globo, chincheta) se lee como una letra suelta: "O Avda. ..."
    while (t.length > 1 && /^[A-Za-zÁÉÍÓÚÑ©®@&°•·*»«$%#~><=+]$/.test(t[0])) t.shift();
    while (t.length > 1 && junk(t[0])) t.shift();
    while (t.length > 1 && junk(t[t.length - 1])) t.pop();
    while (t.length > 2 && /^[A-Za-zÑñ©®@&°•·*»«]$/.test(t[t.length - 1]) && !/^[yY]$/.test(t[t.length - 1])) t.pop();
    return t.join(" ");
  }
  function isUpper(s) { var l = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, ""); return l.length > 1 && l === l.toUpperCase(); }
  function titleCase(s) {
    return s.toLowerCase().split(/(\s+|-)/).map(function (w, i) {
      if (!w.trim() || w === "-") return w;
      if (i > 0 && SMALL[w]) return w;
      if (/^(s\.?a\.?u?\.?|s\.?l\.?u?\.?|ute|s\.?coop\.?)$/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join("");
  }
  function nice(s) { return isUpper(s) ? titleCase(s) : s; }
  function digits(s) { return s.replace(/\D/g, ""); }

  function fmtPhone(raw) {
    var d = digits(raw), plus = /^\s*\+/.test(raw) || d.indexOf("0034") === 0;
    var nat = national(d);
    if (!plus && nat.length > 9 && /^[6789]/.test(nat)) nat = nat.slice(0, 9);   // una cifra suelta pegada al final
    var printed = clean(raw.replace(/[.\-\/()]/g, " ")).replace(/^\+?\s*(00\s?)?34\s*/, "");
    var groups = printed.split(" ");
    var ok = digits(printed) === nat && groups.length >= 3 && groups.every(function (g) { return g.length >= 2 && g.length <= 3; });
    var body = ok ? printed : (nat.length === 9 ? group(nat) : clean(raw));
    return (plus ? "+34 " : "") + body;
  }
  function group(d9) {
    if (/^[67]/.test(d9)) return d9.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
    return d9.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  }
  function national(d) { if (d.indexOf("0034") === 0) return d.slice(4); if (d.indexOf("34") === 0 && d.length === 11) return d.slice(2); return d; }

  function parseCard(input) {
    var lines = [];
    (input || []).forEach(function (l) {
      var t = typeof l === "string" ? l : l.text, h = typeof l === "string" ? 0 : +l.h || 0;
      // "Miguel Rus Palacios | (6 pe" -> dos trozos: el texto y el resto del logo
      String(t || "").split(/\s[|¦]\s|\s{3,}|\t/).forEach(function (part) {
        var x = trimJunk(clean(part));
        if (x.length > 1) lines.push({ text: x, h: h });
      });
    });
    var all = lines.map(function (l) { return l.text; }).join("\n");
    var out = { nombre: "", apellidos: "", cargo: "", empresa: "", movil: "", telefono: "", email: "", web: "", direccion: "", revisar: [] };
    var used = {};

    // Palabras de la tarjeta que pueden ser el dominio (logo, empresa, web)
    var known = {};
    lines.filter(function (l) { return !/^(e\s?-?\s?mail|correo|mail)\b/i.test(l.text); }).map(function (l) { return l.text; }).join(" ")
      .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9-]+/).forEach(function (w) { if (w.length >= 3) known[w.toLowerCase()] = 1; });
    var webDom = (all.match(/www\.([A-Za-z0-9-]+)\./i) || [])[1];
    if (webDom) known[webDom.toLowerCase()] = 1;

    // Correo
    var fixed = all.replace(/\s*@\s*/g, "@").replace(/@(\w+)\s*\.\s*(\w{2,})/g, "@$1.$2");
    var em = fixed.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (em) out.email = em[0].replace(/^[._-]+/, "").toLowerCase();
    lines.forEach(function (l, i) { if (/@/.test(l.text)) used[i] = 1; });
    if (!out.email && webDom) {
      // Sin etiqueta: "mejemploGhormisur.com", "mejemplo hormisur.com", "mejemplo © hormisur.com"
      var wd = webDom.toLowerCase();
      lines.forEach(function (l, i) {
        if (out.email || used[i] || /\bwww\./i.test(l.text)) return;
        var low = l.text.replace(LABEL, ""), re = new RegExp("([A-Za-z0-9._%+-]+)\\s*(?:[^A-Za-z0-9\\s]|[GQ])?\\s*(" + wd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.[a-z.]{2,})\\b", "i");
        var m = low.match(re);
        if (!m) return;
        var local = m[1];
        if (local.toLowerCase().slice(-wd.length) === wd) return;
        if (/[A-Z]$/.test(local) && local.slice(0, -1) === local.slice(0, -1).toLowerCase() && local.length > 2) local = local.slice(0, -1);
        out.email = (local + "@" + m[2]).toLowerCase(); out.revisar.push("email"); used[i] = 1;
      });
    }
    if (!out.email) {
      // La @ se pierde a menudo: se reconstruye desde la línea con la etiqueta e-mail
      lines.forEach(function (l, i) {
        if (out.email) return;
        var m = l.text.match(/^(?:e\s?-?\s?mail|correo(?: electr[oó]nico)?|mail)\s*[:.]?\s*(.+)$/i);
        if (!m) return;
        used[i] = 1;
        var toks = m[1].replace(/[\s-]+$/, "").split(" ").filter(Boolean);
        var di = -1;
        for (var k = toks.length - 1; k >= 0; k--) if (/\.[a-z]{2,}$/i.test(toks[k])) { di = k; break; }
        if (di < 0) return;
        var domTok = toks[di].toLowerCase(), local = toks.slice(0, di);
        if (local.length && local[local.length - 1].length === 1) local.pop();
        var label = domTok.split(".")[0];
        if (local.length && /^[qg@©®a]/.test(label) && known[label.slice(1)] && !known[label]) domTok = domTok.slice(1);
        var lp = local.join("").toLowerCase();
        if (!lp) {
          var whole = domTok.split(".")[0], rest = domTok.slice(whole.length), hit = "";
          Object.keys(known).forEach(function (w) {
            if (w.length < whole.length && whole.slice(-w.length) === w && w.length > hit.length) hit = w;
          });
          if (hit) { lp = whole.slice(0, -hit.length); domTok = hit + rest; }
        }
        if (lp && /^[a-z0-9._%+-]+$/.test(lp)) { out.email = lp + "@" + domTok; out.revisar.push("email"); }
      });
    }

    // Web
    var wm = all.match(/\b(?:https?:\/\/)?(www\.[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})(\/[^\s]*)?/i);
    if (wm) out.web = wm[1].toLowerCase();
    else if (out.email) {
      var ed = out.email.split("@")[1];
      if (ed && !FREE_MAIL.test(ed.split(".")[0])) { out.web = "www." + ed; out.revisar.push("web"); }
    }
    lines.forEach(function (l, i) { if (/\bwww\.|https?:\/\//i.test(l.text)) used[i] = 1; });

    // Teléfonos
    var phones = [];
    lines.forEach(function (l, i) {
      var t = l.text, re = /(\+?\(?\d[\d\s.\-()\/]{7,}\d)/g, m;
      while ((m = re.exec(t))) {
        var d = digits(m[1]);
        if (d.length < 9 || d.length > 13) continue;
        var before = t.slice(0, m.index).toLowerCase();
        if (/fax/.test(before)) { used[i] = 1; continue; }
        var kind = "";
        if (/m[oó]v|cel|mob|\bm\s*[:.]/.test(before)) kind = "movil";
        else if (/tel|tlf|tfno|phone|fijo|\bt\s*[:.]|centralita|ofic/.test(before)) kind = "telefono";
        phones.push({ raw: m[1], d: national(d), kind: kind });
        used[i] = 1;
      }
    });
    phones.forEach(function (p) {
      if (!p.kind) p.kind = /^[67]/.test(p.d) ? "movil" : "telefono";
      if (!out[p.kind]) out[p.kind] = fmtPhone(p.raw);
      else if (p.kind === "telefono" && !out.movil && /^[67]/.test(p.d)) out.movil = fmtPhone(p.raw);
    });

    // Dirección
    var addr = [];
    lines.forEach(function (l, i) {
      if (used[i]) return;
      if (ADDRESS.test(l.text) && !CARGO.test(l.text.replace(/\b(edificio|planta)\b/ig, ""))) { addr.push(l.text.replace(LABEL, "")); used[i] = 1; }
    });
    out.direccion = addr.join(", ").replace(/\s+,/g, ",").replace(/(\d)\s?[*%]/g, "$1ª");

    // Empresa por palabra clave
    var companyIdx = -1;
    lines.forEach(function (l, i) { if (companyIdx < 0 && !used[i] && COMPANY.test(l.text) && !CARGO.test(l.text)) companyIdx = i; });

    // Dominio del correo o de la web como pista de empresa
    var dom = "";
    if (out.email) { var p = out.email.split("@")[1].split("."); if (!FREE_MAIL.test(p[0])) dom = p[0]; }
    if (!dom && out.web) dom = out.web.replace(/^www\./, "").split(".")[0];
    if (companyIdx < 0 && dom) {
      // El logo suele quedar pegado a otra línea: "VIAS EULALIO JESÚS ..."
      lines.forEach(function (l, i) {
        if (companyIdx >= 0 || used[i]) return;
        var w = l.text.split(" ");
        if (w.length < 2) return;
        var first = w[0].toLowerCase().replace(/[^a-z0-9]/g, ""), last = w[w.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
        if (first === dom) { out.empresa = w[0]; l.text = w.slice(1).join(" "); companyIdx = -2; }
        else if (last === dom) { out.empresa = w[w.length - 1]; l.text = w.slice(0, -1).join(" "); companyIdx = -2; }
      });
    }
    if (companyIdx === -1 && dom) {
      lines.forEach(function (l, i) {
        if (companyIdx >= 0 || used[i]) return;
        var w = l.text.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, "");
        if (w && (w === dom || (w.length >= 3 && dom.indexOf(w) === 0 && w.length >= dom.length - 2))) companyIdx = i;
      });
    }
    if (companyIdx >= 0) { out.empresa = lines[companyIdx].text; used[companyIdx] = 1; }
    else if (companyIdx === -1 && dom) out.empresa = dom.length <= 5 ? dom.toUpperCase() : dom.charAt(0).toUpperCase() + dom.slice(1);

    // Cargo
    var cargo = [];
    lines.forEach(function (l, i) {
      if (used[i] || !CARGO.test(l.text) || /\d/.test(l.text)) return;
      var w = l.text.split(" "), t = l.text;
      // Una palabra suelta delante del puesto suele ser un resto del logo ("MATIC INGENIERO DE ...")
      if (w.length > 2 && !CARGO.test(w[0]) && CARGO.test(w[1]) && w[0].replace(/\W/g, "").length <= 6 &&
          !/^(senior|junior|chief|sub|vice|adjunt[oa]|ing\.?|sr\.?|sra\.?|d\.?|d[ñn]a\.?)$/i.test(w[0])) t = w.slice(1).join(" ");
      cargo.push(t); used[i] = 1;
    });
    out.cargo = cargo.map(nice).join(". ");

    // Nombre: línea "de persona" más destacada
    var best = -1, bestScore = -1;
    lines.forEach(function (l, i) {
      if (used[i]) return;
      var t = l.text.replace(/[.,;:]+$/, "");
      if (/[\d@]/.test(t)) return;
      var words = t.split(" ").filter(Boolean);
      if (words.length < 2 || words.length > 6) return;
      if (!words.every(function (w) { return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.\-]*$/.test(w); })) return;
      if (t.replace(/\s/g, "").length < 6) return;
      var score = (l.h || 10) + (isUpper(t) || /^([A-ZÁÉÍÓÚÑ][a-záéíóúüñ'.\-]+\s?)+$/.test(t) ? 8 : 0) - i * 0.5;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) {
      used[best] = 1;
      var w = nice(lines[best].text.replace(/[.,;:]+$/, "")).split(" ").filter(Boolean);
      if (w.length >= 3) { out.apellidos = w.slice(-2).join(" "); out.nombre = w.slice(0, -2).join(" "); }
      else { out.nombre = w[0]; out.apellidos = w.slice(1).join(" "); }
    }
    if (out.empresa && isUpper(out.empresa) && out.empresa.length > 6) out.empresa = titleCase(out.empresa);
    if (out.empresa && out.empresa === out.empresa.toLowerCase()) out.empresa = out.empresa.charAt(0).toUpperCase() + out.empresa.slice(1);
    out.direccion = out.direccion ? nice(out.direccion) : "";
    return out;
  }

  root.parseCard = parseCard;
  if (typeof module !== "undefined") module.exports = { parseCard: parseCard };
})(typeof self !== "undefined" ? self : this);
