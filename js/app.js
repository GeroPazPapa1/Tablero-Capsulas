"use strict";

const RUTA_DATOS = "./data/capsulas.json";

const elementos = {
  comunaSelect: document.querySelector("#comunaSelect"),
  totalCartas: document.querySelector("#totalCartas"),
  promedioDiario: document.querySelector("#promedioDiario"),
  cierreFrecuente: document.querySelector("#cierreFrecuente"),
  turnoFrecuente: document.querySelector("#turnoFrecuente"),
  listaCierres: document.querySelector("#listaCierres"),
  listaTurnos: document.querySelector("#listaTurnos"),
  listaComunas: document.querySelector("#listaComunas"),
  listaDias: document.querySelector("#listaDias"),
};

let registrosOriginales = [];

/**
 * Devuelve un texto limpio y seguro.
 */
function limpiarTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

/**
 * Normaliza valores como:
 * COMUNA 1, 1, 1A o comuna 1.
 */
function ordenarConteoDescendente(conteo) {
  return [...conteo.entries()].sort(
    (a, b) => b[1] - a[1],
  );
}

function escaparHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderizarCierres(registros) {
  elementos.listaCierres.innerHTML = "";

  if (registros.length === 0) {
    elementos.listaCierres.innerHTML = `
      <div class="empty-state">
        No hay cierres para la selección actual.
      </div>
    `;

    return;
  }

  const conteo = contarPorCampo(registros, "resultado");
  const cierresOrdenados = ordenarConteoDescendente(conteo);

  const maximo = cierresOrdenados[0]?.[1] || 1;

  cierresOrdenados.forEach(([nombre, cantidad]) => {
    const porcentaje = (cantidad / registros.length) * 100;
    const anchoRelativo = (cantidad / maximo) * 100;

    const fila = document.createElement("div");
    fila.className = "stat-row";

    fila.innerHTML = `
      <div class="stat-row__header">
        <span
          class="stat-row__name"
          title="${escaparHtml(nombre)}"
        >
          ${escaparHtml(nombre)}
        </span>

        <span class="stat-row__values">
          <strong class="stat-row__count">
            ${cantidad.toLocaleString("es-AR")}
          </strong>

          <span class="stat-row__percent">
            ${porcentaje.toLocaleString("es-AR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}%
          </span>
        </span>
      </div>

      <div class="stat-row__track">
        <div
          class="stat-row__bar"
          style="width: ${anchoRelativo}%"
        ></div>
      </div>
    `;

    elementos.listaCierres.appendChild(fila);
  });
}
function normalizarComuna(valor) {
  const texto = limpiarTexto(valor).toUpperCase();

  if (!texto || texto === "SIN COMUNA") {
    return "SIN COMUNA";
  }

  if (texto === "1A" || texto === "COMUNA 1A") {
    return "COMUNA 1";
  }

  if (texto.startsWith("COMUNA ")) {
    return texto;
  }

  const numero = Number.parseInt(texto, 10);

  if (Number.isInteger(numero) && numero >= 1 && numero <= 15) {
    return `COMUNA ${numero}`;
  }

  return texto;
}

/**
 * Cuenta cuántas veces aparece cada valor.
 */
function contarPorCampo(registros, campo) {
  const conteo = new Map();

  registros.forEach((registro) => {
    const valor = limpiarTexto(registro[campo]) || "Sin especificar";

    conteo.set(valor, (conteo.get(valor) || 0) + 1);
  });

  return conteo;
}

/**
 * Devuelve el elemento más frecuente de un Map.
 */
function obtenerMasFrecuente(conteo) {
  let resultado = {
    nombre: "Sin datos",
    cantidad: 0,
  };

  conteo.forEach((cantidad, nombre) => {
    if (cantidad > resultado.cantidad) {
      resultado = {
        nombre,
        cantidad,
      };
    }
  });

  return resultado;
}

/**
 * Recorta textos largos para que entren en las tarjetas.
 */
