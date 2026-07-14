export type PapelUsuario = 'personal' | 'aluno';
export type TipoAvatar = 'masculino' | 'feminino';

export interface Profile {
  id: string;
  papel: PapelUsuario;
  nome: string;
  avatar_url: string | null;
  avatar_tipo: TipoAvatar | null;
  criado_em: string;
}

export interface Personal {
  id: string;
  plano: string | null;
  assinatura_status: string | null;
  assinatura_expira_em: string | null;
}

export interface Aluno {
  id: string;
  personal_id: string | null;
  objetivo: string | null;
  ativo: boolean;
  // Joined from profiles
  profile?: Profile;
}

export interface Categoria {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
}

export interface Exercicio {
  id: string;
  nome: string;
  categoria_id: string;
  personal_id: string | null;
  video_url_masc: string | null;
  video_url_fem: string | null;
  musculo_primario: string[];
  musculo_secundario: string[];
  dicas: string[];
}

export type TreinoStatus = 'rascunho' | 'publicado' | 'concluido';

export interface Treino {
  id: string;
  aluno_id: string;
  personal_id: string;
  titulo: string;
  nome?: string; // fallback if needed
  data_treino: string;
  status: TreinoStatus;
  criado_em: string;
  exercicios?: TreinoExercicioDetailed[];
}

export interface TreinoExercicio {
  id?: string;
  treino_id: string;
  exercicio_id: string;
  ordem: number;
  series: number;
  repeticoes: string;
  carga_kg?: number | null;
}

export interface TreinoExercicioDetailed extends TreinoExercicio {
  exercicio?: Exercicio;
}

export interface TemplateTreino {
  id: number;
  personal_id: string;
  titulo: string;
  descricao: string | null;
  criado_em: string;
  exercicios?: TemplateExercicioDetailed[];
}

export interface TemplateExercicio {
  id?: number;
  template_id: number;
  exercicio_id: string;
  ordem: number;
  series: number;
  repeticoes: string;
  carga_kg?: number | null;
}

export interface TemplateExercicioDetailed extends TemplateExercicio {
  exercicio?: Exercicio;
}

export interface Habito {
  id: number;
  personal_id: string;
  aluno_id: string;
  nome: string;
  icone: string;
  meta_diaria: string | null;
  ativo: boolean;
  criado_em: string;
  registros?: HabitoRegistro[];
}

export interface HabitoRegistro {
  id: number;
  habito_id: number;
  aluno_id: string;
  data: string;
  concluido: boolean;
}

export interface Checkin {
  id: number;
  aluno_id: string;
  personal_id: string;
  semana: string; // ISO Date of the start of the week
  energia: number;
  qualidade_sono: number;
  nivel_estresse: number;
  dores: string | null;
  observacoes: string | null;
  peso_kg: number | null;
  criado_em: string;
}

export interface Conquista {
  id: number;
  slug: string;
  nome: string;
  descricao: string;
  icone: string;
}

export interface AlunoConquista {
  id: number;
  aluno_id: string;
  conquista_id: number;
  conquistado_em: string;
  conquista?: Conquista;
}

export interface RecordePessoal {
  id: number;
  aluno_id: string;
  exercicio_id: number;
  carga_kg: number;
  data: string;
  exercicio_nome?: string;
}

export interface PlanoAlimentar {
  id: number;
  aluno_id: string;
  personal_id: string;
  meta_calorias: number;
  meta_proteina: number;
  meta_carboidrato: number;
  meta_gordura: number;
  ativo: boolean;
  criado_em: string;
  refeicoes?: RefeicaoPlano[];
}

export interface RefeicaoPlano {
  id: number;
  plano_id: number;
  nome: string;
  horario: string;
  ordem?: number;
  alimentos?: AlimentoRefeicao[];
}

export interface AlimentoRefeicao {
  id: number;
  refeicao_id: number;
  nome: string;
  quantidade: string;
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
}

export interface RegistroNutricao {
  id: number;
  aluno_id: string;
  nome: string;
  calorias: number;
  data: string;
  criado_em: string;
}

export interface RegistroHidratacao {
  id: number;
  aluno_id: string;
  quantidade_ml: number;
  data: string;
  criado_em: string;
}

export interface SessaoBemEstar {
  id: number;
  aluno_id: string;
  tipo: 'respiracao' | 'meditacao';
  duracao_minutos: number;
  data: string;
  criado_em: string;
}

export type StatusAgendamento = 'solicitado' | 'confirmado' | 'cancelado';
export type TipoSessao = 'presencial' | 'online';

export interface Agendamento {
  id: number;
  aluno_id: string;
  personal_id: string;
  data: string;
  horario: string;
  tipo: TipoSessao;
  status: StatusAgendamento;
  observacao: string | null;
  criado_em: string;
  aluno?: Aluno;
}

export interface ResumoBemEstar {
  indiceGeral: number;
  nivel: 'Excelente' | 'Bom' | 'Atenção';
  detalhes: {
    treino: { valor: number; streak: number };
    nutricao: { consumido: number; meta: number };
    hidratacao: { consumido: number; meta: number };
    sono: { nota: number };
    mente: { minutos: number };
    habitos: { concluidos: number; total: number };
  };
  frase: string;
}

export type TipoConteudo = 'artigo' | 'video';
export type CategoriaConteudo = 'Nutrição' | 'Treino' | 'Lesão' | 'Motivação' | 'Geral';

export interface ConteudoEducativo {
  id: number;
  personal_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: TipoConteudo;
  categoria: CategoriaConteudo;
  capa_url: string | null;
  corpo_texto: string | null;
  conteudo?: string | null;
  video_url: string | null;
  publicado: boolean;
  criado_em: string;
  capa_signed_url?: string;
}

export type AnguloFoto = 'frontal' | 'lateral' | 'costas';

export interface FotoProgresso {
  id: number;
  aluno_id: string;
  personal_id: string;
  foto_url: string; // Path in the bucket
  angulo: AnguloFoto;
  registrado_em: string;
  observacao?: string;
  signed_url?: string; // Temporary URL for display
}

