const map = L.map("map").setView([-16.6869, -49.2648], 7);

L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const sidebarContent = document.getElementById("sidebar-content");
const searchInput = document.getElementById("searchInput");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");

let marcadorSelecionado = null;
let camadaMunicipioSelecionada = null;
let geoJsonLayer = null;

const marcadores = [];

const iconePadrao = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconeSelecionado = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

function mostrarMensagemInicial() {
  sidebarContent.innerHTML = `
    <div class="sidebar-empty">
      Pesquise pelo nome da cidade ou da universidade, ou clique no município correspondente no mapa para visualizar o workshop de ideação.
    </div>
  `;
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
      <div class="workshop-item"><strong>Data:</strong> ${workshop.data}</div>
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
    mostrarMensagemInicial();
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

mostrarMensagemInicial();

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

carregarGeoJSON();

searchInput.addEventListener("input", (event) => {
  filtrarCidades(event.target.value);
});

clearSelectionBtn.addEventListener("click", () => {
  searchInput.value = "";
  filtrarCidades("");
  limparSelecao();
});