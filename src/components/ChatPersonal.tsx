import React, { useState, useEffect, useRef } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Aluno, Mensagem } from '../types';
import { Send, MessageSquare, Search, ArrowLeft, Clock, Sparkles, Pencil, Trash2, X, Check, MoreVertical, Paperclip, Camera } from 'lucide-react';
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

interface ChatPersonalProps {
  personalId: string;
  initialSelectedAlunoId?: string | null;
  onClearInitialSelected?: () => void;
}

interface Conversation {
  aluno: Aluno;
  lastMessage: Mensagem | null;
  unreadCount: number;
}

export default function ChatPersonal({ 
  personalId,
  initialSelectedAlunoId = null,
  onClearInitialSelected
}: ChatPersonalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Mensagem[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

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

  // Fetch signed URLs when active messages change
  useEffect(() => {
    const fetchUrls = async () => {
      const imageMsgs = activeMessages.filter(m => m.tipo === 'imagem' && m.arquivo_url && !m.excluida);
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
  }, [activeMessages]);

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

  const handleSaveEdit = async (msgId: string | number) => {
    if (!editingText.trim()) return;
    const { error } = await dbService.editarMensagem(msgId, editingText.trim());
    if (error) {
      console.error('Erro ao editar mensagem:', error);
      setErrorMsg(`Erro ao editar: ${error.message || 'Erro desconhecido'}`);
    } else {
      setEditingMsgId(null);
      setEditingText('');
      if (selectedAlunoId) {
        const { data: msgs } = await dbService.getMensagens(selectedAlunoId);
        if (msgs) setActiveMessages(msgs);
      }
    }
  };

  const handleDelete = async (msgId: string | number) => {
    const { error } = await dbService.excluirMensagem(msgId);
    if (error) {
      console.error('Erro ao excluir mensagem:', error);
      setErrorMsg(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    } else {
      setConfirmingDeleteId(null);
      if (selectedAlunoId) {
        const { data: msgs } = await dbService.getMensagens(selectedAlunoId);
        if (msgs) setActiveMessages(msgs);
      }
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const loadConversations = async () => {
    setLoadingList(true);
    const { data: alumnos } = await dbService.getAlunos(personalId);
    if (alumnos) {
      // Fetch details for each student
      const list: Conversation[] = await Promise.all(
        alumnos.map(async (al) => {
          const { data: lastMsg } = await dbService.getUltimaMensagem(al.id);
          const { data: unread } = await dbService.getMensagensCountNaoLidas(al.id, personalId);
          return {
            aluno: al,
            lastMessage: lastMsg,
            unreadCount: unread || 0,
          };
        })
      );

      // Sort: who has unread messages first, then by latest message date
      list.sort((a, b) => {
        const aUnread = a.unreadCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 ? 1 : 0;
        if (aUnread !== bUnread) {
          return bUnread - aUnread;
        }
        const aTime = a.lastMessage ? new Date(a.lastMessage.criado_em).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.criado_em).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(list);
    }
    setLoadingList(false);
  };

  const loadActiveChat = async (alunoId: string) => {
    setLoadingChat(true);
    const { data: msgs } = await dbService.getMensagens(alunoId);
    if (msgs) {
      setActiveMessages(msgs);
    }
    await dbService.marcarMensagensLidas(alunoId, personalId);
    // Refresh conversation list to clear read state/badge
    const { data: alumnos } = await dbService.getAlunos(personalId);
    if (alumnos) {
      const list: Conversation[] = await Promise.all(
        alumnos.map(async (al) => {
          const { data: lastMsg } = await dbService.getUltimaMensagem(al.id);
          const { data: unread } = await dbService.getMensagensCountNaoLidas(al.id, personalId);
          return {
            aluno: al,
            lastMessage: lastMsg,
            unreadCount: al.id === alunoId ? 0 : (unread || 0),
          };
        })
      );
      list.sort((a, b) => {
        const aUnread = a.unreadCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 ? 1 : 0;
        if (aUnread !== bUnread) {
          return bUnread - aUnread;
        }
        const aTime = a.lastMessage ? new Date(a.lastMessage.criado_em).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.criado_em).getTime() : 0;
        return bTime - aTime;
      });
      setConversations(list);
    }
    // Also notify other parts of the system of message updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zenite_mensagem_lida'));
    }
    setLoadingChat(false);
    setTimeout(() => scrollToBottom('auto'), 100);
  };

  useEffect(() => {
    loadConversations();
  }, [personalId]);

  useEffect(() => {
    if (initialSelectedAlunoId && conversations.length > 0) {
      const found = conversations.find(c => c.aluno.id === initialSelectedAlunoId);
      if (found) {
        setSelectedAlunoId(initialSelectedAlunoId);
        loadActiveChat(initialSelectedAlunoId);
        if (onClearInitialSelected) {
          onClearInitialSelected();
        }
      }
    }
  }, [initialSelectedAlunoId, conversations, onClearInitialSelected]);

  // Handle Realtime updates for Personal Area
  useEffect(() => {
    if (!personalId) return;

    let canalGlobal: any = null;
    let canalChat: any = null;

    if (isSupabaseConfigured && supabase) {
      // Global channel to update unread counts and message previews
      canalGlobal = supabase.channel('mensagens-global')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mensagens', filter: `personal_id=eq.${personalId}` },
          (payload) => {
            const newMsg = payload.new as Mensagem;
            if (!newMsg) return;

            if (newMsg.autor_id !== personalId) {
              tocar('receber');
            }

            // Update preview and unread count in conversations list
            setConversations((prev) => {
              const idx = prev.findIndex((c) => c.aluno.id === newMsg.aluno_id);
              if (idx === -1) return prev;
              
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                lastMessage: newMsg,
                unreadCount: payload.eventType === 'INSERT' && newMsg.autor_id !== personalId && selectedAlunoId !== newMsg.aluno_id
                  ? updated[idx].unreadCount + 1
                  : updated[idx].unreadCount
              };
              
              // Re-sort
              return updated.sort((a, b) => {
                const aUnread = a.unreadCount > 0 ? 1 : 0;
                const bUnread = b.unreadCount > 0 ? 1 : 0;
                if (aUnread !== bUnread) return bUnread - aUnread;
                const aTime = a.lastMessage ? new Date(a.lastMessage.criado_em).getTime() : 0;
                const bTime = b.lastMessage ? new Date(b.lastMessage.criado_em).getTime() : 0;
                return bTime - aTime;
              });
            });

            // Also trigger standard audio/unreads event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('zenite_mensagem_lida'));
            }
          }
        )
        .subscribe();
    }

    // Chat specific channel
    if (selectedAlunoId) {
      if (isSupabaseConfigured && supabase) {
        canalChat = supabase.channel(`mensagens-chat-${selectedAlunoId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'mensagens', filter: `aluno_id=eq.${selectedAlunoId}` },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newMsg = payload.new as Mensagem;
                setActiveMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                if (newMsg.autor_id !== personalId) {
                  dbService.marcarMensagensLidas(selectedAlunoId, personalId);
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedMsg = payload.new as Mensagem;
                setActiveMessages((prev) =>
                  prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
                );
              } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setActiveMessages((prev) => prev.filter((m) => m.id !== deletedId));
              }
            }
          )
          .subscribe();
      }
    }

    const handleMockMsg = (e: any) => {
      // Refresh conversations list on any new message
      loadConversations();
      // If a chat is active, refresh its messages
      if (selectedAlunoId && e.detail?.aluno_id === selectedAlunoId) {
        dbService.getMensagens(selectedAlunoId).then(({ data }) => {
          if (data) {
            setActiveMessages(data);
          }
        });
        dbService.marcarMensagensLidas(selectedAlunoId, personalId);
      }
    };

    window.addEventListener('zenite_mensagem_enviada', handleMockMsg);

    return () => {
      if (canalGlobal) supabase.removeChannel(canalGlobal);
      if (canalChat) supabase.removeChannel(canalChat);
      window.removeEventListener('zenite_mensagem_enviada', handleMockMsg);
    };
  }, [personalId, selectedAlunoId]);

  // Scroll to bottom on message list updates
  useEffect(() => {
    scrollToBottom('smooth');
  }, [activeMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlunoId) return;

    const currentText = inputText.trim();
    const hasFile = !!selectedFile;
    if (!currentText && !hasFile) return;

    setInputText('');
    tocar('enviar');
    setUploadingImage(true);

    try {
      let arquivoUrl: string | null = null;
      let msgTipo: 'texto' | 'imagem' = 'texto';

      if (selectedFile) {
        msgTipo = 'imagem';
        if (isSupabaseConfigured && supabase) {
          const path = `${personalId}_${selectedAlunoId}/${Date.now()}.jpg`;
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
        personalId,
        selectedAlunoId,
        personalId,
        currentText,
        msgTipo,
        arquivoUrl
      );

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        setErrorMsg(`Erro ao enviar: ${error.message || 'Erro desconhecido'}`);
      } else if (newMsg) {
        setActiveMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Clear file state
        setSelectedFile(null);
        setSelectedPreview(null);

        // Update conversations list with latest message
        setConversations((prev) => {
          return prev.map((c) => {
            if (c.aluno.id === selectedAlunoId) {
              return { ...c, lastMessage: newMsg };
            }
            return c;
          });
        });
      }
    } catch (err: any) {
      console.error('Erro ao enviar imagem:', err);
      setErrorMsg(`Erro ao enviar imagem: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSelectAluno = (alunoId: string) => {
    tocar('tap');
    setSelectedAlunoId(alunoId);
    loadActiveChat(alunoId);
  };

  const getActiveStudentProfile = () => {
    const conv = conversations.find((c) => c.aluno.id === selectedAlunoId);
    return conv?.aluno.profile;
  };

  const isUUID = (str: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  };

  const getFirstName = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return 'Aluno';
    return trimmed.split(' ')[0];
  };

  const getActiveStudentProfileName = () => {
    const nome = getActiveStudentProfile()?.nome;
    if (nome && !isUUID(nome)) return nome;
    return 'Aluno';
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (c.aluno.ativo === false) return false;
    const nome = c.aluno.profile?.nome || '';
    return nome.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div id="chat-personal-container" className="grid grid-cols-1 md:grid-cols-12 bg-surface rounded-3xl border border-line overflow-hidden flex-1 min-h-0 shadow-2xl">
      {/* LEFT COLUMN: Student Conversation List */}
      <div className={`md:col-span-4 border-r border-line flex flex-col bg-bg-sub h-full overflow-hidden ${selectedAlunoId ? 'hidden md:flex' : 'flex'}`}>
        {/* Search Header */}
        <div className="p-4 border-b border-line space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="z-h1 text-ink">Alunos ativos</h3>
            <span className="z-badge z-badge--accent">Chat</span>
          </div>
          <div className="z-search">
            <span className="z-search__icon">
              <Search className="w-4 h-4 text-ink-3" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno..."
              className="z-input !h-9 !text-xs"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-line-soft z-list">
          {loadingList ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-accent" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-ink-3 text-xs">
              <MessageSquare className="w-8 h-8 text-ink-3 mx-auto mb-2" />
              Nenhum aluno encontrado.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.aluno.id === selectedAlunoId;
              const hasUnread = c.unreadCount > 0;
              const isFemale = c.aluno.profile?.avatar_tipo === 'feminino';
              
              return (
                <button
                  key={c.aluno.id}
                  type="button"
                  onClick={() => handleSelectAluno(c.aluno.id)}
                  data-sem-som
                  className={`w-full text-left p-4 flex gap-3 transition-all cursor-pointer border-l-3 ${
                    isSelected ? 'bg-raise border-l-accent' : 'border-l-transparent hover:bg-raise/50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="z-avatar">
                      {c.aluno.profile?.avatar_url ? (
                        <img src={c.aluno.profile.avatar_url} alt={c.aluno.profile?.nome || 'Aluno'} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        (c.aluno.profile?.nome || 'A').charAt(0).toUpperCase()
                      )}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent border-2 border-bg rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Text previews */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm truncate font-semibold ${isSelected ? 'text-accent' : 'text-ink'}`}>
                        {c.aluno.profile?.nome || 'Aluno Sem Nome'}
                      </h4>
                      {c.lastMessage && (
                        <span className="text-[11.5px] text-ink-3 shrink-0 z-num">
                          {formatTime(c.lastMessage.criado_em)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={`text-xs truncate flex-1 ${hasUnread ? 'text-ink font-semibold' : 'text-ink-3'}`}>
                        {c.lastMessage ? c.lastMessage.conteudo : 'Nenhuma mensagem ainda'}
                      </p>
                      {hasUnread && (
                        <span className="text-[10.5px] bg-accent text-white px-1.5 py-0.5 rounded-full font-bold z-num">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Frame */}
      <div className={`md:col-span-8 flex flex-col bg-surface h-full overflow-hidden ${!selectedAlunoId ? 'hidden md:flex' : 'flex'}`}>
        {selectedAlunoId ? (
          <>
            {/* Active chat header */}
            <div className="bg-bg-sub px-6 py-4 border-b border-line flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAlunoId(null)}
                  className="md:hidden z-btn z-btn--ghost z-btn--icon z-btn--sm"
                >
                  <ArrowLeft className="w-4 h-4 text-ink-2" />
                </button>
                
                <div className="z-avatar z-avatar--lg bg-raise">
                  {getActiveStudentProfile()?.avatar_url ? (
                    <img src={getActiveStudentProfile()?.avatar_url} alt={getActiveStudentProfileName()} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    getActiveStudentProfileName().charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-base text-ink leading-tight">
                    {getActiveStudentProfileName()}
                  </h3>
                  <p className="z-eyebrow mt-0.5 normal-case tracking-normal">
                    Seu aluno
                  </p>
                </div>
              </div>

              <div className="z-badge z-badge--accent">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
                Realtime ativo
              </div>
            </div>

            {/* Error Alert Box */}
            {errorMsg && (
              <div className="bg-danger-soft border border-danger/25 text-danger text-xs px-4 py-3 rounded-2xl flex justify-between items-center gap-2 animate-fade-in mx-6 mt-4 shrink-0">
                <span>{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg(null)} className="text-danger hover:opacity-80 transition-opacity cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat bubble list */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4"
            >
              {loadingChat ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent" />
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-3">
                  <MessageSquare className="w-10 h-10 text-ink-3 mb-2" />
                  <p className="text-sm font-medium text-ink-2">Nenhuma conversa registrada</p>
                  <p className="text-xs max-w-xs mt-1">Diga olá para iniciar o contato com este aluno.</p>
                </div>
              ) : (
                activeMessages.map((msg, index) => {
                  const isOwn = msg.autor_id === personalId;
                  const showSenderName = !isOwn && (index === 0 || activeMessages[index - 1].autor_id !== msg.autor_id);
                  const studentName = getActiveStudentProfileName();
                  const studentFirstName = getFirstName(studentName);
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
                          <span className="text-[12px] font-semibold text-accent mb-1">
                            {studentFirstName}
                          </span>
                        )}
                        
                        <div className="flex items-center gap-1.5 max-w-full">
                          {/* Menu Trigger for Own Message (Not Excluded) */}
                          {isOwn && !isMessageExcluded && !isEditing && !isConfirmingDelete && (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                                className="p-1.5 rounded-full hover:bg-raise text-ink-3 hover:text-ink transition-all cursor-pointer block"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {openMenuId === msg.id && (
                                <>
                                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuId(null)} />
                                  <div className="absolute right-0 bottom-full mb-1 z-50 bg-surface border border-line rounded-xl shadow-2xl p-1 flex flex-col min-w-[100px] divide-y divide-line-soft animate-fade-in">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMsgId(msg.id);
                                        setEditingText(msg.conteudo);
                                        setOpenMenuId(null);
                                      }}
                                      className="px-3 py-1.5 text-xs text-ink hover:bg-raise rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-left w-full"
                                    >
                                      <Pencil className="w-3 h-3 text-accent" />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmingDeleteId(msg.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="px-3 py-1.5 text-xs text-danger hover:bg-danger-soft rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-left w-full"
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
                                ? 'bg-accent text-white rounded-tr-none shadow-[0_4px_12px_rgba(242,106,27,0.15)] font-medium'
                                : 'bg-raise text-ink-2 rounded-tl-none border border-line font-medium'
                            }`}
                          >
                            {isMessageExcluded ? (
                              <p className="italic text-ink-3 text-xs">Mensagem apagada</p>
                            ) : isConfirmingDelete ? (
                              <div className="flex flex-col gap-2 p-1 min-w-[150px]">
                                <p className="text-xs font-semibold text-ink">Excluir esta mensagem?</p>
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeleteId(null)}
                                    className="px-2.5 py-1 text-[10px] uppercase font-bold text-ink-3 hover:text-ink hover:bg-raise rounded-lg transition-colors cursor-pointer"
                                  >
                                    Não
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(msg.id)}
                                    className="px-2.5 py-1 text-[10px] uppercase font-bold text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors cursor-pointer"
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
                                    className="px-2.5 py-1 text-[12px] font-semibold text-ink-3 hover:text-ink hover:bg-raise rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(msg.id)}
                                    className="px-2.5 py-1 text-[12px] font-semibold text-accent bg-bg-sub border border-accent/20 hover:bg-raise rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
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
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-accent" />
                                      </div>
                                    )}
                                  </div>
                                )}
                                {msg.conteudo && <p className="whitespace-pre-wrap">{msg.conteudo}</p>}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] text-ink-3 mt-1 flex items-center gap-1 z-num">
                          <Clock className="w-3 h-3" />
                          {formatTime(msg.criado_em)}
                          {msg.editado_em && !isMessageExcluded && (
                            <span className="text-[11px] text-ink-3 italic ml-1">(editada)</span>
                          )}
                          {isOwn && msg.lida && !isMessageExcluded && (
                            <span className="text-ok text-[10px] font-bold ml-1 uppercase tracking-wider">Lida</span>
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
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-accent" />
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

            {/* Form */}
            <form onSubmit={handleSend} className="p-4 bg-bg-sub border-t border-line flex items-center gap-2 shrink-0">
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
                className="p-2.5 rounded-xl bg-raise text-ink-3 hover:text-accent hover:bg-raise-strong transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Anexar imagem"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => cameraInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-raise text-ink-3 hover:text-accent hover:bg-raise-strong transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Tirar foto"
              >
                <Camera className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={uploadingImage}
                placeholder={uploadingImage ? 'Fazendo upload da imagem...' : `Mensagem para ${getFirstName(getActiveStudentProfileName())}...`}
                className="z-input flex-1"
              />
              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedFile) || uploadingImage}
                className="z-btn z-btn--primary z-btn--icon w-11 h-11 shrink-0"
              >
                <Send className="w-4 h-4" />
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-3 h-full">
            <MessageSquare className="w-16 h-16 text-accent/15 mb-4 animate-pulse" />
            <h3 className="font-semibold text-lg text-ink">Centro de mensagens</h3>
            <p className="text-sm max-w-sm mt-1 text-ink-2">Selecione um aluno na barra lateral esquerda para visualizar o histórico de conversas e enviar mensagens em tempo real.</p>
          </div>
        )}
      </div>
    </div>
  );
}
