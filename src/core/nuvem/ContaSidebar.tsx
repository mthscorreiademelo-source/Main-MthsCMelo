import { useState } from 'react'
import { IconNuvem, IconSair } from '../components/Icons'
import { sair, useSessao } from './auth'
import { nuvemAtiva } from './config'
import { EntrarModal } from './EntrarModal'
import { useStatusSync } from './sync/estado'

const ROTULO_SYNC: Record<string, string> = {
  ocioso: '',
  sincronizando: 'Sincronizando…',
  ok: 'Sincronizado',
  erro: 'Falha ao sincronizar',
}

/** Bloco de conta na barra lateral. Só aparece quando a nuvem está configurada. */
export function ContaSidebar() {
  const { pronta, sessao, email } = useSessao()
  const [entrando, setEntrando] = useState(false)
  if (!nuvemAtiva()) return null

  if (!sessao) {
    return (
      <>
        <button
          onClick={() => setEntrando(true)}
          disabled={!pronta}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-hover/70 disabled:opacity-50"
        >
          <IconNuvem width={17} height={17} />
          Entrar / criar conta
        </button>
        {entrando && <EntrarModal onFechar={() => setEntrando(false)} />}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2.5 px-3 pt-1.5 text-[12px] text-muted">
        <IconNuvem width={15} height={15} className="shrink-0 text-accent" />
        <span className="min-w-0 truncate">{email ?? 'Conectado'}</span>
      </div>
      <StatusSync />
      <span className="pb-0.5" />
      <button
        onClick={sair}
        className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-hover/70"
      >
        <IconSair width={17} height={17} />
        Sair
      </button>
    </div>
  )
}

function StatusSync() {
  const { estado } = useStatusSync()
  const rotulo = ROTULO_SYNC[estado]
  if (!rotulo) return null
  return (
    <span
      className={`flex items-center gap-1.5 px-3 pl-[30px] text-[11px] ${
        estado === 'erro' ? 'text-danger' : 'text-muted/70'
      }`}
    >
      {estado === 'sincronizando' && (
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
      )}
      {rotulo}
    </span>
  )
}
