import { useState } from 'react'
import { IconLixeira } from '../../../core/components/Icons'
import { atualizarCategoria, criarCategoria, excluirCategoria } from '../personalizar'
import type { Categoria } from '../types'
import { Campo } from './EditorHumorTipo'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { CampoTexto, SeletorIcone } from './seletores'

export function EditorCategoria({
  categoria,
  onFechar,
}: {
  categoria?: Categoria
  onFechar: () => void
}) {
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [icone, setIcone] = useState(categoria?.icone ?? 'folha')
  const [confirmando, setConfirmando] = useState(false)

  async function salvar() {
    if (!nome.trim()) return
    if (categoria) await atualizarCategoria(categoria.id, { nome: nome.trim(), icone })
    else await criarCategoria(nome, icone)
    onFechar()
  }

  async function excluir() {
    if (!categoria) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    await excluirCategoria(categoria.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo={categoria ? 'Editar categoria' : 'Nova categoria'} onFechar={onFechar}>
      <Campo rotulo="Nome">
        <CampoTexto valor={nome} onMudar={setNome} placeholder="Ex.: Sono" autoFocus />
      </Campo>
      <Campo rotulo="Ícone">
        <SeletorIcone valor={icone} onEscolher={setIcone} />
      </Campo>

      <button
        onClick={salvar}
        className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg"
      >
        Salvar
      </button>

      {categoria && !categoria.sistema && (
        <button
          onClick={excluir}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border text-[14px] font-medium transition-colors ${
            confirmando ? 'border-danger bg-danger/10 text-danger' : 'border-line text-muted'
          }`}
        >
          <IconLixeira width={16} height={16} />
          {confirmando ? 'Excluir categoria e seus fatores?' : 'Excluir categoria'}
        </button>
      )}
    </FolhaInferior>
  )
}
