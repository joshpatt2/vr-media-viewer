import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { assetManifestPlugin } from './vite-plugin-asset-manifest'

export default defineConfig({
  plugins: [basicSsl(), assetManifestPlugin()],
  server: {
    https: true,
  },
})
