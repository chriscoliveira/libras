/*************************************************
 * CONFIGURAÇÃO
 *************************************************/
const CSV_FILE = "cards.csv";
let TAMANHO_BLOCO = 100;

/*************************************************
 * ESTADO GLOBAL
 *************************************************/
let todosCards    = [];
let cardsCSVLocal = [];
let usandoCSVLocal = false;

let poolIndices = [];
let ordemBloco  = [];   // cada item: { idx, modo } onde modo = "pt_sinal" | "sinal_pt"
let filaErros   = [];
let pos = 0;
let mostrandoFrente = true;
let respondidos = new Set();

let acertos = 0;
let erros   = 0;

let totalAcertos = Number(localStorage.getItem("libras-total-acertos") || 0);
let totalErros   = Number(localStorage.getItem("libras-total-erros")   || 0);

/*************************************************
 * ELEMENTOS
 *************************************************/
const elCategoriaAtual = document.getElementById("categoriaAtual");
const elModoBadge      = document.getElementById("modoBadge");
const elConteudo       = document.getElementById("conteudo");
const elMediaArea      = document.getElementById("mediaArea");
const elCard           = document.getElementById("card");

const elAcertos     = document.getElementById("acertos");
const elErros       = document.getElementById("erros");
const elRespondidos = document.getElementById("respondidos");
const elTotalBloco  = document.getElementById("totalBloco");

const elFiltroCategoria = document.getElementById("filtroCategoria");
const elTamanhoBloco    = document.getElementById("tamanhoBloco");
const elModoJogo        = document.getElementById("modoJogo");

/*************************************************
 * HELPERS
 *************************************************/
function getCard(idx) {
  return usandoCSVLocal ? cardsCSVLocal[idx] : todosCards[idx];
}

function isVideo(url) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function isGif(url) {
  return /\.gif(\?.*)?$/i.test(url);
}

function criarMedia(url) {
  if (!url) return null;
  if (isVideo(url)) {
    const v = document.createElement("video");
    v.src = url;
    v.autoplay = true;
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.controls = true;
    return v;
  }
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Sinal em Libras";
  return img;
}

function embaralharArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/*************************************************
 * LISTENERS
 *************************************************/
document.getElementById("btnVirar").onclick      = virarCard;
document.getElementById("btnAcerto").onclick     = () => marcarResposta(true);
document.getElementById("btnErro").onclick       = () => marcarResposta(false);
document.getElementById("btnEmbaralhar").onclick = () => iniciarBloco(true);
document.getElementById("btnNovoBloco").onclick  = () => iniciarBloco(false);

elCard.onclick = virarCard;

elTamanhoBloco.onchange = () => {
  TAMANHO_BLOCO = parseInt(elTamanhoBloco.value, 10);
  iniciarBloco(false);
};

elFiltroCategoria.onchange = () => {
  montarPoolPorCategoria();
  iniciarBloco(false);
};

elModoJogo.onchange = () => iniciarBloco(false);

// CSV local
document.getElementById("csvLocal").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const raw = e.target.result;
    const primeiraLinha = raw.split(/\r?\n/)[0];
    const qtdPV = (primeiraLinha.match(/;/g) || []).length;
    const qtdVg = (primeiraLinha.match(/,/g) || []).length;
    const delimitador = qtdPV >= qtdVg ? ";" : ",";

    Papa.parse(raw, {
      delimiter: delimitador,
      skipEmptyLines: true,
      complete: (results) => {
        cardsCSVLocal = results.data
          .map(l => ({
            categoria: (l[0] || "📁 CSV local").trim() || "📁 CSV local",
            palavra:   (l[1] || "").trim(),
            midia:     (l[2] || "").trim(),
            descricao: (l[3] || "").trim()
          }))
          .filter(c => c.palavra && c.midia);

        if (cardsCSVLocal.length === 0) {
          const ex = results.data[0] ? JSON.stringify(results.data[0]) : "vazio";
          alert(
            "CSV vazio ou inválido.\n\n" +
            "Primeira linha lida: " + ex + "\n" +
            "Delimitador detectado: \"" + delimitador + "\"\n\n" +
            "Formato esperado: categoria;palavra;url_midia;descricao_opcional"
          );
          return;
        }

        montarDropdownCategorias();
        elFiltroCategoria.value = "__csv_local__";
        montarPoolPorCategoria();
        iniciarBloco(true);
      }
    });
  };
  reader.readAsText(file, "UTF-8");
});

