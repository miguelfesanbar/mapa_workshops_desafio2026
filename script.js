const API_URL = "https://script.google.com/macros/s/AKfycbyAoVMUKPBuJz-zHzeGaLaxyDrgOvDdCw06InKsBhHNjLRlvb_550lylLjw8Hgc8TlvBQ/exec";
const map = L.map("map").setView([-16.6869, -49.2648], 7);

L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


const sidebar = document.getElementById("sidebar");
const sidebarHandle = document.getElementById("sidebarHandle");
const sidebarDragArea = document.getElementById("sidebarDragArea");
const sidebarContent = document.getElementById("sidebar-content");
const searchInput = document.getElementById("searchInput");
// const clearSelectionBtn = document.getElementById("clearSelectionBtn");



let marcadorSelecionado = null;
let camadaMunicipioSelecionada = null;
let geoJsonLayer = null;

let workshopsPorCidade = {};
const marcadores = [];

const iconePadrao = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [41, 41]
});

const iconeSelecionado = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -42],
  shadowSize: [41, 41]
});

let sidebarMobileConfigurada = false;

function abrirSidebarMobile() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("collapsed");
    sidebar.classList.add("expanded");
    sidebar.style.height = `${Math.round(window.innerHeight * 0.82)}px`;
  }
}

function fecharSidebarMobile() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("expanded");
    sidebar.classList.add("collapsed");
    sidebar.style.height = "110px";
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
      sidebar.style.height = "110px";
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

  const alturaFechada = 110;
  const obterAlturaAberta = () => Math.round(window.innerHeight * 0.82);

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
  const statusNormalizado = status.toLowerCase();

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
  const statusNormalizado = status.toLowerCase();

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

function mostrarMensagemInicial() {
  mostrarTodosOsWorkshops();
}

