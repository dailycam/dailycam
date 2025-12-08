/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_PORTONE_MERCHANT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

