import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Mesma identidade tipográfica do site institucional (Outfit nos títulos,
// Inter no corpo) — self-hosted via next/font (sem link externo ao Google
// Fonts, melhor LCP e sem layout shift). JetBrains Mono é a 3ª família do
// design system v1 (docs/design-system.md §3): códigos, datas, contadores
// e eyebrows — dá o ar "painel de missão" do produto.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Innovare Acompanhe",
  description: "Portal de acompanhamento de projetos — InnovareCode.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a href="#conteudo-principal" className="skip-link">
          Ir para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}
