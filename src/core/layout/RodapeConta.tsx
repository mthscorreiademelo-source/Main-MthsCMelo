import { useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  IconDownload,
  IconEngrenagem,
  IconLixeira,
  IconLua,
  IconNuvem,
  IconSair,
  IconSol,
  IconUpload,
} from '../components/Icons'
import { exportarBackup, importarBackup } from '../db/db'
import { limparDadosExemplo } from '../db/exemplos'
import { sair, useSessao } from '../nuvem/auth'
import { nuvemAtiva } from '../nuvem/config'
import { EntrarModal } from '../nuvem/EntrarModal'
import { useStatusSync } from '../nuvem/sync/estado'
import { usePerfil } from '../perfil/db'
import { PerfilSheet } from '../perfil/PerfilSheet'
import { AparenciaSheet } from '../theme/AparenciaSheet'
import { useTheme } from '../theme/useTheme'

const ROTULO_SYNC: Record<string, string> = {
  ocioso: 'Salvo localmente',
  sincronizando: 'Sincronizando…',
  ok: 'Sincronizado',
  erro: 'Falha ao sincronizar',
}
const COR_SYNC: Record<string, string> = {
  ocioso: 'bg-muted/40',
  sincronizando: 'bg-accent animate-pulse',
  ok: 'bg-emerald-500',
  erro: 'bg-danger',
}

/** Nome amigável e iniciais a partir dos metadados da sessão (ou do e-mail). */
function identidade(sessao: Session | null, email: string | null) {
  const meta = (sessao?.user.user_metadata ?? {}) as Record<string, unknown>
  const nome =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (email ? email.split('@')[0].replace(/[._-]+/g, ' ') : 'Você')
  const foto =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null
  const iniciais = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  return { nome, foto, iniciais }
}

function Avatar({ foto, iniciais, tamanho }: { foto: string | null; iniciais: string; tamanho: number }) {
  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: tamanho, height: tamanho }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42 }}
    >
      {iniciais || '·'}
    </span>
  )
}

