import React, { useState, useEffect, useRef } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Mensagem } from '../types';
import { Send, MessageSquare, Clock, Pencil, Trash2, X, Check, MoreVertical, Paperclip, Camera } from 'lucide-react';
import { tocar } from '../lib/som';

const compressImage = (file: File, maxWidth = 1280, maxHeight = 1280): Promise<Blob | File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => {
        resolve(file);
      };
    };
    reader.onerror = () => {
      resolve(file);
    };
  });
};

interface ChatAlunoProps {
  userId: string;
}

export default function ChatAluno({ userId }: ChatAlunoProps) {
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [inputText, setInputText] = useState('');
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [personalProfile, setPersonalProfile] = useState<{ nome: string; avatar_tipo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit and Delete States
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Image Upload and Preview States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch signed URLs when messages change
  useEffect(() => {
    const fetchUrls = async () => {
      const imageMsgs = messages.filter(m => m.tipo === 'imagem' && m.arquivo_url && !m.excluida);
      if (imageMsgs.length === 0) return;
      
      const newUrls = { ...signedUrls };
      let changed = false;
      
      for (const msg of imageMsgs) {
        const path = msg.arquivo_url!;
        if (newUrls[path]) continue;
        
        if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) {
          newUrls[path] = path;
          changed = true;
        } else if (isSupabaseConfigured && supabase) {
          try {
            const { data, error } = await supabase.storage.from('chat').createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              newUrls[path] = data.signedUrl;
              changed = true;
            }
          } catch (err) {
            console.error('Error getting signed URL:', err);
          }
        } else {
          newUrls[path] = path;
          changed = true;
        }
      }
      
      if (changed) {
        setSignedUrls(newUrls);
      }
    };
    fetchUrls();
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    
    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed as File);
      
      const previewUrl = URL.createObjectURL(compressed);
      setSelectedPreview(previewUrl);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setErrorMsg('Erro ao processar a imagem.');
    }
    e.target.value = '';
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = async () => {
    const { data } = await dbService.getMensagens(userId);
    if (data) {
      setMessages(data);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      // Fetch personal trainer profile (including 1-step and 2-step fallbacks)
      const { data: prof } = await dbService.getPersonalProfileForAluno(userId);
      if (prof) {
        setPersonalProfile(prof);
      }
      
      const { data: pId } = await dbService.getPersonalIdForAluno(userId);
      setPersonalId(pId);
      
      await loadMessages();
      await dbService.marcarMensagensLidas(userId, userId);
      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 100);
    };

    initChat();
  }, [userId]);

  // Handle Realtime updates for both Supabase and mock mode
  useEffect(() => {
    if (!userId) return;

    let canal: any = null;

    if (isSupabaseConfigured && supabase) {
      canal = supabase.channel(`mensagens-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mensagens', filter: `aluno_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as Mensagem;
              if (newMsg.autor_id !== userId) {
                tocar('receber');
              }
              setMessages((prev) => {
                // Avoid duplicate messages
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              // Mark as read if not authored by this user
              if (newMsg.autor_id !== userId) {
                dbService.marcarMensagensLidas(userId, userId);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as Mensagem;
              setMessages((prev) =>
                prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setMessages((prev) => prev.filter((m) => m.id !== deletedId));
            }
          }
        )
        .subscribe();
    }

    const handleMockMsg = (e: any) => {
      if (e.detail?.aluno_id === userId) {
        loadMessages();
        dbService.marcarMensagensLidas(userId, userId);
      }
    };

    window.addEventListener('zenite_mensagem_enviada', handleMockMsg);

    const handleMockReceive = (e: any) => {
      if (e.detail?.aluno_id === userId && e.detail?.autor_id !== userId) {
        tocar('receber');
      }
    };
    window.addEventListener('zenite_mensagem_enviada', handleMockReceive);

    return () => {
      if (canal) {
        supabase.removeChannel(canal);
      }
      window.removeEventListener('zenite_mensagem_enviada', handleMockMsg);
      window.removeEventListener('zenite_mensagem_enviada', handleMockReceive);
    };
  }, [userId]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentText = inputText.trim();
    const hasFile = !!selectedFile;
    if (!currentText && !hasFile) return;

    setInputText('');
    tocar('enviar');
    setUploadingImage(true);

    const targetPersonalId = personalId || '00000000-0000-0000-0000-000000000000'; // fallback

    try {
      let arquivoUrl: string | null = null;
      let msgTipo: 'texto' | 'imagem' = 'texto';

      if (selectedFile) {
        msgTipo = 'imagem';
        if (isSupabaseConfigured && supabase) {
          const path = `${targetPersonalId}_${userId}/${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat')
            .upload(path, selectedFile, { upsert: false, cacheControl: '3600' });

          if (uploadError) {
            throw uploadError;
          }
          arquivoUrl = path;
        } else {
          // Demo/Mock mode: Convert to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(selectedFile);
          });
          arquivoUrl = base64;
        }
      }

      const { data: newMsg, error } = await dbService.enviarMensagem(
        targetPersonalId,
        userId,
        userId,
        currentText,
        msgTipo,
        arquivoUrl
      );

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        setErrorMsg(`Erro ao enviar: ${error.message || 'Erro desconhecido'}`);
      } else if (newMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Clear file state
        setSelectedFile(null);
        setSelectedPreview(null);
      }
    } catch (err: any) {
      console.error('Erro ao enviar imagem:', err);
      setErrorMsg(`Erro ao enviar imagem: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEdit = async (msgId: string | number) => {
    if (!editingText.trim()) return;
    const { error } = await dbService.editarMensagem(msgId, editingText.trim());
    if (error) {
      console.error('Erro ao editar mensagem:', error);
      setErrorMsg(`Erro ao editar: ${error.message || 'Erro desconhecido'}`);
    } else {
      setEditingMsgId(null);
      setEditingText('');
      loadMessages();
    }
  };

  const handleDelete = async (msgId: string | number) => {
    const { error } = await dbService.excluirMensagem(msgId);
    if (error) {
      console.error('Erro ao excluir mensagem:', error);
      setErrorMsg(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    } else {
      setConfirmingDeleteId(null);
      loadMessages();
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isUUID = (str: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  };

  const rawName = personalProfile?.nome || '';
  const personalName = rawName && !isUUID(rawName) ? rawName : 'Seu Personal';
  const isFemale = personalProfile?.avatar_tipo === 'feminino';

  const getFirstName = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return 'Personal';
    return trimmed.split(' ')[0];
  };

  const personalFirstName = getFirstName(personalName);

  return (
    <div id="chat-aluno-container" className="flex flex-col flex-1 min-h-0 bg-surface rounded-3xl border border-line overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="bg-raise px-6 py-4 border-b border-line flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-2xl bg-surface shadow-inner">
            {isFemale ? '👩' : '👨'}
          </div>
          <div>
            <h3 className="font-semibold text-base text-ink leading-tight">{personalName}</h3>
            <p className="text-[12px] text-ink-3 mt-0.5">Seu Personal Trainer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#F26A1B]/10 text-[#F26A1B] border border-[#F26A1B]/10 rounded-full text-[12px] font-semibold">
          <span className="w-1.5 h-1.5 bg-[#F26A1B] rounded-full animate-ping" />
          Realtime ativo
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs px-4 py-3 rounded-2xl flex justify-between items-center gap-2 animate-fade-in mx-6 mt-4 shrink-0 z-10">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F26A1B]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-3">
            <MessageSquare className="w-12 h-12 text-[#F26A1B]/20 mb-3" />
            <p className="font-medium text-sm text-ink-2">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1 max-w-xs">Envie uma mensagem abaixo para iniciar sua conversa com o seu personal trainer.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.autor_id === userId;
            const showSenderName = !isOwn && (index === 0 || messages[index - 1].autor_id !== msg.autor_id);
            const isMessageExcluded = msg.excluida;
            const isEditing = editingMsgId === msg.id;
            const isConfirmingDelete = confirmingDeleteId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in group`}
              >
                <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
                  {showSenderName && (
                    <span className="text-[12px] font-semibold text-[#F26A1B] mb-1">
                      {personalFirstName}
                    </span>
                  )}
                               <div className="flex items-center gap-1.5 max-w-full">
                    {/* Menu Trigger for Own Message (Not Excluded) */}
                    {isOwn && !isMessageExcluded && !isEditing && !isConfirmingDelete && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                          className="p-1.5 rounded-full hover:bg-white/10 text-ink-3 hover:text-ink transition-all cursor-pointer block"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {openMenuId === msg.id && (
                          <>
                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 bottom-full mb-1 z-50 bg-surface border border-line-strong rounded-xl shadow-2xl p-1 flex flex-col min-w-[100px] divide-y divide-line animate-fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditingText(msg.conteudo);
                                  setOpenMenuId(null);
                                }}
                                className="px-3 py-1.5 text-xs text-ink hover:bg-raise rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-left w-full"
                              >
                                <Pencil className="w-3 h-3 text-[#F26A1B]" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmingDeleteId(msg.id);
                                  setOpenMenuId(null);
                                }}
                                className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-left w-full"
                              >
                                <Trash2 className="w-3 h-3" />
                                Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-[#F26A1B] text-white rounded-tr-none shadow-[0_4px_12px_rgba(242,106,27,0.2)]'
                          : 'bg-raise text-ink-2 rounded-tl-none border border-line'
                      }`}
                    >
                      {isMessageExcluded ? (
                        <p className="italic text-ink-3 text-xs">Mensagem apagada</p>
                      ) : isConfirmingDelete ? (
                        <div className="flex flex-col gap-2 p-1 min-w-[150px]">
                          <p className="text-xs font-semibold text-white">Excluir esta mensagem?</p>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                            >
                              Não
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(msg.id)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              Sim
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="z-input w-full resize-none !h-20 text-sm"
                            rows={2}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMsgId(null)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-[#F26A1B] bg-surface-2 hover:bg-raise border border-line rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {msg.tipo === 'imagem' && msg.arquivo_url && (
                            <div 
                              onClick={() => setLightboxUrl(signedUrls[msg.arquivo_url!] || msg.arquivo_url)}
                              className="cursor-pointer overflow-hidden rounded-lg bg-black/10 hover:opacity-90 transition-opacity relative max-w-[240px]"
                            >
                              {signedUrls[msg.arquivo_url] ? (
                                <img 
                                  src={signedUrls[msg.arquivo_url]} 
                                  alt="Anexo" 
                                  className="w-full max-h-[180px] object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-[200px] h-[120px] flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#F26A1B]" />
                                </div>
                              )}
                            </div>
                          )}
                          {msg.conteudo && <p className="whitespace-pre-wrap">{msg.conteudo}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[12px] text-ink-3 mt-1 flex items-center gap-1 num">
                    <Clock className="w-3 h-3" />
                    {formatTime(msg.criado_em)}
                    {msg.editado_em && !isMessageExcluded && (
                      <span className="text-[12px] text-ink-3 italic ml-1">(editada)</span>
                    )}
                    {!isOwn && !msg.lida && (
                      <span className="w-1.5 h-1.5 bg-[#F26A1B] rounded-full ml-1" />
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preview of Image Before Sending */}
      {selectedPreview && (
        <div className="px-6 py-3 bg-bg-sub border-t border-line flex items-center gap-3 animate-fade-in relative shrink-0">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-line bg-raise shrink-0">
            <img src={selectedPreview} alt="Preview" className="w-full h-full object-cover" />
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#F26A1B]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{selectedFile?.name}</p>
            <p className="text-[10px] text-ink-3">Legenda opcional abaixo</p>
          </div>
          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => {
              setSelectedFile(null);
              setSelectedPreview(null);
            }}
            className="p-1.5 rounded-full bg-raise hover:bg-danger/15 text-ink-3 hover:text-danger transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-raise border-t border-line flex items-center gap-2 z-10">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e, false)}
          accept="image/*"
          className="hidden"
        />
        <input 
          type="file"
          ref={cameraInputRef}
          onChange={(e) => handleFileChange(e, true)}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
        
        <button
          type="button"
          disabled={uploadingImage}
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-surface border border-line text-ink-3 hover:text-[#F26A1B] hover:bg-raise transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center w-12 h-12"
          title="Anexar imagem"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        
        <button
          type="button"
          disabled={uploadingImage}
          onClick={() => cameraInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-surface border border-line text-ink-3 hover:text-[#F26A1B] hover:bg-raise transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center w-12 h-12"
          title="Tirar foto"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={uploadingImage}
          placeholder={uploadingImage ? 'Fazendo upload da imagem...' : `Mensagem para ${personalFirstName}...`}
          className="z-input flex-1"
        />
        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedFile) || uploadingImage}
          className="w-12 h-12 rounded-2xl bg-[#F26A1B] hover:bg-[#d55814] active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center transition-all cursor-pointer text-white shadow-lg shadow-[#F26A1B]/20 shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxUrl} 
            alt="Imagem ampliada" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
