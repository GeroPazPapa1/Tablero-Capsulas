from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
EXCEL_PATH = BASE_DIR / "capsulas.xlsx"
JSON_PATH = BASE_DIR / "data" / "capsulas.json"

FECHA_DESDE = pd.Timestamp("2026-07-07 00:00:00")
FECHA_HASTA = pd.Timestamp("2026-07-13 23:59:59")


def limpiar_texto(valor: object) -> str:
    if pd.isna(valor):
        return ""

    return str(valor).strip()


def limpiar_numero(valor: object) -> int | float | None:
    if pd.isna(valor):
        return None

    try:
        numero = float(valor)

        if numero.is_integer():
            return int(numero)

        return numero
    except (TypeError, ValueError):
        return None


def normalizar_comuna(valor: object) -> str:
    texto = limpiar_texto(valor).upper()

    if not texto:
        return "SIN COMUNA"

    if texto.startswith("COMUNA "):
        return texto

    if texto in {"1A", "1 A"}:
        return "COMUNA 1"

    try:
        numero = int(float(texto))

        if 1 <= numero <= 15:
            return f"COMUNA {numero}"
    except ValueError:
        pass

    return texto


def calcular_turno(fecha: pd.Timestamp) -> str:
    hora = fecha.hour

    if 6 <= hora < 14:
        return "Mañana"

    if 14 <= hora < 22:
        return "Tarde"

    return "Noche"


def convertir_fecha_iso(valor: object) -> str:
    fecha = pd.to_datetime(valor, errors="coerce")

    if pd.isna(fecha):
        return ""

    return fecha.isoformat()


def obtener_resultado_normalizado(fila: pd.Series) -> str:
    resultado = limpiar_texto(
        fila.get("categoria_final")
    )

    if not resultado:
        resultado = limpiar_texto(
            fila.get("cierre_texto")
        )

    if not resultado:
        resultado = limpiar_texto(
            fila.get("resultado")
        )

    if not resultado:
        resultado = "Sin especificar"

    return resultado


def main() -> None:
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(
            f"No se encontró el archivo Excel: {EXCEL_PATH}"
        )

    print(f"Leyendo: {EXCEL_PATH.name}")

    df = pd.read_excel(EXCEL_PATH)

    df.columns = [
        str(columna)
        .strip()
        .lower()
        .replace(" ", "_")
        for columna in df.columns
    ]

    columnas_requeridas = {
        "id_suceso",
        "fecha_inicio",
        "comuna",
        "resultado",
    }

    faltantes = columnas_requeridas - set(df.columns)

    if faltantes:
        raise ValueError(
            "Faltan columnas obligatorias: "
            + ", ".join(sorted(faltantes))
        )

    df["fecha_inicio"] = pd.to_datetime(
        df["fecha_inicio"],
        errors="coerce",
    )

    df = df[
        df["fecha_inicio"].between(
            FECHA_DESDE,
            FECHA_HASTA,
            inclusive="both",
        )
    ].copy()

    filtros = {
        "tipo_carta": "MANUAL",
        "origen": "GESTION COLABORATIVA",
        "tipo": "PERSONAS SIN TECHO / BAP",
        "subtipo": "ESPACIO PUBLICO",
    }

    for columna, valor_esperado in filtros.items():
        if columna in df.columns:
            df = df[
                df[columna]
                .fillna("")
                .astype(str)
                .str.strip()
                .str.upper()
                .eq(valor_esperado)
            ]

    registros: list[dict[str, object]] = []

    for _, fila in df.iterrows():
        fecha_inicio = fila["fecha_inicio"]

        turno_base = limpiar_texto(
            fila.get("turno")
        )

        turno = (
            turno_base
            if turno_base
            else calcular_turno(fecha_inicio)
        )

        comuna_base = fila.get(
            "comuna_calculada",
            fila.get("comuna"),
        )

        comuna = normalizar_comuna(comuna_base)

        resultado = obtener_resultado_normalizado(
            fila
        )

        resultado_bucket = limpiar_texto(
            fila.get("resultado_bucket")
        )

        calle = limpiar_texto(
            fila.get("calle")
        )

        altura = limpiar_numero(
            fila.get("altura")
        )

        direccion = calle

        if altura not in {None, 0}:
            direccion = f"{calle} {altura}".strip()

        registro = {
            "id_suceso": limpiar_numero(
                fila["id_suceso"]
            ),
            "fecha_inicio": convertir_fecha_iso(
                fecha_inicio
            ),
            "fecha_fin": convertir_fecha_iso(
                fila.get("fecha_fin")
            ),
            "fecha_dia": fecha_inicio.strftime(
                "%Y-%m-%d"
            ),
            "fecha_label": fecha_inicio.strftime(
                "%d/%m"
            ),
            "dia_semana": fecha_inicio.strftime(
                "%A"
            ),
            "hora": fecha_inicio.strftime(
                "%H:%M"
            ),
            "comuna": comuna,
            "turno": turno,
            "resultado": resultado,
            "resultado_bucket": resultado_bucket,
            "prioridad": limpiar_texto(
                fila.get("prioridad")
            ),
            "direccion": direccion,
            "calle": calle,
            "altura": altura,
            "agencia": limpiar_texto(
                fila.get("agencia")
            ),
            "estado": limpiar_texto(
                fila.get("estado")
            ),
        }

        registros.append(registro)

    JSON_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with JSON_PATH.open(
        "w",
        encoding="utf-8",
    ) as archivo_json:
        json.dump(
            registros,
            archivo_json,
            ensure_ascii=False,
            indent=2,
        )

    print()
    print("Conversión finalizada.")
    print(
        f"Registros exportados: {len(registros)}"
    )
    print(
        f"Archivo generado: {JSON_PATH}"
    )


if __name__ == "__main__":
    main()