import { useState } from 'react'
import { atualizarHumorTipo } from '../personalizar'
import type { HumorTipo } from '../types'
import { FolhaInferior } from './FolhaInferior'
import { RostoHumor } from './RostoHumor'
import { CampoTexto, SeletorCor } from './seletores'

export function EditorHumorTipo({ tipo, onFechar }: { tipo: HumorTipo; onFechar: () => void }) {
  const [nome, setNome] = useState(tipo.nome)
  const [cor, setCor] = useState(tipo.cor)
  const [descricao, setDescricao] = useState(tipo.descricao ?? '')

  async function salvar() {
    if (!nome.trim()) return
    await atualizarHumorTipo(tipo.nivel, {
      nome: nome.trim(),
      cor,
      descricao: descricao.trim() || undefined,
    })
    onFechar()
  }

  return (
    <FolhaInferior titulo="Editar humor" onFechar={onFechar}>
      <div className="flex items-center gap-3">
        <span
          className="flex size-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${cor}26` }}
        >
          <RostoHumor nivel={tipo.nivel} width={38} height={38} style={{ color: cor }} />
        </span>
        <p className="text-[13px] text-muted">
          O rosto acompanha o nível ({tipo.nivel}/5) para manter as correlações — você ajusta o
          nome, a cor e a descrição.
        </p>
      </div>

      <Campo rotulo="Nome">
        <CampoTexto valor={nome} onMudar={setNome} placeholder="Nome do humor" />
      </Campo>
      <Campo rotulo="Cor">
        <SeletorCor valor={cor} onEscolher={setCor} />
      </Campo>
      <Campo rotulo="Descrição (opcional)">
        <CampoTexto valor={descricao} onMudar={setDescricao} placeholder="Ex.: um ótimo dia" />
      </Campo>

      <button
        onClick={salvar}
        className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg"
      >
        Salvar
      </button>
    </FolhaInferior>
  )
}

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">{rotulo}</span>
      {children}
    </label>
  )
}
