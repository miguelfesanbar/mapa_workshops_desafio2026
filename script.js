const API_URL = "https://script.google.com/macros/s/AKfycbyAoVMUKPBuJz-zHzeGaLaxyDrgOvDdCw06InKsBhHNjLRlvb_550lylLjw8Hgc8TlvBQ/exec";
const map = L.map("map").setView([-16.6869, -49.2648], 7);

L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// L.marker([-16.6869, -49.2648]).addTo(map).bindPopup("Teste Goiânia");


const sidebar = document.getElementById("sidebar");
const sidebarDragArea = document.getElementById("sidebarDragArea");
const sidebarContent = document.getElementById("sidebar-content");
const workshopSummary = document.getElementById("workshopSummary");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const locateUserBtn = document.getElementById("locateUserBtn");
const searchBar = document.querySelector(".map-search-bar");

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function atualizarVisibilidadeBotaoLimpar() {
  if (!clearSearchBtn || !searchInput) return;
  clearSearchBtn.style.display = searchInput.value.trim() ? "block" : "none";
}

let marcadorSelecionado = null;
let camadaMunicipioSelecionada = null;
let geoJsonLayer = null;
let contornoGoiasLayer = null;
let cacheDados = "";

let workshopsPorCidade = {};
const marcadores = [];