// Atalhos
document.addEventListener("keydown", e => {
  if (e.code === "Space") { e.preventDefault(); virarCard(); }
  if (e.key.toLowerCase() === "a") marcarResposta(true);
  if (e.key.toLowerCase() === "e") marcarResposta(false);
});

/*************************************************
 * CARREGAR CSV DO SERVIDOR
 *************************************************/
Papa.parse(CSV_FILE, {
  download: true,
  delimiter: ";",
  skipEmptyLines: true,
  complete: (results) => {
    todosCards = results.data
      .map(l => ({
        categoria: (l[0] || "").trim(),
        palavra:   (l[1] || "").trim(),
        midia:     (l[2] || "").trim(),
        descricao: (l[3] || "").trim()
      }))
      .filter(c => c.categoria && c.palavra && c.midia);

    montarDropdownCategorias();
    montarPoolPorCategoria();
    iniciarBloco(true);
  }
});

/*************************************************
 * DROPDOWN DE CATEGORIAS
 *************************************************/
function montarDropdownCategorias() {
  const cats = [...new Set(todosCards.map(c => c.categoria))].sort();

  elFiltroCategoria.innerHTML = "";
  elFiltroCategoria.add(new Option("Todas", "__todas__"));
  cats.forEach(c => elFiltroCategoria.add(new Option(c, c)));

  if (cardsCSVLocal.length > 0) {
    elFiltroCategoria.add(new Option("📁 CSV local", "__csv_local__"));
  }
}

/*************************************************
 * POOL POR CATEGORIA
 *************************************************/
function montarPoolPorCategoria() {
  const cat = elFiltroCategoria.value;
  poolIndices    = [];
  usandoCSVLocal = false;

  if (cat === "__csv_local__") {
    usandoCSVLocal = true;
    for (let i = 0; i < cardsCSVLocal.length; i++) poolIndices.push(i);
    return;
  }

  todosCards.forEach((c, i) => {
    if (cat === "__todas__" || c.categoria === cat) poolIndices.push(i);
  });
}

/*************************************************
 * INICIAR BLOCO
 *************************************************/
function iniciarBloco(embaralhar = false) {
  acertos = 0;
  erros   = 0;
  respondidos.clear();
  filaErros = [];
  pos = 0;

  let base = [...poolIndices];
  if (embaralhar) embaralharArray(base);

  const tamanho = Math.min(TAMANHO_BLOCO, base.length);
  base = base.slice(0, tamanho);

  const modo = elModoJogo.value;

  // Gera lista de { idx, modo }
  if (modo === "ambos") {
    // cada card vira dois itens (um de cada modo), depois embaralha
    let expandido = [];
    base.forEach(idx => {
      expandido.push({ idx, modo: "pt_sinal" });
      expandido.push({ idx, modo: "sinal_pt" });
    });
    if (embaralhar) embaralharArray(expandido);
    ordemBloco = expandido.slice(0, tamanho * 2);
  } else {
    ordemBloco = base.map(idx => ({ idx, modo }));
  }

  elTotalBloco.innerText = ordemBloco.length;
  atualizarContadores();

  if (ordemBloco.length === 0) {
    elCategoriaAtual.innerText = "Sem cards";
    elConteudo.innerText = "";
    elMediaArea.innerHTML = "";
    elModoBadge.innerText = "";
    return;
  }

  mostrarCard();
}

/*************************************************
 * MOSTRAR CARD
 *************************************************/
