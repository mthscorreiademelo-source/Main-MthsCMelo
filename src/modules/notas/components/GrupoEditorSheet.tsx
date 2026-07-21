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
  const [capaDark, setCapaDark] = useState<string | undefined>(undefined)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const inputClara = useRef<HTMLInputElement>(null)
  const inputEscura = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) {
      setNome(grupo?.nome ?? '')
      setCapa(grupo?.capa)
      setCapaDark(grupo?.capaDark)
      setConfirmandoExclusao(false)
    }
  }, [aberto, grupo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function salvarNome(valor: string) {
    setNome(valor)
    if (grupo && valor.trim()) atualizarGrupo(grupo.id, { nome: valor.trim() })
  }

  async function aoEscolherCapa(arquivo: File, tema: 'light' | 'dark') {
    try {
      const dataUrl = await processarCapa(arquivo)
      if (tema === 'dark') {
        setCapaDark(dataUrl)
        if (grupo) atualizarGrupo(grupo.id, { capaDark: dataUrl })
      } else {
        setCapa(dataUrl)
        if (grupo) atualizarGrupo(grupo.id, { capa: dataUrl })
      }
    } catch {
      // imagem inválida: ignora silenciosamente
    }
  }

  function removerCapa(tema: 'light' | 'dark') {
    if (tema === 'dark') {
      setCapaDark(undefined)
      if (grupo) atualizarGrupo(grupo.id, { capaDark: undefined })
    } else {
      setCapa(undefined)
      if (grupo) atualizarGrupo(grupo.id, { capa: undefined })
    }
  }

  async function aoCriar() {
    const id = await criarGrupo(nome)
    if (id && (capa || capaDark)) await atualizarGrupo(id, { capa, capaDark })
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
            Capas (retrato 4:5)
          </span>
          <div className="flex flex-wrap gap-4">
            {/* Capa modo claro */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => inputClara.current?.click()}
                aria-label={capa ? 'Trocar capa clara' : 'Adicionar capa clara'}
                className="w-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-white transition-colors hover:border-muted/60"
              >
                {capa ? (
                  <img src={capa} alt="" className="aspect-[4/5] w-full object-contain" />
                ) : (
                  <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 text-neutral-400">
                    <IconMais />
                    <span className="text-[11px]">Modo claro</span>
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-medium text-muted">☀️ Claro</span>
                {capa && (
                  <button onClick={() => removerCapa('light')} className="text-[11px] text-muted hover:text-danger">Remover</button>
                )}
              </div>
            </div>

            {/* Capa modo escuro */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => inputEscura.current?.click()}
                aria-label={capaDark ? 'Trocar capa escura' : 'Adicionar capa escura'}
                className="w-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-neutral-900 transition-colors hover:border-muted/60"
              >
                {capaDark ? (
                  <img src={capaDark} alt="" className="aspect-[4/5] w-full object-contain" />
                ) : (
                  <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 text-neutral-500">
                    <IconMais />
                    <span className="text-[11px]">Modo escuro</span>
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-medium text-muted">🌙 Escuro</span>
                {capaDark && (
                  <button onClick={() => removerCapa('dark')} className="text-[11px] text-muted hover:text-danger">Remover</button>
                )}
              </div>
            </div>
          </div>
          <input
            ref={inputClara}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) aoEscolherCapa(arquivo, 'light')
              e.target.value = ''
            }}
          />
          <input
            ref={inputEscura}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) aoEscolherCapa(arquivo, 'dark')
              e.target.value = ''
            }}
          />
          <p className="text-[12px] text-muted/70">
            A capa escura é opcional — sem ela, a clara vale para os dois temas. Ótimo para PNGs com fundo transparente.
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
