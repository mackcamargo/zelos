import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Anamnese } from '../types';
import { 
  ArrowLeft, ArrowRight, Save, ShieldAlert, Heart, Activity, 
  Target, Info, Check, AlertTriangle, ChevronRight, ClipboardList
} from 'lucide-react';

interface AnamneseFormProps {
  alunoId: string;
  onClose: () => void;
  onSave?: () => void;
  isPersonalEditing?: boolean; // If true, personal is editing on behalf of student
}

const COMMON_CHRONIC_DISEASES = [
  { id: 'hipertensao', label: 'Hipertensão' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'asma', label: 'Asma' },
  { id: 'artrose', label: 'Artrose' },
  { id: 'hernia_de_disco', label: 'Hérnia de disco' },
  { id: 'colesterol_alto', label: 'Colesterol alto' },
  { id: 'tireoide', label: 'Problemas de tireoide' },
  { id: 'outra', label: 'Outra' }
];

export function AnamneseForm({ alunoId, onClose, onSave, isPersonalEditing = false }: AnamneseFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Omit<Anamnese, 'criado_em' | 'updated_at'>>({
    aluno_id: alunoId,
    objetivo_principal: '',
    experiencia: 'nunca_treinou',
    tempo_sem_treinar: '',
    frequencia_semanal_desejada: 3,
    parq_problema_cardiaco: false,
    parq_dor_no_peito: false,
    parq_tontura_desmaio: false,
    parq_problema_osseo_articular: false,
    parq_medicamento_pressao: false,
    parq_outra_razao: false,
    parq_outra_razao_qual: '',
    possui_lesao: false,
    lesoes: '',
    cirurgias: '',
    doencas_cronicas: [],
    medicamentos: '',
    alergias: '',
    possui_liberacao_medica: false,
    fumante: false,
    consumo_alcool: 'nao',
    horas_sono: 8,
    nivel_atividade_diaria: 'sedentario',
    observacoes: ''
  });

  useEffect(() => {
    async function loadAnamnese() {
      if (alunoId) {
        setLoading(true);
        const { data, error } = await dbService.getAnamnese(alunoId);
        if (data) {
          setFormData({
            aluno_id: data.aluno_id,
            objetivo_principal: data.objetivo_principal || '',
            experiencia: data.experiencia || 'nunca_treinou',
            tempo_sem_treinar: data.tempo_sem_treinar || '',
            frequencia_semanal_desejada: Number(data.frequencia_semanal_desejada) || 3,
            parq_problema_cardiaco: !!data.parq_problema_cardiaco,
            parq_dor_no_peito: !!data.parq_dor_no_peito,
            parq_tontura_desmaio: !!data.parq_tontura_desmaio,
            parq_problema_osseo_articular: !!data.parq_problema_osseo_articular,
            parq_medicamento_pressao: !!data.parq_medicamento_pressao,
            parq_outra_razao: !!data.parq_outra_razao,
            parq_outra_razao_qual: data.parq_outra_razao_qual || '',
            possui_lesao: !!data.possui_lesao,
            lesoes: data.lesoes || '',
            cirurgias: data.cirurgias || '',
            doencas_cronicas: Array.isArray(data.doencas_cronicas) ? data.doencas_cronicas : [],
            medicamentos: data.medicamentos || '',
            alergias: data.alergias || '',
            possui_liberacao_medica: !!data.possui_liberacao_medica,
            fumante: !!data.fumante,
            consumo_alcool: data.consumo_alcool || 'nao',
            horas_sono: Number(data.horas_sono) || 8,
            nivel_atividade_diaria: data.nivel_atividade_diaria || 'sedentario',
            observacoes: data.observacoes || ''
          });
          setIsEditing(true);
        }
        setLoading(false);
      }
    }
    loadAnamnese();
  }, [alunoId]);

  const handleCheckboxChange = (field: keyof typeof formData, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Se parq_outra_razao mudar para falso, limpa o campo "qual"
      ...(field === 'parq_outra_razao' && !value ? { parq_outra_razao_qual: '' } : {}),
      // Se possui_lesao mudar para falso, limpa "lesoes"
      ...(field === 'possui_lesao' && !value ? { lesoes: '' } : {})
    }));
  };

  const handleDiseaseToggle = (diseaseId: string) => {
    setFormData(prev => {
      const current = prev.doencas_cronicas;
      const updated = current.includes(diseaseId)
        ? current.filter(id => id !== diseaseId)
        : [...current, diseaseId];
      return { ...prev, doencas_cronicas: updated };
    });
  };

  const hasParqPositive = 
    formData.parq_problema_cardiaco || 
    formData.parq_dor_no_peito || 
    formData.parq_tontura_desmaio || 
    formData.parq_problema_osseo_articular || 
    formData.parq_medicamento_pressao || 
    formData.parq_outra_razao;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Create valid object matching database expectations
      const payload: Anamnese = {
        ...formData,
        frequencia_semanal_desejada: Number(formData.frequencia_semanal_desejada) || 0,
        horas_sono: Number(formData.horas_sono) || 0
      };

      const { data, error } = await dbService.salvarAnamnese(payload);
      if (error) {
        alert('Erro ao salvar anamnese: ' + error.message);
      } else {
        if (onSave) onSave();
        onClose();
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, label: 'Objetivo' },
    { num: 2, label: 'PAR-Q' },
    { num: 3, label: 'Saúde' },
    { num: 4, label: 'Hábitos' }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#F26A1B] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-ink-2">Carregando dados da anamnese...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden max-w-3xl mx-auto shadow-2xl">
      {/* Header Form */}
      <div className="flex items-center justify-between pb-6 border-b border-line">
        <div>
          <h2 className="font-display font-bold text-xl text-ink">
            {isPersonalEditing ? 'Anamnese e Avaliação do Aluno' : (isEditing ? 'Atualizar Anamnese' : 'Responder Anamnese')}
          </h2>
          <p className="text-sm text-ink-2 mt-1">
            {isPersonalEditing ? 'Preencha os dados coletados na avaliação presencial' : 'Preencha com atenção para que seu treino seja prescrito com total segurança.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-surface-3 hover:bg-surface-2 text-ink-2 hover:text-ink flex items-center justify-center text-sm border border-white/5 transition-all"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-ink-3 uppercase tracking-wider">Etapa {step} de 4</span>
          <span className="text-xs font-semibold text-flame">{steps[step - 1].label}</span>
        </div>
        
        {/* Progress Line */}
        <div className="h-1 bg-white/5 rounded-full overflow-hidden flex gap-1">
          {steps.map(s => (
            <div 
              key={s.num} 
              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                s.num <= step ? 'bg-[#F26A1B]' : 'bg-white/5'
              }`}
            />
          ))}
        </div>

        {/* Desktop labels */}
        <div className="hidden sm:flex justify-between text-[11px] font-medium text-ink-3">
          {steps.map(s => (
            <span 
              key={s.num}
              className={`transition-colors ${s.num === step ? 'text-flame font-bold' : ''}`}
            >
              {s.num}. {s.label}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* STEP 1: OBJETIVO */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Objetivo Principal do Aluno</label>
              <textarea
                required
                placeholder="Ex: Redução de percentual de gordura, fortalecimento lombar, hipertrofia de membros inferiores..."
                value={formData.objetivo_principal}
                onChange={e => setFormData(prev => ({ ...prev, objetivo_principal: e.target.value }))}
                className="z-input w-full min-h-[100px] py-3.5 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Nível de Experiência em Musculação</label>
                <select
                  value={formData.experiencia}
                  onChange={e => setFormData(prev => ({ ...prev, experiencia: e.target.value as any }))}
                  className="z-input w-full cursor-pointer h-12"
                >
                  <option value="nunca_treinou">Nunca treinou (Sedentário)</option>
                  <option value="iniciante">Iniciante (menos de 6 meses)</option>
                  <option value="intermediario">Intermediário (6 meses a 2 anos)</option>
                  <option value="avancado">Avançado (mais de 2 anos)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Há quanto tempo está sem treinar?</label>
                <input
                  type="text"
                  placeholder="Ex: Treinando ativo, parado há 3 meses, nunca treinei..."
                  value={formData.tempo_sem_treinar}
                  onChange={e => setFormData(prev => ({ ...prev, tempo_sem_treinar: e.target.value }))}
                  className="z-input w-full h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Frequência Semanal Desejada ({formData.frequencia_semanal_desejada}x por semana)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, frequencia_semanal_desejada: num }))}
                    className={`flex-1 py-3 rounded-xl border font-mono text-sm font-bold transition-all ${
                      formData.frequencia_semanal_desejada === num
                        ? 'bg-accent border-line text-white shadow-sm'
                        : 'bg-surface-2 border border-line text-ink-2 hover:bg-surface-3'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PAR-Q */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="p-4 bg-raise border border-line rounded-2xl">
              <div className="flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-flame shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-ink">Questionário de prontidão para atividade física (PAR-Q)</h4>
                  <p className="text-xs text-ink-3 mt-1 leading-relaxed">
                    Responda com sinceridade às questões de segurança cardiovascular e osteomuscular abaixo.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 divide-y divide-line">
              {[
                { key: 'parq_problema_cardiaco', text: 'Algum médico já disse que você possui problema cardíaco?' },
                { key: 'parq_dor_no_peito', text: 'Você sente dor no peito ao praticar atividade física?' },
                { key: 'parq_tontura_desmaio', text: 'Você já teve tontura ou desmaio ao se exercitar?' },
                { key: 'parq_problema_osseo_articular', text: 'Você tem algum problema ósseo ou articular que possa piorar com exercício?' },
                { key: 'parq_medicamento_pressao', text: 'Você toma medicamento para pressão ou coração?' },
                { key: 'parq_outra_razao', text: 'Existe alguma outra razão pela qual você não deveria se exercitar?' }
              ].map((item, idx) => {
                const checked = !!(formData as any)[item.key];
                return (
                  <div key={item.key} className={`flex items-start justify-between gap-4 pt-3.5 ${idx === 0 ? 'pt-0' : ''}`}>
                    <p className="text-sm text-ink-2 leading-relaxed">{item.text}</p>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCheckboxChange(item.key as any, true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          checked
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-surface border-line text-ink-3 hover:bg-raise'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCheckboxChange(item.key as any, false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          !checked
                            ? 'bg-[#F26A1B]/10 border-[#F26A1B]/20 text-[#F26A1B]'
                            : 'bg-surface border-line text-ink-3 hover:bg-raise'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Se "outra razao" for sim, mostra campo livre */}
            {formData.parq_outra_razao && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Qual outra razão?</label>
                <input
                  required
                  type="text"
                  placeholder="Por favor, especifique qual a outra razão relatada..."
                  value={formData.parq_outra_razao_qual || ''}
                  onChange={e => setFormData(prev => ({ ...prev, parq_outra_razao_qual: e.target.value }))}
                  className="z-input w-full h-12"
                />
              </div>
            )}

            {/* Aviso âmbar se qualquer PAR-Q for positivo */}
            {hasParqPositive && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/25 rounded-2xl flex gap-3 text-amber-500 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed font-medium">
                  <p className="font-bold uppercase tracking-wide">Atenção Médica Recomendada</p>
                  <p className="mt-1">Recomendamos que você consulte um médico antes de iniciar ou modificar suas atividades físicas. Seu personal trainer será automaticamente alertado sobre essas condições.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SAÚDE */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-ink-3 uppercase tracking-wider">Possui alguma lesão física?</label>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCheckboxChange('possui_lesao', true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        formData.possui_lesao
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-surface border-line text-ink-3 hover:bg-raise'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckboxChange('possui_lesao', false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        !formData.possui_lesao
                          ? 'bg-[#F26A1B]/10 border-[#F26A1B]/20 text-[#F26A1B]'
                          : 'bg-surface border-line text-ink-3 hover:bg-raise'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {formData.possui_lesao && (
                  <textarea
                    required
                    placeholder="Especifique a lesão (ex: Condromalácia patelar grau 2, hérnia de disco L4-L5, tendinite no ombro)..."
                    value={formData.lesoes || ''}
                    onChange={e => setFormData(prev => ({ ...prev, lesoes: e.target.value }))}
                    className="z-input w-full min-h-[90px] py-3.5 resize-none animate-in slide-in-from-top-2 duration-200"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Cirurgias Anteriores</label>
                <textarea
                  placeholder="Se já realizou cirurgias, liste aqui..."
                  value={formData.cirurgias || ''}
                  onChange={e => setFormData(prev => ({ ...prev, cirurgias: e.target.value }))}
                  className="z-input w-full min-h-[90px] py-3.5 resize-none"
                />
              </div>
            </div>

            {/* Doencas Cronicas (multi-selection) */}
            <div className="space-y-3.5">
              <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Doenças Crônicas Diagnosticadas</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {COMMON_CHRONIC_DISEASES.map(dis => {
                  const active = formData.doencas_cronicas.includes(dis.id);
                  return (
                    <button
                      key={dis.id}
                      type="button"
                      onClick={() => handleDiseaseToggle(dis.id)}
                      className={`py-3 px-3.5 rounded-xl border text-xs font-semibold text-center transition-all flex items-center justify-between ${
                        active
                          ? 'bg-[#F26A1B]/15 border-[#F26A1B]/35 text-white shadow-sm'
                          : 'bg-surface border-line text-ink-2 hover:bg-raise'
                      }`}
                    >
                      <span>{dis.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[#F26A1B] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Medicamentos em Uso Contínuo</label>
                <input
                  type="text"
                  placeholder="Ex: Enalapril para pressão, metformina..."
                  value={formData.medicamentos || ''}
                  onChange={e => setFormData(prev => ({ ...prev, medicamentos: e.target.value }))}
                  className="z-input w-full h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Alergias Conocidas</label>
                <input
                  type="text"
                  placeholder="Ex: Alergia a AAS, látex, poeira, etc..."
                  value={formData.alergias || ''}
                  onChange={e => setFormData(prev => ({ ...prev, alergias: e.target.value }))}
                  className="z-input w-full h-12"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-raise border border-line rounded-2xl">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-ink">Possui Liberação Médica expressa?</span>
                <p className="text-xs text-ink-3">Atestado médico carimbado autorizando musculação de alta intensidade.</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCheckboxChange('possui_liberacao_medica', true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    formData.possui_liberacao_medica
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-surface border-line text-ink-3 hover:bg-raise'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckboxChange('possui_liberacao_medica', false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    !formData.possui_liberacao_medica
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                      : 'bg-surface border-line text-ink-3 hover:bg-raise'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: HÁBITOS & OBS */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-center justify-between p-4 bg-raise border border-line rounded-2xl">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-ink">Fumante?</span>
                  <p className="text-xs text-ink-3">Usa tabaco ou vapes.</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCheckboxChange('fumante', true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      formData.fumante
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-surface border-line text-ink-3 hover:bg-raise'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCheckboxChange('fumante', false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      !formData.fumante
                        ? 'bg-[#F26A1B]/10 border-[#F26A1B]/20 text-[#F26A1B]'
                        : 'bg-surface border-line text-ink-3 hover:bg-raise'
                    }`}
                  >
                    Não
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Frequência de Consumo de Álcool</label>
                <select
                  value={formData.consumo_alcool}
                  onChange={e => setFormData(prev => ({ ...prev, consumo_alcool: e.target.value as any }))}
                  className="z-input w-full h-12 cursor-pointer"
                >
                  <option value="nao">Não consumo</option>
                  <option value="social">Socialmente (finais de semana)</option>
                  <option value="frequente">Frequentemente (3x ou mais por semana)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Média de Horas de Sono por Noite</label>
                <input
                  type="number"
                  min="3"
                  max="16"
                  value={formData.horas_sono}
                  onChange={e => setFormData(prev => ({ ...prev, horas_sono: Number(e.target.value) || 0 }))}
                  className="z-input w-full h-12 num"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Nível de Atividade Diária</label>
                <select
                  value={formData.nivel_atividade_diaria}
                  onChange={e => setFormData(prev => ({ ...prev, nivel_atividade_diaria: e.target.value as any }))}
                  className="z-input w-full h-12 cursor-pointer"
                >
                  <option value="sedentario">Sedentário (Trabalho sentado, sem esforço físico)</option>
                  <option value="leve">Leve (Fica em pé às vezes, rotina tranquila)</option>
                  <option value="moderado">Moderado (Caminha bastante, rotina agitada)</option>
                  <option value="intenso">Intenso (Esforço físico pesado, trabalho manual)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-ink-3 uppercase tracking-wider block">Observações Livres e Histórico Geral</label>
              <textarea
                placeholder="Escreva aqui qualquer outra informação complementar relevante para o seu personal..."
                value={formData.observacoes || ''}
                onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                className="z-input w-full min-h-[100px] py-3.5 resize-none"
              />
            </div>
          </div>
        )}

        {/* Action controls */}
        <div className="flex justify-between items-center pt-6 border-t border-line">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              className="py-2.5 px-5 rounded-xl bg-raise hover:bg-surface border border-line text-ink-2 hover:text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev + 1)}
              className="py-2.5 px-5 rounded-xl bg-[#F26A1B] hover:bg-[#D45914] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ml-auto"
            >
              <span>Avançar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-5 rounded-xl bg-[#F26A1B] hover:bg-[#D45914] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 ml-auto"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Anamnese</span>
                </>
              )}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