const REGIOES_CONFIG = {
  centro_leste: {
    nome: "Centro Leste",
    cor: "#fde68a",
    municipios: [
      "Abadiânia",
      "Águas Lindas de Goiás",
      "Alexânia",
      "Anápolis",
      "Bonfinópolis",
      "Campo Limpo de Goiás",
      "Cocalzinho de Goiás",
      "Corumbá de Goiás",
      "Gameleira de Goiás",
      "Goianápolis",
      "Leopoldo de Bulhões",
      "Mimoso de Goiás",
      "Nerópolis",
      "Ouro Verde de Goiás",
      "Padre Bernardo",
      "Petrolina de Goiás",
      "Pirenópolis",
      "Santo Antônio do Descoberto",
      "Silvânia",
      "Terezópolis de Goiás",
      "Vianópolis"
    ]
  },
  centro_norte: {
    nome: "Centro Norte",
    cor: "#bfdbfe",
    municipios: [
      "Adelândia",
      "Americano do Brasil",
      "Anicuns",
      "Araçu",
      "Avelinópolis",
      "Carmo do Rio Verde",
      "Damolândia",
      "Guaraíta",
      "Heitoraí",
      "Inhumas",
      "Itaberaí",
      "Itaguari",
      "Itaguaru",
      "Itapuranga",
      "Itauçu",
      "Jaraguá",
      "Jesúpolis",
      "Santa Rosa de Goiás",
      "São Francisco de Goiás",
      "São Patrício",
      "Taquaral de Goiás",
      "Uruana"
    ]
  },
  extremo_sudoeste: {
    nome: "Extremo Sudoeste",
    cor: "#c7d2fe",
    municipios: [
      "Aparecida do Rio Doce",
      "Aporé",
      "Cachoeira Alta",
      "Caçu",
      "Chapadão do Céu",
      "Itajá",
      "Itarumã",
      "Jataí",
      "Lagoa Santa",
      "Mineiros",
      "Paranaiguara",
      "Perolândia",
      "Portelândia",
      "Santa Rita do Araguaia",
      "São Simão",
      "Serranópolis"
    ]
  },
  leste: {
    nome: "Leste",
    cor: "#bbf7d0",
    municipios: [
      "Anhanguera",
      "Campo Alegre de Goiás",
      "Catalão",
      "Cidade Ocidental",
      "Cristalina",
      "Cumari",
      "Davinópolis",
      "Goiandira",
      "Ipameri",
      "Luziânia",
      "Nova Aurora",
      "Novo Gama",
      "Orizona",
      "Ouvidor",
      "Palmelo",
      "Pires do Rio",
      "Santa Cruz de Goiás",
      "Três Ranchos",
      "Urutaí",
      "Valparaíso de Goiás"
    ]
  },
  medio_norte: {
    nome: "Médio Norte",
    cor: "#fbcfe8",
    municipios: [
      "Barro Alto",
      "Campos Verdes",
      "Ceres",
      "Colinas do Sul",
      "Crixás",
      "Goianésia",
      "Guarinos",
      "Hidrolina",
      "Ipiranga de Goiás",
      "Itapaci",
      "Morro Agudo de Goiás",
      "Niquelândia",
      "Nova América",
      "Nova Glória",
      "Pilar de Goiás",
      "Rialma",
      "Rianápolis",
      "Rubiataba",
      "Santa Isabel",
      "Santa Rita do Novo Destino",
      "Santa Terezinha de Goiás",
      "São Luíz do Norte",
      "Uirapuru",
      "Uruaçu",
      "Vila Propício"
    ]
  },
  metropolitana: {
    nome: "Metropolitana",
    cor: "#fecaca",
    municipios: [
      "Abadia de Goiás",
      "Aparecida de Goiânia",
      "Aragoiânia",
      "Bela Vista de Goiás",
      "Brazabrantes",
      "Caldazinha",
      "Campestre de Goiás",
      "Caturaí",
      "Cezarina",
      "Cristianópolis",
      "Goiânia",
      "Goianira",
      "Guapó",
      "Hidrolândia",
      "Nazário",
      "Nova Veneza",
      "Palmeiras de Goiás",
      "Palminópolis",
      "Santa Bárbara de Goiás",
      "Santo Antônio de Goiás",
      "São Miguel do Passa Quatro",
      "Senador Canedo",
      "Trindade",
      "Turvânia",
      "Varjão"
    ]
  },
  nordeste: {
    nome: "Nordeste",
    cor: "#a7f3d0",
    municipios: [
      "Água Fria de Goiás",
      "Alto Paraíso de Goiás",
      "Alvorada do Norte",
      "Buritinópolis",
      "Cabeceiras",
      "Campos Belos",
      "Cavalcante",
      "Damianópolis",
      "Divinópolis de Goiás",
      "Flores de Goiás",
      "Formosa",
      "Guarani de Goiás",
      "Iaciara",
      "Mambaí",
      "Monte Alegre de Goiás",
      "Nova Roma",
      "Planaltina",
      "Posse",
      "São Domingos",
      "São João D Aliança",
      "Simolândia",
      "Sítio D Abadia",
      "Teresina de Goiás",
      "Vila Boa"
    ]
  },
  norte: {
    nome: "Norte",
    cor: "#ddd6fe",
    municipios: [
      "Alto Horizonte",
      "Amaralina",
      "Bonópolis",
      "Campinaçu",
      "Campinorte",
      "Estrela do Norte",
      "Formoso",
      "Mara Rosa",
      "Minaçu",
      "Montividiu do Norte",
      "Mutunópolis",
      "Nova Iguaçu de Goiás",
      "Novo Planalto",
      "Porangatu",
      "Santa Tereza de Goiás",
      "São Miguel do Araguaia",
      "Trombas"
    ]
  },
  oeste: {
    nome: "Oeste",
    cor: "#fdba74",
    municipios: [
      "Amorinópolis",
      "Aragarças",
      "Arenópolis",
      "Aurilândia",
      "Baliza",
      "Bom Jardim de Goiás",
      "Cachoeira de Goiás",
      "Caiapônia",
      "Córrego do Ouro",
      "Diorama",
      "Doverlândia",
      "Fazenda Nova",
      "Firminópolis",
      "Iporá",
      "Israelândia",
      "Ivolândia",
      "Moiporá",
      "Palestina de Goiás",
      "Piranhas",
      "São João da Paraúna",
      "São Luís de Montes Belos"
    ]
  },
  sudoeste: {
    nome: "Sudoeste",
    cor: "#f9a8d4",
    municipios: [
      "Acreúna",
      "Castelândia",
      "Edealina",
      "Edéia",
      "Gouvelândia",
      "Inaciolândia",
      "Indiara",
      "Jandaia",
      "Maurilândia",
      "Montividiu",
      "Paraúna",
      "Porteirão",
      "Quirinópolis",
      "Rio Verde",
      "Santa Helena de Goiás",
      "Santo Antônio da Barra",
      "Turvelândia"
    ]
  },
  sul: {
    nome: "Sul",
    cor: "#bae6fd",
    municipios: [
      "Água Limpa",
      "Aloândia",
      "Bom Jesus de Goiás",
      "Buriti Alegre",
      "Cachoeira Dourada",
      "Caldas Novas",
      "Corumbaíba",
      "Cromínia",
      "Goiatuba",
      "Itumbiara",
      "Joviânia",
      "Mairipotaba",
      "Marzagão",
      "Morrinhos",
      "Panamá",
      "Piracanjuba",
      "Pontalina",
      "Professor Jamil",
      "Rio Quente",
      "Vicentinópolis"
    ]
  },
  vale_do_araguaia: {
    nome: "Vale do Araguaia",
    cor: "#d9f99d",
    municipios: [
      "Araguapaz",
      "Aruanã",
      "Britânia",
      "Buriti de Goiás",
      "Faina",
      "Goiás",
      "Itapirapuã",
      "Jussara",
      "Matrinchã",
      "Montes Claros de Goiás",
      "Mossâmedes",
      "Mozarlândia",
      "Mundo Novo de Goiás",
      "Nova Crixás",
      "Novo Brasil",
      "Sanclerlândia",
      "Santa Fé de Goiás"
    ]
  }
};

