import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { criarMovimento, formatarBRL, parsearValor } from '../../financas/db'
import { CartaoModulo, Vazio, type ControleCartao } from './CartaoModulo'
import { criarConsulta, removerConsulta, TIPOS_HISTORICO } from '../db'
import { useConsultas } from '../hooks'
import type { Pet, TipoHistorico } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

function iconeTipo(t: TipoHistorico): string {
  return TIPOS_HISTORICO.find((x) => x.valor === t)?.icone ?? '📋'
}

export function CardHistorico({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const consultas = useConsultas(pet.id)
  const [add, setAdd] = useState(false)
  const [tipo, setTipo] = useState<TipoHistorico>('consulta')
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(hojeISO())
  const [vet, setVet] = useState('')
  const [descricao, setDescricao] = useState('')
  const [custo, setCusto] = useState('')

  const lista = [...(consultas ?? [])].sort((a, b) => b.data.localeCompare(a.data))

  async function salvar() {
    if (!titulo.trim()) return
    const centavos = custo ? parsearValor(custo) ?? undefined : undefined
    if (centavos) {
      await criarMovimento({ tipo: 'saida', valorCentavos: centavos, descricao: `${pet.nome} · ${titulo.trim()}`, data, categoria: 'Pets', petId: pet.id })
    }
    await criarConsulta({
      petId: pet.id,
      tipo,
      titulo: titulo.trim(),
      data,
      veterinario: vet.trim() || undefined,
      descricao: descricao.trim() || undefined,
      custoCentavos: centavos,
    })
    setTitulo(''); setVet(''); setDescricao(''); setCusto(''); setData(hojeISO()); setTipo('consulta'); setAdd(false)
  }

  return (
    <CartaoModulo
      titulo="Histórico veterinário"
      emoji="🩺"
      acao={
        <button onClick={() => setAdd(true)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Registrar">
          <IconMais width={16} height={16} />
        </button>
      }
      {...controle}
    >
      {lista.length === 0 ? (
        <Vazio>Nenhum registro no prontuário ainda.</Vazio>
      ) : (
        <ul className="flex flex-col">
          {lista.map((c, i) => (
            <li key={c.id} className="group flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-hover text-[13px]">{iconeTipo(c.tipo)}</span>
                {i < lista.length - 1 && <span className="my-1 w-px flex-1 bg-line" />}
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-medium">{c.titulo}</span>
                  <button onClick={() => removerConsulta(c.id)} className="text-[16px] leading-none text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100" title="Remover">×</button>
                </div>
                <div className="text-[11.5px] text-muted">
                  {format(parseISO(c.data), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                  {c.veterinario ? ` · ${c.veterinario}` : ''}
                  {c.custoCentavos ? ` · ${formatarBRL(c.custoCentavos)}` : ''}
                </div>
                {c.descricao && <p className="mt-0.5 text-[12.5px] text-ink/80">{c.descricao}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {add && (
        <FolhaInferior titulo="Registrar no prontuário" onFechar={() => setAdd(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_HISTORICO.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => setTipo(t.valor)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    tipo === t.valor ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span aria-hidden>{t.icone}</span> {t.nome}
                </button>
              ))}
            </div>
            <label className="block"><span className={ROT}>Título</span><input className={`${CAMPO} mt-1`} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Consulta de rotina" autoFocus /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className={ROT}>Data</span><input type="date" className={`${CAMPO} mt-1`} value={data} onChange={(e) => setData(e.target.value)} /></label>
              <label className="block"><span className={ROT}>Custo (opcional)</span><input inputMode="decimal" className={`${CAMPO} mt-1`} value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="R$ 0,00" /></label>
            </div>
            <label className="block"><span className={ROT}>Veterinário / local</span><input className={`${CAMPO} mt-1`} value={vet} onChange={(e) => setVet(e.target.value)} placeholder="Opcional" /></label>
            <label className="block"><span className={ROT}>Descrição</span><textarea className={`${CAMPO} mt-1 min-h-16 resize-y`} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Diagnóstico, orientações, resultados…" /></label>
            {custo && <p className="text-[12px] text-muted">O custo será lançado em Finanças, vinculado a {pet.nome}.</p>}
            <button onClick={salvar} disabled={!titulo.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
