import { useState } from 'react'
import { Button } from '../../../core/components/Button'
import { Sheet } from '../../../core/components/Sheet'
import { IconLixeira } from '../../../core/components/Icons'
import { atualizarProjeto, CORES_PROJETO, criarProjeto, excluirProjeto } from '../db'
import type { Projeto } from '../types'

interface Props {
  /** null = criando; Projeto = editando; undefined = fechado. */
  projeto: Projeto | null | undefined
  onFechar: () => void
  onCriado?: (id: string) => void
}

export function EditorProjeto({ projeto, onFechar, onCriado }: Props) {
  const editando = !!projeto
  const [nome, setNome] = useState(projeto?.nome ?? '')
  const [cor, setCor] = useState(projeto?.cor ?? CORES_PROJETO[6])
  const [confirmar, setConfirmar] = useState(false)

  async function salvar() {
    if (!nome.trim()) return
    if (editando && projeto) {
      await atualizarProjeto(projeto.id, { nome: nome.trim(), cor })
    } else {
      const id = await criarProjeto({ nome: nome.trim(), cor })
      onCriado?.(id)
    }
    onFechar()
  }

  async function aoExcluir() {
    if (!projeto) return
    if (!confirmar) {
      setConfirmar(true)
      return
    }
    await excluirProjeto(projeto.id)
    onFechar()
  }

  return (
    <Sheet aberto={projeto !== undefined} titulo={editando ? 'Editar projeto' : 'Novo projeto'} onFechar={onFechar}>
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Nome</span>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && salvar()}
            placeholder="ex.: Trabalho, Casa, Estudos"
            className="min-h-11 rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted">Cor</span>
          <div className="flex flex-wrap gap-2">
            {CORES_PROJETO.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                aria-label={`Cor ${c}`}
                className={`size-8 rounded-full transition-transform ${cor === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <Button variante="primaria" onClick={salvar} className="justify-center">
          {editando ? 'Salvar' : 'Criar projeto'}
        </Button>

        {editando && (
          <Button variante="perigo" onClick={aoExcluir} className="self-start">
            <IconLixeira width={16} height={16} />
            {confirmar ? 'Confirmar exclusão' : 'Excluir projeto'}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