const iconeCidade = L.divIcon({
  className: "custom-marker",
  html: `<div class="pin"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

let sidebarMobileConfigurada = false;
const ALTURA_SIDEBAR_FECHADA = 110;

function obterAlturaAbertaSidebarMobile() {
  if (!sidebar) return ALTURA_SIDEBAR_FECHADA;
  if (!searchBar) return Math.round(window.innerHeight * 0.82);

  const searchBarRect = searchBar.getBoundingClientRect();
  const espacoDisponivel = window.innerHeight - searchBarRect.bottom;

  return Math.max(ALTURA_SIDEBAR_FECHADA, Math.round(espacoDisponivel));
}

function abrirSidebarMobile() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("collapsed");
    sidebar.classList.add("expanded");
    sidebar.style.height = `${obterAlturaAbertaSidebarMobile()}px`;
  }
}

function fecharSidebarMobile() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("expanded");
    sidebar.classList.add("collapsed");
    sidebar.style.height = `${ALTURA_SIDEBAR_FECHADA}px`;
  }
}

function configurarEstadoInicialSidebarMobile() {
  if (!sidebar) return;

  if (window.innerWidth <= 768) {
    if (
      !sidebar.classList.contains("collapsed") &&
      !sidebar.classList.contains("expanded")
    ) {
      sidebar.classList.add("collapsed");
      sidebar.style.height = `${ALTURA_SIDEBAR_FECHADA}px`;
    } else if (sidebar.classList.contains("expanded")) {
      sidebar.style.height = `${obterAlturaAbertaSidebarMobile()}px`;
    }
  } else {
    sidebar.classList.remove("collapsed", "expanded", "dragging");
    sidebar.style.height = "";
  }
}

function configurarSidebarMobile() {
  if (!sidebar || !sidebarDragArea) return;

  configurarEstadoInicialSidebarMobile();

  if (sidebarMobileConfigurada) return;
  sidebarMobileConfigurada = true;

  let arrastando = false;
  let inicioY = 0;
  let alturaInicial = 0;
  let moveu = false;

  const alturaFechada = ALTURA_SIDEBAR_FECHADA;
  const obterAlturaAberta = () => obterAlturaAbertaSidebarMobile();

  function iniciarArraste(clientY) {
    if (window.innerWidth > 768) return;

    arrastando = true;
    moveu = false;
    inicioY = clientY;
    alturaInicial = sidebar.offsetHeight;
    sidebar.classList.add("dragging");
  }

  function moverArraste(clientY) {
    if (!arrastando || window.innerWidth > 768) return;

    const deslocamento = inicioY - clientY;
    if (Math.abs(deslocamento) > 5) {
      moveu = true;
    }

    let novaAltura = alturaInicial + deslocamento;
    const alturaAberta = obterAlturaAberta();

    if (novaAltura < alturaFechada) novaAltura = alturaFechada;
    if (novaAltura > alturaAberta) novaAltura = alturaAberta;

    sidebar.style.height = `${novaAltura}px`;
  }

  function finalizarArraste() {
    if (!arrastando) return;

    arrastando = false;
    sidebar.classList.remove("dragging");

    const alturaAtual = sidebar.offsetHeight;
    const alturaAberta = obterAlturaAberta();
    const pontoDeCorte = (alturaFechada + alturaAberta) / 2;

    if (alturaAtual >= pontoDeCorte) {
      abrirSidebarMobile();
    } else {
      fecharSidebarMobile();
    }
  }

  sidebarDragArea.addEventListener("pointerdown", (event) => {
    if (window.innerWidth > 768) return;

    iniciarArraste(event.clientY);
    sidebarDragArea.setPointerCapture(event.pointerId);
  });

  sidebarDragArea.addEventListener("pointermove", (event) => {
    moverArraste(event.clientY);
  });

  sidebarDragArea.addEventListener("pointerup", () => {
    const houveArraste = moveu;
    finalizarArraste();

    if (!houveArraste && window.innerWidth <= 768) {
      if (sidebar.classList.contains("collapsed")) {
        abrirSidebarMobile();
      } else {
        fecharSidebarMobile();
      }
    }
  });

  sidebarDragArea.addEventListener("pointercancel", () => {
    finalizarArraste();
  });
}

function expandirSidebarNoMobile() {
  abrirSidebarMobile();
}

function obterClasseStatus(status) {
  const statusNormalizado = normalizarTexto(status);

  if (statusNormalizado.includes("aberta")) return "aberto";
  if (
    statusNormalizado.includes("últimas vagas") ||
    statusNormalizado.includes("ultimas vagas")
  ) return "ultimas-vagas";
  if (statusNormalizado.includes("em breve")) return "em-breve";
  if (statusNormalizado.includes("encerrado")) return "encerrado";

  return "";
}

function obterOrdemStatus(status) {
  const statusNormalizado = normalizarTexto(status);

  if (statusNormalizado.includes("aberta")) return 1;
  if (
    statusNormalizado.includes("últimas vagas") ||
    statusNormalizado.includes("ultimas vagas")
  ) return 2;
  if (statusNormalizado.includes("em breve")) return 3;
  if (statusNormalizado.includes("encerrado")) return 4;

  return 99;
}

function formatarData(data) {
  if (!data) return "";

  // Caso já esteja no formato dd/mm/aaaa
  if (typeof data === "string" && data.includes("/")) {
    return data;
  }

  const dataObj = new Date(data);

  if (isNaN(dataObj.getTime())) {
    return String(data);
  }

  return dataObj.toLocaleDateString("pt-BR");
}

function converterParaDataOrdenacao(data) {
  if (!data) return null;

  if (typeof data === "string") {
    const texto = data.trim();
    const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (match) {
      const [, dia, mes, ano] = match;
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
  }

  const dataObj = new Date(data);
  return isNaN(dataObj.getTime()) ? null : dataObj;
}

function compararWorkshops(a, b) {
  const ordemStatus = obterOrdemStatus(a.status) - obterOrdemStatus(b.status);
  if (ordemStatus !== 0) return ordemStatus;

  const dataA = converterParaDataOrdenacao(a.data);
  const dataB = converterParaDataOrdenacao(b.data);

  if (dataA && dataB) return dataA - dataB;
  if (dataA) return -1;
  if (dataB) return 1;

  return 0;
}

function workshopEstaComInscricaoAberta(workshop) {
  return normalizarTexto(workshop?.status).includes("aberta");
}

function contarWorkshopsComInscricaoAberta(workshops) {
  return workshops.filter(workshopEstaComInscricaoAberta).length;
}

function atualizarResumoWorkshops(quantidade) {
  if (!workshopSummary) return;

  workshopSummary.innerHTML = `
    <strong>${quantidade}</strong>
    <span>workshop${quantidade > 1 ? "s" : ""} com inscri&ccedil;&atilde;o aberta</span>
  `;
}

function mostrarMensagemInicial() {
  mostrarTodosOsWorkshops();
}

function obterLogoWorkshop(workshop) {
  if (!workshop || typeof workshop !== "object") return "";

  return workshop.logo || "";
}

function montarCardWorkshop(workshop, nomeCidade) {
  const classeStatus = obterClasseStatus(workshop.status);
  const inscricaoEncerrada = normalizarTexto(workshop.status).includes("encerrado");
  const tituloAcao = `${workshop.universidade} - Workshop de Idea&ccedil;&atilde;o`;

  const logoWorkshop = obterLogoWorkshop(workshop);

  let html = `
    <div class="workshop-card">
      ${
        logoWorkshop
          ? `<div class="workshop-logo-wrap">
              <img src="${logoWorkshop}" alt="Logo da institui&ccedil;&atilde;o" class="workshop-logo">
            </div>`
          : ""
      }
      <h4>${tituloAcao}</h4>
      <div class="status-badge ${classeStatus}">${workshop.status}</div>
      <div class="workshop-date-highlight">
        <span class="workshop-date-icon" aria-hidden="true">&#128197;</span>
        <div class="workshop-date-content">
          <span class="workshop-date-label">Data do workshop</span>
          <strong class="workshop-date-value">${formatarData(workshop.data)}</strong>
        </div>
      </div>
      <div class="workshop-item"><strong>Hor&aacute;rio:</strong> ${workshop.horario}</div>
      <div class="workshop-item"><strong>Munic&iacute;pio:</strong> ${nomeCidade}</div>
      <div class="workshop-item"><strong>Local:</strong> ${workshop.local}</div>
      <div class="workshop-item"><strong>Institui&ccedil;&atilde;o:</strong> ${workshop.instituicao}</div>
  `;

  if (inscricaoEncerrada) {
    html += `<span class="workshop-link disabled">Inscri&ccedil;&otilde;es encerradas</span>`;
  } else {
    html += `
      <a class="workshop-link" href="${workshop.linkInscricao}" target="_blank" rel="noopener">
        Fazer inscri&ccedil;&atilde;o
      </a>
    `;
  }

  html += `</div>`;
  return html;
}

function mostrarTodosOsWorkshops() {
  const resultados = [];

  for (const nomeCidade in workshopsPorCidade) {
    const dadosCidade = workshopsPorCidade[nomeCidade];

    const workshopsOrdenados = [...dadosCidade.workshops].sort(compararWorkshops);

    if (workshopsOrdenados.length > 0) {
      resultados.push({
        nomeCidade,
        workshops: workshopsOrdenados
      });
    }
  }

  if (resultados.length === 0) {
    atualizarResumoWorkshops(0);
    sidebarContent.innerHTML = `
      <div class="sidebar-empty">
        Nenhum workshop dispon&iacute;vel no momento.
      </div>
    `;
    return;
  }

  const totalWorkshops = resultados.reduce((total, item) => {
    return total + contarWorkshopsComInscricaoAberta(item.workshops);
  }, 0);

  atualizarResumoWorkshops(totalWorkshops);

  let html = "";

  resultados.forEach((resultado) => {
    html += `
      <div class="city-section-title">
        ${resultado.nomeCidade}
      </div>
    `;

    resultado.workshops.forEach((workshop) => {
      html += montarCardWorkshop(workshop, resultado.nomeCidade);
    });
  });

  sidebarContent.innerHTML = html;
  expandirSidebarNoMobile();
}

function mostrarWorkshops(nomeCidade, dadosCidade) {
  const workshopsOrdenados = [...dadosCidade.workshops].sort(compararWorkshops);
  

  const quantidade = contarWorkshopsComInscricaoAberta(workshopsOrdenados);
  atualizarResumoWorkshops(quantidade);

let html = `
  <div class="city-header-row">
    <div class="city-title">${nomeCidade}</div>
    <button class="clear-filter-btn" data-action="clear-filter" type="button">
      Limpar
    </button>
  </div>
`;

  if (workshopsOrdenados.length === 0) {
    html += `
      <div class="sidebar-empty">
        Nenhum workshop cadastrado para este munic&iacute;pio.
      </div>
    `;
  } else {
    workshopsOrdenados.forEach((workshop) => {
      html += montarCardWorkshop(workshop, nomeCidade);
    });
  }

  sidebarContent.innerHTML = html;
  expandirSidebarNoMobile();
}

function mostrarCarregando() {
  sidebarContent.innerHTML = `
    <div class="sidebar-empty">
      Carregando workshops e mapa...
    </div>
  `;
}

function atualizarEstadoBotaoLocalizacao(ativo, texto = "Workshop perto de mim") {
  if (!locateUserBtn) return;

  locateUserBtn.disabled = ativo;
  locateUserBtn.innerHTML = `
    <span class="location-btn-icon" aria-hidden="true">&#128205;</span>
    <span>${texto}</span>
  `;
}

function mostrarMensagemLocalizacao(titulo, mensagem) {
  sidebarContent.innerHTML = `
    <div class="city-title">${titulo}</div>
    <div class="sidebar-empty">
      ${mensagem}
    </div>
  `;
  expandirSidebarNoMobile();
}

function encontrarCidadeComWorkshop(nomeMunicipio) {
  const nomeNormalizado = normalizarTexto(nomeMunicipio);
  const nomesCidades = Object.keys(workshopsPorCidade);

  const correspondenciaExata = nomesCidades.find((nomeCidade) => {
    return normalizarTexto(nomeCidade) === nomeNormalizado;
  });

  if (correspondenciaExata) {
    return correspondenciaExata;
  }

  return (
    nomesCidades.find((nomeCidade) => {
      const nomeCidadeNormalizado = normalizarTexto(nomeCidade);
      return (
        nomeCidadeNormalizado.includes(nomeNormalizado) ||
        nomeNormalizado.includes(nomeCidadeNormalizado)
      );
    }) || null
  );
}

async function obterMunicipioPorCoordenadas(latitude, longitude) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude);
  url.searchParams.set("lon", longitude);
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");

  const resposta = await fetch(url.toString(), {
    headers: {
      Accept: "application/json"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao consultar localizacao: ${resposta.status}`);
  }

  const dados = await resposta.json();
  const endereco = dados.address || {};

  return (
    endereco.city ||
    endereco.town ||
    endereco.municipality ||
    endereco.village ||
    endereco.county ||
    ""
  );
}

