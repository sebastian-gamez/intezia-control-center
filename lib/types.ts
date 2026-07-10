// Modelo de datos del guion (refleja el frontmatter de los .md de la fábrica)

// El proceso en esta app llega hasta "grabado"; edición/publicación se llevan por otro lado.
export const ESTADOS = [
  "idea",
  "borrador",
  "aprobado",
  "por_grabar",
  "grabado",
] as const;
export type Estado = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<Estado, string> = {
  idea: "💡 Idea",
  borrador: "📝 Borrador",
  aprobado: "✅ Aprobado",
  por_grabar: "🎥 Por grabar",
  grabado: "🔴 Grabado",
};

// Columnas del tablero (excluye idea, que es backlog)
export const KANBAN_ESTADOS: Estado[] = [
  "borrador",
  "aprobado",
  "por_grabar",
  "grabado",
];

export const PILARES = [
  "casos",
  "herramientas",
  "noticias",
  "mitos",
  "datos",
  "liderazgo",
] as const;
export type Pilar = (typeof PILARES)[number];

export const PILAR_LABEL: Record<string, string> = {
  casos: "Casos de uso",
  herramientas: "Herramientas",
  noticias: "Noticias",
  mitos: "Mitos y criterio",
  datos: "Datos y tendencias",
  liderazgo: "Adopción y liderazgo",
};

export const VOCES = ["CEO", "COO", "CMO", "colaborador"] as const;
export const PLATAFORMAS = [
  "IG",
  "TikTok",
  "YouTube Shorts",
  "LinkedIn",
] as const;
export const CTAS = ["valor", "nudge-suave"] as const;

export interface Metricas {
  views?: number | null;
  saves?: number | null;
  shares?: number | null;
}

export interface Guion {
  slug: string; // nombre de archivo sin .md
  titulo: string;
  estado: Estado;
  pilar: string;
  voz: string; // ejecutivo EN CÁMARA
  plataforma: string;
  formato: string;
  duracion: string;
  persona_audiencia: string;
  fuente: string;
  insight: string;
  responsable: string; // productor/editor
  fecha_grabacion: string;
  fecha_produccion: string;
  fecha_publicacion: string;
  cta: string;
  metricas: Metricas;
  pipeline: string;
  tags: string[];
  cuerpo: string; // markdown sin frontmatter
}

// Campos de metadatos editables desde la app
export type GuionPatch = Partial<
  Pick<
    Guion,
    | "estado"
    | "voz"
    | "plataforma"
    | "pilar"
    | "responsable"
    | "fecha_grabacion"
    | "fecha_produccion"
    | "fecha_publicacion"
    | "cta"
    | "duracion"
    | "persona_audiencia"
  >
>;
