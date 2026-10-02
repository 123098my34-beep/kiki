/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PADDLE_PUBLIC_KEY?: string;
  readonly VITE_PADDLE_PRICE_ID_PRO?: string;
  readonly VITE_GUMROAD_PRODUCT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