async function localizarWorkshopDoUsuario() {
  if (!navigator.geolocation) {
    mostrarMensagemLocalizacao(
      "Localizacao indisponivel",
      "Seu navegador nao oferece suporte a geolocalizacao."
    );
    return;
  }

  atualizarEstadoBotaoLocalizacao(true, "Localizando...");

  try {
    const posicao = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      });
    });

    const { latitude, longitude } = posicao.coords;
    const nomeMunicipio = await obterMunicipioPorCoordenadas(latitude, longitude);

    if (!nomeMunicipio) {
      mostrarMensagemLocalizacao(
        "Localizacao encontrada",
        "Nao foi possivel identificar o municipio a partir da sua localizacao."
      );
      return;
    }

    const nomeCidadeComWorkshop = encontrarCidadeComWorkshop(nomeMunicipio);

    if (!nomeCidadeComWorkshop) {
      map.setView([latitude, longitude], 9);
      mostrarMensagemLocalizacao(
        "Municipio identificado",
        `Voce esta em ${nomeMunicipio}, mas ainda nao ha workshop cadastrado para esse municipio.`
      );
      return;
    }

    const dadosCidade = workshopsPorCidade[nomeCidadeComWorkshop];
    const itemCidade = marcadores.find((item) => item.nomeCidade === nomeCidadeComWorkshop);

    if (searchInput) {
      searchInput.value = nomeCidadeComWorkshop;
      atualizarVisibilidadeBotaoLimpar();
    }

    filtrarCidades(nomeCidadeComWorkshop);

    if (itemCidade) {
      selecionarCidade(
        itemCidade.nomeCidade,
        itemCidade.dadosCidade,
        itemCidade.marcador,
        itemCidade.camadaMunicipio
      );
    } else if (dadosCidade?.coordenadas) {
      map.setView(dadosCidade.coordenadas, 8);
      mostrarWorkshops(nomeCidadeComWorkshop, dadosCidade);
    }
  } catch (erro) {
    const mensagem =
      erro?.code === 1
        ? "A permissao de localizacao foi negada."
        : erro?.code === 2
          ? "Nao foi possivel obter sua localizacao."
          : erro?.code === 3
            ? "A localizacao demorou demais para responder."
            : "Nao foi possivel localizar seu municipio agora.";

    mostrarMensagemLocalizacao("Erro de localizacao", mensagem);
  } finally {
    atualizarEstadoBotaoLocalizacao(false, "Workshop perto de mim");
  }
}

