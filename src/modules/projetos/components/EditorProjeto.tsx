import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { CORES_PROJETO, criarProjetoWorkspace } from '../db'
import { TEMPLATES } from '../modulos'

const ICONES = ['📁', '🚀', '📱', '🏢', '🎓', '✈️', '🏠', '💡', '🎯', '📊', '🛠️', '🎨', '🌱', '❤️', '🎉', '🔬']

export function EditorProjeto({ onFechar, onCriado }: { onFechar: () => void; onCriado: (id: string) => void }) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [icone, setIcone] = useState(ICONES[0])
  const [cor, setCor] = useState(CORES_PROJETO[0])
  const [templateId, setTemplateId] = useState('vazio')

  async function criar() {
    if (!nome.trim()) return
    const id = await criarProjetoWorkspace({ nome, descricao, categoria, icone, cor, templateId })
    onCriado(id)
  }

  return (
    <FolhaInferior titulo="Novo projeto" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        {/* Ícone + nome */}
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-[28px]" style={{ backgroundColor: `color-mix(in srgb, ${cor} 14%, var(--vida-surface))` }}>{icone}</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do projeto"
            autoFocus
            className="min-h-12 flex-1 rounded-xl border border-line bg-transparent px-3 text-[16px] font-semibold outline-none focus:border-muted/50"
          />
        </div>

        {/* Ícones */}
        <div className="flex flex-wrap gap-1.5">
          {ICONES.map((e) => (
            <button key={e} onClick={() => setIcone(e)} className={`flex size-9 items-center justify-center rounded-lg text-[18px] transition-colors ${icone === e ? 'bg-ink' : 'bg-hover hover:bg-hover/70'}`}>{e}</button>
          ))}
        </div>

        {/* Cor */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted">Cor</span>
          <div className="flex flex-wrap gap-1.5">
            {CORES_PROJETO.map((c) => (
              <button key={c} onClick={() => setCor(c)} className={`size-7 rounded-full transition-transform ${cor === c ? 'ring-2 ring-offset-2 ring-offset-surface' : ''}`} style={{ backgroundColor: c, boxShadow: cor === c ? `0 0 0 2px ${c}` : undefined }} aria-label="cor" />
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Descrição <span className="font-normal text-muted/60">(opcional)</span></span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Uma linha sobre o projeto" className="min-h-11 rounded-xl border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Categoria <span className="font-normal text-muted/60">(opcional)</span></span>
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Trabalho, Pessoal, Estudo" className="min-h-11 rounded-xl border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50" />
        </label>

        {/* Template */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Começar com</span>
          <p className="-mt-1 text-[11.5px] text-muted/70">O template só sugere os módulos iniciais — nada fica travado, você ajusta depois.</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13px] transition-colors ${templateId === t.id ? 'border-ink bg-hover' : 'border-line hover:bg-hover/60'}`}
              >
                <span className="text-[16px]">{t.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{t.nome}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={criar} disabled={!nome.trim()} className="mt-1 flex min-h-12 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-surface disabled:opacity-40">
          Criar projeto
        </button>
      </div>
    </FolhaInferior>
  )
}
