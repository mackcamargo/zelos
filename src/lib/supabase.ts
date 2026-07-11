import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile, Aluno, PapelUsuario, TipoAvatar, Categoria, Exercicio, TemplateTreino, TemplateExercicio, Mensagem, ConversaSumario, Checkin, Habito, HabitoRegistro, Conquista, AlunoConquista, RecordePessoal, FotoProgresso, AnguloFoto, PlanoAlimentar, RegistroNutricao, RegistroHidratacao, SessaoBemEstar, ConteudoEducativo, Agendamento, ResumoBemEstar } from '../types';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Verify if Supabase is properly configured (i.e. not empty, and not placeholders)
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 20 &&
  !supabaseUrl.includes('YOUR_SUPABASE') &&
  !supabaseAnonKey.includes('YOUR_SUPABASE');

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
  }
}

export const supabase = supabaseInstance;

// --- LOCAL PERSISTENCE BACKEND FOR DEMO MODE ---
// Used only if Supabase is not configured to allow previewing the entire app.

interface MockUser {
  id: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
  avatar_tipo: TipoAvatar;
  avatar_url: string | null;
  criado_em: string;
}

// Seed initial mock data
const loadMockUsers = (): MockUser[] => {
  const data = localStorage.getItem('zenite_mock_users');
  if (data) return JSON.parse(data);
  const initial: MockUser[] = [
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
  ];
  localStorage.setItem('zenite_mock_users', JSON.stringify(initial));
  return initial;
};

const loadMockAlunos = (): Aluno[] => {
  const data = localStorage.getItem('zenite_mock_alunos');
  if (data) return JSON.parse(data);
  const initial: Aluno[] = [
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
  ];
  localStorage.setItem('zenite_mock_alunos', JSON.stringify(initial));
  return initial;
};

// --- MOCK CONVITES ---
interface MockConvite {
  id: number;
  personal_id: string;
  codigo: string;
  usado: boolean;
  criado_em: string;
}

const loadMockConvites = (): MockConvite[] => {
  const data = localStorage.getItem('zenite_mock_convites');
  if (data) return JSON.parse(data);
  const initial: MockConvite[] = [
    {
      id: 1,
      personal_id: 'personal-demo-id',
      codigo: 'ZEN-DEMO-123',
      usado: false,
      criado_em: new Date().toISOString()
    }
  ];
  localStorage.setItem('zenite_mock_convites', JSON.stringify(initial));
  return initial;
};

// Unified Auth Service Wrapper
export const authService = {
  async signUp(email: string, password: string, nome: string, papel: PapelUsuario, avatar_tipo: TipoAvatar, codigoConvite?: string) {
    if (isSupabaseConfigured && supabase) {
      // Diagnostic Log
      if (papel === 'aluno' && codigoConvite) {
        console.log("Código digitado:", codigoConvite);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
            papel,
            avatar_tipo,
          }
        }
      });

      if (error) {
        return { data, error };
      }

      // If user was created and we have a invitation code to process:
      if (data?.user && papel === 'aluno' && codigoConvite) {
        const codigoFormatado = codigoConvite.trim().toUpperCase();
        
        // Wait a small moment to ensure the backend trigger (profiles/alunos) has finished
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Use the requested RPC function for linking
        const { data: rpcData, error: rpcError } = await supabase.rpc('usar_convite', {
          p_codigo: codigoFormatado
        });

        // Diagnostic Log
        console.log("Resultado da validação:", rpcData, rpcError);

        if (rpcError) {
          console.error('Erro ao validar convite via RPC:', rpcError);
          // We don't block the sign up if linking fails, but we could return an error if preferred.
          // For now, let's keep it consistent with the goal of linking.
          if (rpcError.message.includes('não encontrado') || rpcError.message.includes('inválido')) {
             return { data, error: { message: 'Conta criada, mas o código de convite é inválido ou já foi usado. Você pode se vincular ao seu Personal depois no perfil.' } };
          }
        } else if (rpcData === false) {
          return { data, error: { message: 'Conta criada, mas o código de convite é inválido ou já foi usado.' } };
        }
      }

      return { data, error };
    } else {
      // Mock SignUp
      const users = loadMockUsers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { data: null, error: { message: 'Este email já está cadastrado no modo Demo.' } };
      }

      let personalIdToLink: string | null = 'personal-demo-id'; // default in demo
      if (papel === 'aluno' && codigoConvite) {
        const convites = loadMockConvites();
        const convite = convites.find(c => c.codigo.trim().toUpperCase() === codigoConvite.trim().toUpperCase());
        if (!convite) {
          return { data: null, error: { message: 'Código de convite inválido ou não encontrado no modo Demo.' } };
        }
        if (convite.usado) {
          return { data: null, error: { message: 'Este código de convite já foi utilizado.' } };
        }
        personalIdToLink = convite.personal_id;
        convite.usado = true;
        localStorage.setItem('zenite_mock_convites', JSON.stringify(convites));
      }

      const newUser: MockUser = {
        id: 'mock-user-' + Math.random().toString(36).substring(2, 9),
        email,
        nome,
        papel,
        avatar_tipo,
        avatar_url: null,
        criado_em: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem('zenite_mock_users', JSON.stringify(users));

      // Link to personal in demo mode
      if (papel === 'aluno') {
        const alumnos = loadMockAlunos();
        const newAluno: Aluno = {
          id: newUser.id,
          personal_id: personalIdToLink,
          objetivo: 'Aprimoramento do condicionamento',
          ativo: true,
          profile: {
            id: newUser.id,
            papel: 'aluno',
            nome,
            avatar_url: null,
            avatar_tipo,
            criado_em: newUser.criado_em
          }
        };
        alumnos.push(newAluno);
        localStorage.setItem('zenite_mock_alunos', JSON.stringify(alumnos));
      }

      const mockSession = { user: { id: newUser.id, email, user_metadata: { nome, papel, avatar_tipo } } };
      localStorage.setItem('zenite_mock_session', JSON.stringify(mockSession));
      return { data: mockSession, error: null };
    }
  },

  async signIn(email: string, password: string) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    } else {
      // Mock SignIn
      const users = loadMockUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return { data: null, error: { message: 'Usuário não encontrado no modo Demo. Cadastre-se ou use os emails de demonstração: personal@zenite.com ou aluno@zenite.com.' } };
      }
      // Anyone can login with any password in demo mode
      const mockSession = { user: { id: user.id, email: user.email, user_metadata: { nome: user.nome, papel: user.papel, avatar_tipo: user.avatar_tipo } } };
      localStorage.setItem('zenite_mock_session', JSON.stringify(mockSession));
      return { data: mockSession, error: null };
    }
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      return await supabase.auth.signOut();
    } else {
      localStorage.removeItem('zenite_mock_session');
      return { error: null };
    }
  },

  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } else {
      const sessionStr = localStorage.getItem('zenite_mock_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        return session.user;
      }
      return null;
    }
  }
};

