import { 
  Profile, Aluno, PapelUsuario, TipoAvatar, Categoria, Exercicio, 
  TemplateTreino, TemplateExercicio, Checkin, Habito, HabitoRegistro, 
  Conquista, AlunoConquista, RecordePessoal, FotoProgresso, AnguloFoto, 
  PlanoAlimentar, RegistroNutricao, RegistroHidratacao, SessaoBemEstar, 
  ConteudoEducativo, Agendamento, ResumoBemEstar, Treino, TreinoExercicio 
} from '../types';

// Mock values for video placeholders
const V_BENCH = "data:video/mp4;base64,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AAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAAP93bWRhdAAAAq0GBf//qdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0xIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTIgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MCBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTAgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9MCB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTEga2V5aW50PTI1MCBrZXlpbnRfbWluPTI0IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9MTAgcmM9Y3JmIG1idHJlZT0xIGNyZj0zMC4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAdw2WIhAAr/5QBqWofAoz+2mvvArlebAUaR4jc7obEArNlAhCfNjoqAQS+/110D4ySJjbetGzucMV9SXVsWcNZ4QwHTTLjx7uHEIT65yOZqTlxTigT8E8ZzfV8eAr422eXAzlrcf125oJp3uY+O6ohOZIbLZT4XGUPSqu+e9CNi9MDyxZDpIWX/y3JXi+h2VWw1Y+KOf9LcQrUtvkEGgaaWeReR2GbTkR9/RpaDnWlevumM1gY7midPGAxZhaSYUo67AvKPLkMoVmSeoXP0WR5c+jmBN1HvJfman8VWR/R+7mu7Rc97Yii+lynyFe2LufQJW78BG4f8h4CTDTd9Y27efPUp1kevihFc2nKdWFUY+CgRe6CnBxmnDz2eypE/ASAW9VKyei1i4vdeMI2MvmROyBMbQpevzU0Z+J6HzsB06dwRC/pQDVcutb2nWfLvO6xwz0t/P+ZmrQbVnle5oaAzlR84pSHnLf+Uylrv+t/e022WLsV3ZQji5nFEdHMcvAE2Tq8w68xOoThaRfPYNh8Nyh9XZpPL2cVLcWU54Ksnp7lXIb0MYc10OR9Xzk8aJco4XXdIdeqYuR7xRgVPkfWB2H7PqQ9uqx8a31BjZw+GqDrguOmbvPWmZauFTvW6XdJKMERkaNeEYAo6qGzqq7gTLd2+0J5CGIr/9utLslMePaGL9jfcFbNjWOfZQT14ER3//83uLsjtjSOdeoLBrXNxL6UzbjRkBAuAri9z7+6dYtA3LvuGIWiBnF6cYwkf62jD2OJeeESl8QPdrNyhLEkjVwFqdPWekFIc6GyMRVkOwT34+YiY6I5ST4Anx3z/dYL5RON1uP6cG0udZETltwDxMovAybD/FRqHf7OjmOLC0ZEsfrBJ+3mevild3NJJQrnloknjoyVWDZwErXA1+3JW1hh+INpFpjQXUlqo4VTUmwiQzudlqFCeoMofBdZf7bwgl5QqhVJPdM0hUy6ze5sZ+tEyjkCzjG5nqjJR3bZDXgNmiAJ7j3qUAIxwe34kihjDqyDGxbIMM768oM+hiENMMu52uH62Fuo4NfBBs8fdiheKnGD5O5wvJ928AsK88bvRiqugYJ9t4yj5OzTkXFnBgBYuF3ro+t1FOtkJmeQnOUZaCca41d/ndMWbwEWslt55fRbPEhWsQCs0whHyrTTwx8slBQ8Ay36QHrS1yBmXMCGRXgZEvBMUK3ylb51xLYaZ5EV8SXW6RVxsBxxxKdToMvsdCHbXNqyYFisjIRRphPzpSDoUq9vSInD4WY97IBMLBXTX5MExetnKHw4o4+dg8w0/JQVHBcOBZ8PZb9zRdf0y0katqrDR9Yn9X+yiAdxFdQAP84WMZET1RiFmGg28MBQ4FXrw1QR8HTYsZJ4TguV8qiIAAACnx4x+BAAAAygGft0T/AAKEBrWcsf/p9Ldln9FAMXa47tSxafryTwOaFmuAOq2loGKVZlDJHreYAfru8zvxDR7acu1Xu6jDhlUO0JojI1uIyKKMmcHTIVRkkKrvBplbGmTX1sctpcpyDlCadwYGjmj92xC8ulAIq8jWM78ZT/3f2rXBfjTnBvNOWGXHa1QSVcJxNu2fETFZQwfoqE4Ve/mcQbT9PFBRDPuWVF7RJlMLBX0MbEcwZzC5L+ymAPcJ9r/aBWQm8a+fAq3UAJn/iCV1G0EAAAfbQZu8NExG/7w7uRaA5ASI6Zv/ReN1ygqpnEpKwJvHPUxzTEM4tc5PRMek5poZBiI5jzhE7NFg4fdU5Co97Lml/FIHZVLBc5vtmF24wXJfh71L0YSg0yQnHTRLmN32wCdgygvCGJMgc3bDADc70Lm2qKhNVYOjN611QGg93SSj1KhkEWpegypHYq0DbNuHLrdPa3u5sIPWexDp2qtee1Mtu+D5N/jJZJObVs6jIJ90ou5/@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";
const V_SQUAT = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAeibW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAD6AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAABsx0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAeAAAANWAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAA+gAAAEAAABAAAAAAZEbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAAwABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAF721pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAABa9zdGJsAAAAr3N0c2QAAAAAAAAAAQAAAJ9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAeADVgBIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAe/+EAGWdkAB6s2UHgbfmhAAADAAEAAAMAMA8WLZYBAAVo74RywP34+AAAAAAUYnRydAAAAAAAAf7eAAH+3gAAABhzdHRzAAAAAAAAAAEAAABgAAACAAAAABRzdHNzAAAAAAAAAAEAAAABAAADCGN0dHMAAAAAAAAAXwAAAAEAAAQAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAgAAAAAAgAAAgAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAGAAAAABAAABlHN0c3oAAAAAAAAAAAAAAGAAAB1kAAAD7gAAAOkAAAA1AAAANgAACBUAAAHqAAAAwQAAAQMAAAp3AAADLQAAAVQAAAGOAAAIKgAAAbkAAAkjAAAB2AAADQMAAAQOAAABywAAAc4AAAwRAAAC2wAAAYQAAAFcAAALPgAAAiAAAAE0AAAA/wAACUMAAAGpAAAA0QAAALgAAAVjAAAA8wAAAJwAAAB4AAAC+wAAALAAAABNAAAAfQAABRkAAAE4AAAAjwAAAMEAAAgPAAAB2wAAAMIAAADpAAAKRwAAAmQAAAENAAABTQAADMMAAAL2AAABagAAAYYAAA1lAAADMwAAAZwAAAGkAAANKAAAA6oAAAGcAAABrAAADJEAAANSAAAB0gAAAU8AAAp6AAACBwAAAOUAAADHAAAIAAAAAWsAAACcAAAAQQAAA+YAAADcAAAAFQAAABoAAAWNAAAAQgAAAEUAAAAlAAAHMAAAAHQAAABCAAAAPQAABrsAAADLAAAAIAAAACgAAAPDAAABQgAAAOgAAAAUc3RjbwAAAAAAAAABAAAH0gAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAAUuHbWRhdAAAAq0GBf//qdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0xIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTIgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MCBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTAgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9MCB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTEga2V5aW50PTI1MCBrZXlpbnRfbWluPTI0IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9MTAgcmM9Y3JmIG1idHJlZT0xIGNyZj0zMC4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAdw2WIhAAr/5QBqWofAoz+2mvvArlebAUaR4jc7obEArNlAhCfNjoqAQS+/110D4ySJjbetGzucMV9SXVsWcNZ4QwHTTLjx7uHEIT65yOZqTlxTigT8E8ZzfV8eAr422eXAzlrcf125oJp3uY+O6ohOZIbLZT4XGUPSqu+e9CNi9MDyxZDpIWX/y3JXi+h2VWw1Y+KOf9LcQrUtvkEGgaaWeReR2GbTkR9/RpaDnWlevumM1gY7midPGAxZhaSYUo67AvKPLkMoVmSeoXP0WR5c+jmBN1HvJfman8VWR/R+7mu7Rc97Yii+lynyFe2LufQJW78BG4f8h4CTDTd9Y27efPUp1kevihFc2nKdWFUY+CgRe6CnBxmnDz2eypE/ASAW9VKyei1i4vdeMI2MvmROyBMbQpevzU0Z+J6HzsB06dwRC/pQDVcutb2nWfLvO6xwz0t/P+ZmrQbVnle5oaAzlR84pSHnLf+Uylrv+t/e022WLsV3ZQji5nFEdHMcvAE2Tq8w68xOoThaRfPYNh8Nyh9XZpPL2cVLcWU54Ksnp7lXIb0MYc10OR9Xzk8aJco4XXdIdeqYuR7xRgVPkfWB2H7PqQ9uqx8a31BjZw+GqDrguOmbvPWmZauFTvW6XdJKMERkaNeEYAo6qGzqq7gTLd2+0J5CGIr/9utLslMePaGL9jfcFbNjWOfZQT14ER3//83uLsjtjSOdeoLBrXNxL6UzbjRkBAuAri9z7+6dYtA3LvuGIWiBnF6cYwkf62jD2OJeeESl8QPdrNyhLEkjVwFqdPWekFIc6GyMRVkOwT34+YiY6I5ST4Anx3z/dYL5RON1uP6cG0udZETltwDxMovAybD/FRqHf7OjmOLC0ZEsfrBJ+3mevild3NJJQrnloknjoyVWDZwErXA1+3JW1hh+INpFpjQXUlqo4VTUmwiQzudlqFCeoMofBdZf7bwgl5QqhVJPdM0hUy6ze5sZ+tEyjkCzjG5nqjJR3bZDXgNmiAJ7j3qUAIxwe34kihjDqyDGxbIMM768oM+hiENMMu52uH62Fuo4NfBBs8fdiheKnGD5O5wvJ928AsK88bvRiqugYJ9t4yj5OzTkXFnBgBYuF3ro+t1FOtkJmeQnOUZaCca41d/ndMWbwEWslt55fRbPEhWsQCs0whHyrTTwx8slBQ8Ay36QHrS1yBmXMCGRXgZEvBMUK3ylb51xLYaZ5EV8SXW6RVxsBxxxKdToMvsdCHbXNqyYFisjIRRphPzpSDoUq9vSInD4WY97IBMLBXTX5MExetnKHw4o4+dg8w0/JQVHBcOBZ8PZb9zRdf0y0katqrDR9Yn9X+yiAdxFdQAP84WMZET1RiFmGg28MBQ4FXrw1QR8HTYsZJ4TguV8qiIAAACnx4x+BAAAAygGft0T/AAKEBrWcsf/p9Ldln9FAMXa47tSxafryTwOaFmuAOq2loGKVZlDJHreYAfru8zvxDR7acu1Xu6jDhlUO0JojI1uIyKKMmcHTIVRkkKrvBplbGmTX1sctpcpyDlCadwYGjmj92xC8ulAIq8jWM78ZT/3f2rXBfjTnBvNOWGXHa1QSVcJxNu2fETFZQwfoqE4Ve/mcQbT9PFBRDPuWVF7RJlMLBX0MbEcwZzC5L+ymAPcJ9r/aBWQm8a+fAq3UAJn/iCV1G0EAAAfbQZu8NExG/7w7uRaA5ASI6Zv/ReN1ygqpnEpKwJvHPUxzTEM4tc5PRMek5poZBiI5jzhE7NFg4fdU5Co97Lml/FIHZVLBc5vtmF24wXJfh71L0YSg0yQnHTRLmN32wCdgygvCGJMgc3bDADc70Lm2qKhNVYOjN611QGg93SSj1KhkEWpegypHYq0DbNuHLrdPa3u5sIPWexDp2qtee1Mtu+D5N/jJZJObVs6jIJ90ou5/@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";