/** Rodapé da barra lateral: perfil + engrenagem de configurações (ambos flutuantes). */
export function RodapeConta() {
  const { tema, alternar } = useTheme()
  const { pronta, sessao, email } = useSessao()
  const { estado, erro } = useStatusSync()
  const perfil = usePerfil()
  const [painel, setPainel] = useState<null | 'perfil' | 'config'>(null)
  const [aparencia, setAparencia] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)
  const [entrando, setEntrando] = useState(false)
  const [status, setStatus] = useState('')
  const inputArquivo = useRef<HTMLInputElement>(null)

  const nuvem = nuvemAtiva()
  const base = identidade(sessao, email)
  // O perfil pessoal (editável) tem prioridade sobre os metadados da conta.
  const nome = perfil?.nome || base.nome
  const foto = perfil?.foto ?? base.foto
  const iniciais = (perfil?.apelido || perfil?.nome || nome)
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  function avisar(msg: string) {
    setStatus(msg)
    setTimeout(() => setStatus(''), 4000)
  }

  async function exportar() {
    const dados = await exportarBackup()
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lume-backup-${dados.exportadoEm.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    avisar('Backup exportado')
  }

  async function importar(arquivo: File) {
    try {
      const json = JSON.parse(await arquivo.text())
      const { tasks, paginas } = await importarBackup(json)
      avisar(`Restaurado: ${tasks} tarefa(s), ${paginas} página(s)`)
    } catch {
      avisar('Arquivo de backup inválido')
    }
  }

  async function limparExemplos() {
    if (!confirm('Apagar os dados de exemplo (Oli, itens de exemplo da despensa, "Ovos" e "Notebook novo")?\n\nNão apaga nada que você já tenha criado ou editado.')) return
    const n = await limparDadosExemplo()
    avisar(n > 0 ? `${n} registro(s) de exemplo apagado(s)` : 'Nenhum dado de exemplo encontrado')
  }

  return (
    <footer className="relative flex flex-col gap-1 border-t border-line px-2 py-2.5">
      {/* Fundo para fechar os painéis ao clicar fora */}
      {painel && <div className="fixed inset-0 z-40" onClick={() => setPainel(null)} />}

      {/* ---- Perfil ---- */}
      {nuvem && !sessao ? (
        <button
          onClick={() => setEntrando(true)}
          disabled={!pronta}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-hover/70 disabled:opacity-50"
        >
          <IconNuvem width={17} height={17} />
          Entrar / criar conta
        </button>
      ) : nuvem && sessao ? (
        <div className="relative">
          <button
            onClick={() => setPainel((p) => (p === 'perfil' ? null : 'perfil'))}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover/70"
          >
            <Avatar foto={foto} iniciais={iniciais} tamanho={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold capitalize leading-tight">{nome}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className={`size-1.5 shrink-0 rounded-full ${COR_SYNC[estado] ?? 'bg-muted/40'}`} />
                <span className="truncate">{ROTULO_SYNC[estado] ?? ''}</span>
              </span>
            </span>
          </button>

          {painel === 'perfil' && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-1.5 rounded-2xl border border-line bg-surface p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <Avatar foto={foto} iniciais={iniciais} tamanho={48} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold capitalize leading-tight">{nome}</p>
                  <p className="truncate text-[12px] text-muted">{email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-hover/60 px-3 py-2">
                <span className={`size-2 shrink-0 rounded-full ${COR_SYNC[estado] ?? 'bg-muted/40'}`} />
                <div className="min-w-0 text-[12px]">
                  <p className={estado === 'erro' ? 'font-medium text-danger' : 'font-medium'}>{ROTULO_SYNC[estado]}</p>
                  {estado === 'erro' && erro && <p className="line-clamp-2 text-[11px] text-muted">{erro}</p>}
                </div>
              </div>
              <button
                onClick={() => { setPainel(null); setPerfilAberto(true) }}
                className="mt-3 flex w-full min-h-10 items-center justify-center gap-2 rounded-xl bg-ink text-[13px] font-semibold text-bg"
              >
                Editar perfil
              </button>
              <button
                onClick={() => {
                  setPainel(null)
                  sair()
                }}
                className="mt-2 flex w-full min-h-10 items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-muted transition-colors hover:text-danger"
              >
                <IconSair width={15} height={15} />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* ---- Configurações (engrenagem que expande) ---- */}
      <div className="relative">
        <button
          onClick={() => setPainel((p) => (p === 'config' ? null : 'config'))}
          className={`flex w-full min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-hover/70 ${
            painel === 'config' ? 'bg-hover text-ink' : 'text-muted'
          }`}
        >
          <IconEngrenagem width={17} height={17} />
          Configurações
        </button>

        {painel === 'config' && (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1.5 flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
            <button
              onClick={() => alternar()}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover/70"
            >
              {tema === 'dark' ? <IconSol width={16} height={16} /> : <IconLua width={16} height={16} />}
              {tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
            <button
              onClick={() => {
                setPainel(null)
                setAparencia(true)
              }}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover/70"
            >
              <span className="text-[15px] leading-none">🎨</span>
              Aparência
            </button>
            <button
              onClick={() => {
                setPainel(null)
                exportar()
              }}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover/70"
            >
              <IconDownload width={16} height={16} />
              Exportar backup
            </button>
            <button
              onClick={() => inputArquivo.current?.click()}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover/70"
            >
              <IconUpload width={16} height={16} />
              Importar backup
            </button>
            <button
              onClick={() => {
                setPainel(null)
                limparExemplos()
              }}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover/70 hover:text-danger"
            >
              <IconLixeira width={16} height={16} />
              Apagar dados de exemplo
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputArquivo}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) importar(arquivo)
          e.target.value = ''
        }}
      />
      {status && <p className="px-3 pt-0.5 text-[11px] text-muted">{status}</p>}

      {aparencia && <AparenciaSheet tema={tema} alternar={alternar} onFechar={() => setAparencia(false)} />}
      {entrando && <EntrarModal onFechar={() => setEntrando(false)} />}
      <PerfilSheet aberto={perfilAberto} email={email} onFechar={() => setPerfilAberto(false)} />
    </footer>
  )
}
