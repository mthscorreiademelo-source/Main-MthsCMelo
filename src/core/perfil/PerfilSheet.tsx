import { useEffect, useRef, useState } from 'react'
import { RecorteImagem } from '../components/RecorteImagem'
import { Sheet } from '../components/Sheet'
import { idadeDe, salvarPerfil, usePerfil } from './db'

/** Avatar redondo com foto ou iniciais. */
function Avatar({ foto, nome, tamanho }: { foto?: string; nome?: string; tamanho: number }) {
  const iniciais = (nome ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  if (foto) {
    return <img src={foto} alt="" className="rounded-full object-cover" style={{ width: tamanho, height: tamanho }} />
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-accent/15 font-semibold text-accent"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
    >
      {iniciais || '🙂'}
    </span>
  )
}

export function PerfilSheet({ aberto, email, onFechar }: { aberto: boolean; email?: string | null; onFechar: () => void }) {
  const perfil = usePerfil()
  const [nome, setNome] = useState('')
  const [apelido, setApelido] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [bio, setBio] = useState('')
  const [foto, setFoto] = useState<string | undefined>(undefined)
  const [recortando, setRecortando] = useState<File | null>(null)
  const inputFoto = useRef<HTMLInputElement>(null)

  // Preenche ao abrir / quando o perfil carrega.
  useEffect(() => {
    if (!aberto) return
    setNome(perfil?.nome ?? '')
    setApelido(perfil?.apelido ?? '')
    setNascimento(perfil?.nascimento ?? '')
    setBio(perfil?.bio ?? '')
    setFoto(perfil?.foto)
  }, [aberto, perfil?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const idade = idadeDe(nascimento)

  return (
    <Sheet aberto={aberto} titulo="Seu perfil" onFechar={onFechar}>
      <div className="flex flex-col gap-5">
        {/* Foto */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => inputFoto.current?.click()}
            className="relative shrink-0 cursor-pointer rounded-full ring-1 ring-line transition-transform hover:scale-[1.03]"
            aria-label="Trocar foto de perfil"
          >
            <Avatar foto={foto} nome={nome} tamanho={76} />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-ink text-[12px] text-bg">✎</span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{nome || 'Sem nome ainda'}</p>
            {email && <p className="truncate text-[12px] text-muted">{email}</p>}
            {foto && (
              <button
                onClick={() => { setFoto(undefined); salvarPerfil({ foto: undefined }) }}
                className="mt-1 text-[12px] text-muted hover:text-danger"
              >
                Remover foto
              </button>
            )}
          </div>
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) setRecortando(arquivo)
              e.target.value = ''
            }}
          />
        </div>

        {recortando && (
          <RecorteImagem
            arquivo={recortando}
            aspecto={1}
            redondo
            saidaLargura={256}
            onConfirmar={(url) => { setFoto(url); salvarPerfil({ foto: url }); setRecortando(null) }}
            onCancelar={() => setRecortando(null)}
          />
        )}

        {/* Nome */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Nome</span>
          <input
            value={nome}
            onChange={(e) => { setNome(e.target.value); salvarPerfil({ nome: e.target.value.trim() }) }}
            placeholder="Como você se chama"
            className="min-h-11 rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
          />
        </label>

        {/* Apelido */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Apelido <span className="font-normal text-muted/60">(como o app te chama)</span></span>
          <input
            value={apelido}
            onChange={(e) => { setApelido(e.target.value); salvarPerfil({ apelido: e.target.value.trim() }) }}
            placeholder="Ex.: Mth"
            className="min-h-11 rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
          />
        </label>

        {/* Nascimento */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">
            Data de nascimento{idade != null && <span className="font-normal text-muted/60"> · {idade} anos</span>}
          </span>
          <input
            type="date"
            value={nascimento}
            onChange={(e) => { setNascimento(e.target.value); salvarPerfil({ nascimento: e.target.value || undefined }) }}
            className="min-h-11 self-start rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
          />
        </label>

        {/* Bio */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Sobre você <span className="font-normal text-muted/60">(opcional)</span></span>
          <textarea
            value={bio}
            onChange={(e) => { setBio(e.target.value); salvarPerfil({ bio: e.target.value }) }}
            placeholder="Uma frase, um lembrete, uma intenção…"
            rows={3}
            className="resize-none rounded-lg border border-line bg-transparent px-3 py-2.5 text-[15px] outline-none focus:border-muted/50"
          />
        </label>

        <p className="text-[12px] leading-relaxed text-muted/70">
          Suas informações ficam guardadas na sua conta e sincronizam entre seus aparelhos.
        </p>
      </div>
    </Sheet>
  )
}
