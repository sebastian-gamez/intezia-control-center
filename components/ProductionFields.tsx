"use client";

import {
  ESTADOS,
  ESTADO_LABEL,
  VOCES,
  PLATAFORMAS,
  PILARES,
  CTAS,
} from "@/lib/types";
import { SelectField, InputField, DateField } from "./fields";

export type MetaForm = Record<string, string>;

const ESTADO_OPTS = ESTADOS.map((s) => [s, ESTADO_LABEL[s]] as const);
const VOZ_OPTS = VOCES.map((v) => [v, v] as const);
const PILAR_OPTS = PILARES.map((p) => [p, p] as const);
const PLAT_OPTS = PLATAFORMAS.map((p) => [p, p] as const);
const CTA_OPTS = CTAS.map((c) => [c, c] as const);

/** Ficha de producción editable. Presentacional: recibe el estado y el setter. */
export default function ProductionFields({
  form,
  onField,
}: {
  form: MetaForm;
  onField: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <SelectField
        label="Estado"
        value={form.estado}
        onChange={(v) => onField("estado", v)}
        options={ESTADO_OPTS}
      />
      <SelectField
        label="Voz (en cámara)"
        value={form.voz}
        onChange={(v) => onField("voz", v)}
        options={VOZ_OPTS}
        placeholder="—"
      />
      <InputField
        label="Responsable (produce/edita)"
        value={form.responsable}
        onChange={(v) => onField("responsable", v)}
        placeholder="Productor/editor"
      />
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Pilar"
          value={form.pilar}
          onChange={(v) => onField("pilar", v)}
          options={PILAR_OPTS}
          placeholder="—"
        />
        <SelectField
          label="Plataforma"
          value={form.plataforma}
          onChange={(v) => onField("plataforma", v)}
          options={PLAT_OPTS}
          placeholder="—"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Duración"
          value={form.duracion}
          onChange={(v) => onField("duracion", v)}
          placeholder="30s"
        />
        <InputField
          label="Palabras objetivo"
          value={form.palabras_objetivo}
          onChange={(v) => onField("palabras_objetivo", v)}
          placeholder="80"
        />
      </div>
      <DateField
        label="🎥 Fecha de grabación"
        value={form.fecha_grabacion}
        onChange={(v) => onField("fecha_grabacion", v)}
      />
      <SelectField
        label="CTA"
        value={form.cta}
        onChange={(v) => onField("cta", v)}
        options={CTA_OPTS}
      />
    </div>
  );
}

/** Extrae del guion los campos editables al formato del formulario. */
export function toMetaForm(g: {
  estado: string;
  voz: string;
  plataforma: string;
  pilar: string;
  responsable: string;
  fecha_grabacion: string;
  fecha_produccion: string;
  fecha_publicacion: string;
  cta: string;
  duracion: string;
  palabras_objetivo: number | null;
}): MetaForm {
  return {
    estado: g.estado,
    voz: g.voz,
    plataforma: g.plataforma,
    pilar: g.pilar,
    responsable: g.responsable,
    fecha_grabacion: g.fecha_grabacion,
    cta: g.cta,
    duracion: g.duracion,
    palabras_objetivo:
      g.palabras_objetivo === null ? "" : String(g.palabras_objetivo),
  };
}
