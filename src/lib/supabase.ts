import { 
  Profile, Aluno, PapelUsuario, TipoAvatar, Categoria, Exercicio, 
  TemplateTreino, TemplateExercicio, Checkin, Habito, HabitoRegistro, 
  Conquista, AlunoConquista, RecordePessoal, FotoProgresso, AnguloFoto, 
  PlanoAlimentar, RegistroNutricao, RegistroHidratacao, SessaoBemEstar, 
  ConteudoEducativo, Agendamento, ResumoBemEstar, Treino, TreinoExercicio 
} from '../types';

// Mock values for video placeholders
const V_BENCH = "data:video/mp4;base64,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AAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAACGZyZWUAAP93bWRhdAAAAq0GBf//qdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0xIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTIgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MCBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTAgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9MCB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTEga2V5aW50PTI1MCBrZXlpbnRfbWluPTI0IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9MTAgcmM9Y3JmIG1idHJlZT0xIGNyZj0zMC4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAdw2WIhAAr/5QBqWofAoz+2mvvArlebAUaR4jc7obEArNlAhCfNjoqAQS+/110D4ySJjbetGzucMV9SXVsWcNZ4QwHTTLjx7uHEIT65yOZqTlxTigT8E8ZzfV8eAr422eXAzlrcf125oJp3uY+O6ohOZIbLZT4XGUPSqu+e9CNi9MDyxZDpIWX/y3JXi+h2VWw1Y+KOf9LcQrUtvkEGgaaWeReR2GbTkR9/RpaDnWlevumM1gY7midPGAxZhaSYUo67AvKPLkMoVmSeoXP0WR5c+jmBN1HvJfman8VWR/R+7mu7Rc97Yii+lynyFe2LufQJW78BG4f8h4CTDTd9Y27efPUp1kevihFc2nKdWFUY+CgRe6CnBxmnDz2eypE/ASAW9VKyei1i4vdeMI2MvmROyBMbQpevzU0Z+J6HzsB06dwRC/pQDVcutb2nWfLvO6xwz0t/P+ZmrQbVnle5oaAzlR84pSHnLf+Uylrv+t/e022WLsV3ZQji5nFEdHMcvAE2Tq8w68xOoThaRfPYNh8Nyh9XZpPL2cVLcWU54Ksnp7lXIb0MYc10OR9Xzk8aJco4XXdIdeqYuR7xRgVPkfWB2H7PqQ9uqx8a31BjZw+GqDrguOmbvPWmZauFTvW6XdJKMERkaNeEYAo6qGzqq7gTLd2+0J5CGIr/9utLslMePaGL9jfcFbNjWOfZQT14ER3//83uLsjtjSOdeoLBrXNxL6UzbjRkBAuAri9z7+6dYtA3LvuGIWiBnF6cYwkf62jD2OJeeESl8QPdrNyhLEkjVwFqdPWekFIc6GyMRVkOwT34+YiY6I5ST4Anx3z/dYL5RON1uP6cG0udZETltwDxMovAybD/FRqHf7OjmOLC0ZEsfrBJ+3mevild3NJJQrnloknjoyVWDZwErXA1+3JW1hh+INpFpjQXUlqo4VTUmwiQzudlqFCeoMofBdZf7bwgl5QqhVJPdM0hUy6ze5sZ+tEyjkCzjG5nqjJR3bZDXgNmiAJ7j3qUAIxwe34kihjDqyDGxbIMM768oM+hiENMMu52uH62Fuo4NfBBs8fdiheKnGD5O5wvJ928AsK88bvRiqugYJ9t4yj5OzTkXFnBgBYuF3ro+t1FOtkJmeQnOUZaCca41d/ndMWbwEWslt55fRbPEhWsQCs0whHyrTTwx8slBQ8Ay36QHrS1yBmXMCGRXgZEvBMUK3ylb51xLYaZ5EV8SXW6RVxsBxxxKdToMvsdCHbXNqyYFisjIRRphPzpSDoUq9vSInD4WY97IBMLBXTX5MExetnKHw4o4+dg8w0/JQVHBcOBZ8PZb9zRdf0y0katqrDR9Yn9X+yiAdxFdQAP84WMZET1RiFmGg28MBQ4FXrw1QR8HTYsZJ4TguV8qiIAAACnx4x+BAAAAygGft0T/AAKEBrWcsf/p9Ldln9FAMXa47tSxafryTwOaFmuAOq2loGKVZlDJHreYAfru8zvxDR7acu1Xu6jDhlUO0JojI1uIyKKMmcHTIVRkkKrvBplbGmTX1sctpcpyDlCadwYGjmj92xC8ulAIq8jWM78ZT/3f2rXBfjTnBvNOWGXHa1QSVcJxNu2fETFZQwfoqE4Ve/mcQbT9PFBRDPuWVF7RJlMLBX0MbEcwZzC5L+ymAPcJ9r/aBWQm8a+fAq3UAJn/iCV1G0EAAAfbQZu8NExG/7w7uRaA5ASI6Zv/ReN1ygqpnEpKwJvHPUxzTEM4tc5PRMek5poZBiI5jzhE7NFg4fdU5Co97Lml/FIHZVLBc5vtmF24wXJfh71L0YSg0yQnHTRLmN32wCdgygvCGJMgc3bDADc70Lm2qKhNVYOjN611QGg93SSj1KhkEWpegypHYq0DbNuHLrdPa3u5sIPWexDp2qtee1Mtu+D5N/jJZJObVs6jIJ90ou5/@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";
const V_SQUAT = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAeibW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAD6AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAABsx0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAeAAAANWAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAA+gAAAEAAABAAAAAAZEbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAAwABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAF721pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAABa9zdGJsAAAAr3N0c2QAAAAAAAAAAQAAAJ9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAeADVgBIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAe/+EAGWdkAB6s2UHgbfmhAAADAAEAAAMAMA8WLZYBAAVo74RywP34+AAAAAAUYnRydAAAAAAAAf7eAAH+3gAAABhzdHRzAAAAAAAAAAEAAABgAAACAAAAABRzdHNzAAAAAAAAAAEAAAABAAADCGN0dHMAAAAAAAAAXwAAAAEAAAQAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAKAAAAAAEAAAQAAAAAAQAAAAAAAAABAAACAAAAAAEAAAgAAAAAAgAAAgAAAAAcc3RzYwAAAAAAAAAB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@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";