// --- MOCK VIDEOS ---
const V_BENCH = "data:video/mp4;base64,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AAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAAP93bWRhdAAAAq0GBf//qdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0xIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTIgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MCBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTAgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9MCB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTEga2V5aW50PTI1MCBrZXlpbnRfbWluPTI0IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9MTAgcmM9Y3JmIG1idHJlZT0xIGNyZj0zMC4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAdw2WIhAAr/5QBqWofAoz+2mvvArlebAUaR4jc7obEArNlAhCfNjoqAQS+/110D4ySJjbetGzucMV9SXVsWcNZ4QwHTTLjx7uHEIT65yOZqTlxTigT8E8ZzfV8eAr422eXAzlrcf125oJp3uY+O6ohOZIbLZT4XGUPSqu+e9CNi9MDyxZDpIWX/y3JXi+h2VWw1Y+KOf9LcQrUtvkEGgaaWeReR2GbTkR9/RpaDnWlevumM1gY7midPGAxZhaSYUo67AvKPLkMoVmSeoXP0WR5c+jmBN1HvJfman8VWR/R+7mu7Rc97Yii+lynyUnFe2LufQJW78BG4f8h4CTDTd9Y27efPUp1kevihFc2nKdWFUY+CgRe6CnBxmnDz2eypE/ASAW9VKyei1i4vdeMI2MvmROyBMbQpevzU0Z+J6HzsB06dwRC/pQDVcutb2nWfLvO6xwz0t/P+ZmrQbVnle5oaAzlR84pSHnLf+Uylrv+t/e022WLsV3ZQji5nFEdHMcvAE2Tq8w68xOoThaRfPYNh8Nyh9XZpPL2cVLcWU54Ksnp7lXIb0MYc10OR9Xzk8aJco4XXdIdeqYuR7xRgVPkfWB2H7PqQ9uqx8a31BjZw+GqDrguOmbvPWmZauFTvW6XdJKMERkaNeEYAo6qGzqq7gTLd2+0J5CGIr/9utLslMePaGL9jfcFbNjWOfZQT14ER3//83uLsjtjSOdeoLBrXNxL6UzbjRkBAuAri9z7+6dYtA3LvuGIWiBnF6cYwkf62jD2OJeeESl8QPdrNyhLEkjVwFqdPWekFIc6GyMRVkOwT34+YiY6I5ST4Anx3z/dYL5RON1uP6cG0udZETltwDxMovAybD/FRqHf7OjmOLC0ZEsfrBJ+3mevild3NJJQrnloknjoyVWDZwErXA1+3JW1hh+INpFpjQXUlqo4VTUmwiQzudlqFCeoMofBdZf7bwgl5QqhVJPdM0hUy6ze5sZ+tEyjkCzjG5nqjJR3bZDXgNmiAJ7j3qUAIxwe34kihjDqyDGxbIMM768oM+hiENMMu52uH62Fuo4NfBBs8fdiheKnGD5O5wvJ928AsK88bvRiqugYJ9t4yj5OzTkXFnBgBYuF3ro+t1FOtkJmeQnOUZaCca41d/ndMWbwEWslt55fRbPEhWsQCs0whHyrTTwx8slBQ8Ay36QHrS1yBmXMCGRXgZEvBMUK3ylb51xLYaZ5EV8SXW6RVxsBxxxKdToMvsdCHbXNqyYFisjIRRphPzpSDoUq9vSInD4WY97IBMLBXTX5MExetnKHw4o4+dg8w0/JQVHBcOBZ8PZb9zRdf0y0katqrDR9Yn9X+yiAdxFdQAP84WMZET1RiFmGg28MBQ4FXrw1QR8HTYsZJ4TguV8qiIAAACnx4x+BAAAAygGft0T/AAKEBrWcsf/p9Ldln9FAMXa47tSxafryTwOaFmuAOq2loGKVZlDJHreYAfru8zvxDR7acu1Xu6jDhlUO0JojI1uIyKKMmcHTIVRkkKrvBplbGmTX1sctpcpyDlCadwYGjmj92xC8ulAIq8jWM78ZT/3f2rXBfjTnBvNOWGXHa1QSVcJxNu2fETFZQwfoqE4Ve/mcQbT9PFBRDPuWVF7RJlMLBX0MbEcwZzC5L+ymAPcJ9r/aBWQm8a+fAq3UAJn/iCV1G0EAAAfbQZu8NExG/7w7uRaA5ASI6Zv/ReN1ygqpnEpKwJvHPUxzTEM4tc5PRMek5poZBiI5jzhE7NFg4fdU5Co97Lml/FIHZVLBc5vtmF24wXJfh71L0JDg0yQnHTRLmN32wCdgygvCGJMgc3bDADc70Lm2qKhNVYOjN611QGg93SSj1KhkEWpegypHYq0DbNuHLrdPa3u5sIPWexDp2qtee1Mtu+D5N/jJZJObVs6jIJ90ou5/@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";
const V_SQUAT = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAeibW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAD6AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAABsx0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAeAAAANWAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAA+gAAAEAAABAAAAAAZEbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAAwABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAF721pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAABa9zdGJsAAAAr3N0c2QAAAAAAAAAAQAAAJ9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAeADVgBIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAe/+EAGWdkAB6s2UHgbfmhAAADAAEAAAMAMA8WLZYBAAVo74RywP34+AAAAAAUYnRydAAAAAAAAf7eAAH+3gAAABhzdHRzAAAAAAAAAAEAAABgAAACAAAAABRzdHNzAAAAAAAAAAEAAAABAAADCGN0dHMAAAAAAAAAXwAAAAEAAAQAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAAB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@gVnOoI0Q37urnQUc9EGrvFLrWZ0exnoVDR4WwgzDw6Z7eEVMBqyVPn4ZhwaG+hYAjUXMSyVqgCWxIYTfpQqb7PvTn4ijMgMNjHrrZ3PsSruoqH6hyBz/5/8GM3rZU//61b57D5z50CYN0hLIeMQIcjE/8/yo+gyZObCKP38Y9omEtXd6BXXh1XFUVUPTI+M+RGHYFx5pBWzSSoBqjhYoWmoR1DBMlX5wlK9wRLC9SvGeDwsajueagPrIEH6nEh2CGa3iRPHMZrQ8VO6mRyMQXnC4MHelBQ4ssR7TD4FSCe+MktaCB08lSwrEnmdj6tqga5SR3jKx17/LOcLr5K/9PzuiqE0khuVJ9qIiyZnz78/3BkmbSFNpfPjIyjw8qXcdbJvoH+kW8K2+1RTPeSAJLenjEltmc+suBl+V5QbGbStKFexLEwaYHDCMePGSALIdO96fDuxkESuUTjVbofTWK43cNanbqfmZDRfNR/FQQN+5JNyFscxmrEZmomzEimp7Xj1/zwaaqukZsrDFinmyyEJOJcvl3Y+9SbgBw+SPzFyxL3/X1I5Lb2Qkswf/8vnMVa1uGdCdGwpzqYoimfyQ8se5p/HlQMcp/yQafQfUI5r4oku9lbpfCZPYOiOoy+HnBEfRfVuHbp4QsHUstc3LuKxyCdeXoadDxUV907tb2/ksfrHRozabqV0Vc89bVlwcdfOIan75uOYVecSvW38IGX48ofvyvEMW2It5Ya1gKiMXD3hscB3pp8q6WYWkzw2+JVCaRD1yvSdjNzcH+i3VmDIKgCDbUoaOIKIFd2bThV/wLKbUF002u55Xkl/NNCXegLnmNSwdRO6VQNCqcmmEhUl/qKK/9jyxWMs/2I042l4QcBl8c4mHww3aWfWEVf8lfjjZN5Bf7pu/RK8oH6d99aE5xwEngzxwOBkDy4tEAolKyuXM48dso/6pvmckQVaPatmFDsB0bIjqgXwniYD1d+5PXxyMXxq01TviFVU6vAlChUV63V78n8qfLbvEfF62avZ9leIpaIm3SFo+o9az/oOEAxbzmp9/isoUzkMyK92pdD0/z5aofee4sLUr8XQRG02DsBkyKzmQzzPjCCEbLhapIw0FLHH3Qr1wvYU9PuIc4b+U5f1tUEoElwg1e/Gze9MWSeFIcrOs3UdEgo9SiZaTWqIEx45n9nIUL6UnL3KdQ8bP/Vxc2g4uGCFLbzAeW8EM48FN/svlK6Vl34tn+XzhbyGwzJSMW9nMr7nz6lVhCr3yCRN9cLfbH0pzyg5ZBw7KlOsYzJ31p3AKjnCv+vbTm1MqntscmxBXBY3YmZf3zno/tEeiRrgCOtKHwk0/lGRzuadFKKgQAMdP6xOcPq+E81H/a3t7Pn2j5SYUdLsDO3jVezxAWpeQTbq8J7jQm2ybz8qZ3+sc4VObkc4V9gZxwDB990ljMOJRTPrBDx5qrlfgxE5MQLjq93I1e2lL7Eh3ey394T4b9ekn67HQl8O7nFYSMM5VUbo2mlQ+SJZXDk+nKZsTmD0eIdifABk0zeMPKG9rKreXHW1jXe7FznoXTpiIOO96Fkv8A+0Wf9fT9YyY8fV0Mv/vJv3j6vYwAFnS9XxsihovUvSqmvsWOKwebha94v1NE2Kks9ri4Jc4mpnadq8oO5pAYAWmVlujYFBAAAAr0GfEkUVLG8F/tOnf6fE5VfRIn4VvD6f1KzLIsR89WbOQunN7uAbeS60Zc6r3z4X+aVlXqYvshqD8EonMlhT9ZzY8uFIszUqSAn9rXThwOq8uDRE4mS9Ym6V1XqGZzN0Fof/mUuX0vT9zK9jZ6vN/P/Uv399mGZf4pP8/EonRAn6pIov9FvM9m8tL3m3CboI+bVfXvFEvF8g8SVTZ6CgV/8B30ZisvP8vR6w0rC+qjOf2L+Yw4bWvOq73KpsKqF82E2eXqN65u2qE66Wf8KmvZfR4uR1f6K2pC8gAbIov/XvInXWvY6uGNDGmv88m9Z1gX+a82z4ZbeEmsKiv7G9vKqyX63qVz6Zc6hK76iYVcoXofU1f8XOfhFq7f/mYv9XW2P93LToqR0qU/S9K6Z37O8Z0UUTqgDovM0X3fE/83E0Gg8pP/U+p1/V0WCHzM27b8VwG8v9U74f/OshmR+gALF3A3f+Dbe7Vq8UmsW7XwVq8bC5/K9Tof0Gg9XWv6+X8f//8bEnIn/g2P/C6GstN/0Z6v9n/1S6P+Z2v8tYofMvXg+A6/K7oFMyI0MAMmK7C/D8N/T8VqUAAAf4UGbNDRMRj8ADq7tiqRgH4g26Ma7MYQEA==";

const loadMockCategorias = (): Categoria[] => {
  const data = localStorage.getItem('zenite_mock_categorias');
  if (data) return JSON.parse(data);
  const initial: Categoria[] = [
    { id: 'cat-peito', slug: 'peito', nome: 'Peito', ordem: 1 },
    { id: 'cat-costas', slug: 'costas', nome: 'Costas', ordem: 2 },
    { id: 'cat-pernas', slug: 'pernas', nome: 'Pernas', ordem: 3 },
    { id: 'cat-ombros', slug: 'ombros', nome: 'Ombros', ordem: 4 },
    { id: 'cat-biceps', slug: 'biceps', nome: 'Bíceps', ordem: 5 },
    { id: 'cat-abdomen', slug: 'abdomen', nome: 'Abdômen', ordem: 6 }
  ];
  localStorage.setItem('zenite_mock_categorias', JSON.stringify(initial));
  return initial;
};

const loadMockExercicios = (): Exercicio[] => {
  const data = localStorage.getItem('zenite_mock_exercicios');
  if (data) return JSON.parse(data);
  const initial: Exercicio[] = [
    {
      id: 'ex-supino',
      nome: 'Supino Reto com Barra',
      categoria_id: 'cat-peito',
      personal_id: null,
      video_url_masc: V_BENCH,
      video_url_fem: V_BENCH,
      musculo_primario: ['Peitoral Maior'],
      musculo_secundario: ['Tríceps Braquial', 'Deltoide Anterior'],
      dicas: [
        'Mantenha os pés firmes no chão durante toda a execução.',
        'Desça a barra controladamente até tocar levemente o peito.',
        'Empurre a barra estendendo os cotovelos sem tirar as costas do banco.'
      ]
    },
    {
      id: 'ex-supino-inc',
      nome: 'Supino Inclinado com Halteres',
      categoria_id: 'cat-peito',
      personal_id: null,
      video_url_masc: null,
      video_url_fem: null,
      musculo_primario: ['Peitoral Superior'],
      musculo_secundario: ['Deltoide Anterior', 'Tríceps Braquial'],
      dicas: [
        'Incline o banco em um ângulo aproximado de 30 a 45 graus.',
        'Mantenha as escápulas retraídas contra o banco.',
        'Controle o movimento na subida e na descida para maximizar o estímulo.'
      ]
    },
    {
      id: 'ex-agachamento',
      nome: 'Agachamento Livre com Barra',
      categoria_id: 'cat-pernas',
      personal_id: null,
      video_url_masc: V_SQUAT,
      video_url_fem: V_SQUAT,
      musculo_primario: ['Quadríceps'],
      musculo_secundario: ['Glúteo Máximo', 'Posteriores de Coxa', 'Eretores da Espinha'],
      dicas: [
        'Apoie a barra firmemente sobre os trapézios, nunca na cervical.',
        'Inicie o movimento projetando o quadril levemente para trás antes de flexionar os joelhos.',
        'Mantenha os calcanhares apoiados no chão e os joelhos alinhados com as pontas dos pés.'
      ]
    },
    {
      id: 'ex-terra',
      nome: 'Levantamento Terra Convencional',
      categoria_id: 'cat-costas',
      personal_id: null,
      video_url_masc: null,
      video_url_fem: null,
      musculo_primario: ['Eretores da Espinha', 'Glúteo Máximo'],
      musculo_secundario: ['Dorsais', 'Trapézios', 'Isquiotibiais'],
      dicas: [
        'Inicie com a barra colada nas canelas.',
        'Mantenha a coluna completamente neutra e contraia as escápulas.',
        'Suba empurrando o chão com as pernas enquanto estende o quadril.'
      ]
    },
    {
      id: 'ex-remada-curvada',
      nome: 'Remada Curvada com Barra',
      categoria_id: 'cat-costas',
      personal_id: null,
      video_url_masc: null,
      video_url_fem: null,
      musculo_primario: ['Latíssimo do Dorso', 'Redondo Maior'],
      musculo_secundario: ['Bíceps Braquial', 'Deltoide Posterior', 'Trapézio'],
      dicas: [
        'Incline o tronco à frente mantendo a coluna alinhada.',
        'Puxe a barra em direção ao abdômen inferior guiando com os cotovelos.'
      ]
    },
    {
      id: 'ex-elevacao-lateral',
      nome: 'Elevação Lateral com Halteres',
      categoria_id: 'cat-ombros',
      personal_id: null,
      video_url_masc: null,
      video_url_fem: null,
      musculo_primario: ['Deltoide Lateral'],
      musculo_secundario: ['Deltoide Anterior', 'Trapézio'],
      dicas: [
        'Eleve os braços lateralmente até a linha dos ombros.',
        'Mantenha uma leve flexão nos cotovelos durante o movimento.'
      ]
    },
    {
      id: 'ex-rosca-direta',
      nome: 'Rosca Direta com Barra W',
      categoria_id: 'cat-biceps',
      personal_id: null,
      video_url_masc: null,
      video_url_fem: null,
      musculo_primario: ['Bíceps Braquial'],
      musculo_secundario: ['Braquial', 'Braquiorradial'],
      dicas: [
        'Mantenha os cotovelos fixos ao lado do corpo.',
        'Flexione os cotovelos contraindo os bíceps ao máximo e desça de forma controlada.'
      ]
    },
    {
      id: 'ex-prancha',
      nome: 'Prancha Abdominal Isométrica',
      categoria_id: 'cat-abdomen',
      personal_id: null,
      video_url_masc: null,
      video_url_fem: null,
      musculo_primario: ['Reto do Abdômen', 'Transverso do Abdômen'],
      musculo_secundario: ['Lombar', 'Glúteos'],
      dicas: [
        'Apoie os antebraços e as pontas dos pés no chão.',
        'Mantenha o corpo alinhado da cabeça aos calcanhares sem deixar o quadril cair.'
      ]
    }
  ];
  localStorage.setItem('zenite_mock_exercicios', JSON.stringify(initial));
  return initial;
};

