import { useState } from 'react'
import { IconArquivar, IconLixeira } from '../../../core/components/Icons'
import { arquivarFator, atualizarFator, criarFator, excluirFator } from '../personalizar'
import type { Fator } from '../types'
import { Campo } from './EditorHumorTipo'
import { FolhaInferior } from './FolhaInferior'
import { IconeFator } from './icones'
import { CampoTexto, SeletorCor, SeletorIcone } from './seletores'

export function EditorFator({
  fator,
  categoriaId,
  onFechar,
}: {
  fator?: Fator
  categoriaId: string
  onFechar: () => void
}) {
  const [nome, setNome] = useState(fator?.nome ?? '')
  const [icone, setIcone] = useState(fator?.icone ?? 'folha')
  const [cor, setCor] = useState<string | undefined>(fator?.cor)
  const [descricao, setDescricao] = useState(fator?.descricao ?? '')
  const [confirmando, setConfirmando] = useState(false)

  async function salvar() {
    if (!nome.trim()) return
    if (fator) {
      await atualizarFator(fator.id, {
        nome: nome.trim(),
        icone,
        cor,
        descricao: descricao.trim() || undefined,
      })
    } else {
      await criarFator(categoriaId, nome, icone, cor)
    }
    onFechar()
  }

  async function excluir() {
    if (!fator) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    await excluirFator(fator.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo={fator ? 'Editar fator' : 'Novo fator'} onFechar={onFechar}>
      <div className="flex items-center gap-2">
        <span
          className="flex size-10 items-center justify-center rounded-full"
          style={{ backgroundColor: cor ? `${cor}22` : 'var(--vida-hover)' }}
        >
          <IconeFator nome={icone} width={20} height={20} style={{ color: cor ?? 'var(--vida-muted)' }} />
        </span>
        <span className="text-[14px] font-medium">{nome || 'Novo fator'}</span>
      </div>

      <Campo rotulo="Nome">
        <CampoTexto valor={nome} onMudar={setNome} placeholder="Ex.: Corrida" autoFocus />
      </Campo>
      <Campo rotulo="Ícone">
        <SeletorIcone valor={icone} cor={cor} onEscolher={setIcone} />
      </Campo>
      <Campo rotulo="Cor">
        <div className="flex flex-col gap-2">
          <SeletorCor valor={cor} onEscolher={setCor} />
          {cor && (
            <button
              onClick={() => setCor(undefined)}
              className="cursor-pointer self-start text-[12px] text-muted hover:text-ink"
            >
              Remover cor
            </button>
          )}
        </div>
      </Campo>
      <Campo rotulo="Descrição (opcional)">
        <CampoTexto valor={descricao} onMudar={setDescricao} placeholder="Uma nota sobre este fator" />
      </Campo>

      <button
        onClick={salvar}
        className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg"
      >
        Salvar
      </button>

      {fator && (
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await arquivarFator(fator.id, !fator.arquivado)
              onFechar()
            }}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line text-[14px] font-medium text-muted transition-colors hover:text-ink"
          >
            <IconArquivar width={16} height={16} />
            {fator.arquivado ? 'Desarquivar' : 'Arquivar'}
          </button>
          <button
            onClick={excluir}
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border text-[14px] font-medium transition-colors ${
              confirmando ? 'border-danger bg-danger/10 text-danger' : 'border-line text-muted'
            }`}
          >
            <IconLixeira width={16} height={16} />
            {confirmando ? 'Confirmar' : 'Excluir'}
          </button>
        </div>
      )}
    </FolhaInferior>
  )
}