// --- LOCAL PERSISTENCE BACKEND ---
// This service now exclusively uses localStorage for data persistence.

export const isSupabaseConfigured = false;
export const supabase = null;

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
    const users = loadMockUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { data: null, error: { message: 'Este email já está cadastrado.' } };
    }

    let personalIdToLink: string | null = 'personal-demo-id';
    if (papel === 'aluno' && codigoConvite) {
      const convites = loadMockConvites();
      const convite = convites.find((c: any) => c.codigo.trim().toUpperCase() === codigoConvite.trim().toUpperCase());
      if (!convite) {
        return { data: null, error: { message: 'Código de convite inválido ou não encontrado.' } };
      }
      if (convite.usado) {
        return { data: null, error: { message: 'Este código de convite já foi utilizado.' } };
      }
      personalIdToLink = convite.personal_id;
      convite.usado = true;
      save('zenite_mock_convites', convites);
    }

    const newUser: MockUser = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      email,
      nome,
      papel,
      avatar_tipo,
      avatar_url: null,
      criado_em: new Date().toISOString()
    };
    users.push(newUser);
    save('zenite_mock_users', users);

    if (papel === 'aluno') {
      const alunos = loadMockAlunos();
      alunos.push({
        id: newUser.id,
        personal_id: personalIdToLink,
        objetivo: 'Objetivo inicial',
        ativo: true,
        profile: { ...newUser, avatar_tipo: newUser.avatar_tipo || 'masculino' }
      });
      save('zenite_mock_alunos', alunos);
    }

    const session = { user: { id: newUser.id, email, user_metadata: { nome, papel, avatar_tipo } } };
    save('zenite_mock_session', session);
    return { data: session, error: null };
  },

  async signIn(email: string, _password?: string) {
    const users = loadMockUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { data: null, error: { message: 'Usuário não encontrado.' } };
    }
    const session = { user: { id: user.id, email: user.email, user_metadata: { nome: user.nome, papel: user.papel, avatar_tipo: user.avatar_tipo } } };
    save('zenite_mock_session', session);
    return { data: session, error: null };
  },

  async signOut() {
    localStorage.removeItem('zenite_mock_session');
    return { error: null };
  },

  async getCurrentUser() {
    const sessionStr = localStorage.getItem('zenite_mock_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      return session.user;
    }
    return null;
  }
};