function obterMapaMunicipioParaRegiao() {
  const mapaMunicipioParaRegiao = new Map();

  Object.values(REGIOES_CONFIG).forEach((regiao) => {
    if (!regiao || !Array.isArray(regiao.municipios)) return;

    regiao.municipios.forEach((municipio) => {
      mapaMunicipioParaRegiao.set(normalizarTexto(municipio), regiao);
    });
  });

  return mapaMunicipioParaRegiao;
}

function obterRegiaoDoMunicipio(nomeMunicipio) {
  const municipiosPorRegiao = obterMapaMunicipioParaRegiao();
  return municipiosPorRegiao.get(normalizarTexto(nomeMunicipio)) || null;
}

function obterCorRegiao(nomeMunicipio) {
  const regiao = obterRegiaoDoMunicipio(nomeMunicipio);
  return regiao?.cor || null;
}

function estiloMunicipioBase(temWorkshop) {
  return estiloMunicipioPorNome("", temWorkshop);
}

function estiloMunicipioPorNome(nomeMunicipio, temWorkshop) {
  const corRegiao = obterCorRegiao(nomeMunicipio);
  const fillColor = temWorkshop
    ? "#6ee7b7"
    : corRegiao || "#cbd5e1";

  return {
    color: temWorkshop ? "#047857" : "#94a3b8",
    weight: temWorkshop ? 2 : 1,
    fillColor,
    fillOpacity: temWorkshop ? 0.22 : (corRegiao ? 0.32 : 0.08)
  };
}

