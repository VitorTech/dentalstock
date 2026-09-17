/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // O cabeçalho "X-Powered-By: Next.js" só informa a stack a quem procura
  // alvo. Removê-lo não é defesa por si só, mas não há motivo para anunciar.
  poweredByHeader: false,

  experimental: {
    // Importar de "lucide-react" carrega o índice do pacote inteiro; com isto
    // o Next reescreve para o caminho de cada ícone usado, e só eles entram no
    // pacote enviado ao navegador.
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;