export const dbService = {
  async getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
    const users = loadMockUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      return { data: { ...user, avatar_tipo: user.avatar_tipo || 'masculino' } as Profile, error: null };
    }
    return { data: null, error: { message: 'Profile not found' } };
  },

  async getAlunos(personalId: string): Promise<{ data: Aluno[] | null; error: any }> {
    const alunos = loadMockAlunos();
    const filtered = alunos.filter(a => a.personal_id === personalId);
    return { data: filtered, error: null };
  },

  async updateAlunoObjetivo(alunoId: string, objetivo: string): Promise<{ data: any; error: any }> {
    const alunos = loadMockAlunos();
    const index = alunos.findIndex(a => a.id === alunoId);
    if (index >= 0) {
      alunos[index].objetivo = objetivo;
      save('zenite_mock_alunos', alunos);
      return { data: alunos[index], error: null };
    }
    return { data: null, error: { message: 'Aluno não encontrado' } };
  },

  async getAlunoObjetivo(alunoId: string): Promise<{ objetivo: string | null }> {
    const alunos = loadMockAlunos();
    const found = alunos.find(a => a.id === alunoId);
    return { objetivo: found?.objetivo || 'Foco em saúde' };
  },

  async updateAlunoAtivo(alunoId: string, ativo: boolean): Promise<{ data: any; error: any }> {
    const alunos = loadMockAlunos();
    const index = alunos.findIndex(a => a.id === alunoId);
    if (index >= 0) {
      alunos[index].ativo = ativo;
      save('zenite_mock_alunos', alunos);
      return { data: alunos[index], error: null };
    }
    return { data: null, error: { message: 'Aluno não encontrado' } };
  },

  async removeAluno(alunoId: string): Promise<{ error: any }> {
    const alunos = loadMockAlunos();
    const index = alunos.findIndex(a => a.id === alunoId);
    if (index >= 0) {
      alunos[index].personal_id = null;
      save('zenite_mock_alunos', alunos);
      return { error: null };
    }
    return { error: { message: 'Aluno não encontrado' } };
  },

  async createConvite(personalId: string): Promise<{ data: any; error: any }> {
    const convites = loadMockConvites();
    const codigo = `ZEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newConvite = {
      id: Math.floor(Math.random() * 1000000),
      personal_id: personalId,
      codigo,
      usado: false,
      criado_em: new Date().toISOString()
    };
    convites.push(newConvite);
    save('zenite_mock_convites', convites);
    return { data: newConvite, error: null };
  },

  async getConvites(personalId: string): Promise<{ data: any; error: any }> {
    const convites = loadMockConvites();
    const filtered = convites.filter((c: any) => c.personal_id === personalId);
    return { data: filtered, error: null };
  },

  async getCategorias(): Promise<{ data: Categoria[] | null; error: any }> {
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

  async getTreinosParaAluno(alunoId: string): Promise<{ data: Treino[] | null; error: any }> {
    const treinos = load('zenite_mock_treinos', []);
    const filtered = treinos.filter((t: any) => t.aluno_id === alunoId);
    return { data: filtered, error: null };
  },

  async getTreinoCompleto(treinoId: string): Promise<{ data: any; error: any }> {
    const treinos = load('zenite_mock_treinos', []);
    const workout = treinos.find((t: any) => t.id === treinoId);
    if (!workout) return { data: null, error: { message: 'Workout not found' } };
    
    const workoutExercises = load('zenite_mock_treino_exercicios', []);
    const exercises = (await this.getAllExercicios()).data || [];
    
    const detailed = workoutExercises
      .filter((te: any) => te.treino_id === treinoId)
      .map((te: any) => ({
        ...te,
        exercicio: exercises.find((ex: any) => ex.id === te.exercicio_id)
      }));
      
    return { data: { ...workout, exercicios: detailed }, error: null };
  },

  async saveTreino(treino: any, exercicios: any[]): Promise<{ data: any; error: any }> {
    const treinos = load('zenite_mock_treinos', []);
    const id = treino.id || 'w-' + Math.random().toString(36).substring(2, 9);
    const newTreino = { ...treino, id, criado_em: treino.criado_em || new Date().toISOString() };
    
    const index = treinos.findIndex((t: any) => t.id === id);
    if (index >= 0) treinos[index] = newTreino;
    else treinos.push(newTreino);
    save('zenite_mock_treinos', treinos);

    const workoutExercises = load('zenite_mock_treino_exercicios', []);
    const filtered = workoutExercises.filter((te: any) => te.treino_id !== id);
    const newWE = exercicios.map((ex, idx) => ({
      ...ex,
      id: ex.id || 'te-' + Math.random().toString(36).substring(2, 9),
      treino_id: id,
      ordem: idx
    }));
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
    const templates = load('zenite_mock_templates', []);
    return { data: templates.filter((t: any) => t.personal_id === personalId), error: null };
  },

  async saveTemplate(template: any, exercicios: any[]): Promise<{ data: any; error: any }> {
    const templates = load('zenite_mock_templates', []);
    const id = template.id || Math.floor(Math.random() * 1000000);
    const newTemplate = { ...template, id, criado_em: template.criado_em || new Date().toISOString() };
    
    const index = templates.findIndex((t: any) => t.id === id);
    if (index >= 0) templates[index] = newTemplate;
    else templates.push(newTemplate);
    save('zenite_mock_templates', templates);

    const templateExercises = load('zenite_mock_template_exercicios', []);
    const filtered = templateExercises.filter((te: any) => te.template_id !== id);
    const newTE = exercicios.map((ex, idx) => ({
      ...ex,
      id: ex.id || Math.floor(Math.random() * 1000000),
      template_id: id,
      ordem: idx
    }));
    save('zenite_mock_template_exercicios', [...filtered, ...newTE]);
    
    return { data: newTemplate, error: null };
  },

  async getTemplateCompleto(templateId: number): Promise<{ data: any; error: any }> {
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
    const templates = load('zenite_mock_templates', []);
    save('zenite_mock_templates', templates.filter((t: any) => t.id !== templateId));
    return { error: null };
  },

  async getSeriesRealizadas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    const series = load('zenite_series_realizadas', []);
    return { data: series.filter((s: any) => s.aluno_id === alunoId), error: null };
  },

  async salvarSerieRealizada(serie: any): Promise<{ error: any }> {
    const series = load('zenite_series_realizadas', []);
    const key = `${serie.treino_exercicio_id}_${serie.numero_serie}`;
    const index = series.findIndex((s: any) => `${s.treino_exercicio_id}_${s.numero_serie}` === key && s.aluno_id === serie.aluno_id);
    
    if (index >= 0) {
      series[index] = { ...series[index], ...serie };
    } else {
      series.push({ id: Math.random().toString(36).substring(2, 9), ...serie });
    }
    save('zenite_series_realizadas', series);
    return { error: null };
  },

  async updateTreinoStatus(treinoId: string, status: string): Promise<{ error: any }> {
    const treinos = load('zenite_mock_treinos', []);
    const index = treinos.findIndex((t: any) => t.id === treinoId);
    if (index >= 0) {
      treinos[index].status = status;
      save('zenite_mock_treinos', treinos);
    }
    return { error: null };
  },

  async getHabitos(alunoId: string): Promise<{ data: Habito[] | null; error: any }> {
    const habitos = load('zenite_habitos', []);
    const registros = load('zenite_habitos_registros', []);
    const filtered = habitos.filter((h: any) => h.aluno_id === alunoId);
    const detailed = filtered.map((h: any) => ({
      ...h,
      registros: registros.filter((r: any) => r.habito_id === h.id)
    }));
    return { data: detailed, error: null };
  },

  async salvarRegistroHabito(registro: any): Promise<{ error: any }> {
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
    const checkins = load('zenite_checkins', []);
    checkins.push({ id: Math.floor(Math.random() * 1000000), ...checkin });
    save('zenite_checkins', checkins);
    return { error: null };
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

  async getConteudoEducativo(): Promise<{ data: ConteudoEducativo[] | null; error: any }> {
    const contents = load('zenite_conteudos', [
      {
        id: 1,
        titulo: 'O poder da consistência',
        descricao: 'Por que treinar 3x por semana vence treinar 5x por uma semana.',
        tipo: 'artigo',
        categoria: 'Geral',
        capa_url: null,
        publicado: true,
        criado_em: new Date().toISOString()
      }
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
    const metricas = load('zenite_metricas', []);
    return { data: metricas.filter((m: any) => m.aluno_id === alunoId), error: null };
  },

  async salvarMetrica(metrica: any): Promise<{ error: any }> {
    const metricas = load('zenite_metricas', []);
    metricas.push({ id: 'm-' + Math.random().toString(36).substring(2, 9), ...metrica });
    save('zenite_metricas', metricas);
    return { error: null };
  },

  async getSeriesRealizadasDetalhadas(alunoId: string): Promise<{ data: any[] | null; error: any }> {
    const series = load('zenite_series_realizadas', []);
    const filtered = series.filter((s: any) => s.aluno_id === alunoId);
    return { data: filtered, error: null };
  },

  async saveConteudoEducativo(conteudo: any): Promise<{ data: any; error: any }> {
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
    const habitos = load('zenite_habitos', []);
    habitos.push({ id: Math.floor(Math.random() * 1000000), ...habito });
    save('zenite_habitos', habitos);
    return { error: null };
  },

  async desativarHabito(id: number): Promise<{ error: any }> {
    const habitos = load('zenite_habitos', []);
    const index = habitos.findIndex((h: any) => h.id === id);
    if (index >= 0) {
      habitos[index].ativo = false;
      save('zenite_habitos', habitos);
    }
    return { error: null };
  },

  async getPlanoAlimentarAtivo(alunoId: string): Promise<{ data: PlanoAlimentar | null; error: any }> {
    const planos = load('zenite_planos_alimentares', []);
    const found = planos.find((p: any) => p.aluno_id === alunoId && p.ativo);
    return { data: found || null, error: null };
  },

  async savePlanoAlimentar(plano: any): Promise<{ error: any }> {
    const planos = load('zenite_planos_alimentares', []);
    planos.push({ id: Math.floor(Math.random() * 1000000), ...plano });
    save('zenite_planos_alimentares', planos);
    return { error: null };
  },

  async toggleHabitoRegistro(habitoId: number, alunoId: string, data: string, concluido: boolean): Promise<{ error: any }> {
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
    const registros = load('zenite_hidratacao', []);
    const targetDate = data || new Date().toISOString().split('T')[0];
    const filtered = registros.filter((r: any) => r.aluno_id === alunoId && r.data === targetDate);
    return { data: filtered, error: null };
  },

  async getHistoricoHidratacao(alunoId: string): Promise<{ data: any[]; error: any }> {
    const registros = load('zenite_hidratacao', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async saveRegistroHidratacao(registro: any): Promise<{ data: any; error: any }> {
    const registros = load('zenite_hidratacao', []);
    const newR = { id: Math.floor(Math.random() * 1000000), ...registro };
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

  async getRegistrosNutricao(alunoId: string, data: string): Promise<{ data: RegistroNutricao[]; error: any }> {
    const registros = load('zenite_nutricao', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId && r.data === data), error: null };
  },

  async getHistoricoCalorias(alunoId: string): Promise<{ data: any[]; error: any }> {
    const registros = load('zenite_nutricao', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async saveRegistroNutricao(registro: any): Promise<{ error: any }> {
    const registros = load('zenite_nutricao', []);
    registros.push({ id: Math.floor(Math.random() * 1000000), ...registro });
    save('zenite_nutricao', registros);
    return { error: null };
  },

  async getResumoBemEstarAluno(alunoId: string): Promise<{ data: ResumoBemEstar | null; error: any }> {
    return this.getResumoBemEstar(alunoId);
  },

  async getCheckins(alunoId: string): Promise<{ data: Checkin[]; error: any }> {
    const checkins = load('zenite_checkins', []);
    return { data: checkins.filter((c: any) => c.aluno_id === alunoId), error: null };
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

  async getConteudosEducativos(categoria?: string): Promise<{ data: ConteudoEducativo[]; error: any }> {
    const contents = load('zenite_conteudos', []);
    if (categoria && categoria !== 'Todas') {
      return { data: contents.filter((c: any) => c.categoria === categoria), error: null };
    }
    return { data: contents, error: null };
  },

  async getFotosProgresso(alunoId: string): Promise<{ data: FotoProgresso[]; error: any }> {
    const fotos = load('zenite_fotos_progresso', []);
    return { data: fotos.filter((f: any) => f.aluno_id === alunoId), error: null };
  },

  async updateFotoObservacao(id: string | number, observacao: string): Promise<{ error: any }> {
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
    const fotos = load('zenite_fotos_progresso', []);
    const newFotos = fotos.filter((f: any) => f.id !== id.toString());
    save('zenite_fotos_progresso', newFotos);
    return { error: null };
  },

  async uploadFotoProgresso(alunoId: string, personalId: string | null, angulo: any, file: File | string, observacao?: string): Promise<{ error: any }> {
    const fotos = load('zenite_fotos_progresso', []);
    fotos.push({
      id: Math.random().toString(36).substring(2, 9),
      aluno_id: alunoId,
      angulo,
      foto_url: typeof file === 'string' ? file : 'mock-url',
      observacao,
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

  async getConquistas(): Promise<{ data: Conquista[]; error: any }> {
    const conquistas = load('zenite_conquistas', [
      { id: 'c1', nome: 'Iniciante', descricao: 'Primeiro treino realizado', icone: 'award', pontos: 10 },
      { id: 'c2', nome: 'Consistente', descricao: '5 treinos na semana', icone: 'flame', pontos: 50 }
    ]);
    return { data: conquistas, error: null };
  },

  async getAlunoConquistas(alunoId: string): Promise<{ data: AlunoConquista[]; error: any }> {
    const registros = load('zenite_aluno_conquistas', []);
    return { data: registros.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async getRecordesPessoais(alunoId: string): Promise<{ data: RecordePessoal[]; error: any }> {
    const prs = load('zenite_prs', []);
    return { data: prs.filter((r: any) => r.aluno_id === alunoId), error: null };
  },

  async desbloquearConquista(alunoId: string, conquistaId: string): Promise<{ data: any; error: any }> {
    const registros = load('zenite_aluno_conquistas', []);
    if (!registros.some((r: any) => r.aluno_id === alunoId && r.conquista_id === conquistaId)) {
      const newRec = {
        id: Math.random().toString(36).substring(2, 9),
        aluno_id: alunoId,
        conquista_id: conquistaId,
        conquistado_em: new Date().toISOString()
      };
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

  async getConteudosPersonal(personalId: string): Promise<{ data: ConteudoEducativo[]; error: any }> {
    const contents = load('zenite_conteudos', []);
    return { data: contents, error: null };
  },

  async deleteConteudoEducativo(id: number | string): Promise<{ error: any }> {
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
