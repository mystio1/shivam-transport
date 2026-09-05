/// <reference types="vite/client" />

interface ImportMetaEnv {
  /// Where "Exit to TrackMarg" in the header goes. Unset falls back to https://trackmarg.in.
  readonly VITE_TRACKMARG_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