function montarCardWorkshop(workshop, nomeCidade) {
  const classeStatus = obterClasseStatus(workshop.status);
  const inscricaoEncerrada = workshop.status.toLowerCase().includes("encerrado");
  const tituloAcao = `${workshop.universidade} - Workshop de Ideação`;

  let html = `
    <div class="workshop-card">
      <h4>${tituloAcao}</h4>
      <div class="status-badge ${classeStatus}">${workshop.status}</div>
      <div class="workshop-description">${workshop.descricao}</div>
      <div class="workshop-item"><strong>Universidade:</strong> ${workshop.universidade}</div>
      <div class="workshop-item"><strong>Município:</strong> ${nomeCidade}</div>
      <div class="workshop-item"><strong>Data:</strong> ${formatarData(workshop.data)}</div>
      <div class="workshop-item"><strong>Horário:</strong> ${workshop.horario}</div>
      <div class="workshop-item"><strong>Local:</strong> ${workshop.local}</div>
      <div class="workshop-item"><strong>Instituição:</strong> ${workshop.instituicao}</div>
  `;

  if (inscricaoEncerrada) {
    html += `<span class="workshop-link disabled">Inscrições encerradas</span>`;
  } else {
    html += `
      <a class="workshop-link" href="${workshop.linkInscricao}" target="_blank">
        Fazer inscrição
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

    const workshopsOrdenados = [...dadosCidade.workshops].sort((a, b) => {
      return obterOrdemStatus(a.status) - obterOrdemStatus(b.status);
    });

    if (workshopsOrdenados.length > 0) {
      resultados.push({
        nomeCidade,
        workshops: workshopsOrdenados
      });
    }
  }

  if (resultados.length === 0) {
    sidebarContent.innerHTML = `
      <div class="sidebar-empty">
        Nenhum workshop disponível no momento.
      </div>
    `;
    return;
  }

  const totalWorkshops = resultados.reduce((total, item) => {
    return total + item.workshops.length;
  }, 0);

  let html = `
    <div class="city-title">Todos os workshops</div>
    <div class="city-meta">
      ${totalWorkshops} workshop${totalWorkshops > 1 ? "s" : ""} disponível${totalWorkshops > 1 ? "is" : ""}
    </div>
  `;

  resultados.forEach((resultado) => {
    html += `
      <div style="margin: 18px 0 10px; font-weight: bold; color: #0f172a;">
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
  const workshopsOrdenados = [...dadosCidade.workshops].sort((a, b) => {
    return obterOrdemStatus(a.status) - obterOrdemStatus(b.status);
  });

  const quantidade = workshopsOrdenados.length;

  let html = `
    <div class="city-title">${nomeCidade}</div>
    <div class="city-meta">
      ${quantidade} workshop${quantidade > 1 ? "s" : ""} encontrado${quantidade > 1 ? "s" : ""}
    </div>
  `;

  if (quantidade === 0) {
    html += `
      <div class="sidebar-empty">
        Nenhum workshop cadastrado para este município.
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

function estiloMunicipioBase(temWorkshop) {
  return {
    color: temWorkshop ? "#047857" : "#94a3b8",
    weight: temWorkshop ? 2 : 1,
    fillColor: temWorkshop ? "#6ee7b7" : "#cbd5e1",
    fillOpacity: temWorkshop ? 0.2 : 0.08
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
  camada.setStyle(estiloMunicipioBase(temWorkshop));
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
  if (marcadorSelecionado) {
    marcadorSelecionado.setIcon(iconePadrao);
  }

  if (camadaMunicipioSelecionada) {
    const nomeAnterior = obterNomeMunicipio(camadaMunicipioSelecionada.feature);
    const temWorkshopAnterior = !!workshopsPorCidade[nomeAnterior];
    resetarMunicipio(camadaMunicipioSelecionada, temWorkshopAnterior);
  }

  marcador.setIcon(iconeSelecionado);
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
  if (marcadorSelecionado) {
    marcadorSelecionado.setIcon(iconePadrao);
    marcadorSelecionado = null;
  }

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
  const termo = textoBusca.toLowerCase().trim();

  if (termo === "") {
    mostrarTodosOsWorkshops();
    return;
  }

  const resultados = [];

  for (const nomeCidade in workshopsPorCidade) {
    const dadosCidade = workshopsPorCidade[nomeCidade];
    const cidadeCorresponde = nomeCidade.toLowerCase().includes(termo);

    const workshopsFiltrados = dadosCidade.workshops
      .filter((workshop) => {
        const universidadeCorresponde = workshop.universidade
          .toLowerCase()
          .includes(termo);

        return cidadeCorresponde || universidadeCorresponde;
      })
      .sort((a, b) => obterOrdemStatus(a.status) - obterOrdemStatus(b.status));

    if (workshopsFiltrados.length > 0) {
      resultados.push({
        nomeCidade,
        workshops: workshopsFiltrados
      });
    }
  }

  if (resultados.length === 0) {
    sidebarContent.innerHTML = `
      <div class="sidebar-empty">
        Nenhum workshop encontrado para a busca informada.
      </div>
    `;
    return;
  }

  const totalWorkshops = resultados.reduce((total, item) => {
    return total + item.workshops.length;
  }, 0);

  let html = `
    <div class="city-title">Resultado da busca</div>
    <div class="city-meta">
      ${totalWorkshops} workshop${totalWorkshops > 1 ? "s" : ""} encontrado${totalWorkshops > 1 ? "s" : ""}
    </div>
  `;

  resultados.forEach((resultado) => {
    html += `
      <div style="margin: 18px 0 10px; font-weight: bold; color: #0f172a;">
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
  const termo = textoBusca.toLowerCase().trim();

  marcadores.forEach((item) => {
    const cidadeCorresponde = item.nomeCidade.toLowerCase().includes(termo);

    const universidadeCorresponde = item.dadosCidade.workshops.some((workshop) =>
      workshop.universidade.toLowerCase().includes(termo)
    );

    const mostrarItem = termo === "" || cidadeCorresponde || universidadeCorresponde;

    if (mostrarItem) {
      if (!map.hasLayer(item.marcador)) {
        item.marcador.addTo(map);
      }

      if (item.camadaMunicipio) {
        item.camadaMunicipio.setStyle(estiloMunicipioBase(true));
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
    const dados = await resposta.json();
    workshopsPorCidade = dados;
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
        return estiloMunicipioBase(temWorkshop);
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

function criarMarcadores() {
  marcadores.forEach((item) => {
    if (map.hasLayer(item.marcador)) {
      map.removeLayer(item.marcador);
    }
  });

  marcadores.length = 0;

  for (const nomeCidade in workshopsPorCidade) {
    const dadosCidade = workshopsPorCidade[nomeCidade];

    const marcador = L.marker(dadosCidade.coordenadas, {
      icon: iconePadrao
    }).addTo(map);

    marcador.bindPopup(`<strong>${nomeCidade}</strong>`);

    const marcadorInfo = {
      nomeCidade,
      dadosCidade,
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

async function iniciarMapa() {
  mostrarCarregando();

  await carregarWorkshopsDaAPI();
  criarMarcadores();
  mostrarTodosOsWorkshops();

  setTimeout(async () => {
    await carregarGeoJSON();
  }, 100);
}

iniciarMapa();

searchInput.addEventListener("input", (event) => {
  const valor = event.target.value;

  if (valor.trim() === "") {
    limparSelecao();
    filtrarCidades("");
    return;
  }

  filtrarCidades(valor);
});

let cacheDados = "";

async function atualizarDadosSeMudou() {
  const resposta = await fetch(API_URL);
  const texto = await resposta.text();

  if (texto !== cacheDados) {
    cacheDados = texto;
    workshopsPorCidade = JSON.parse(texto);

    criarMarcadores();
    mostrarResultadosBusca(searchInput.value);
  }
}

setInterval(atualizarDadosSeMudou, 30000);

configurarSidebarMobile();

window.addEventListener("resize", () => {
  configurarEstadoInicialSidebarMobile();
});