function destacarMunicipio(camada) {
  camada.setStyle({
    color: "#065f46",
    weight: 3,
    fillColor: "#10b981",
    fillOpacity: 0.32
  });
}

function resetarMunicipio(camada, temWorkshop) {
  const nomeMunicipio = obterNomeMunicipio(camada.feature);
  camada.setStyle(estiloMunicipioPorNome(nomeMunicipio, temWorkshop));
}

function obterNomeMunicipio(feature) {
  return (
    feature.properties.name ||
    feature.properties.NM_MUN ||
    feature.properties.nome ||
    feature.properties.municipio ||
    ""
  );
}

function selecionarCidade(nomeCidade, dadosCidade, marcador, camadaMunicipio) {
  if (camadaMunicipioSelecionada) {
    const nomeAnterior = obterNomeMunicipio(camadaMunicipioSelecionada.feature);
    const temWorkshopAnterior = !!workshopsPorCidade[nomeAnterior];
    resetarMunicipio(camadaMunicipioSelecionada, temWorkshopAnterior);
  }

  marcadorSelecionado = marcador;

  if (camadaMunicipio) {
    destacarMunicipio(camadaMunicipio);
    camadaMunicipioSelecionada = camadaMunicipio;
    map.fitBounds(camadaMunicipio.getBounds());
  } else {
    camadaMunicipioSelecionada = null;
    map.setView(dadosCidade.coordenadas, 8);
  }

  mostrarWorkshops(nomeCidade, dadosCidade);
}

function limparSelecao() {
  marcadorSelecionado = null;

  if (camadaMunicipioSelecionada) {
    const nomeCidade = obterNomeMunicipio(camadaMunicipioSelecionada.feature);
    const temWorkshop = !!workshopsPorCidade[nomeCidade];
    resetarMunicipio(camadaMunicipioSelecionada, temWorkshop);
    camadaMunicipioSelecionada = null;
  }

  mostrarMensagemInicial();
  map.setView([-16.6869, -49.2648], 7);
}

