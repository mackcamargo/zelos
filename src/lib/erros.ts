export function traduzErro(msg?: string): string {
  if (!msg) return "Ocorreu um erro. Tente novamente.";
  const m = msg.toLowerCase();
  
  if (m.includes("password should contain")) return "A senha precisa ter ao menos uma letra minúscula, uma maiúscula e um número.";
  if (m.includes("password should be at least")) return "A senha precisa ter no mínimo 8 caracteres.";
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("user already registered")) return "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("unable to validate email")) return "E-mail inválido.";
  if (m.includes("otp_expired") || m.includes("expired")) return "Este link expirou. Solicite um novo.";
  
  return msg;
}
