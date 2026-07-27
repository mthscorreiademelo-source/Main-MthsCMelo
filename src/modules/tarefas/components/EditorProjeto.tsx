import { useEffect, useRef, useState } from 'react'
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
  const aberto = projeto !== undefined
  const editando = !!projeto
  const [nome, setNome] = useState(projeto?.nome ?? '')
  const [cor, setCor] = useState(projeto?.cor ?? CORES_PROJETO[6])
  const [confirmar, setConfirmar] = useState(false)
  const campoNome = useRef<HTMLInputElement>(null)

  // O painel fica sempre montado (escondido fora da tela). Por isso os valores
  // iniciais do useState só valem na primeira montagem. Sempre que o painel
  // abre para um alvo (um projeto específico para editar, ou "novo projeto"),
  // reiniciamos os campos com os valores atuais desse alvo — assim editar traz
  // o nome/cor do projeto, e "novo" vem em branco.
  useEffect(() => {
    if (!aberto) return
    setNome(projeto?.nome ?? '')
    setCor(projeto?.cor ?? CORES_PROJETO[6])
    setConfirmar(false)
    // Reinicia só quando o painel abre ou troca de projeto-alvo (id); não
    // relistamos nome/cor de propósito, para não apagar o que o usuário digita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, projeto?.id])

  // Foca o campo de nome só quando o painel abre — assim o teclado do tablet
  // não sobe sozinho enquanto o painel está fechado (fora da tela).
  useEffect(() => {
    if (aberto) campoNome.current?.focus()
  }, [aberto])

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
            ref={campoNome}
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