function mostrarResultadosBusca(textoBusca) {
  const termo = normalizarTexto(textoBusca);

  if (termo === "") {
    mostrarTodosOsWorkshops();
    return;
  }

  const resultados = [];

  for (const nomeCidade in workshopsPorCidade) {
    const dadosCidade = workshopsPorCidade[nomeCidade];
    const cidadeCorresponde = normalizarTexto(nomeCidade).includes(termo);

    const workshopsFiltrados = dadosCidade.workshops
      .filter((workshop) => {
        const universidadeCorresponde = normalizarTexto(workshop.universidade).includes(termo);
        const instituicaoCorresponde = normalizarTexto(workshop.instituicao).includes(termo);
        const localCorresponde = normalizarTexto(workshop.local).includes(termo);

        return cidadeCorresponde || universidadeCorresponde || instituicaoCorresponde || localCorresponde;
      })
      .sort(compararWorkshops);

    if (workshopsFiltrados.length > 0) {
      resultados.push({
        nomeCidade,
        workshops: workshopsFiltrados
      });
    }
  }

  if (resultados.length === 0) {
    atualizarResumoWorkshops(0);
    sidebarContent.innerHTML = `
      <div class="sidebar-empty">
        Nenhum workshop encontrado para a busca informada.
      </div>
    `;
    return;
  }

  const totalWorkshops = resultados.reduce((total, item) => {
    return total + contarWorkshopsComInscricaoAberta(item.workshops);
  }, 0);

  atualizarResumoWorkshops(totalWorkshops);

  let html = `
    <div class="city-title">Resultado da busca</div>
  `;

  resultados.forEach((resultado) => {
    html += `
      <div class="city-section-title">
        ${resultado.nomeCidade}
      </div>
    `;

    resultado.workshops.forEach((workshop) => {
      html += montarCardWorkshop(workshop, resultado.nomeCidade);
    });
  });

  sidebarContent.innerHTML = html;
  expandirSidebarNoMobile();
}

function filtrarCidades(textoBusca) {
  const termo = normalizarTexto(textoBusca);

  marcadores.forEach((item) => {
    const cidadeCorresponde = normalizarTexto(item.nomeCidade).includes(termo);

    const universidadeCorresponde = item.dadosCidade.workshops.some((workshop) => {
      return [
        workshop.universidade,
        workshop.instituicao,
        workshop.local
      ].some((campo) => normalizarTexto(campo).includes(termo));
    });

    const mostrarItem = termo === "" || cidadeCorresponde || universidadeCorresponde;

    if (mostrarItem) {
      if (!map.hasLayer(item.marcador)) {
        item.marcador.addTo(map);
      }

      if (item.camadaMunicipio) {
        item.camadaMunicipio.setStyle(estiloMunicipioPorNome(item.nomeCidade, true));
      }
    } else {
      if (map.hasLayer(item.marcador)) {
        map.removeLayer(item.marcador);
      }

      if (item.camadaMunicipio) {
        item.camadaMunicipio.setStyle({
          color: "transparent",
          weight: 0,
          fillOpacity: 0
        });
      }
    }
  });

  mostrarResultadosBusca(textoBusca);
}

async function carregarWorkshopsDaAPI() {
  try {
    const resposta = await fetch(API_URL);
    const texto = await resposta.text();
    cacheDados = texto;
    workshopsPorCidade = JSON.parse(texto);

    const primeiraCidade = Object.keys(workshopsPorCidade)[0];
    const primeiroWorkshop = primeiraCidade
      ? workshopsPorCidade[primeiraCidade]?.workshops?.[0]
      : null;

  } catch (erro) {
    console.error("Erro ao carregar workshops da API:", erro);


    sidebarContent.innerHTML = `
      <div class="sidebar-empty">
        Não foi possível carregar os workshops da planilha.
      </div>
    `;
  }
}

async function carregarGeoJSON() {
  try {
    const resposta = await fetch("./dados/goias-municipios.geojson");
    const geojson = await resposta.json();

    geoJsonLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const nomeMunicipio = obterNomeMunicipio(feature);
        const temWorkshop = !!workshopsPorCidade[nomeMunicipio];
        return estiloMunicipioPorNome(nomeMunicipio, temWorkshop);
      },
      onEachFeature: (feature, layer) => {
        const nomeMunicipio = obterNomeMunicipio(feature);
        const dadosCidade = workshopsPorCidade[nomeMunicipio];
        const temWorkshop = !!dadosCidade;

        layer.on("mouseover", () => {
          if (layer !== camadaMunicipioSelecionada && temWorkshop) {
            layer.setStyle({
              fillOpacity: 0.28,
              weight: 3
            });
          }
        });

        layer.on("mouseout", () => {
          if (layer !== camadaMunicipioSelecionada) {
            resetarMunicipio(layer, temWorkshop);
          }
        });

        if (temWorkshop) {
          layer.on("click", () => {
            const itemCidade = marcadores.find((item) => item.nomeCidade === nomeMunicipio);
            if (itemCidade) {
              selecionarCidade(
                itemCidade.nomeCidade,
                itemCidade.dadosCidade,
                itemCidade.marcador,
                layer
              );
            }
          });
        }

        layer.bindPopup(`<strong>${nomeMunicipio}</strong>`);

        if (temWorkshop) {
          const itemCidade = marcadores.find((item) => item.nomeCidade === nomeMunicipio);
          if (itemCidade) {
            itemCidade.camadaMunicipio = layer;
          }
        }
      }
    }).addTo(map);
  } catch (erro) {
    console.error("Erro ao carregar GeoJSON:", erro);
  }
}