const loadMockTreinos = (): any[] => {
  const data = localStorage.getItem('zenite_mock_treinos');
  if (data) return JSON.parse(data);
  return [];
};

const loadMockTreinoExercicios = (): any[] => {
  const data = localStorage.getItem('zenite_mock_treino_exercicios');
  if (data) return JSON.parse(data);
  return [];
};

const loadMockTemplates = (): TemplateTreino[] => {
  const data = localStorage.getItem('zenite_mock_templates');
  if (data) return JSON.parse(data);
  return [];
};

const loadMockTemplateExercicios = (): TemplateExercicio[] => {
  const data = localStorage.getItem('zenite_mock_template_exercicios');
  if (data) return JSON.parse(data);
  return [];
};

// Unified Database Service Wrapper
export const dbService = {
  async getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return { data: data as Profile | null, error };
    } else {
      // Mock Profile
      const users = loadMockUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        return {
          data: {
            id: user.id,
            papel: user.papel,
            nome: user.nome,
            avatar_url: user.avatar_url,
            avatar_tipo: user.avatar_tipo,
            criado_em: user.criado_em
          },
          error: null
        };
      }
      return { data: null, error: { message: 'Profile not found in demo storage' } };
    }
  },

  async getAlunos(personalId: string): Promise<{ data: Aluno[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Fetch students for the personal trainer and join profiles
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          id,
          personal_id,
          objetivo,
          ativo,
          profiles:id (
            id,
            papel,
            nome,
            avatar_url,
            avatar_tipo,
            criado_em
          )
        `)
        .eq('personal_id', personalId);

      // Map the profiles join because of nested structure
      const formattedData = data?.map((item: any) => ({
        id: item.id,
        personal_id: item.personal_id,
        objetivo: item.objetivo,
        ativo: item.ativo,
        profile: item.profiles
      })) || [];

      return { data: formattedData as Aluno[], error };
    } else {
      // Mock getAlunos
      const alumnos = loadMockAlunos();
      const filtered = alumnos.filter(a => a.personal_id === personalId);
      return { data: filtered, error: null };
    }
  },

  async updateAlunoObjetivo(alunoId: string, objetivo: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('alunos')
        .update({ objetivo })
        .eq('id', alunoId)
        .select()
        .single();
      return { data, error };
    } else {
      const alumnos = loadMockAlunos();
      const index = alumnos.findIndex(a => a.id === alunoId);
      if (index >= 0) {
        alumnos[index].objetivo = objetivo;
        localStorage.setItem('zenite_mock_alunos', JSON.stringify(alumnos));
        return { data: alumnos[index], error: null };
      }
      return { data: null, error: { message: 'Aluno não encontrado no modo Demo' } };
    }
  },

  async getAlunoObjetivo(alunoId: string): Promise<{ objetivo: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('alunos')
        .select('objetivo')
        .eq('id', alunoId)
        .single();
      if (error || !data) return { objetivo: null };
      return { objetivo: data.objetivo };
    } else {
      const alumnos = loadMockAlunos();
      const found = alumnos.find(a => a.id === alunoId);
      return { objetivo: found?.objetivo || 'Hipertrofia & Definição' };
    }
  },

  async updateAlunoAtivo(alunoId: string, ativo: boolean): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('alunos')
        .update({ ativo })
        .eq('id', alunoId)
        .select()
        .single();
      return { data, error };
    } else {
      const alumnos = loadMockAlunos();
      const index = alumnos.findIndex(a => a.id === alunoId);
      if (index >= 0) {
        alumnos[index].ativo = ativo;
        localStorage.setItem('zenite_mock_alunos', JSON.stringify(alumnos));
        return { data: alumnos[index], error: null };
      }
      return { data: null, error: { message: 'Aluno não encontrado no modo Demo' } };
    }
  },

  async removeAluno(alunoId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Desvincular aluno do personal_id
      const { error } = await supabase
        .from('alunos')
        .update({ personal_id: null })
        .eq('id', alunoId);
      return { error };
    } else {
      const alumnos = loadMockAlunos();
      const index = alumnos.findIndex(a => a.id === alunoId);
      if (index >= 0) {
        alumnos[index].personal_id = null;
        localStorage.setItem('zenite_mock_alunos', JSON.stringify(alumnos));
        return { error: null };
      }
      return { error: { message: 'Aluno não encontrado no modo Demo' } };
    }
  },

  async createConvite(personalId: string): Promise<{ data: any; error: any }> {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const codigo = `ZEN-${randomHex}`;
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('convites')
        .insert({
          personal_id: personalId,
          codigo,
          usado: false
        })
        .select()
        .single();
      return { data, error };
    } else {
      const convites = loadMockConvites();
      const newConvite = {
        id: Math.floor(Math.random() * 1000000),
        personal_id: personalId,
        codigo,
        usado: false,
        criado_em: new Date().toISOString()
      };
      convites.push(newConvite);
      localStorage.setItem('zenite_mock_convites', JSON.stringify(convites));
      return { data: newConvite, error: null };
    }
  },

  async getConvites(personalId: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('convites')
        .select('*')
        .eq('personal_id', personalId)
        .order('criado_em', { ascending: false });
      return { data, error };
    } else {
      const convites = loadMockConvites();
      const filtered = convites.filter(c => c.personal_id === personalId);
      return { data: filtered, error: null };
    }
  },

  // Facilitates adding a demo student to show state updates
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
    localStorage.setItem('zenite_mock_alunos', JSON.stringify(alumnos));
    return newAluno;
  },

  async getCategorias(): Promise<{ data: Categoria[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('ordem', { ascending: true });
      return { data: data as Categoria[] | null, error };
    } else {
      const categorias = loadMockCategorias();
      return { data: categorias, error: null };
    }
  },

  async getExercicios(categoriaId: string, personalId: string | null): Promise<{ data: Exercicio[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('exercicios')
        .select('*')
        .eq('categoria_id', categoriaId);
      
      if (personalId) {
        query = query.or(`personal_id.is.null,personal_id.eq.${personalId}`);
      } else {
        query = query.is('personal_id', null);
      }

      const { data, error } = await query;
      return { data: data as Exercicio[] | null, error };
    } else {
      const exercicios = loadMockExercicios();
      const filtered = exercicios.filter(ex => 
        ex.categoria_id === categoriaId && 
        (ex.personal_id === null || ex.personal_id === personalId)
      );
      return { data: filtered, error: null };
    }
  },

  async getSignedUrl(path: string): Promise<string | null> {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    if ((window as any).__zenite_mock_videos && (window as any).__zenite_mock_videos[path]) {
      return (window as any).__zenite_mock_videos[path];
    }
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('exercicios')
          .createSignedUrl(path, 3600);
        if (error) {
          console.error('Error generating signed URL:', error);
          return null;
        }
        return data?.signedUrl || null;
      } catch (error) {
        console.error('Exception generating signed URL:', error);
        return null;
      }
    } else {
      return path;
    }
  },

  async getAllExercicios(): Promise<{ data: Exercicio[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .order('nome', { ascending: true });
      return { data: data as Exercicio[] | null, error };
    } else {
      const exercicios = loadMockExercicios();
      return { data: exercicios, error: null };
    }
  },

  async getExercicioById(id: string): Promise<{ data: Exercicio | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as Exercicio | null, error };
    } else {
      const exercicios = loadMockExercicios();
      const found = exercicios.find(ex => ex.id === id) || null;
      return { data: found, error: null };
    }
  },

  async updateExercicioVideo(id: string, field: 'video_url_masc' | 'video_url_fem', path: string | null): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('exercicios')
        .update({ [field]: path })
        .eq('id', id)
        .select()
        .single();
      return { data: data, error };
    } else {
      const exercicios = loadMockExercicios();
      const idx = exercicios.findIndex(ex => ex.id === id);
      if (idx >= 0) {
        exercicios[idx][field] = path;
        localStorage.setItem('zenite_mock_exercicios', JSON.stringify(exercicios));
        return { data: exercicios[idx], error: null };
      }
      return { data: null, error: new Error('Exercício não encontrado no localStorage') };
    }
  },

  async saveExercicio(exercicio: Partial<Exercicio>): Promise<{ data: Exercicio | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const id = exercicio.id || 'ex-' + Math.random().toString(36).substring(2, 9);
      const payload = { ...exercicio, id };
      const { data, error } = await supabase
        .from('exercicios')
        .upsert(payload)
        .select()
        .single();
      return { data: data as Exercicio | null, error };
    } else {
      const exercicios = loadMockExercicios();
      const id = exercicio.id || 'ex-' + Math.random().toString(36).substring(2, 9);
      const payload = {
        id,
        nome: exercicio.nome || '',
        categoria_id: exercicio.categoria_id || '',
        personal_id: exercicio.personal_id || null,
        video_url_masc: exercicio.video_url_masc || null,
        video_url_fem: exercicio.video_url_fem || null,
        musculo_primario: exercicio.musculo_primario || [],
        musculo_secundario: exercicio.musculo_secundario || [],
        dicas: exercicio.dicas || []
      } as Exercicio;

      const index = exercicios.findIndex(ex => ex.id === id);
      if (index >= 0) {
        exercicios[index] = payload;
      } else {
        exercicios.push(payload);
      }
      localStorage.setItem('zenite_mock_exercicios', JSON.stringify(exercicios));
      return { data: payload, error: null };
    }
  },

  async uploadVideo(path: string, file: File): Promise<{ data: string | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('exercicios')
          .upload(path, file, { upsert: true });
        if (error) return { data: null, error };
        return { data: data?.path || path, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    } else {
      const objectUrl = URL.createObjectURL(file);
      if (!(window as any).__zenite_mock_videos) {
        (window as any).__zenite_mock_videos = {};
      }
      (window as any).__zenite_mock_videos[path] = objectUrl;
      return { data: path, error: null };
    }
  },

  async getTreinos(alunoId: string, personalId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('treinos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('personal_id', personalId)
        .order('data_treino', { ascending: false });
      return { data, error };
    } else {
      const treinos = loadMockTreinos();
      const filtered = treinos.filter(t => t.aluno_id === alunoId && t.personal_id === personalId);
      // Sort descending by data_treino
      filtered.sort((a, b) => new Date(b.data_treino).getTime() - new Date(a.data_treino).getTime());
      return { data: filtered, error: null };
    }
  },

  async getTreinosParaAluno(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('treinos')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('status', 'publicado')
        .order('data_treino', { ascending: false });
      return { data, error };
    } else {
      const treinos = loadMockTreinos();
      const filtered = treinos.filter(t => t.aluno_id === alunoId && t.status === 'publicado');
      filtered.sort((a, b) => new Date(b.data_treino).getTime() - new Date(a.data_treino).getTime());
      return { data: filtered, error: null };
    }
  },

  async getTreinoCompleto(treinoId: string): Promise<{ data: any | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data: treino, error: treinoError } = await supabase
        .from('treinos')
        .select('*')
        .eq('id', treinoId)
        .single();

      if (treinoError) return { data: null, error: treinoError };

      const { data: exData, error: exError } = await supabase
        .from('treino_exercicios')
        .select(`
          id,
          treino_id,
          exercicio_id,
          ordem,
          series,
          repeticoes,
          carga_kg,
          exercicios:exercicio_id (
            id,
            nome,
            categoria_id,
            personal_id,
            video_url_masc,
            video_url_fem,
            musculo_primario,
            musculo_secundario,
            dicas
          )
        `)
        .eq('treino_id', treinoId)
        .order('ordem', { ascending: true });

      if (exError) return { data: null, error: exError };

      const formattedExercicios = exData?.map((item: any) => ({
        id: item.id,
        treino_id: item.treino_id,
        exercicio_id: item.exercicio_id,
        ordem: item.ordem,
        series: item.series,
        repeticoes: item.repeticoes,
        carga_kg: item.carga_kg,
        exercicio: item.exercicios
      })) || [];

      return {
        data: {
          ...treino,
          exercicios: formattedExercicios
        },
        error: null
      };
    } else {
      const treinos = loadMockTreinos();
      const treino = treinos.find(t => t.id === treinoId);
      if (!treino) return { data: null, error: { message: 'Treino não encontrado' } };

      const allExs = loadMockTreinoExercicios();
      const filteredExs = allExs.filter(ex => ex.treino_id === treinoId);
      filteredExs.sort((a, b) => a.ordem - b.ordem);

      const exerciciosDb = loadMockExercicios();
      const formattedExercicios = filteredExs.map(ex => {
        const matchedEx = exerciciosDb.find(e => e.id === ex.exercicio_id);
        return {
          ...ex,
          exercicio: matchedEx || null
        };
      });

      return {
        data: {
          ...treino,
          exercicios: formattedExercicios
        },
        error: null
      };
    }
  },

  async saveTreino(treino: any, exercicios: any[]): Promise<{ data: any | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const id = treino.id || 'treino-' + Math.random().toString(36).substring(2, 9);
      const payload = {
        ...treino,
        id,
        criado_em: treino.criado_em || new Date().toISOString()
      };

      const { data: savedTreino, error: treinoError } = await supabase
        .from('treinos')
        .upsert(payload)
        .select()
        .single();

      if (treinoError) return { data: null, error: treinoError };

      // Clear existing exercises for this workout to rewrite order/config
      const { error: deleteError } = await supabase
        .from('treino_exercicios')
        .delete()
        .eq('treino_id', id);

      if (deleteError) return { data: null, error: deleteError };

      if (exercicios.length > 0) {
        const formattedExercicios = exercicios.map((ex, index) => ({
          treino_id: id,
          exercicio_id: ex.exercicio_id,
          ordem: index + 1,
          series: Number(ex.series) || 3,
          repeticoes: String(ex.repeticoes) || '10',
          carga_kg: ex.carga_kg !== undefined && ex.carga_kg !== null && ex.carga_kg !== '' ? Number(ex.carga_kg) : null
        }));

        const { error: exerciciosError } = await supabase
          .from('treino_exercicios')
          .insert(formattedExercicios);

        if (exerciciosError) return { data: null, error: exerciciosError };
      }

      return { data: savedTreino, error: null };
    } else {
      const treinos = loadMockTreinos();
      const id = treino.id || 'treino-' + Math.random().toString(36).substring(2, 9);
      const payload = {
        id,
        aluno_id: treino.aluno_id,
        personal_id: treino.personal_id,
        titulo: treino.titulo || 'Treino A',
        data_treino: treino.data_treino || new Date().toISOString().split('T')[0],
        status: treino.status || 'rascunho',
        criado_em: treino.criado_em || new Date().toISOString()
      };

      const index = treinos.findIndex(t => t.id === id);
      if (index >= 0) {
        treinos[index] = payload;
      } else {
        treinos.push(payload);
      }
      localStorage.setItem('zenite_mock_treinos', JSON.stringify(treinos));

      let allExs = loadMockTreinoExercicios();
      allExs = allExs.filter(ex => ex.treino_id !== id);

      const newExs = exercicios.map((ex, idx) => ({
        id: 'treino-ex-' + Math.random().toString(36).substring(2, 9),
        treino_id: id,
        exercicio_id: ex.exercicio_id,
        ordem: idx + 1,
        series: Number(ex.series) || 3,
        repeticoes: String(ex.repeticoes) || '10',
        carga_kg: ex.carga_kg !== undefined && ex.carga_kg !== null && ex.carga_kg !== '' ? Number(ex.carga_kg) : null
      }));

      allExs.push(...newExs);
      localStorage.setItem('zenite_mock_treino_exercicios', JSON.stringify(allExs));

      return { data: payload, error: null };
    }
  },

  async deleteTreino(treinoId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Cascade delete is usually setup on DB, but let's do exercises delete explicitly just in case
      await supabase.from('treino_exercicios').delete().eq('treino_id', treinoId);
      const { error } = await supabase.from('treinos').delete().eq('id', treinoId);
      return { error };
    } else {
      let treinos = loadMockTreinos();
      treinos = treinos.filter(t => t.id !== treinoId);
      localStorage.setItem('zenite_mock_treinos', JSON.stringify(treinos));

      let allExs = loadMockTreinoExercicios();
      allExs = allExs.filter(ex => ex.treino_id !== treinoId);
      localStorage.setItem('zenite_mock_treino_exercicios', JSON.stringify(allExs));

      return { error: null };
    }
  },

  async getSeriesRealizadas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('series_realizadas')
        .select('*')
        .eq('aluno_id', alunoId);
      return { data, error };
    } else {
      const raw = localStorage.getItem('zenite_series_realizadas');
      const series = raw ? JSON.parse(raw) : [];
      const filtered = series.filter((s: any) => s.aluno_id === alunoId);
      return { data: filtered, error: null };
    }
  },

  async salvarSerieRealizada(serie: {
    treino_exercicio_id: string;
    aluno_id: string;
    numero_serie: number;
    carga_kg: number | null;
    repeticoes: number;
    concluida: boolean;
    concluida_em?: string;
  }): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('series_realizadas')
        .upsert({
          ...serie,
          concluida_em: serie.concluida_em || new Date().toISOString()
        }, {
          onConflict: 'treino_exercicio_id,numero_serie'
        })
        .select();
      return { data, error };
    } else {
      const raw = localStorage.getItem('zenite_series_realizadas');
      const series = raw ? JSON.parse(raw) : [];
      const idx = series.findIndex((s: any) => s.treino_exercicio_id === serie.treino_exercicio_id && s.numero_serie === serie.numero_serie);
      const payload = {
        ...serie,
        id: idx >= 0 ? series[idx].id : 'sr-' + Math.random().toString(36).substring(2, 9),
        concluida_em: serie.concluida_em || new Date().toISOString()
      };
      if (idx >= 0) {
        series[idx] = payload;
      } else {
        series.push(payload);
      }
      localStorage.setItem('zenite_series_realizadas', JSON.stringify(series));
      return { data: payload, error: null };
    }
  },

  async updateTreinoStatus(treinoId: string, status: 'rascunho' | 'publicado' | 'concluido'): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('treinos')
        .update({ status })
        .eq('id', treinoId);
      return { error };
    } else {
      const treinos = loadMockTreinos();
      const idx = treinos.findIndex(t => t.id === treinoId);
      if (idx >= 0) {
        treinos[idx].status = status;
        localStorage.setItem('zenite_mock_treinos', JSON.stringify(treinos));
      }
      return { error: null };
    }
  },

  async getSeriesRealizadasDetalhadas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('series_realizadas')
        .select(`
          id,
          treino_exercicio_id,
          aluno_id,
          numero_serie,
          carga_kg,
          repeticoes,
          concluida,
          concluida_em,
          treino_exercicios:treino_exercicio_id (
            id,
            exercicio_id,
            exercicios:exercicio_id (
              id,
              nome
            ),
            treinos:treino_id (
              id,
              data_treino,
              titulo
            )
          )
        `)
        .eq('aluno_id', alunoId);

      const formatted = data?.map((sr: any) => {
        const te = sr.treino_exercicios;
        const ex = te?.exercicios;
        const tr = te?.treinos;
        return {
          id: sr.id,
          treino_exercicio_id: sr.treino_exercicio_id,
          aluno_id: sr.aluno_id,
          numero_serie: sr.numero_serie,
          carga_kg: sr.carga_kg,
          repeticoes: sr.repeticoes,
          concluida: sr.concluida,
          concluida_em: sr.concluida_em,
          exercicio_id: ex?.id || null,
          exercicio_nome: ex?.nome || 'Exercício',
          treino_id: tr?.id || null,
          data_treino: tr?.data_treino || sr.concluida_em?.split('T')[0] || new Date().toISOString().split('T')[0],
          treino_titulo: tr?.titulo || 'Treino'
        };
      }) || [];

      return { data: formatted, error };
    } else {
      const raw = localStorage.getItem('zenite_series_realizadas');
      const series = raw ? JSON.parse(raw) : [];
      const filtered = series.filter((s: any) => s.aluno_id === alunoId);

      const allExs = loadMockTreinoExercicios();
      const exerciciosDb = loadMockExercicios();
      const treinos = loadMockTreinos();

      const formatted = filtered.map((sr: any) => {
        const te = allExs.find(e => e.id === sr.treino_exercicio_id);
        const ex = te ? exerciciosDb.find(e => e.id === te.exercicio_id) : null;
        const tr = te ? treinos.find(t => t.id === te.treino_id) : null;

        return {
          id: sr.id,
          treino_exercicio_id: sr.treino_exercicio_id,
          aluno_id: sr.aluno_id,
          numero_serie: sr.numero_serie,
          carga_kg: sr.carga_kg,
          repeticoes: sr.repeticoes,
          concluida: sr.concluida,
          concluida_em: sr.concluida_em,
          exercicio_id: ex?.id || null,
          exercicio_nome: ex?.nome || 'Exercício',
          treino_id: tr?.id || null,
          data_treino: tr?.data_treino || sr.concluida_em?.split('T')[0] || new Date().toISOString().split('T')[0],
          treino_titulo: tr?.titulo || 'Treino'
        };
      });

      return { data: formatted, error: null };
    }
  },

  async getMetricas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('metricas')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('registrado_em', { ascending: true });
      return { data, error };
    } else {
      const raw = localStorage.getItem('zenite_metricas');
      const metricas = raw ? JSON.parse(raw) : [];
      const filtered = metricas.filter((m: any) => m.aluno_id === alunoId);
      filtered.sort((a: any, b: any) => new Date(a.registrado_em).getTime() - new Date(b.registrado_em).getTime());
      return { data: filtered, error: null };
    }
  },

  async salvarMetrica(metrica: {
    aluno_id: string;
    personal_id: string | null;
    tipo: string;
    valor: number;
    unidade: string;
    registrado_em?: string;
  }): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('metricas')
        .insert({
          ...metrica,
          registrado_em: metrica.registrado_em || new Date().toISOString()
        })
        .select()
        .single();
      return { data, error };
    } else {
      const raw = localStorage.getItem('zenite_metricas');
      const metricas = raw ? JSON.parse(raw) : [];
      const payload = {
        ...metrica,
        id: 'met-' + Math.random().toString(36).substring(2, 9),
        registrado_em: metrica.registrado_em || new Date().toISOString()
      };
      metricas.push(payload);
      localStorage.setItem('zenite_metricas', JSON.stringify(metricas));
      return { data: payload, error: null };
    }
  },

  async getTemplates(personalId: string): Promise<{ data: TemplateTreino[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('templates_treino')
        .select(`
          *,
          template_exercicios (
            *,
            exercicios (*)
          )
        `)
        .eq('personal_id', personalId)
        .order('criado_em', { ascending: false });

      if (error) return { data: null, error };

      const formatted = data?.map((t: any) => ({
        ...t,
        exercicios: t.template_exercicios?.map((te: any) => ({
          ...te,
          exercicio: te.exercicios
        })).sort((a: any, b: any) => a.ordem - b.ordem)
      })) || [];

      return { data: formatted as TemplateTreino[], error: null };
    } else {
      const templates = loadMockTemplates();
      const allExs = loadMockTemplateExercicios();
      const exerciciosDb = loadMockExercicios();
      
      const filtered = templates.filter(t => t.personal_id === personalId);
      const formatted = filtered.map(t => ({
        ...t,
        exercicios: allExs
          .filter(te => te.template_id === t.id)
          .map(te => ({
            ...te,
            exercicio: exerciciosDb.find(ex => ex.id === te.exercicio_id)
          }))
          .sort((a, b) => a.ordem - b.ordem)
      }));

      return { data: formatted as TemplateTreino[], error: null };
    }
  },

  async saveTemplate(template: Partial<TemplateTreino>, exercicios: any[]): Promise<{ data: TemplateTreino | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const isNew = !template.id;
      
      let res;
      if (isNew) {
        res = await supabase
          .from('templates_treino')
          .insert({
            personal_id: template.personal_id,
            titulo: template.titulo,
            descricao: template.descricao
          })
          .select()
          .single();
      } else {
        res = await supabase
          .from('templates_treino')
          .update({
            titulo: template.titulo,
            descricao: template.descricao
          })
          .eq('id', template.id)
          .select()
          .single();
      }

      if (res.error) return { data: null, error: res.error };
      const savedTemplate = res.data;

      // Delete existing exercises if updating
      if (!isNew) {
        await supabase.from('template_exercicios').delete().eq('template_id', savedTemplate.id);
      }

      // Insert new exercises
      const exsToInsert = exercicios.map((ex, idx) => ({
        template_id: savedTemplate.id,
        exercicio_id: ex.exercicio_id,
        ordem: idx,
        series: ex.series || 3,
        repeticoes: ex.repeticoes || '10',
        carga_kg: ex.carga_kg
      }));

      const { error: exsErr } = await supabase.from('template_exercicios').insert(exsToInsert);
      if (exsErr) return { data: null, error: exsErr };

      return { data: savedTemplate as TemplateTreino, error: null };
    } else {
      const templates = loadMockTemplates();
      const allExs = loadMockTemplateExercicios();
      
      let savedTemplate: TemplateTreino;
      if (template.id) {
        const idx = templates.findIndex(t => t.id === template.id);
        savedTemplate = { 
          ...templates[idx], 
          titulo: template.titulo!, 
          descricao: template.descricao || null 
        };
        templates[idx] = savedTemplate;
        // Clean old exercises
        const filteredExs = allExs.filter(te => te.template_id !== template.id);
        allExs.length = 0;
        allExs.push(...filteredExs);
      } else {
        savedTemplate = {
          id: Math.floor(Math.random() * 100000),
          personal_id: template.personal_id!,
          titulo: template.titulo!,
          descricao: template.descricao || null,
          criado_em: new Date().toISOString()
        };
        templates.push(savedTemplate);
      }

      const newExs = exercicios.map((ex, idx) => ({
        id: Math.floor(Math.random() * 100000),
        template_id: savedTemplate.id,
        exercicio_id: ex.exercicio_id,
        ordem: idx,
        series: ex.series || 3,
        repeticoes: ex.repeticoes || '10',
        carga_kg: ex.carga_kg
      }));

      allExs.push(...newExs);
      localStorage.setItem('zenite_mock_templates', JSON.stringify(templates));
      localStorage.setItem('zenite_mock_template_exercicios', JSON.stringify(allExs));

      return { data: savedTemplate, error: null };
    }
  },

  async deleteTemplate(templateId: number): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('templates_treino').delete().eq('id', templateId);
      return { error };
    } else {
      const templates = loadMockTemplates();
      const allExs = loadMockTemplateExercicios();
      
      const filteredT = templates.filter(t => t.id !== templateId);
      const filteredE = allExs.filter(te => te.template_id !== templateId);
      
      localStorage.setItem('zenite_mock_templates', JSON.stringify(filteredT));
      localStorage.setItem('zenite_mock_template_exercicios', JSON.stringify(filteredE));
      return { error: null };
    }
  },

  async getMensagens(personalId: string, alunoId: string): Promise<{ data: Mensagem[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('personal_id', personalId)
        .eq('aluno_id', alunoId)
        .order('criado_em', { ascending: true });
      return { data, error };
    } else {
      const msgs = JSON.parse(localStorage.getItem('zenite_mock_mensagens') || '[]');
      const filtered = msgs.filter((m: any) => m.personal_id === personalId && m.aluno_id === alunoId);
      return { data: filtered, error: null };
    }
  },

  async enviarMensagem(payload: Partial<Mensagem>): Promise<{ data: Mensagem | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('mensagens')
        .insert(payload)
        .select()
        .single();
      return { data, error };
    } else {
      const msgs = JSON.parse(localStorage.getItem('zenite_mock_mensagens') || '[]');
      const newMsg = {
        ...payload,
        id: Math.floor(Math.random() * 1000000),
        criado_em: new Date().toISOString(),
        lida: false
      };
      msgs.push(newMsg);
      localStorage.setItem('zenite_mock_mensagens', JSON.stringify(msgs));
      return { data: newMsg as Mensagem, error: null };
    }
  },

  async marcarMensagensLidas(personalId: string, alunoId: string, autorIdNaoEh: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('mensagens')
        .update({ lida: true })
        .eq('personal_id', personalId)
        .eq('aluno_id', alunoId)
        .neq('autor_id', autorIdNaoEh)
        .eq('lida', false);
      return { error };
    } else {
      const msgs = JSON.parse(localStorage.getItem('zenite_mock_mensagens') || '[]');
      const updated = msgs.map((m: any) => {
        if (m.personal_id === personalId && m.aluno_id === alunoId && m.autor_id !== autorIdNaoEh) {
          return { ...m, lida: true };
        }
        return m;
      });
      localStorage.setItem('zenite_mock_mensagens', JSON.stringify(updated));
      return { error: null };
    }
  },

  async getConversasSumario(personalId: string): Promise<{ data: ConversaSumario[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Fetch all students for this personal
      const { data: alunos, error: alunosErr } = await supabase
        .from('alunos')
        .select('*, profiles(*)')
        .eq('personal_id', personalId);
      
      if (alunosErr) return { data: null, error: alunosErr };

      // Fetch last messages and unread counts
      // This is slightly inefficient in a single query without complex SQL, 
      // but for a few dozen students it's fine.
      const promises = (alunos || []).map(async (aluno: any) => {
        const { data: lastMsg } = await supabase
          .from('mensagens')
          .select('*')
          .eq('personal_id', personalId)
          .eq('aluno_id', aluno.id)
          .order('criado_em', { ascending: false })
          .limit(1)
          .single();

        const { count } = await supabase
          .from('mensagens')
          .select('*', { count: 'exact', head: true })
          .eq('personal_id', personalId)
          .eq('aluno_id', aluno.id)
          .neq('autor_id', personalId)
          .eq('lida', false);

        return {
          aluno_id: aluno.id,
          aluno_nome: aluno.profiles?.nome || 'Aluno',
          aluno_avatar: aluno.profiles?.avatar_url || null,
          ultima_mensagem: lastMsg || null,
          nao_lidas: count || 0
        };
      });

      const results = await Promise.all(promises);
      return { data: results, error: null };
    } else {
      const alunos = loadMockAlunos().filter(a => a.personal_id === personalId);
      const profiles = loadMockUsers();
      const msgs = JSON.parse(localStorage.getItem('zenite_mock_mensagens') || '[]');

      const results = alunos.map(aluno => {
        const profile = profiles.find(p => p.id === aluno.id);
        const alunoMsgs = msgs.filter((m: any) => m.personal_id === personalId && m.aluno_id === aluno.id);
        const sorted = [...alunoMsgs].sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
        const unread = alunoMsgs.filter((m: any) => m.autor_id !== personalId && !m.lida).length;

        return {
          aluno_id: aluno.id,
          aluno_nome: profile?.nome || 'Aluno',
          aluno_avatar: profile?.avatar_url || null,
          ultima_mensagem: sorted[0] || null,
          nao_lidas: unread
        };
      });

      return { data: results, error: null };
    }
  },

  async uploadArquivoMensagem(file: File, path: string): Promise<{ url: string | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.storage
        .from('mensagens')
        .upload(path, file);
      
      if (error) return { url: null, error };
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('mensagens').getPublicUrl(path);
      return { url: publicUrl, error: null };
    } else {
      // Mock upload
      return { url: URL.createObjectURL(file), error: null };
    }
  },

  subscribeMensagens(personalId: string, alunoId: string, callback: (msg: Mensagem) => void) {
    if (isSupabaseConfigured && supabase) {
      return supabase
        .channel(`chat_${personalId}_${alunoId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
            filter: `personal_id=eq.${personalId},aluno_id=eq.${alunoId}`
          },
          (payload) => callback(payload.new as Mensagem)
        )
        .subscribe();
    }
    return null;
  },

  async getCheckins(alunoId: string): Promise<{ data: Checkin[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('semana', { ascending: false });
      return { data, error };
    } else {
      const checkins = JSON.parse(localStorage.getItem('zenite_mock_checkins') || '[]');
      const filtered = checkins.filter((c: any) => c.aluno_id === alunoId);
      return { data: filtered, error: null };
    }
  },

  async getCheckinDaSemana(alunoId: string, semana: string): Promise<{ data: Checkin | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('semana', semana)
        .maybeSingle();
      return { data, error };
    } else {
      const checkins = JSON.parse(localStorage.getItem('zenite_mock_checkins') || '[]');
      const found = checkins.find((c: any) => c.aluno_id === alunoId && c.semana === semana);
      return { data: found || null, error: null };
    }
  },

  async salvarCheckin(checkin: Partial<Checkin>): Promise<{ data: Checkin | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('checkins')
        .upsert(checkin)
        .select()
        .single();
      return { data, error };
    } else {
      const checkins = JSON.parse(localStorage.getItem('zenite_mock_checkins') || '[]');
      const index = checkins.findIndex((c: any) => c.aluno_id === checkin.aluno_id && c.semana === checkin.semana);
      
      const newCheckin = {
        ...checkin,
        id: checkin.id || Math.floor(Math.random() * 1000000),
        criado_em: new Date().toISOString()
      };

      if (index >= 0) {
        checkins[index] = newCheckin;
      } else {
        checkins.push(newCheckin);
      }
      
      localStorage.setItem('zenite_mock_checkins', JSON.stringify(checkins));
      return { data: newCheckin as Checkin, error: null };
    }
  },

  async getHabitos(alunoId: string): Promise<{ data: Habito[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('habitos')
        .select('*, habitos_registros(*)')
        .eq('aluno_id', alunoId)
        .eq('ativo', true)
        .order('criado_em', { ascending: true });
      return { data, error };
    } else {
      const habitos = JSON.parse(localStorage.getItem('zenite_mock_habitos') || '[]');
      const filtered = habitos.filter((h: any) => h.aluno_id === alunoId && h.ativo !== false);
      const registros = JSON.parse(localStorage.getItem('zenite_mock_habitos_registros') || '[]');
      
      const data = filtered.map((h: any) => ({
        ...h,
        registros: registros.filter((r: any) => r.habito_id === h.id)
      }));
      
      return { data, error: null };
    }
  },

  async salvarHabito(habito: Partial<Habito>): Promise<{ data: Habito | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('habitos')
        .insert(habito)
        .select()
        .single();
      return { data, error };
    } else {
      const habitos = JSON.parse(localStorage.getItem('zenite_mock_habitos') || '[]');
      const newHabito = {
        ...habito,
        id: Math.floor(Math.random() * 1000000),
        criado_em: new Date().toISOString(),
        ativo: true
      };
      habitos.push(newHabito);
      localStorage.setItem('zenite_mock_habitos', JSON.stringify(habitos));
      return { data: newHabito as Habito, error: null };
    }
  },

  async toggleHabitoRegistro(habitoId: number, alunoId: string, data: string, concluido: boolean): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('habitos_registros')
        .upsert({ habito_id: habitoId, aluno_id: alunoId, data, concluido }, { onConflict: 'habito_id,aluno_id,data' });
      return { error };
    } else {
      const registros = JSON.parse(localStorage.getItem('zenite_mock_habitos_registros') || '[]');
      const index = registros.findIndex((r: any) => r.habito_id === habitoId && r.aluno_id === alunoId && r.data === data);
      
      if (index >= 0) {
        registros[index].concluido = concluido;
      } else {
        registros.push({
          id: Math.floor(Math.random() * 1000000),
          habito_id: habitoId,
          aluno_id: alunoId,
          data,
          concluido
        });
      }
      
      localStorage.setItem('zenite_mock_habitos_registros', JSON.stringify(registros));
      return { error: null };
    }
  },

  async desativarHabito(habitoId: number): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('habitos')
        .update({ ativo: false })
        .eq('id', habitoId);
      return { error };
    } else {
      const habitos = JSON.parse(localStorage.getItem('zenite_mock_habitos') || '[]');
      const index = habitos.findIndex((h: any) => h.id === habitoId);
      if (index >= 0) {
        habitos[index].ativo = false;
        localStorage.setItem('zenite_mock_habitos', JSON.stringify(habitos));
      }
      return { error: null };
    }
  },

  async getConquistas(): Promise<{ data: Conquista[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('conquistas').select('*');
      return { data, error };
    } else {
      const conquistas = [
        { id: 1, slug: 'primeiro_treino', nome: 'Primeiro Treino', descricao: 'Completou o primeiro treino no ZÊNITE', icone: '🔥' },
        { id: 2, slug: 'sequencia_3', nome: '3 em Sequência', descricao: '3 treinos seguidos sem falhar', icone: '⚡' },
        { id: 3, slug: 'sequencia_7', nome: 'Semana Perfeita', descricao: '7 treinos seguidos', icone: '🏆' },
        { id: 4, slug: 'primeiro_pr', nome: 'Primeiro PR', descricao: 'Bateu o primeiro recorde pessoal', icone: '💪' },
        { id: 5, slug: 'pr_5', nome: '5 Recordes', descricao: 'Bateu 5 recordes pessoais', icone: '🎯' },
        { id: 6, slug: '100_series', nome: '100 Séries', descricao: 'Completou 100 séries no total', icone: '💯' },
        { id: 7, slug: 'check_in_4', nome: 'Consistência', descricao: 'Fez check-in por 4 semanas seguidas', icone: '📋' },
        { id: 8, slug: 'habitos_7', nome: 'Hábito Formado', descricao: 'Manteve todos os hábitos por 7 dias', icone: '🌟' }
      ];
      return { data: conquistas as Conquista[], error: null };
    }
  },

  async getAlunoConquistas(alunoId: string): Promise<{ data: AlunoConquista[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('aluno_conquistas')
        .select('*, conquista:conquistas(*)')
        .eq('aluno_id', alunoId);
      return { data, error };
    } else {
      const key = `zenite_mock_conquistas_${alunoId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return { data, error: null };
    }
  },

  async desbloquearConquista(alunoId: string, conquistaSlug: string): Promise<{ data: AlunoConquista | null; error: any }> {
    const { data: allConquistas } = await this.getConquistas();
    const conquista = allConquistas?.find(c => c.slug === conquistaSlug);
    if (!conquista) return { data: null, error: 'Conquista não encontrada' };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('aluno_conquistas')
        .upsert({ aluno_id: alunoId, conquista_id: conquista.id }, { onConflict: 'aluno_id,conquista_id' })
        .select('*, conquista:conquistas(*)')
        .single();
      return { data, error };
    } else {
      const key = `zenite_mock_conquistas_${alunoId}`;
      const conquistas = JSON.parse(localStorage.getItem(key) || '[]');
      if (conquistas.some((c: any) => c.conquista_id === conquista.id)) {
        return { data: conquistas.find((c: any) => c.conquista_id === conquista.id), error: null };
      }
      const newConquista = {
        id: Math.floor(Math.random() * 1000000),
        aluno_id: alunoId,
        conquista_id: conquista.id,
        conquistado_em: new Date().toISOString(),
        conquista
      };
      conquistas.push(newConquista);
      localStorage.setItem(key, JSON.stringify(conquistas));
      return { data: newConquista as AlunoConquista, error: null };
    }
  },

  async getRecordesPessoais(alunoId: string): Promise<{ data: RecordePessoal[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Logic for PRs in Supabase would involve a view or complex query on workout sets
      // For now, let's assume a dedicated table or similar structure
      const { data, error } = await supabase
        .from('recordes_pessoais')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('data', { ascending: false });
      return { data, error };
    } else {
      const key = `zenite_mock_prs_${alunoId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return { data, error: null };
    }
  },

  async checkAndSavePR(alunoId: string, exercicioId: number, exercicioNome: string, cargaKg: number): Promise<{ isNewPR: boolean; data: RecordePessoal | null }> {
    const key = `zenite_mock_prs_${alunoId}`;
    const prs = JSON.parse(localStorage.getItem(key) || '[]');
    const existingPR = prs.find((p: any) => p.exercicio_id === exercicioId);

    if (!existingPR || cargaKg > existingPR.carga_kg) {
      const newPR = {
        id: existingPR?.id || Math.floor(Math.random() * 1000000),
        aluno_id: alunoId,
        exercicio_id: exercicioId,
        exercicio_nome: exercicioNome,
        carga_kg: cargaKg,
        data: new Date().toISOString()
      };

      if (existingPR) {
        const idx = prs.indexOf(existingPR);
        prs[idx] = newPR;
      } else {
        prs.push(newPR);
      }

      localStorage.setItem(key, JSON.stringify(prs));
      return { isNewPR: true, data: newPR as RecordePessoal };
    }

    return { isNewPR: false, data: null };
  },

  async getFotosProgresso(alunoId: string): Promise<{ data: FotoProgresso[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('fotos_progresso')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('registrado_em', { ascending: false });

      if (data && !error) {
        // Generate signed URLs for each photo
        const dataWithUrls = await Promise.all(data.map(async (foto) => {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('progresso')
            .createSignedUrl(foto.foto_url, 3600);
          return { ...foto, signed_url: signedData?.signedUrl };
        }));
        return { data: dataWithUrls, error: null };
      }
      return { data, error };
    } else {
      const key = `zenite_mock_fotos_${alunoId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      // Mock signed URL (just use base64 if it's there or a placeholder)
      const dataWithUrls = data.map((f: any) => ({ ...f, signed_url: f.foto_url }));
      return { data: dataWithUrls, error: null };
    }
  },

  async uploadFotoProgresso(alunoId: string, personalId: string, angulo: AnguloFoto, file: File | string): Promise<{ data: FotoProgresso | null; error: any }> {
    const fileName = `${alunoId}/${new Date().toISOString().split('T')[0]}/${angulo}_${Date.now()}.jpg`;

    if (isSupabaseConfigured && supabase && file instanceof File) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('progresso')
        .upload(fileName, file);

      if (uploadError) return { data: null, error: uploadError };

      const { data, error } = await supabase
        .from('fotos_progresso')
        .insert({
          aluno_id: alunoId,
          personal_id: personalId,
          foto_url: fileName,
          angulo,
          registrado_em: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      return { data, error };
    } else {
      // Mock: handle string (base64) or File
      let mockUrl = '';
      if (typeof file === 'string') {
        mockUrl = file;
      } else {
        mockUrl = URL.createObjectURL(file);
      }

      const key = `zenite_mock_fotos_${alunoId}`;
      const fotos = JSON.parse(localStorage.getItem(key) || '[]');
      const newFoto = {
        id: Math.floor(Math.random() * 1000000),
        aluno_id: alunoId,
        personal_id: personalId,
        foto_url: mockUrl,
        angulo,
        registrado_em: new Date().toISOString().split('T')[0]
      };
      fotos.push(newFoto);
      localStorage.setItem(key, JSON.stringify(fotos));
      return { data: newFoto as FotoProgresso, error: null };
    }
  },

  async updateFotoObservacao(fotoId: number, observacao: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('fotos_progresso')
        .update({ observacao })
        .eq('id', fotoId);
      return { error };
    } else {
      // Find and update in all aluno keys (mock is a bit messy here but functional)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('zenite_mock_fotos_')) {
          const fotos = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = fotos.findIndex((f: any) => f.id === fotoId);
          if (idx >= 0) {
            fotos[idx].observacao = observacao;
            localStorage.setItem(key, JSON.stringify(fotos));
            break;
          }
        }
      }
      return { error: null };
    }
  },

  async getPlanoAlimentarAtivo(alunoId: string): Promise<{ data: PlanoAlimentar | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('planos_alimentares')
        .select(`
          *,
          refeicoes:refeicoes_plano(
            *,
            alimentos:alimentos_refeicao(*)
          )
        `)
        .eq('aluno_id', alunoId)
        .eq('ativo', true)
        .maybeSingle();
      
      return { data, error };
    } else {
      const key = `zenite_mock_plano_${alunoId}`;
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      return { data, error: null };
    }
  },

  async savePlanoAlimentar(plano: Partial<PlanoAlimentar>): Promise<{ data: PlanoAlimentar | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      // Deactivate old plans
      await supabase
        .from('planos_alimentares')
        .update({ ativo: false })
        .eq('aluno_id', plano.aluno_id);

      // Insert new plan
      const { data, error } = await supabase
        .from('planos_alimentares')
        .insert({
          aluno_id: plano.aluno_id,
          personal_id: plano.personal_id,
          meta_calorias: plano.meta_calorias,
          meta_proteina: plano.meta_proteina,
          meta_carboidrato: plano.meta_carboidrato,
          meta_gordura: plano.meta_gordura,
          ativo: true
        })
        .select()
        .single();

      if (data && plano.refeicoes) {
        for (const ref of plano.refeicoes) {
          const { data: refData } = await supabase
            .from('refeicoes_plano')
            .insert({
              plano_id: data.id,
              nome: ref.nome,
              horario: ref.horario
            })
            .select()
            .single();
          
          if (refData && ref.alimentos) {
            await supabase
              .from('alimentos_refeicao')
              .insert(ref.alimentos.map(ali => ({
                refeicao_id: refData.id,
                nome: ali.nome,
                quantidade: ali.quantidade,
                calorias: ali.calorias,
                proteina: ali.proteina,
                carboidrato: ali.carboidrato,
                gordura: ali.gordura
              })));
          }
        }
      }
      return { data, error };
    } else {
      const key = `zenite_mock_plano_${plano.aluno_id}`;
      const newPlano = {
        ...plano,
        id: Math.floor(Math.random() * 1000000),
        criado_em: new Date().toISOString(),
        ativo: true
      };
      localStorage.setItem(key, JSON.stringify(newPlano));
      return { data: newPlano as PlanoAlimentar, error: null };
    }
  },

  async getRegistrosNutricao(alunoId: string, dataStr: string): Promise<{ data: RegistroNutricao[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('registros_nutricao')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('data', dataStr);
      return { data, error };
    } else {
      const key = `zenite_mock_registros_nutri_${alunoId}_${dataStr}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return { data, error: null };
    }
  },

  async saveRegistroNutricao(registro: Partial<RegistroNutricao>): Promise<{ data: RegistroNutricao | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('registros_nutricao')
        .insert(registro)
        .select()
        .single();
      return { data, error };
    } else {
      const dataStr = registro.data || new Date().toISOString().split('T')[0];
      const key = `zenite_mock_registros_nutri_${registro.aluno_id}_${dataStr}`;
      const registros = JSON.parse(localStorage.getItem(key) || '[]');
      const newReg = {
        ...registro,
        id: Math.floor(Math.random() * 1000000),
        criado_em: new Date().toISOString()
      };
      registros.push(newReg);
      localStorage.setItem(key, JSON.stringify(registros));
      return { data: newReg as RegistroNutricao, error: null };
    }
  },

  async getHistoricoCalorias(alunoId: string): Promise<{ data: { data: string; calorias: number }[] | null; error: any }> {
    // Return last 7 days calories
    if (isSupabaseConfigured && supabase) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('registros_nutricao')
        .select('data, calorias')
        .eq('aluno_id', alunoId)
        .gte('data', dateStr);
      
      if (data) {
        const grouped = data.reduce((acc: any, curr) => {
          acc[curr.data] = (acc[curr.data] || 0) + curr.calorias;
          return acc;
        }, {});
        const result = Object.keys(grouped).map(d => ({ data: d, calorias: grouped[d] }));
        return { data: result, error: null };
      }
      return { data: null, error };
    } else {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const key = `zenite_mock_registros_nutri_${alunoId}_${dStr}`;
        const regs = JSON.parse(localStorage.getItem(key) || '[]');
        const total = regs.reduce((acc: number, curr: any) => acc + curr.calorias, 0);
        result.push({ data: dStr, calorias: total });
      }
      return { data: result, error: null };
    }
  },
  
  async getHidratacaoHoje(alunoId: string, dataStr: string): Promise<{ data: RegistroHidratacao[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('registros_hidratacao')
        .select('*')
        .eq('aluno_id', alunoId)
        .eq('data', dataStr);
      return { data, error };
    } else {
      const key = `zenite_mock_hidra_${alunoId}_${dataStr}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return { data, error: null };
    }
  },

  async saveRegistroHidratacao(registro: Partial<RegistroHidratacao>): Promise<{ data: RegistroHidratacao | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('registros_hidratacao')
        .insert(registro)
        .select()
        .single();
      return { data, error };
    } else {
      const dataStr = registro.data || new Date().toISOString().split('T')[0];
      const key = `zenite_mock_hidra_${registro.aluno_id}_${dataStr}`;
      const registros = JSON.parse(localStorage.getItem(key) || '[]');
      const newReg = {
        ...registro,
        id: Math.floor(Math.random() * 1000000),
        criado_em: new Date().toISOString()
      };
      registros.push(newReg);
      localStorage.setItem(key, JSON.stringify(registros));
      return { data: newReg as RegistroHidratacao, error: null };
    }
  },

  async getHistoricoHidratacao(alunoId: string): Promise<{ data: { data: string; total: number }[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('registros_hidratacao')
        .select('data, quantidade_ml')
        .eq('aluno_id', alunoId)
        .gte('data', dateStr);
      
      if (data) {
        const grouped = data.reduce((acc: any, curr) => {
          acc[curr.data] = (acc[curr.data] || 0) + curr.quantidade_ml;
          return acc;
        }, {});
        const result = Object.keys(grouped).map(d => ({ data: d, total: grouped[d] }));
        return { data: result, error: null };
      }
      return { data: null, error };
    } else {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const key = `zenite_mock_hidra_${alunoId}_${dStr}`;
        const regs = JSON.parse(localStorage.getItem(key) || '[]');
        const total = regs.reduce((acc: number, curr: any) => acc + curr.quantidade_ml, 0);
        result.push({ data: dStr, total });
      }
      return { data: result, error: null };
    }
  },

  async getSessoesBemEstar(alunoId: string): Promise<{ data: SessaoBemEstar[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sessoes_bemestar')
        .select('*')
        .eq('aluno_id', alunoId)
        .gte('data', dateStr);
      return { data, error };
    } else {
      const key = `zenite_mock_bemestar_${alunoId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return { data, error: null };
    }
  },

  async saveSessaoBemEstar(sessao: Partial<SessaoBemEstar>): Promise<{ data: SessaoBemEstar | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('sessoes_bemestar')
        .insert(sessao)
        .select()
        .single();
      return { data, error };
    } else {
      const key = `zenite_mock_bemestar_${sessao.aluno_id}`;
      const sessoes = JSON.parse(localStorage.getItem(key) || '[]');
      const newSessao = {
        ...sessao,
        id: Math.floor(Math.random() * 1000000),
        criado_em: new Date().toISOString(),
        data: sessao.data || new Date().toISOString().split('T')[0]
      };
      sessoes.push(newSessao);
      localStorage.setItem(key, JSON.stringify(sessoes));
      return { data: newSessao as SessaoBemEstar, error: null };
    }
  },

  async getConteudosEducativos(personalId?: string | null): Promise<{ data: ConteudoEducativo[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('conteudos_educativos')
        .select('*')
        .eq('publicado', true);
      
      if (personalId !== undefined) {
        if (personalId === null) {
          query = query.is('personal_id', null);
        } else {
          // Both global and specific personal content
          query = query.or(`personal_id.is.null,personal_id.eq.${personalId}`);
        }
      }

      const { data, error } = await query.order('criado_em', { ascending: false });
      return { data: data as ConteudoEducativo[] | null, error };
    } else {
      const key = `zenite_mock_conteudo`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      let filtered = data.filter((c: any) => c.publicado);
      
      if (personalId !== undefined) {
        if (personalId === null) {
          filtered = filtered.filter((c: any) => c.personal_id === null);
        } else {
          filtered = filtered.filter((c: any) => c.personal_id === null || c.personal_id === personalId);
        }
      }
      
      return { data: filtered, error: null };
    }
  },

  async getConteudosPersonal(personalId: string): Promise<{ data: ConteudoEducativo[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('conteudos_educativos')
        .select('*')
        .eq('personal_id', personalId)
        .order('criado_em', { ascending: false });
      return { data: data as ConteudoEducativo[] | null, error };
    } else {
      const key = `zenite_mock_conteudo`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = data.filter((c: any) => c.personal_id === personalId);
      return { data: filtered, error: null };
    }
  },

  async saveConteudoEducativo(conteudo: Partial<ConteudoEducativo>): Promise<{ data: ConteudoEducativo | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('conteudos_educativos')
        .upsert({
          ...conteudo,
          criado_em: conteudo.criado_em || new Date().toISOString()
        })
        .select()
        .single();
      return { data, error };
    } else {
      const key = `zenite_mock_conteudo`;
      const conteudos = JSON.parse(localStorage.getItem(key) || '[]');
      let updated;
      
      if (conteudo.id) {
        const idx = conteudos.findIndex((c: any) => c.id === conteudo.id);
        if (idx >= 0) {
          updated = { ...conteudos[idx], ...conteudo };
          conteudos[idx] = updated;
        }
      } else {
        updated = {
          ...conteudo,
          id: Math.floor(Math.random() * 1000000),
          criado_em: new Date().toISOString(),
          publicado: conteudo.publicado ?? true
        };
        conteudos.push(updated);
      }
      
      localStorage.setItem(key, JSON.stringify(conteudos));
      return { data: updated as ConteudoEducativo, error: null };
    }
  },

  async deleteConteudoEducativo(id: number): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('conteudos_educativos')
        .delete()
        .eq('id', id);
      return { error };
    } else {
      const key = `zenite_mock_conteudo`;
      const conteudos = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = conteudos.filter((c: any) => c.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
      return { error: null };
    }
  },

  async getAgendamentosAluno(alunoId: string): Promise<{ data: Agendamento[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('data', { ascending: true })
        .order('horario', { ascending: true });
      return { data, error };
    } else {
      const key = `zenite_mock_agenda_${alunoId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return { data, error: null };
    }
  },

  async getAgendamentosPersonal(personalId: string): Promise<{ data: Agendamento[] | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, aluno:alunos(*)')
        .eq('personal_id', personalId)
        .order('data', { ascending: true })
        .order('horario', { ascending: true });
      return { data, error };
    } else {
      // Mock needs to join with alunos, let's simplify for mock
      const key = `zenite_mock_agenda_personal_${personalId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return { data, error: null };
    }
  },

  async saveAgendamento(agendamento: Partial<Agendamento>): Promise<{ data: Agendamento | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('agendamentos')
        .upsert({
          ...agendamento,
          criado_em: agendamento.criado_em || new Date().toISOString()
        })
        .select('*, aluno:alunos(*)')
        .single();
      return { data, error };
    } else {
      const personalId = agendamento.personal_id;
      const alunoId = agendamento.aluno_id;
      
      const pKey = `zenite_mock_agenda_personal_${personalId}`;
      const aKey = `zenite_mock_agenda_${alunoId}`;
      
      const pData = JSON.parse(localStorage.getItem(pKey) || '[]');
      const aData = JSON.parse(localStorage.getItem(aKey) || '[]');
      
      let updated;
      if (agendamento.id) {
        // Update
        updated = { ...agendamento }; // Simplified mock update
      } else {
        updated = {
          ...agendamento,
          id: Math.floor(Math.random() * 1000000),
          criado_em: new Date().toISOString(),
          status: agendamento.status || 'solicitado'
        };
        pData.push(updated);
        aData.push(updated);
      }
      
      localStorage.setItem(pKey, JSON.stringify(pData));
      localStorage.setItem(aKey, JSON.stringify(aData));
      
      return { data: updated as Agendamento, error: null };
    }
  },

  async updateStatusAgendamento(id: number, status: string, alunoId: string, personalId: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id);
      return { error };
    } else {
      const pKey = `zenite_mock_agenda_personal_${personalId}`;
      const aKey = `zenite_mock_agenda_${alunoId}`;
      
      const pData = JSON.parse(localStorage.getItem(pKey) || '[]');
      const aData = JSON.parse(localStorage.getItem(aKey) || '[]');
      
      const pIdx = pData.findIndex((a: any) => a.id === id);
      if (pIdx >= 0) pData[pIdx].status = status;
      
      const aIdx = aData.findIndex((a: any) => a.id === id);
      if (aIdx >= 0) aData[aIdx].status = status;
      
      localStorage.setItem(pKey, JSON.stringify(pData));
      localStorage.setItem(aKey, JSON.stringify(aData));
      
      return { error: null };
    }
  },

  async getResumoBemEstarAluno(alunoId: string): Promise<{ data: ResumoBemEstar | null; error: any }> {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const hojeObj = new Date();
      const diaSemana = hojeObj.getDay();
      const diff = hojeObj.getDate() - diaSemana;
      const inicioSemana = new Date(hojeObj.setDate(diff));
      const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];

      // Treino
      const { data: treinos } = await this.getTreinosAluno(alunoId);
      const treinosSemana = (treinos || []).filter(t => t.data_treino >= inicioSemanaStr);
      const concluido = treinosSemana.filter(t => t.status === 'concluido').length;
      const aderencia = treinosSemana.length > 0 ? (concluido / treinosSemana.length) * 100 : 100;
      const streak = (treinos || []).filter(t => t.status === 'concluido').length;

      // Nutricao
      const { data: plano } = await this.getPlanoAlimentarAtivo(alunoId);
      const { data: regsNutri } = await this.getRegistrosNutricao(alunoId, hoje);
      const consumidoNutri = (regsNutri || []).reduce((acc, r) => acc + r.calorias, 0);
      const metaNutri = plano?.meta_calorias || 2000;

      // Hidratacao
      const { data: regsHidra } = await this.getHidratacaoHoje(alunoId, hoje);
      const consumidoHidra = (regsHidra || []).reduce((acc, r) => acc + r.quantidade_ml, 0);
      const metaHidra = 2500;

      // Sono
      const { data: checkins } = await this.getCheckins(alunoId);
      const lastCheckin = checkins && checkins.length > 0 ? checkins[0] : null;
      const notaSono = lastCheckin?.qualidade_sono || 0;

      // Mente
      const { data: sessoes } = await this.getSessoesBemEstar(alunoId);
      const sessoesSemana = (sessoes || []).filter(s => s.data >= inicioSemanaStr);
      const minutosMente = sessoesSemana.reduce((acc, s) => acc + s.duracao_minutos, 0);

      // Habitos
      const { data: habitos } = await this.getHabitos(alunoId);
      const ativos = (habitos || []).filter(h => h.ativo);
      const concluidosHoje = ativos.filter(h => h.registros?.some(r => r.data === hoje && r.concluido)).length;
      const totalHabitos = ativos.length;

      // Weights: Treino 25%, Nutri 20%, Hidra 15%, Sono 15%, Mente 10%, Habitos 15%
      const pTreino = aderencia;
      const pNutri = metaNutri > 0 ? Math.min((consumidoNutri / metaNutri) * 100, 100) : 100;
      const pHidra = Math.min((consumidoHidra / metaHidra) * 100, 100);
      const pSono = (notaSono / 10) * 100;
      const pMente = Math.min((minutosMente / 60) * 100, 100);
      const pHabitos = totalHabitos > 0 ? (concluidosHoje / totalHabitos) * 100 : 100;

      const indice = Math.round(
        (pTreino * 0.25) + 
        (pNutri * 0.20) + 
        (pHidra * 0.15) + 
        (pSono * 0.15) + 
        (pMente * 0.10) + 
        (pHabitos * 0.15)
      );

      let nivel: 'Excelente' | 'Bom' | 'Atenção' = 'Atenção';
      if (indice >= 85) nivel = 'Excelente';
      else if (indice >= 60) nivel = 'Bom';

      const frases = {
        Excelente: "Você está no topo! Continue com essa disciplina inabalável.",
        Bom: "Ótimo desempenho! Pequenos ajustes e você chegará à excelência.",
        Atenção: "Momento de foco. Reajuste sua rotina para retomar o equilíbrio."
      };

      return {
        data: {
          indiceGeral: indice,
          nivel,
          detalhes: {
            treino: { valor: Math.round(aderencia), streak },
            nutricao: { consumido: consumidoNutri, meta: metaNutri },
            hidratacao: { consumido: consumidoHidra, meta: metaHidra },
            sono: { nota: notaSono },
            mente: { minutos: minutosMente },
            habitos: { concluidos: concluidosHoje, total: totalHabitos }
          },
          frase: frases[nivel]
        },
        error: null
      };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  async getResumoAlunosPersonal(personalId: string): Promise<{ data: any[] | null; error: any }> {
    const { data: alunos, error } = await this.getAlunos(personalId);
    if (error) return { data: null, error };

    const resumos = await Promise.all((alunos || []).map(async (aluno) => {
      const { data: resumo } = await this.getResumoBemEstarAluno(aluno.id);
      return {
        aluno_id: aluno.id,
        nome: aluno.profile?.nome || 'Aluno',
        avatar: aluno.profile?.avatar_url || null,
        resumo: resumo || null
      };
    }));

    return { data: resumos, error: null };
  }
};
