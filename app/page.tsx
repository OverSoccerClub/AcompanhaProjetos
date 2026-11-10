import { redirect } from "next/navigation";

// Home pública: nada a mostrar ainda (o app não tem landing própria — o
// site institucional continua em innovarecode.com.br). Manda para /entrar.
export default function HomePage() {
  redirect("/entrar");
}
