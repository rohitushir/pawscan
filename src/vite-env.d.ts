/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DETECT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