function mostrarCard() {
  mostrandoFrente = true;
  elMediaArea.innerHTML = "";

  const { idx, modo } = ordemBloco[pos];
  const card = getCard(idx);

  elCategoriaAtual.innerText = card.categoria;
  elModoBadge.innerText = modo === "pt_sinal" ? "PT → Sinal" : "Sinal → PT";

  if (modo === "pt_sinal") {
    // Frente: palavra em português
    elConteudo.innerText = card.palavra;
  } else {
    // Frente: mídia (gif/vídeo do sinal)
    elConteudo.innerText = "";
    const el = criarMedia(card.midia);
    if (el) elMediaArea.appendChild(el);
  }
}

/*************************************************
 * VIRAR CARD
 *************************************************/
function virarCard() {
  const { idx, modo } = ordemBloco[pos];
  const card = getCard(idx);

  mostrandoFrente = !mostrandoFrente;
  elMediaArea.innerHTML = "";

  if (mostrandoFrente) {
    // Voltou pra frente
    if (modo === "pt_sinal") {
      elConteudo.innerText = card.palavra;
    } else {
      elConteudo.innerText = "";
      const el = criarMedia(card.midia);
      if (el) elMediaArea.appendChild(el);
    }
  } else {
    // Mostra verso
    if (modo === "pt_sinal") {
      // Verso: gif/vídeo
      elConteudo.innerText = card.descricao || "";
      const el = criarMedia(card.midia);
      if (el) elMediaArea.appendChild(el);
    } else {
      // Verso: palavra em português
      elConteudo.innerText = card.palavra;
      if (card.descricao) {
        elConteudo.innerText += "\n" + card.descricao;
      }
    }
  }
}

/*************************************************
 * MARCAR RESPOSTA
 *************************************************/
function marcarResposta(correto) {
  const key = pos + "_" + ordemBloco[pos].idx + "_" + ordemBloco[pos].modo;
  if (respondidos.has(key)) return;
  respondidos.add(key);

  if (correto) {
    acertos++;
    totalAcertos++;
    localStorage.setItem("libras-total-acertos", totalAcertos);
  } else {
    erros++;
    totalErros++;
    filaErros.push(ordemBloco[pos]);
    localStorage.setItem("libras-total-erros", totalErros);
  }

  atualizarContadores();
  avancar();
}

/*************************************************
 * AVANÇAR
 *************************************************/
function avancar() {
  pos++;

  if (pos >= ordemBloco.length) {
    if (filaErros.length > 0) {
      ordemBloco = ordemBloco.concat(filaErros);
      filaErros  = [];
      elTotalBloco.innerText = ordemBloco.length;
    } else {
      alert("🎉 Bloco concluído!");
      iniciarBloco(false);
      return;
    }
  }

  mostrarCard();
}

/*************************************************
 * CONTADORES
 *************************************************/
function atualizarContadores() {
  elAcertos.innerText     = acertos;
  elErros.innerText       = erros;
  elRespondidos.innerText = acertos + erros;

  document.getElementById("totalAcertosGlobal").innerText = totalAcertos;
  document.getElementById("totalErrosGlobal").innerText   = totalErros;
  document.getElementById("totalGlobal").innerText        = totalAcertos + totalErros;
}

/*************************************************
 * TEMA ESCURO
 *************************************************/
const btnTema = document.getElementById("btnTema");

function aplicarTema() {
  const tema = localStorage.getItem("libras-tema") || "claro";
  document.body.classList.toggle("dark", tema === "escuro");
  btnTema.innerText = tema === "escuro" ? "☀" : "🌙";
}

btnTema.onclick = () => {
  const novo = document.body.classList.contains("dark") ? "claro" : "escuro";
  localStorage.setItem("libras-tema", novo);
  aplicarTema();
};

aplicarTema();

/*************************************************
 * SWIPE MOBILE
 *************************************************/
let xStart = null, yStart = null;

elCard.addEventListener("touchstart", e => {
  xStart = e.touches[0].clientX;
  yStart = e.touches[0].clientY;
});

elCard.addEventListener("touchend", e => {
  if (xStart === null) return;
  const dx = e.changedTouches[0].clientX - xStart;
  const dy = e.changedTouches[0].clientY - yStart;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx >  50) marcarResposta(true);
    if (dx < -50) marcarResposta(false);
  } else {
    if (dy < -50) virarCard();
  }

  xStart = yStart = null;
});