import { createClient } from '@supabase/supabase-js';

// --- LOCAL PERSISTENCE BACKEND ---
// This service now exclusively uses localStorage for data persistence.

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseUrl.trim() !== '' && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('aBcDe') &&
  supabaseAnonKey &&
  supabaseAnonKey.trim() !== '' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY'
);

// Diagnósticos solicitados
console.log('DEBUG URL:', supabaseUrl);
console.log('DEBUG KEY existe?:', !!supabaseAnonKey);
console.log('DEBUG modo demo?:', !isSupabaseConfigured);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface MockUser {
  id: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
  avatar_tipo: TipoAvatar;
  avatar_url: string | null;
  criado_em: string;
}

// Helper to load/save from localStorage
const load = (key: string, initial: any) => {
  const data = localStorage.getItem(key);
  if (data) return JSON.parse(data);
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
};

const save = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Seed initial mock data
const loadMockUsers = (): MockUser[] => load('zenite_mock_users', [
  {
    id: 'personal-demo-id',
    email: 'personal@zenite.com',
    nome: 'Rodrigo Personal',
    papel: 'personal',
    avatar_tipo: 'masculino',
    avatar_url: null,
    criado_em: new Date().toISOString()
  },
  {
    id: 'aluno-demo-id',
    email: 'aluno@zenite.com',
    nome: 'Juliana Aluna',
    papel: 'aluno',
    avatar_tipo: 'feminino',
    avatar_url: null,
    criado_em: new Date().toISOString()
  }
]);

const loadMockAlunos = (): Aluno[] => load('zenite_mock_alunos', [
  {
    id: 'student-1',
    personal_id: 'personal-demo-id',
    objetivo: 'Hipertrofia e definição muscular',
    ativo: true,
    profile: {
      id: 'student-1',
      papel: 'aluno',
      nome: 'Marcos Silva',
      avatar_url: null,
      avatar_tipo: 'masculino',
      criado_em: new Date().toISOString()
    }
  },
  {
    id: 'student-2',
    personal_id: 'personal-demo-id',
    objetivo: 'Emagrecimento e ganho de fôlego',
    ativo: true,
    profile: {
      id: 'student-2',
      papel: 'aluno',
      nome: 'Fernanda Lima',
      avatar_url: null,
      avatar_tipo: 'feminino',
      criado_em: new Date().toISOString()
    }
  }
]);

const loadMockConvites = () => load('zenite_mock_convites', [
  {
    id: 1,
    personal_id: 'personal-demo-id',
    codigo: 'ZEN-DEMO-123',
    usado: false,
    criado_em: new Date().toISOString()
  }
]);

export const authService = {
  async signUp(email: string, password: string, nome: string, papel: PapelUsuario, avatar_tipo: TipoAvatar, codigoConvite?: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome, papel, avatar_tipo, codigo_convite: codigoConvite || null }
        }
      });
      if (error) return { data: null, error };
      return { data: { user: data.user }, error: null };
    }

    // ---- MODO DEMO (localStorage) ----
    const users = loadMockUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { data: null, error: { message: 'Este email já está cadastrado.' } };
    }
    let personalIdToLink: string | null = 'personal-demo-id';
    if (papel === 'aluno' && codigoConvite) {
      const convites = loadMockConvites();
      const convite = convites.find((c: any) => c.codigo.trim().toUpperCase() === codigoConvite.trim().toUpperCase());
      if (!convite) return { data: null, error: { message: 'Código de convite inválido ou não encontrado.' } };
      if (convite.usado) return { data: null, error: { message: 'Este código de convite já foi utilizado.' } };
      personalIdToLink = convite.personal_id;
      convite.usado = true;
      save('zenite_mock_convites', convites);
    }
    const newUser: MockUser = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      email, nome, papel, avatar_tipo, avatar_url: null,
      criado_em: new Date().toISOString()
    };
    users.push(newUser);
    save('zenite_mock_users', users);
    if (papel === 'aluno') {
      const alunos = loadMockAlunos();
      alunos.push({
        id: newUser.id, personal_id: personalIdToLink, objetivo: 'Objetivo inicial', ativo: true,
        profile: { ...newUser, avatar_tipo: newUser.avatar_tipo || 'masculino' }
      });
      save('zenite_mock_alunos', alunos);
    }
    const session = { user: { id: newUser.id, email, user_metadata: { nome, papel, avatar_tipo } } };
    save('zenite_mock_session', session);
    return { data: session, error: null };
  },

  async signIn(email: string, password?: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
      if (error) return { data: null, error };
      return { data: { user: data.user }, error: null };
    }

    // ---- MODO DEMO ----
    const users = loadMockUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { data: null, error: { message: 'Usuário não encontrado.' } };
    const session = { user: { id: user.id, email: user.email, user_metadata: { nome: user.nome, papel: user.papel, avatar_tipo: user.avatar_tipo } } };
    save('zenite_mock_session', session);
    return { data: session, error: null };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      return { error };
    }
    localStorage.removeItem('zenite_mock_session');
    return { error: null };
  },

  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      return data.session?.user ?? null;
    }
    const sessionStr = localStorage.getItem('zenite_mock_session');
    if (sessionStr) return JSON.parse(sessionStr).user;
    return null;
  },

  async validarConvite(codigo: string): Promise<{ valido: boolean; personalId: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('validar_convite', { p_codigo: codigo });
      if (error) return { valido: false, personalId: null };
      return { valido: !!data, personalId: (data as string) ?? null };
    }
    const convites = loadMockConvites();
    const c = convites.find((x: any) => x.codigo.trim().toUpperCase() === codigo.trim().toUpperCase() && !x.usado);
    return { valido: !!c, personalId: c?.personal_id ?? null };
  }
};