function recortarTexto(texto, maximo = 42) {
  const valor = limpiarTexto(texto);

  if (valor.length <= maximo) {
    return valor;
  }

  return `${valor.slice(0, maximo - 3)}...`;
}

/**
 * Filtra los datos según la comuna elegida.
 */
function filtrarPorComuna(registros, comunaSeleccionada) {
  if (comunaSeleccionada === "all") {
    return registros;
  }

  const comunaBuscada = `COMUNA ${comunaSeleccionada}`;

  return registros.filter(
    (registro) =>
      normalizarComuna(registro.comuna) === comunaBuscada,
  );
}

/**
 * Calcula los KPI del conjunto filtrado.
 */
function calcularIndicadores(registros) {
  const total = registros.length;

  const fechasUnicas = new Set(
    registros
      .map((registro) => limpiarTexto(registro.fecha_dia))
      .filter(Boolean),
  );

  const cantidadDias = fechasUnicas.size || 7;
  const promedioDiario = total / cantidadDias;

  const cierres = contarPorCampo(registros, "resultado");
  const cierreMasFrecuente = obtenerMasFrecuente(cierres);

  const turnos = contarPorCampo(registros, "turno");
  const turnoMasFrecuente = obtenerMasFrecuente(turnos);

  return {
    total,
    promedioDiario,
    cierreMasFrecuente,
    turnoMasFrecuente,
  };
}

/**
 * Actualiza las cuatro tarjetas KPI.
 */
