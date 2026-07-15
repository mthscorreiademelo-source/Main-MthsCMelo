import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../core/components/Button'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import { Sheet } from '../../../core/components/Sheet'
import { atualizarGrupo, criarGrupo, excluirGrupo, processarCapa } from '../db'
import type { Grupo } from '../types'

interface Props {
  aberto: boolean
  /** null = modo criação */
  grupo: Grupo | null
  onFechar: () => void
  /** Chamado após excluir (modo edição) para navegar de volta. */
  onExcluido?: () => void
}

export function GrupoEditorSheet({ aberto, grupo, onFechar, onExcluido }: Props) {
  const criando = !grupo
  const [nome, setNome] = useState('')
  const [capa, setCapa] = useState<string | undefined>(undefined)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const inputArquivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) {
      setNome(grupo?.nome ?? '')
      setCapa(grupo?.capa)
      setConfirmandoExclusao(false)
    }
  }, [aberto, grupo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function salvarNome(valor: string) {
    setNome(valor)
    if (grupo && valor.trim()) atualizarGrupo(grupo.id, { nome: valor.trim() })
  }

  async function aoEscolherCapa(arquivo: File) {
    try {
      const dataUrl = await processarCapa(arquivo)
      setCapa(dataUrl)
      if (grupo) atualizarGrupo(grupo.id, { capa: dataUrl })
    } catch {
      // imagem inválida: ignora silenciosamente
    }
  }

  function removerCapa() {
    setCapa(undefined)
    if (grupo) atualizarGrupo(grupo.id, { capa: undefined })
  }

  async function aoCriar() {
    const id = await criarGrupo(nome)
    if (id && capa) await atualizarGrupo(id, { capa })
    if (id) onFechar()
  }

  async function aoExcluir() {
    if (!grupo) return
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    await excluirGrupo(grupo.id)
    onFechar()
    onExcluido?.()
  }

  return (
    <Sheet aberto={aberto} titulo={criando ? 'Novo grupo' : 'Grupo'} onFechar={onFechar}>
      <div className="flex h-full flex-col gap-5">
        <input
          value={nome}
          onChange={(e) => (criando ? setNome(e.target.value) : salvarNome(e.target.value))}
          placeholder="Nome do grupo"
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted/60"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">
            Capa (retrato 4:5)
          </span>
          <div className="flex items-end gap-3">
            <button
              onClick={() => inputArquivo.current?.click()}
              aria-label={capa ? 'Trocar capa' : 'Adicionar capa'}
              className="w-32 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line transition-colors hover:border-muted/60"
            >
              {capa ? (
                <img src={capa} alt="" className="aspect-[4/5] w-full object-cover" />
              ) : (
                <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 text-muted">
                  <IconMais />
                  <span className="text-[12px]">Adicionar</span>
                </span>
              )}
            </button>
            {capa && (
              <Button onClick={removerCapa} className="text-muted">
                Remover capa
              </Button>
            )}
          </div>
          <input
            ref={inputArquivo}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) aoEscolherCapa(arquivo)
              e.target.value = ''
            }}
          />
          <p className="text-[12px] text-muted/70">
            A imagem é recortada ao centro automaticamente.
          </p>
        </div>

        <div className="flex-1" />

        {criando ? (
          <Button
            variante="primaria"
            onClick={aoCriar}
            disabled={!nome.trim()}
            className="self-stretch"
          >
            Criar grupo
          </Button>
        ) : (
          <>
            <p className="text-[12px] leading-relaxed text-muted/70">
              Ao excluir um grupo, as notas dele não são apagadas — voltam para
              as notas soltas.
            </p>
            <Button variante="perigo" onClick={aoExcluir} className="self-start">
              <IconLixeira width={16} height={16} />
              {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir grupo'}
            </Button>
          </>
        )}
      </div>
    </Sheet>
  )
}