export const dbService = {
  async getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) return { data: null, error };
      return { data: data as Profile, error: null };
    }
    const users = loadMockUsers();
    const user = users.find(u => u.id === userId);
    if (user) return { data: { ...user, avatar_tipo: user.avatar_tipo || 'masculino' } as Profile, error: null };
    return { data: null, error: { message: 'Profile not found' } };
  },

  async getAlunos(personalId: string): Promise<{ data: Aluno[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('alunos')
        .select('id, personal_id, objetivo, ativo, profile:profiles!alunos_id_fkey(id, papel, nome, avatar_url, avatar_tipo, criado_em)')
        .eq('personal_id', personalId);
      if (error) return { data: null, error };
      const mapped = (data || []).map((a: any) => ({
        id: a.id,
        personal_id: a.personal_id,
        objetivo: a.objetivo,
        ativo: a.ativo,
        profile: Array.isArray(a.profile) ? a.profile[0] : a.profile
      }));
      return { data: mapped as Aluno[], error: null };
    }
    const alunos = loadMockAlunos();
    return { data: alunos.filter(a => a.personal_id === personalId), error: null };
  },

  async updateAlunoObjetivo(alunoId: string, objetivo: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('alunos').update({ objetivo }).eq('id', alunoId).select().single();
      return { data, error };
    }
    const alunos = loadMockAlunos();
    const index = alunos.findIndex(a => a.id === alunoId);
    if (index >= 0) { alunos[index].objetivo = objetivo; save('zenite_mock_alunos', alunos); return { data: alunos[index], error: null }; }
    return { data: null, error: { message: 'Aluno não encontrado' } };
  },

  async getAlunoObjetivo(alunoId: string): Promise<{ objetivo: string | null }> {
    const alunos = loadMockAlunos();
    const found = alunos.find(a => a.id === alunoId);
    return { objetivo: found?.objetivo || 'Foco em saúde' };
  },

  async updateAlunoAtivo(alunoId: string, ativo: boolean): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('alunos').update({ ativo }).eq('id', alunoId).select().single();
      return { data, error };
    }
    const alunos = loadMockAlunos();
    const index = alunos.findIndex(a => a.id === alunoId);
    if (index >= 0) { alunos[index].ativo = ativo; save('zenite_mock_alunos', alunos); return { data: alunos[index], error: null }; }
    return { data: null, error: { message: 'Aluno não encontrado' } };
  },

  async removeAluno(alunoId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('alunos').update({ personal_id: null }).eq('id', alunoId);
      return { error };
    }
    const alunos = loadMockAlunos();
    const index = alunos.findIndex(a => a.id === alunoId);
    if (index >= 0) { alunos[index].personal_id = null; save('zenite_mock_alunos', alunos); return { error: null }; }
    return { error: { message: 'Aluno não encontrado' } };
  },

  async createConvite(personalId: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const codigo = `ZEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data, error } = await supabase
        .from('convites')
        .insert({ personal_id: personalId, codigo, usado: false })
        .select()
        .single();
      return { data, error };
    }
    const convites = loadMockConvites();
    const codigo = `ZEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newConvite = { id: Math.floor(Math.random() * 1000000), personal_id: personalId, codigo, usado: false, criado_em: new Date().toISOString() };
    convites.push(newConvite);
    save('zenite_mock_convites', convites);
    return { data: newConvite, error: null };
  },

  async getConvites(personalId: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('convites')
        .select('*')
        .eq('personal_id', personalId)
        .order('criado_em', { ascending: false });
      return { data, error };
    }
    const convites = loadMockConvites();
    return { data: convites.filter((c: any) => c.personal_id === personalId), error: null };
  },

  async getCategorias(): Promise<{ data: Categoria[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias').select('*').order('ordem', { ascending: true });
      if (error) return { data: null, error };
      return { data: data as Categoria[], error: null };
    }
    const categories = load('zenite_mock_categorias', [
      { id: 'cat-peito', slug: 'peito', nome: 'Peito', ordem: 1 },
      { id: 'cat-costas', slug: 'costas', nome: 'Costas', ordem: 2 },
      { id: 'cat-pernas', slug: 'pernas', nome: 'Pernas', ordem: 3 },
      { id: 'cat-ombros', slug: 'ombros', nome: 'Ombros', ordem: 4 },
      { id: 'cat-biceps', slug: 'biceps', nome: 'Bíceps', ordem: 5 },
      { id: 'cat-abdomen', slug: 'abdomen', nome: 'Abdômen', ordem: 6 }
    ]);
    return { data: categories, error: null };
  },

  async getAllExercicios(): Promise<{ data: Exercicio[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('exercicios').select('*').order('nome', { ascending: true });
      if (error) return { data: null, error };
      return { data: data as Exercicio[], error: null };
    }
    const exercises = load('zenite_mock_exercicios', [
      {
        id: 'ex-supino',
        nome: 'Supino Reto com Barra',
        categoria_id: 'cat-peito',
        personal_id: null,
        video_url_masc: V_BENCH,
        video_url_fem: V_BENCH,
        musculo_primario: ['Peitoral Maior'],
        musculo_secundario: ['Tríceps Braquial', 'Deltoide Anterior'],
        dicas: ['Mantenha os pés no chão']
      },
      {
        id: 'ex-agachamento',
        nome: 'Agachamento Livre com Barra',
        categoria_id: 'cat-pernas',
        personal_id: null,
        video_url_masc: V_SQUAT,
        video_url_fem: V_SQUAT,
        musculo_primario: ['Quadríceps'],
        musculo_secundario: ['Glúteo'],
        dicas: ['Apoie a barra nos trapézios']
      }
    ]);
    return { data: exercises, error: null };
  },

  async getExercicios(categoriaId: string, personalId: string | null): Promise<{ data: Exercicio[] | null; error: any }> {
    const exercises = (await this.getAllExercicios()).data || [];
    const filtered = exercises.filter((ex: any) => 
      ex.categoria_id === categoriaId && 
      (ex.personal_id === null || ex.personal_id === personalId)
    );
    return { data: filtered, error: null };
  },

  async getSignedUrl(path: string): Promise<string | null> {
    if (!path) return null;
    // Se já for uma URL completa ou data URI (mock), retorna direto
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.storage
        .from('exercicios')
        .createSignedUrl(path, 60 * 60); // válido por 1 hora
      if (error) {
        console.error('Erro ao gerar signed URL:', error);
        return null;
      }
      return data?.signedUrl ?? null;
    }
    // Modo demo: tenta recuperar blob local
    if ((window as any).__zenite_mock_videos && (window as any).__zenite_mock_videos[path]) {
      return (window as any).__zenite_mock_videos[path];
    }
    return path;
  },

  async saveExercicio(exercicio: Partial<Exercicio>): Promise<{ data: Exercicio | null; error: any }> {
    const exercises = (await this.getAllExercicios()).data || [];
    const id = exercicio.id || 'ex-' + Math.random().toString(36).substring(2, 9);
    const payload = { ...exercicio, id } as Exercicio;
    const index = exercises.findIndex((ex: any) => ex.id === id);
    if (index >= 0) {
      exercises[index] = payload;
    } else {
      exercises.push(payload);
    }
    save('zenite_mock_exercicios', exercises);
    return { data: payload, error: null };
  },

  async deleteExercicio(id: string): Promise<{ error: any }> {
    const exercises = (await this.getAllExercicios()).data || [];
    const filtered = exercises.filter((ex: any) => ex.id !== id);
    save('zenite_mock_exercicios', filtered);
    return { error: null };
  },

  async getTreinosParaAluno(alunoId: string, personalId?: string): Promise<{ data: Treino[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('treinos').select('*').eq('aluno_id', alunoId);
      // Se for o personal consultando, mostra todos (inclusive rascunho); se for o aluno, o RLS já filtra
      const { data, error } = await query.order('data_treino', { ascending: false });
      if (error) return { data: [], error };
      return { data: (data || []) as Treino[], error: null };
    }
    const treinos = load('zenite_mock_treinos', []);
    return { data: treinos.filter((t: any) => t.aluno_id === alunoId), error: null };
  },

  async getTreinoCompleto(treinoId: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: treino, error: tErr } = await supabase
        .from('treinos').select('*').eq('id', treinoId).single();
      if (tErr || !treino) return { data: null, error: tErr };

      const { data: tes, error: teErr } = await supabase
        .from('treino_exercicios')
        .select('*, exercicio:exercicios(*)')
        .eq('treino_id', treinoId)
        .order('ordem', { ascending: true });
      if (teErr) return { data: null, error: teErr };

      return { data: { ...treino, exercicios: tes || [] }, error: null };
    }
    const treinos = load('zenite_mock_treinos', []);
    const workout = treinos.find((t: any) => t.id === treinoId);
    if (!workout) return { data: null, error: { message: 'Workout not found' } };
    const workoutExercises = load('zenite_mock_treino_exercicios', []);
    const exercises = (await this.getAllExercicios()).data || [];
    const detailed = workoutExercises.filter((te: any) => te.treino_id === treinoId).map((te: any) => ({ ...te, exercicio: exercises.find((ex: any) => ex.id === te.exercicio_id) }));
    return { data: { ...workout, exercicios: detailed }, error: null };
  },

  async saveTreino(treino: any, exercicios: any[]): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      let treinoId = treino.id;
      // Cria ou atualiza o treino
      if (!treinoId) {
        const { data: novo, error: insErr } = await supabase
          .from('treinos')
          .insert({
            personal_id: treino.personal_id,
            aluno_id: treino.aluno_id,
            titulo: treino.titulo,
            data_treino: treino.data_treino,
            status: treino.status || 'rascunho'
          })
          .select()
          .single();
        if (insErr || !novo) return { data: null, error: insErr };
        treinoId = novo.id;
      } else {
        const { error: updErr } = await supabase
          .from('treinos')
          .update({
            titulo: treino.titulo,
            data_treino: treino.data_treino,
            status: treino.status || 'rascunho'
          })
          .eq('id', treinoId);
        if (updErr) return { data: null, error: updErr };
      }

      // Substitui os exercícios do treino (apaga os antigos e insere os novos)
      await supabase.from('treino_exercicios').delete().eq('treino_id', treinoId);

      if (exercicios && exercicios.length > 0) {
        const rows = exercicios.map((ex: any, idx: number) => ({
          treino_id: treinoId,
          exercicio_id: ex.exercicio_id,
          ordem: ex.ordem ?? (idx + 1),
          series: ex.series ?? 3,
          repeticoes: ex.repeticoes ?? '10',
          carga_kg: (ex.carga_kg === '' || ex.carga_kg === undefined) ? null : ex.carga_kg
        }));
        const { error: exErr } = await supabase.from('treino_exercicios').insert(rows);
        if (exErr) return { data: null, error: exErr };
      }

      return { data: { id: treinoId, ...treino }, error: null };
    }

    // ---- MODO DEMO ----
    const treinos = load('zenite_mock_treinos', []);
    const id = treino.id || 'w-' + Math.random().toString(36).substring(2, 9);
    const newTreino = { ...treino, id, criado_em: treino.criado_em || new Date().toISOString() };
    const index = treinos.findIndex((t: any) => t.id === id);
    if (index >= 0) treinos[index] = newTreino; else treinos.push(newTreino);
    save('zenite_mock_treinos', treinos);
    const workoutExercises = load('zenite_mock_treino_exercicios', []);
    const filtered = workoutExercises.filter((te: any) => te.treino_id !== id);
    const newWE = exercicios.map((ex, idx) => ({ ...ex, id: ex.id || 'te-' + Math.random().toString(36).substring(2, 9), treino_id: id, ordem: idx }));
    save('zenite_mock_treino_exercicios', [...filtered, ...newWE]);
    return { data: newTreino, error: null };
  },

  async deleteTreino(treinoId: string): Promise<{ error: any }> {
    const treinos = load('zenite_mock_treinos', []);
    save('zenite_mock_treinos', treinos.filter((t: any) => t.id !== treinoId));
    const workoutExercises = load('zenite_mock_treino_exercicios', []);
    save('zenite_mock_treino_exercicios', workoutExercises.filter((te: any) => te.treino_id !== treinoId));
    return { error: null };
  },

  async getTemplates(personalId: string): Promise<{ data: TemplateTreino[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('templates_treino')
        .select('*')
        .eq('personal_id', personalId)
        .order('criado_em', { ascending: false });
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const templates = load('zenite_mock_templates', []);
    return { data: templates.filter((t: any) => t.personal_id === personalId), error: null };
  },

  async saveTemplate(template: any, exercicios: any[]): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      let templateId = template.id;
      if (!templateId) {
        const { data: novo, error: insErr } = await supabase
          .from('templates_treino')
          .insert({
            personal_id: template.personal_id,
            titulo: template.titulo || 'Novo Modelo',
            descricao: template.descricao || null
          })
          .select()
          .single();
        if (insErr || !novo) return { data: null, error: insErr };
        templateId = novo.id;
      } else {
        const { error: updErr } = await supabase
          .from('templates_treino')
          .update({ titulo: template.titulo || 'Novo Modelo', descricao: template.descricao || null })
          .eq('id', templateId);
        if (updErr) return { data: null, error: updErr };
      }

      // Substitui os exercícios do template
      await supabase.from('template_exercicios').delete().eq('template_id', templateId);

      if (exercicios && exercicios.length > 0) {
        const rows = exercicios.map((ex: any, idx: number) => ({
          template_id: templateId,
          exercicio_id: ex.exercicio_id,
          ordem: ex.ordem ?? idx,
          series: ex.series ?? 3,
          repeticoes: ex.repeticoes ?? '10',
          carga_kg: (ex.carga_kg === '' || ex.carga_kg === undefined) ? null : ex.carga_kg
        }));
        const { error: exErr } = await supabase.from('template_exercicios').insert(rows);
        if (exErr) return { data: null, error: exErr };
      }

      return { data: { id: templateId, ...template }, error: null };
    }

    const templates = load('zenite_mock_templates', []);
    const id = template.id || Math.floor(Math.random() * 1000000);
    const newTemplate = { ...template, id, criado_em: template.criado_em || new Date().toISOString() };
    const index = templates.findIndex((t: any) => t.id === id);
    if (index >= 0) templates[index] = newTemplate; else templates.push(newTemplate);
    save('zenite_mock_templates', templates);
    const templateExercises = load('zenite_mock_template_exercicios', []);
    const filtered = templateExercises.filter((te: any) => te.template_id !== id);
    const newTE = exercicios.map((ex, idx) => ({ ...ex, id: ex.id || Math.floor(Math.random() * 1000000), template_id: id, ordem: idx }));
    save('zenite_mock_template_exercicios', [...filtered, ...newTE]);
    return { data: newTemplate, error: null };
  },

  async getTemplateCompleto(templateId: number): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: tpl, error: tErr } = await supabase
        .from('templates_treino').select('*').eq('id', templateId).single();
      if (tErr || !tpl) return { data: null, error: tErr };
      
      const { data: tes, error: teErr } = await supabase
        .from('template_exercicios')
        .select('*')
        .eq('template_id', templateId)
        .order('ordem', { ascending: true });
      if (teErr) return { data: null, error: teErr };

      const exercises = (await this.getAllExercicios()).data || [];
      const detailed = (tes || []).map((te: any) => ({
        ...te,
        exercicio: exercises.find((ex: any) => ex.id === te.exercicio_id)
      }));

      return { data: { ...tpl, exercicios: detailed }, error: null };
    }

    const templates = load('zenite_mock_templates', []);
    const template = templates.find((t: any) => t.id === templateId);
    if (!template) return { data: null, error: { message: 'Template not found' } };
    
    const templateExercises = load('zenite_mock_template_exercicios', []);
    const exercises = (await this.getAllExercicios()).data || [];
    
    const detailed = templateExercises
      .filter((te: any) => te.template_id === templateId)
      .map((te: any) => ({
        ...te,
        exercicio: exercises.find((ex: any) => ex.id === te.exercicio_id)
      }));
      
    return { data: { ...template, exercicios: detailed }, error: null };
  },

  async deleteTemplate(templateId: number): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Deleta primeiro os exercicios vinculados
      await supabase.from('template_exercicios').delete().eq('template_id', templateId);
      const { error } = await supabase.from('templates_treino').delete().eq('id', templateId);
      return { error };
    }
    const templates = load('zenite_mock_templates', []);
    save('zenite_mock_templates', templates.filter((t: any) => t.id !== templateId));
    // Deleta os exercicios mockados correspondentes
    const templateExercises = load('zenite_mock_template_exercicios', []);
    save('zenite_mock_template_exercicios', templateExercises.filter((te: any) => te.template_id !== templateId));
    return { error: null };
  },

  async getSeriesRealizadas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('series_realizadas')
        .select('*')
        .eq('aluno_id', alunoId);
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const series = load('zenite_series_realizadas', []);
    return { data: series.filter((s: any) => s.aluno_id === alunoId), error: null };
  },

  async salvarSerieRealizada(serie: any): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // upsert manual: procura série existente (mesmo treino_exercicio + numero_serie + aluno)
      const { data: existente } = await supabase
        .from('series_realizadas')
        .select('id')
        .eq('treino_exercicio_id', serie.treino_exercicio_id)
        .eq('numero_serie', serie.numero_serie)
        .eq('aluno_id', serie.aluno_id)
        .maybeSingle();

      const payload = {
        treino_exercicio_id: serie.treino_exercicio_id,
        aluno_id: serie.aluno_id,
        numero_serie: serie.numero_serie,
        carga_kg: (serie.carga_kg === '' || serie.carga_kg === undefined) ? null : serie.carga_kg,
        repeticoes: (serie.repeticoes === '' || serie.repeticoes === undefined) ? null : serie.repeticoes,
        concluida: !!serie.concluida,
        concluida_em: serie.concluida ? (serie.concluida_em || new Date().toISOString()) : null
      };

      if (existente?.id) {
        const { error } = await supabase.from('series_realizadas').update(payload).eq('id', existente.id);
        return { error };
      } else {
        const { error } = await supabase.from('series_realizadas').insert(payload);
        return { error };
      }
    }
    const series = load('zenite_series_realizadas', []);
    const key = `${serie.treino_exercicio_id}_${serie.numero_serie}`;
    const index = series.findIndex((s: any) => `${s.treino_exercicio_id}_${s.numero_serie}` === key && s.aluno_id === serie.aluno_id);
    if (index >= 0) series[index] = { ...series[index], ...serie };
    else series.push({ id: Math.random().toString(36).substring(2, 9), ...serie });
    save('zenite_series_realizadas', series);
    return { error: null };
  },

  async updateTreinoStatus(treinoId: string, status: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('treinos').update({ status }).eq('id', treinoId);
      return { error };
    }
    const treinos = load('zenite_mock_treinos', []);
    const index = treinos.findIndex((t: any) => t.id === treinoId);
    if (index >= 0) { treinos[index].status = status; save('zenite_mock_treinos', treinos); }
    return { error: null };
  },

  async getHabitos(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: habitos, error } = await supabase
        .from('habitos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('ativo', true)
        .order('criado_em', { ascending: true });
      if (error) return { data: [], error };
      const ids = (habitos || []).map((h: any) => h.id);
      let registros: any[] = [];
      if (ids.length > 0) {
        const { data: regs } = await supabase
          .from('habitos_registros')
          .select('*')
          .in('habito_id', ids);
        registros = regs || [];
      }
      const detailed = (habitos || []).map((h: any) => ({
        ...h,
        registros: registros.filter((r: any) => r.habito_id === h.id)
      }));
      return { data: detailed, error: null };
    }
    const habitos = load('zenite_habitos', []);
    const registros = load('zenite_habitos_registros', []);
    const filtered = habitos.filter((h: any) => h.aluno_id === alunoId);
    const detailed = filtered.map((h: any) => ({ ...h, registros: registros.filter((r: any) => r.habito_id === h.id) }));
    return { data: detailed, error: null };
  },

  async salvarRegistroHabito(registro: any): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: existente } = await supabase
        .from('habitos_registros')
        .select('id')
        .eq('habito_id', registro.habito_id)
        .eq('data', registro.data)
        .eq('aluno_id', registro.aluno_id)
        .maybeSingle();
      if (existente?.id) {
        const { error } = await supabase.from('habitos_registros').update({ concluido: !!registro.concluido }).eq('id', existente.id);
        return { error };
      } else {
        const { error } = await supabase.from('habitos_registros').insert({
          habito_id: registro.habito_id, aluno_id: registro.aluno_id, data: registro.data, concluido: !!registro.concluido
        });
        return { error };
      }
    }
    const registros = load('zenite_habitos_registros', []);
    const index = registros.findIndex((r: any) => r.habito_id === registro.habito_id && r.data === registro.data);
    if (index >= 0) registros[index] = { ...registros[index], ...registro };
    else registros.push({ id: Math.floor(Math.random() * 1000000), ...registro });
    save('zenite_habitos_registros', registros);
    return { error: null };
  },

  async getCheckinDaSemana(alunoId: string, semana: string): Promise<{ data: Checkin | null; error: any }> {
    const checkins = load('zenite_checkins', []);
    const found = checkins.find((c: any) => c.aluno_id === alunoId && c.semana === semana);
    return { data: found || null, error: null };
  },

  async salvarCheckin(checkin: any): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Descobre o personal do aluno (personal_id é obrigatório na tabela)
      let personalId = checkin.personal_id;
      if (!personalId) {
        const { data: alunoRow } = await supabase
          .from('alunos').select('personal_id').eq('id', checkin.aluno_id).maybeSingle();
        personalId = alunoRow?.personal_id;
      }
      if (!personalId) return { error: { message: 'Aluno não vinculado a um personal.' } };

      const semana = checkin.semana || new Date().toISOString().split('T')[0];
      const payload = {
        aluno_id: checkin.aluno_id,
        personal_id: personalId,
        semana,
        energia: checkin.energia ?? null,
        qualidade_sono: checkin.qualidade_sono ?? null,
        nivel_estresse: checkin.nivel_estresse ?? null,
        dores: checkin.dores ?? null,
        observacoes: checkin.observacoes ?? null,
        peso_kg: (checkin.peso_kg === '' || checkin.peso_kg === undefined) ? null : checkin.peso_kg
      };

      // Um check-in por semana: se já existe, atualiza; senão, cria.
      const { data: existente } = await supabase
        .from('checkins').select('id')
        .eq('aluno_id', checkin.aluno_id).eq('semana', semana).maybeSingle();

      if (existente?.id) {
        const { error } = await supabase.from('checkins').update(payload).eq('id', existente.id);
        return { error };
      } else {
        const { error } = await supabase.from('checkins').insert(payload);
        return { error };
      }
    }
    const checkins = load('zenite_checkins', []);
    checkins.push({ id: Math.floor(Math.random() * 1000000), ...checkin });
    save('zenite_checkins', checkins);
    return { error: null };
  },

  async getCheckins(alunoId: string): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('checkins').select('*')
        .eq('aluno_id', alunoId)
        .order('semana', { ascending: false });
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const checkins = load('zenite_checkins', []);
    return { data: checkins.filter((c: any) => c.aluno_id === alunoId), error: null };
  },

  async getResumoBemEstar(alunoId: string): Promise<{ data: ResumoBemEstar | null; error: any }> {
    return { 
      data: {
        indiceGeral: 85,
        nivel: 'Bom',
        detalhes: {
          treino: { valor: 4, streak: 5 },
          nutricao: { consumido: 1800, meta: 2000 },
          hidratacao: { consumido: 2500, meta: 3000 },
          sono: { nota: 8 },
          mente: { minutos: 15 },
          habitos: { concluidos: 3, total: 5 }
        },
        frase: "Seu ritmo está excelente. Continue assim!"
      } as ResumoBemEstar, 
      error: null 
    };
  },

  async getConteudoEducativo(): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('conteudos')
        .select('*')
        .eq('publicado', true)
        .order('criado_em', { ascending: false });
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const contents = load('zenite_conteudos', [
      { id: 1, titulo: 'O poder da consistência', descricao: 'Por que treinar 3x por semana vence treinar 5x por uma semana.', tipo: 'artigo', categoria: 'Geral', capa_url: null, publicado: true, criado_em: new Date().toISOString() }
    ]);
    return { data: contents, error: null };
  },

  async getAgendamentos(userId: string, papel: PapelUsuario): Promise<{ data: Agendamento[] | null; error: any }> {
    const agenda = load('zenite_agenda', []);
    const filtered = agenda.filter((a: any) => papel === 'personal' ? a.personal_id === userId : a.aluno_id === userId);
    return { data: filtered, error: null };
  },

  async salvarAgendamento(agendamento: any): Promise<{ error: any }> {
    const agenda = load('zenite_agenda', []);
    agenda.push({ id: Math.floor(Math.random() * 1000000), ...agendamento });
    save('zenite_agenda', agenda);
    return { error: null };
  },

  async updateAgendamentoStatus(id: number, status: string): Promise<{ error: any }> {
    const agenda = load('zenite_agenda', []);
    const idx = agenda.findIndex((a: any) => a.id === id);
    if (idx >= 0) {
      agenda[idx].status = status;
      save('zenite_agenda', agenda);
    }
    return { error: null };
  },

  async getMetricas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('metricas')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('registrado_em', { ascending: true });
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const metricas = load('zenite_metricas', []);
    return { data: metricas.filter((m: any) => m.aluno_id === alunoId), error: null };
  },

  async salvarMetrica(metrica: any): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('metricas').insert({
        aluno_id: metrica.aluno_id,
        personal_id: metrica.personal_id || null,
        tipo: metrica.tipo,
        valor: metrica.valor,
        unidade: metrica.unidade,
        registrado_em: metrica.registrado_em || new Date().toISOString()
      });
      return { error };
    }
    const metricas = load('zenite_metricas', []);
    metricas.push({ id: 'm-' + Math.random().toString(36).substring(2, 9), ...metrica });
    save('zenite_metricas', metricas);
    return { error: null };
  },

  async getSeriesRealizadasDetalhadas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('series_realizadas')
        .select('*, treino_exercicio:treino_exercicios(id, treino_id, exercicio_id, treino:treinos(data_treino), exercicio:exercicios(nome))')
        .eq('aluno_id', alunoId)
        .eq('concluida', true);
      if (error) return { data: [], error };
      const flat = (data || []).map((s: any) => ({
        ...s,
        treino_id: s.treino_exercicio?.treino_id ?? null,
        exercicio_id: s.treino_exercicio?.exercicio_id ?? null,
        exercicio_nome: s.treino_exercicio?.exercicio?.nome ?? 'Exercício',
        data_treino: s.treino_exercicio?.treino?.data_treino ?? null
      }));
      return { data: flat, error: null };
    }
    const series = load('zenite_series_realizadas', []);
    return { data: series.filter((s: any) => s.aluno_id === alunoId), error: null };
  },

  async saveConteudoEducativo(conteudo: any): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const payload = {
        personal_id: conteudo.personal_id,
        titulo: conteudo.titulo || 'Sem título',
        categoria: conteudo.categoria || 'Geral',
        tipo: conteudo.tipo || 'artigo',
        conteudo: conteudo.conteudo ?? conteudo.descricao ?? null,
        video_url: conteudo.video_url ?? null,
        capa_url: conteudo.capa_url ?? null,
        publicado: conteudo.publicado ?? false
      };
      if (conteudo.id && typeof conteudo.id === 'number' && conteudo.id < 1000000000000) {
        // edição de registro existente
        const { data, error } = await supabase.from('conteudos').update(payload).eq('id', conteudo.id).select().single();
        return { data, error };
      } else {
        const { data, error } = await supabase.from('conteudos').insert(payload).select().single();
        return { data, error };
      }
    }
    const contents = load('zenite_conteudos', []);
    const newC = { id: Math.floor(Math.random() * 1000000), ...conteudo };
    contents.push(newC);
    save('zenite_conteudos', contents);
    return { data: newC, error: null };
  },

  async updateExercicioVideo(id: string, field: string, path: string): Promise<{ error: any }> {
    const exercises = load('zenite_mock_exercicios', []);
    const index = exercises.findIndex((ex: any) => ex.id === id);
    if (index >= 0) {
      exercises[index][field] = path;
      save('zenite_mock_exercicios', exercises);
    }
    return { error: null };
  },

  async getExercicioById(id: string): Promise<{ data: Exercicio | null; error: any }> {
    const exercises = load('zenite_mock_exercicios', []);
    const found = exercises.find((ex: any) => ex.id === id);
    return { data: found || null, error: null };
  },

  async salvarHabito(habito: any): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Descobre o personal se não veio
      let pid = habito.personal_id;
      if (!pid) {
        const { data: al } = await supabase.from('alunos').select('personal_id').eq('id', habito.aluno_id).maybeSingle();
        pid = al?.personal_id;
      }
      if (!pid) return { error: { message: 'Aluno não vinculado a um personal.' } };
      const { error } = await supabase.from('habitos').insert({
        personal_id: pid,
        aluno_id: habito.aluno_id,
        nome: habito.nome,
        icone: habito.icone || '💧',
        meta_diaria: habito.meta_diaria || null,
        ativo: true
      });
      return { error };
    }
    const habitos = load('zenite_habitos', []);
    habitos.push({ id: Math.floor(Math.random() * 1000000), ...habito });
    save('zenite_habitos', habitos);
    return { error: null };
  },

  async desativarHabito(id: number): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('habitos').update({ ativo: false }).eq('id', id);
      return { error };
    }
    const habitos = load('zenite_habitos', []);
    const index = habitos.findIndex((h: any) => h.id === id);
    if (index >= 0) {
      habitos[index].ativo = false;
      save('zenite_habitos', habitos);
    }
    return { error: null };
  },

  async getPlanoAlimentarAtivo(alunoId: string): Promise<{ data: PlanoAlimentar | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('planos_alimentares')
        .select('*, refeicoes(*, alimentos_refeicao(*))')
        .eq('aluno_id', alunoId)
        .eq('ativo', true)
        .maybeSingle();

      if (error) return { data: null, error };
      if (!data) return { data: null, error: null };

      // Traduzir do schema do Supabase para o tipo PlanoAlimentar do Frontend
      const mappedPlano: PlanoAlimentar = {
        id: data.id,
        aluno_id: data.aluno_id,
        personal_id: data.personal_id,
        meta_calorias: data.meta_calorias,
        meta_proteina: data.meta_proteina,
        meta_carboidrato: data.meta_carbo ?? data.meta_carboidrato,
        meta_gordura: data.meta_gordura,
        ativo: data.ativo,
        criado_em: data.criado_em,
        refeicoes: (data.refeicoes || []).map((r: any) => ({
          id: r.id,
          plano_id: r.plano_id,
          nome: r.nome,
          horario: r.horario,
          ordem: r.ordem ?? 0,
          alimentos: (r.alimentos_refeicao || []).map((a: any) => ({
            id: a.id,
            refeicao_id: a.refeicao_id,
            nome: a.alimento ?? a.nome,
            quantidade: a.quantidade,
            calorias: a.calorias,
            proteina: a.proteina,
            carboidrato: a.carbo ?? a.carboidrato,
            gordura: a.gordura
          }))
        }))
      };

      // Ordenar as refeições por "ordem"
      mappedPlano.refeicoes?.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

      return { data: mappedPlano, error: null };
    }

    const planos = load('zenite_planos_alimentares', []);
    const found = planos.find((p: any) => p.aluno_id === alunoId && p.ativo);
    return { data: found || null, error: null };
  },

  async savePlanoAlimentar(plano: any): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      try {
        // 1) Desativa planos anteriores do aluno
        await supabase.from('planos_alimentares').update({ ativo: false }).eq('aluno_id', plano.aluno_id);

        // 2) Insere o novo plano e pega o id
        const { data: novoPlano, error: planoErr } = await supabase
          .from('planos_alimentares')
          .insert({
            personal_id: plano.personal_id,
            aluno_id: plano.aluno_id,
            titulo: plano.titulo || 'Plano Alimentar',
            meta_calorias: plano.meta_calorias ?? 0,
            meta_proteina: plano.meta_proteina ?? 0,
            meta_carbo: plano.meta_carbo ?? plano.meta_carboidrato ?? 0,
            meta_gordura: plano.meta_gordura ?? 0,
            ativo: true
          })
          .select()
          .single();

        if (planoErr || !novoPlano) return { error: planoErr };

        // 3) Insere refeições e alimentos
        const refeicoes = plano.refeicoes || [];
        for (let i = 0; i < refeicoes.length; i++) {
          const ref = refeicoes[i];
          const { data: novaRef, error: refErr } = await supabase
            .from('refeicoes')
            .insert({
              plano_id: novoPlano.id,
              nome: ref.nome || `Refeição ${i + 1}`,
              horario: ref.horario || null,
              ordem: ref.ordem ?? i
            })
            .select()
            .single();

          if (refErr || !novaRef) return { error: refErr };

          const alimentos = ref.alimentos || [];
          if (alimentos.length > 0) {
            const rows = alimentos.map((al: any) => ({
              refeicao_id: novaRef.id,
              alimento: al.nome ?? al.alimento ?? 'Alimento',
              quantidade: al.quantidade ?? null,
              calorias: al.calorias ?? 0,
              proteina: al.proteina ?? 0,
              carbo: al.carbo ?? al.carboidrato ?? 0,
              gordura: al.gordura ?? 0
            }));
            const { error: alErr } = await supabase.from('alimentos_refeicao').insert(rows);
            if (alErr) return { error: alErr };
          }
        }

        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    }

    // ---- MODO DEMO ----
    const planos = load('zenite_planos_alimentares', []);
    const filtered = planos.filter((p: any) => p.aluno_id !== plano.aluno_id);
    const newPlano = { ...plano, id: plano.id || 'plano-' + Math.random().toString(36).substring(2, 9), ativo: true, criado_em: new Date().toISOString() };
    filtered.push(newPlano);
    save('zenite_planos_alimentares', filtered);
    return { error: null };
  },

  async toggleHabitoRegistro(habitoId: number, alunoId: string, data: string, concluido: boolean): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: existente } = await supabase
        .from('habitos_registros')
        .select('id')
        .eq('habito_id', habitoId)
        .eq('data', data)
        .eq('aluno_id', alunoId)
        .maybeSingle();

      if (existente?.id) {
        const { error } = await supabase
          .from('habitos_registros')
          .update({ concluido })
          .eq('id', existente.id);
        return { error };
      } else {
        const { error } = await supabase
          .from('habitos_registros')
          .insert({
            habito_id: habitoId,
            aluno_id: alunoId,
            data,
            concluido
          });
        return { error };
      }
    }
    const registros = load('zenite_habitos_registros', []);
    const index = registros.findIndex((r: any) => r.habito_id === habitoId && r.data === data && r.aluno_id === alunoId);
    if (index >= 0) {
      registros[index].concluido = concluido;
    } else {
      registros.push({ id: Math.floor(Math.random() * 1000000), habito_id: habitoId, aluno_id: alunoId, data, concluido });
    }
    save('zenite_habitos_registros', registros);
    return { error: null };
  },

  async getHidratacaoHoje(alunoId: string, data?: string): Promise<{ data: any[]; error: any }> {
    const targetDate = data || new Date().toISOString().split('T')[0];
    if (isSupabaseConfigured && supabase) {
      const { data: rows, error } = await supabase
        .from('hidratacao')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('data', targetDate);
      if (error) return { data: [], error };
      return { data: rows || [], error: null };
    }
    const registros = load('zenite_hidratacao', []);
    const filtered = registros.filter((r: any) => r.aluno_id === alunoId && r.data === targetDate);
    return { data: filtered, error: null };
  },

  async getHistoricoHidratacao(alunoId: string): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: rows, error } = await supabase
        .from('hidratacao')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('data', { ascending: false });
      if (error) return { data: [], error };
      return { data: rows || [], error: null };
    }
    const registros = load('zenite_hidratacao', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async getMetaHidratacao(alunoId: string): Promise<{ data: number; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('alunos')
        .select('meta_hidratacao_ml')
        .eq('id', alunoId)
        .single();
      if (error) return { data: 2000, error };
      return { data: data?.meta_hidratacao_ml ?? 2000, error: null };
    }
    const alunos = load('zenite_mock_alunos', []);
    const al = alunos.find((a: any) => a.id === alunoId);
    return { data: al?.meta_hidratacao_ml ?? 2000, error: null };
  },

  async setMetaHidratacao(alunoId: string, metaMl: number): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('alunos')
        .update({ meta_hidratacao_ml: metaMl })
        .eq('id', alunoId);
      return { error };
    }
    const alunos = load('zenite_mock_alunos', []);
    const idx = alunos.findIndex((a: any) => a.id === alunoId);
    if (idx >= 0) { alunos[idx].meta_hidratacao_ml = metaMl; save('zenite_mock_alunos', alunos); }
    return { error: null };
  },

  async saveRegistroHidratacao(registro: any): Promise<{ data: any; error: any }> {
    const targetDate = registro.data || new Date().toISOString().split('T')[0];
    // Aceita tanto "ml" quanto "quantidade_ml" vindos do componente
    const incremento = Number(registro.ml ?? registro.quantidade_ml ?? 0) || 0;
    const metaMl = Number(registro.meta_ml) || 2000;

    if (isSupabaseConfigured && supabase) {
      // Um registro por aluno por dia: soma o incremento ao total já existente.
      const { data: existente } = await supabase
        .from('hidratacao')
        .select('id, ml, meta_ml')
        .eq('aluno_id', registro.aluno_id)
        .eq('data', targetDate)
        .maybeSingle();

      if (existente?.id) {
        const novoTotal = (Number(existente.ml) || 0) + incremento;
        const { data, error } = await supabase
          .from('hidratacao')
          .update({ ml: novoTotal, meta_ml: existente.meta_ml || metaMl })
          .eq('id', existente.id)
          .select()
          .single();
        return { data, error };
      } else {
        const { data, error } = await supabase
          .from('hidratacao')
          .insert({ aluno_id: registro.aluno_id, data: targetDate, ml: incremento, meta_ml: metaMl })
          .select()
          .single();
        return { data, error };
      }
    }

    const registros = load('zenite_hidratacao', []);
    const idx = registros.findIndex((r: any) => r.aluno_id === registro.aluno_id && r.data === targetDate);
    if (idx >= 0) {
      registros[idx].ml = (Number(registros[idx].ml) || 0) + incremento;
      save('zenite_hidratacao', registros);
      return { data: registros[idx], error: null };
    }
    const newR = { id: Math.floor(Math.random() * 1000000), aluno_id: registro.aluno_id, data: targetDate, ml: incremento, meta_ml: metaMl };
    registros.push(newR);
    save('zenite_hidratacao', registros);
    return { data: newR, error: null };
  },

  async saveSessaoBemEstar(sessao: any): Promise<{ data: any; error: any }> {
    const sessoes = load('zenite_bem_estar', []);
    const newS = { id: Math.floor(Math.random() * 1000000), ...sessao };
    sessoes.push(newS);
    save('zenite_bem_estar', sessoes);
    return { data: newS, error: null };
  },

  async getRegistrosNutricao(alunoId: string, data: string): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: rows, error } = await supabase
        .from('registro_alimentar')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('data', data)
        .order('criado_em', { ascending: true });
      if (error) return { data: [], error };
      return { data: rows || [], error: null };
    }
    const registros = load('zenite_nutricao', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId && r.data === data), error: null };
  },

  async getHistoricoCalorias(alunoId: string): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: rows, error } = await supabase
        .from('registro_alimentar')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('data', { ascending: false });
      if (error) return { data: [], error };
      return { data: rows || [], error: null };
    }
    const registros = load('zenite_nutricao', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async saveRegistroNutricao(registro: any): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('registro_alimentar').insert({
        aluno_id: registro.aluno_id,
        data: registro.data || new Date().toISOString().split('T')[0],
        refeicao: registro.refeicao || registro.tipo || 'Refeição',
        alimento: registro.alimento || registro.nome || 'Alimento',
        calorias: (registro.calorias === '' || registro.calorias === undefined) ? null : Number(registro.calorias)
      });
      return { error };
    }
    const registros = load('zenite_nutricao', []);
    registros.push({ id: Math.floor(Math.random() * 1000000), ...registro });
    save('zenite_nutricao', registros);
    return { error: null };
  },

  async getResumoBemEstarAluno(alunoId: string): Promise<{ data: ResumoBemEstar | null; error: any }> {
    return this.getResumoBemEstar(alunoId);
  },

  async getResumoAlunosPersonal(personalId: string): Promise<{ data: any[]; error: any }> {
    const alumnos = loadMockAlunos();
    const filtered = alumnos.filter(a => a.personal_id === personalId);
    const result = await Promise.all(filtered.map(async (a) => {
      const resumo = await this.getResumoBemEstar(a.id);
      return {
        alunoId: a.id,
        nome: a.profile.nome,
        avatar_tipo: a.profile.avatar_tipo,
        resumo: resumo.data
      };
    }));
    return { data: result, error: null };
  },

  async getConteudosEducativos(categoria?: string): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('conteudos').select('*').eq('publicado', true);
      if (categoria && categoria !== 'Todas') query = query.eq('categoria', categoria);
      const { data, error } = await query.order('criado_em', { ascending: false });
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const contents = load('zenite_conteudos', []);
    if (categoria && categoria !== 'Todas') return { data: contents.filter((c: any) => c.categoria === categoria), error: null };
    return { data: contents, error: null };
  },

  async getFotosProgresso(alunoId: string): Promise<{ data: FotoProgresso[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('fotos_progresso')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('registrado_em', { ascending: false });
      if (error) return { data: [], error };
      // Gera signed URL para cada foto (bucket privado)
      const withUrls = await Promise.all((data || []).map(async (f: any) => {
        let url = f.foto_url;
        if (url && !url.startsWith('http') && !url.startsWith('data:')) {
          const { data: signed } = await supabase.storage.from('zenite_fotos_progresso').createSignedUrl(url, 3600);
          url = signed?.signedUrl || f.foto_url;
        }
        return { ...f, signed_url: url, foto_url_display: url };
      }));
      return { data: withUrls, error: null };
    }
    const fotos = load('zenite_fotos_progresso', []);
    const filtered = fotos.filter((f: any) => f.aluno_id === alunoId);
    const mapped = filtered.map((f: any) => ({
      ...f,
      signed_url: f.signed_url || f.foto_url
    }));
    return { data: mapped, error: null };
  },

  async updateFotoObservacao(id: string | number, observacao: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('fotos_progresso').update({ observacao }).eq('id', id);
      return { error };
    }
    const fotos = load('zenite_fotos_progresso', []);
    const idx = fotos.findIndex((f: any) => f.id === id.toString());
    if (idx >= 0) {
      fotos[idx].observacao = observacao;
      save('zenite_fotos_progresso', fotos);
    }
    return { error: null };
  },

  async saveAgendamento(agendamento: any): Promise<{ data: any; error: any }> {
    const agenda = load('zenite_agenda', []);
    const newAgendamento = { id: Math.floor(Math.random() * 1000000), ...agendamento };
    agenda.push(newAgendamento);
    save('zenite_agenda', agenda);
    return { data: newAgendamento, error: null };
  },

  async updateStatusAgendamento(id: number | string, status: string, observacao_personal?: string, extra_param?: any): Promise<{ error: any }> {
    const agenda = load('zenite_agenda', []);
    const idx = agenda.findIndex((a: any) => a.id === (typeof id === 'string' ? parseInt(id) : id));
    if (idx >= 0) {
      agenda[idx].status = status;
      if (observacao_personal) agenda[idx].observacao_personal = observacao_personal;
      save('zenite_agenda', agenda);
    }
    return { error: null };
  },

  async deleteFotoProgresso(id: string | number): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Busca o caminho pra apagar do storage também
      const { data: foto } = await supabase.from('fotos_progresso').select('foto_url').eq('id', id).maybeSingle();
      if (foto?.foto_url && !foto.foto_url.startsWith('http') && !foto.foto_url.startsWith('data:')) {
        await supabase.storage.from('zenite_fotos_progresso').remove([foto.foto_url]);
      }
      const { error } = await supabase.from('fotos_progresso').delete().eq('id', id);
      return { error };
    }
    const fotos = load('zenite_fotos_progresso', []);
    const newFotos = fotos.filter((f: any) => f.id !== id.toString());
    save('zenite_fotos_progresso', newFotos);
    return { error: null };
  },

  async uploadFotoProgresso(alunoId: string, personalId: string | null, angulo: any, file: File | string, observacao?: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Descobre o personal se não veio
      let pid = personalId;
      if (!pid) {
        const { data: al } = await supabase.from('alunos').select('personal_id').eq('id', alunoId).maybeSingle();
        pid = al?.personal_id || null;
      }
      if (!pid) return { error: { message: 'Aluno não vinculado a um personal.' } };

      // Faz o upload do arquivo (espera um File)
      if (typeof file === 'string') return { error: { message: 'Arquivo inválido.' } };
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
      const caminho = `${alunoId}/${angulo}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('zenite_fotos_progresso')
        .upload(caminho, file, { upsert: true, cacheControl: '3600' });
      if (upErr) return { error: upErr };

      // Grava no banco
      const { error: insErr } = await supabase.from('fotos_progresso').insert({
        aluno_id: alunoId,
        personal_id: pid,
        foto_url: caminho,
        angulo,
        registrado_em: new Date().toISOString().split('T')[0],
        observacao: observacao || null
      });
      if (insErr) {
        // Se falhar a gravação no banco, tenta remover do storage pra manter a consistência
        await supabase.storage.from('zenite_fotos_progresso').remove([caminho]);
        return { error: insErr };
      }

      // Regra de negócio: máximo de 4 fotos por ângulo — ao subir a 5ª de um ângulo, apaga a mais antiga daquele ângulo
      try {
        const { data: fotosExistentes, error: getErr } = await supabase
          .from('fotos_progresso')
          .select('id, foto_url')
          .eq('aluno_id', alunoId)
          .eq('angulo', angulo)
          .order('registrado_em', { ascending: true })
          .order('id', { ascending: true });

        if (!getErr && fotosExistentes && fotosExistentes.length > 4) {
          const excedentes = fotosExistentes.slice(0, fotosExistentes.length - 4);
          for (const exc of excedentes) {
            if (exc.foto_url && !exc.foto_url.startsWith('http') && !exc.foto_url.startsWith('data:')) {
              await supabase.storage.from('zenite_fotos_progresso').remove([exc.foto_url]);
            }
            await supabase.from('fotos_progresso').delete().eq('id', exc.id);
          }
        }
      } catch (err) {
        console.error('Erro ao processar limite de fotos:', err);
      }

      return { error: null };
    }

    // Fallback Local Storage
    const fotos = load('zenite_fotos_progresso', []);
    
    // Regra de negócio: máximo de 4 fotos por ângulo
    const fotosDoAngulo = fotos.filter((f: any) => f.aluno_id === alunoId && f.angulo === angulo);
    if (fotosDoAngulo.length >= 4) {
      const ordenadas = [...fotosDoAngulo].sort((a: any, b: any) => {
        const d1 = a.registrado_em || a.data || '';
        const d2 = b.registrado_em || b.data || '';
        const dCompare = d1.localeCompare(d2);
        if (dCompare !== 0) return dCompare;
        return String(a.id).localeCompare(String(b.id));
      });
      const maisAntiga = ordenadas[0];
      const indexParaRemover = fotos.findIndex((f: any) => f.id === maisAntiga.id);
      if (indexParaRemover >= 0) {
        fotos.splice(indexParaRemover, 1);
      }
    }

    // Se file for File e não string, no mock salvamos como dataUrl ou mock string
    let mockUrl = typeof file === 'string' ? file : 'mock-url';
    if (typeof file !== 'string') {
      try {
        mockUrl = URL.createObjectURL(file);
      } catch (e) {
        mockUrl = 'mock-url';
      }
    }

    fotos.push({
      id: Math.random().toString(36).substring(2, 9),
      aluno_id: alunoId,
      personal_id: personalId || 'mock-personal',
      angulo,
      foto_url: mockUrl,
      signed_url: mockUrl,
      observacao,
      registrado_em: new Date().toISOString().split('T')[0],
      data: new Date().toISOString().split('T')[0]
    });
    save('zenite_fotos_progresso', fotos);
    return { error: null };
  },

  async checkAndSavePR(alunoId: string, exercicioId: string | number, exercicioNome: string, carga: number): Promise<{ data: any; isNewPR?: boolean; error: any }> {
    const prs = load('zenite_prs', []);
    const exIdStr = exercicioId.toString();
    const index = prs.findIndex((r: any) => r.aluno_id === alunoId && r.exercicio_id === exIdStr);
    let isNewPR = false;
    let data = null;
    if (index >= 0) {
      if (carga > prs[index].carga_maxima) {
        prs[index].carga_maxima = carga;
        prs[index].data = new Date().toISOString().split('T')[0];
        isNewPR = true;
        data = prs[index];
      }
    } else {
      const newPR = {
        id: Math.random().toString(36).substring(2, 9),
        aluno_id: alunoId,
        exercicio_id: exIdStr,
        carga_maxima: carga,
        data: new Date().toISOString().split('T')[0]
      };
      prs.push(newPR);
      isNewPR = true;
      data = newPR;
    }
    save('zenite_prs', prs);
    return { data, isNewPR, error: null };
  },

  async getConquistas(): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('conquistas').select('*').order('id', { ascending: true });
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const conquistas = load('zenite_conquistas', [
      { id: 'c1', nome: 'Iniciante', descricao: 'Primeiro treino realizado', icone: 'award', pontos: 10 },
      { id: 'c2', nome: 'Consistente', descricao: '5 treinos na semana', icone: 'flame', pontos: 50 }
    ]);
    return { data: conquistas, error: null };
  },

  async getAlunoConquistas(alunoId: string): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('aluno_conquistas')
        .select('*')
        .eq('aluno_id', alunoId);
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const registros = load('zenite_aluno_conquistas', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async getRecordesPessoais(alunoId: string): Promise<{ data: RecordePessoal[]; error: any }> {
    const prs = load('zenite_prs', []);
    return { data: prs.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async verificarConquistas(alunoId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('verificar_conquistas', { p_aluno: alunoId });
      return { error };
    }
    return { error: null };
  },

  async desbloquearConquista(alunoId: string, conquistaId: string): Promise<{ data: any; error: any }> {
    // Mantido para compatibilidade; a lógica real agora é a verificarConquistas (função do banco)
    if (isSupabaseConfigured && supabase) {
      await this.verificarConquistas(alunoId);
      return { data: null, error: null };
    }
    const registros = load('zenite_aluno_conquistas', []);
    if (!registros.some((r: any) => r.aluno_id === alunoId && r.conquista_id === conquistaId)) {
      const newRec = { id: Math.random().toString(36).substring(2, 9), aluno_id: alunoId, conquista_id: conquistaId, conquistado_em: new Date().toISOString() };
      registros.push(newRec);
      save('zenite_aluno_conquistas', registros);
      return { data: newRec, error: null };
    }
    return { data: null, error: null };
  },

  async getAgendamentosPersonal(personalId: string): Promise<{ data: Agendamento[]; error: any }> {
    return this.getAgendamentos(personalId, 'personal');
  },

  async getAgendamentosAluno(alunoId: string): Promise<{ data: Agendamento[]; error: any }> {
    return this.getAgendamentos(alunoId, 'aluno');
  },

  async getTreinos(alunoId: string, personalId?: string): Promise<{ data: Treino[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('treinos').select('*').eq('aluno_id', alunoId);
      // Se for o personal consultando, mostra todos (inclusive rascunho); se for o aluno, o RLS já filtra
      const { data, error } = await query.order('data_treino', { ascending: false });
      if (error) return { data: [], error };
      return { data: (data || []) as Treino[], error: null };
    }
    const treinos = load('zenite_mock_treinos', []);
    return { data: treinos.filter((t: any) => t.aluno_id === alunoId), error: null };
  },

  async createDemoAluno(personalId: string, nome: string, objetivo: string, avatar_tipo: TipoAvatar): Promise<Aluno> {
    const alumnos = loadMockAlunos();
    const newId = 'mock-user-' + Math.random().toString(36).substring(2, 9);
    
    const newAluno: Aluno = {
      id: newId,
      personal_id: personalId,
      objetivo,
      ativo: true,
      profile: {
        id: newId,
        papel: 'aluno',
        nome,
        avatar_url: null,
        avatar_tipo,
        criado_em: new Date().toISOString()
      }
    };

    alumnos.push(newAluno);
    save('zenite_mock_alunos', alumnos);
    return newAluno;
  },

  async getConteudosPersonal(personalId: string): Promise<{ data: any[]; error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Traz TODOS do personal (publicados e rascunhos), pra ele gerenciar
      const { data, error } = await supabase
        .from('conteudos')
        .select('*')
        .eq('personal_id', personalId)
        .order('criado_em', { ascending: false });
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    }
    const contents = load('zenite_conteudos', []);
    return { data: contents, error: null };
  },

  async deleteConteudoEducativo(id: number | string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('conteudos').delete().eq('id', id);
      return { error };
    }
    const contents = load('zenite_conteudos', []);
    const targetId = typeof id === 'string' ? parseInt(id) : id;
    const filtered = contents.filter((c: any) => c.id !== targetId);
    save('zenite_conteudos', filtered);
    return { error: null };
  },

  async getSessoesBemEstar(alunoId: string): Promise<{ data: SessaoBemEstar[]; error: any }> {
    const sessoes = load('zenite_bem_estar', []);
    return { data: sessoes.filter((s: any) => s.aluno_id === alunoId), error: null };
  }
};