function renderizarIndicadores(registros) {
  const indicadores = calcularIndicadores(registros);

  elementos.totalCartas.textContent =
    indicadores.total.toLocaleString("es-AR");

  elementos.promedioDiario.textContent =
    indicadores.promedioDiario.toLocaleString("es-AR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  elementos.cierreFrecuente.textContent =
    indicadores.total > 0
      ? recortarTexto(indicadores.cierreMasFrecuente.nombre)
      : "Sin datos";

  elementos.cierreFrecuente.title =
    indicadores.cierreMasFrecuente.nombre;

  elementos.turnoFrecuente.textContent =
    indicadores.total > 0
      ? indicadores.turnoMasFrecuente.nombre
      : "Sin datos";
}

/**
 * Actualiza todo el dashboard según la selección actual.
 */
function actualizarDashboard() {
  const comunaSeleccionada = elementos.comunaSelect.value;

  const registrosFiltrados = filtrarPorComuna(
    registrosOriginales,
    comunaSeleccionada,
  );

  renderizarIndicadores(registrosFiltrados);
  renderizarCierres(registrosFiltrados);
  renderizarTurnos(registrosFiltrados);
  renderizarComunas(registrosFiltrados);
  renderizarDias(registrosFiltrados);
  
  console.log({
    comunaSeleccionada,
    registrosMostrados: registrosFiltrados.length,
  });
}



function renderizarTurnos(registros) {

  elementos.listaTurnos.innerHTML = "";

  if (registros.length === 0) {
    elementos.listaTurnos.innerHTML = `
      <div class="empty-state">
        No hay datos.
      </div>
    `;
    return;
  }

  const conteo = contarPorCampo(registros, "turno");
  const turnos = ordenarConteoDescendente(conteo);

  const maximo = turnos[0][1];

  turnos.forEach(([nombre, cantidad]) => {

    const porcentaje = cantidad * 100 / registros.length;
    const ancho = cantidad * 100 / maximo;

    elementos.listaTurnos.innerHTML += `
      <div class="stat-row">

        <div class="stat-row__header">

          <span class="stat-row__name">
            ${nombre}
          </span>

          <span class="stat-row__values">

            <strong class="stat-row__count">
              ${cantidad}
            </strong>

            <span class="stat-row__percent">
              ${porcentaje.toFixed(1)}%
            </span>

          </span>

        </div>

        <div class="stat-row__track">

          <div
            class="stat-row__bar"
            style="width:${ancho}%"
          ></div>

        </div>

      </div>
    `;

  });

}

function renderizarComunas(registros) {

  elementos.listaComunas.innerHTML = "";

  if (registros.length === 0) {

    elementos.listaComunas.innerHTML = `
      <div class="empty-state">
        No hay datos.
      </div>
    `;

    return;
  }

  const conteo = contarPorCampo(registros, "comuna");

  const comunas = ordenarConteoDescendente(conteo);

  const maximo = comunas[0][1];

  comunas.forEach(([nombre, cantidad]) => {

    const porcentaje = cantidad * 100 / registros.length;
    const ancho = cantidad * 100 / maximo;

    elementos.listaComunas.innerHTML += `

      <div class="stat-row">

        <div class="stat-row__header">

          <span class="stat-row__name">
            ${nombre}
          </span>

          <span class="stat-row__values">

            <strong class="stat-row__count">
              ${cantidad}
            </strong>

            <span class="stat-row__percent">
              ${porcentaje.toFixed(1)}%
            </span>

          </span>

        </div>

        <div class="stat-row__track">

          <div
            class="stat-row__bar"
            style="width:${ancho}%"
          ></div>

        </div>

      </div>

    `;

  });

}

function renderizarDias(registros) {

  elementos.listaDias.innerHTML = "";

  if (registros.length === 0) {

    elementos.listaDias.innerHTML = `
      <div class="empty-state">
        No hay datos.
      </div>
    `;

    return;
  }

  const conteo = contarPorCampo(
    registros,
    "fecha_label"
  );

  const dias = [...conteo.entries()].sort((a, b) => {

    const [da, ma] = a[0].split("/");
    const [db, mb] = b[0].split("/");

    return new Date(2026, ma - 1, da)
      - new Date(2026, mb - 1, db);

  });

  const maximo = Math.max(
    ...dias.map(d => d[1])
  );

  dias.forEach(([dia, cantidad]) => {

    const porcentaje =
      cantidad * 100 / registros.length;

    const ancho =
      cantidad * 100 / maximo;

    elementos.listaDias.innerHTML += `

      <div class="stat-row">

        <div class="stat-row__header">

          <span class="stat-row__name">
            ${dia}
          </span>

          <span class="stat-row__values">

            <strong class="stat-row__count">
              ${cantidad}
            </strong>

            <span class="stat-row__percent">
              ${porcentaje.toFixed(1)}%
            </span>

          </span>

        </div>

        <div class="stat-row__track">

          <div
            class="stat-row__bar"
            style="width:${ancho}%"
          ></div>

        </div>

      </div>

    `;

  });

}

/**
 * Carga el JSON generado desde Excel.
 */
async function cargarDatos() {
  const respuesta = await fetch(RUTA_DATOS, {
    cache: "no-store",
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar ${RUTA_DATOS}. Código: ${respuesta.status}`,
    );
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos)) {
    throw new Error(
      "El archivo capsulas.json no contiene una lista de registros.",
    );
  }

  registrosOriginales = datos.map((registro) => ({
    ...registro,
    comuna: normalizarComuna(registro.comuna),
  }));

  console.log(
    `Registros cargados correctamente: ${registrosOriginales.length}`,
  );

  actualizarDashboard();
}

/**
 * Muestra un error visible en las tarjetas.
 */
function mostrarError(error) {
  console.error(error);

  elementos.totalCartas.textContent = "Error";
  elementos.promedioDiario.textContent = "Error";
  elementos.cierreFrecuente.textContent =
    "No se pudieron cargar los datos";
  elementos.turnoFrecuente.textContent = "Sin datos";
}

/**
 * Inicializa eventos y carga la información.
 */
async function iniciarDashboard() {
  elementos.comunaSelect.addEventListener(
    "change",
    actualizarDashboard,
  );

  try {
    await cargarDatos();
  } catch (error) {
    mostrarError(error);
  }
}

document.addEventListener(
  "DOMContentLoaded",
  iniciarDashboard,
);