function desenharContornoGoias(geojson) {
  if (contornoGoiasLayer) {
    map.removeLayer(contornoGoiasLayer);
  }

  contornoGoiasLayer = L.geoJSON(geojson, {
    style: {
      color: "#166534",
      weight: 4,
      fill: false,
      opacity: 1
    },
    interactive: false
  }).addTo(map);

  contornoGoiasLayer.bringToFront();
}

function criarMarcadores() {
  marcadores.forEach((item) => {
    if (map.hasLayer(item.marcador)) {
      map.removeLayer(item.marcador);
    }
  });

  marcadores.length = 0;

  for (const nomeCidade in workshopsPorCidade) {
    const dadosCidade = workshopsPorCidade[nomeCidade];

    let latitude = dadosCidade.coordenadas?.[0];
    let longitude = dadosCidade.coordenadas?.[1];

    latitude = Number(latitude);
    longitude = Number(longitude);

    // Corrige coordenadas sem ponto decimal
    if (Math.abs(latitude) > 90) latitude = latitude / 10000;
    if (Math.abs(longitude) > 180) longitude = longitude / 10000;

    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn(`Coordenadas inválidas para ${nomeCidade}:`, dadosCidade);
      continue;
    }

    const coordenadasCorrigidas = [latitude, longitude];

    const marcador = L.marker(coordenadasCorrigidas, {
      icon: iconeCidade
    }).addTo(map);

    marcador.bindPopup(`<strong>${nomeCidade}</strong>`);

    const marcadorInfo = {
      nomeCidade,
      dadosCidade: {
        ...dadosCidade,
        coordenadas: coordenadasCorrigidas
      },
      marcador,
      camadaMunicipio: null
    };

    marcador.on("click", () => {
      selecionarCidade(
        marcadorInfo.nomeCidade,
        marcadorInfo.dadosCidade,
        marcadorInfo.marcador,
        marcadorInfo.camadaMunicipio
      );
    });

    marcadores.push(marcadorInfo);
  }
}

async function carregarContornoEstado() {
  const resposta = await fetch("./dados/goias-estado.geojson");
  const geojsonEstado = await resposta.json();

  L.geoJSON(geojsonEstado, {
    style: {
      color: "#166534",
      weight: 2,
      fill: "white",
      fillOpacity: 0.04,
      opacity: 1
    },
    interactive: false
  }).addTo(map).bringToFront();
}

async function iniciarMapa() {
  mostrarCarregando();

  await carregarWorkshopsDaAPI();
  criarMarcadores();
  mostrarTodosOsWorkshops();
  await carregarGeoJSON();
  await carregarContornoEstado();
}

iniciarMapa();

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    const valor = event.target.value;

    atualizarVisibilidadeBotaoLimpar();

    if (valor.trim() === "") {
      limparSelecao();
      filtrarCidades("");
      return;
    }

    filtrarCidades(valor);
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    if (!searchInput) return;

    searchInput.value = "";
    atualizarVisibilidadeBotaoLimpar();
    limparSelecao();
    filtrarCidades("");
  });
}

if (locateUserBtn) {
  locateUserBtn.addEventListener("click", () => {
    localizarWorkshopDoUsuario();
  });
}

if (sidebarContent) {
  sidebarContent.addEventListener("click", (event) => {
    const clearFilterBtn = event.target.closest('[data-action="clear-filter"]');
    if (!clearFilterBtn || !searchInput) return;

    searchInput.value = "";
    atualizarVisibilidadeBotaoLimpar();
    limparSelecao();
    filtrarCidades("");
  });
}

async function atualizarDadosSeMudou() {
  try {
    const resposta = await fetch(API_URL);
    const texto = await resposta.text();

    if (texto !== cacheDados) {
      cacheDados = texto;
      workshopsPorCidade = JSON.parse(texto);

      criarMarcadores();

      if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
        geoJsonLayer = null;
        await carregarGeoJSON();
      }

      filtrarCidades(searchInput ? searchInput.value : "");
    }
  } catch (erro) {
    console.error("Erro ao atualizar workshops:", erro);
  }
}

setInterval(atualizarDadosSeMudou, 30000);

configurarSidebarMobile();

window.addEventListener("resize", () => {
  configurarEstadoInicialSidebarMobile();
});
