import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { useListas } from '../../compras/hooks'
import { usePets } from '../../pets/hooks'
import { atualizarLugar, criarLugar, excluirLugar, TIPOS_LUGAR } from '../db'
import { obterPosicao } from '../geolocalizacao'
import type { Lugar, TipoLugar } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

export function EditorLugar({ lugar, onFechar }: { lugar?: Lugar; onFechar: () => void }) {
  const listas = useListas()
  const pets = usePets()
  const editando = !!lugar
  const [nome, setNome] = useState(lugar?.nome ?? '')
  const [tipo, setTipo] = useState<TipoLugar>(lugar?.tipo ?? 'mercado')
  const [endereco, setEndereco] = useState(lugar?.endereco ?? '')
  const [listaId, setListaId] = useState(lugar?.listaId ?? '')
  const [petId, setPetId] = useState(lugar?.petId ?? '')
  const [coord, setCoord] = useState<{ lat?: number; lng?: number }>({ lat: lugar?.lat, lng: lugar?.lng })
  const [capturando, setCapturando] = useState(false)
  const [erroGeo, setErroGeo] = useState<string | null>(null)

  function escolherTipo(t: TipoLugar) {
    setTipo(t)
    // sugere a lista com nome igual ao tipo, se existir e nada escolhido
    if (!listaId) {
      const sug = TIPOS_LUGAR.find((x) => x.valor === t)?.listaSugerida
      const l = listas?.find((x) => x.nome === sug)
      if (l) setListaId(l.id)
    }
  }

  async function usarLocalizacao() {
    setCapturando(true); setErroGeo(null)
    try {
      const p = await obterPosicao()
      setCoord(p)
    } catch {
      setErroGeo('Não foi possível obter sua localização. Verifique a permissão do navegador.')
    } finally {
      setCapturando(false)
    }
  }

  async function salvar() {
    if (!nome.trim()) return
    const dados = { nome: nome.trim(), tipo, endereco: endereco.trim() || undefined, listaId: listaId || undefined, petId: petId || undefined, lat: coord.lat, lng: coord.lng }
    if (editando && lugar) await atualizarLugar(lugar.id, dados)
    else await criarLugar(dados)
    onFechar()
  }
  async function apagar() {
    if (!lugar) return
    if (!confirm(`Excluir “${lugar.nome}”?`)) return
    await excluirLugar(lugar.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo={editando ? 'Editar lugar' : 'Novo lugar'} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <label className="block"><span className={ROT}>Nome</span><input autoFocus className={`${CAMPO} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Mercado do bairro" /></label>
        <div>
          <span className={ROT}>Tipo</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TIPOS_LUGAR.map((t) => (
              <button key={t.valor} onClick={() => escolherTipo(t.valor)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-medium ${tipo === t.valor ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>
                <span aria-hidden>{t.icone}</span> {t.nome}
              </button>
            ))}
          </div>
        </div>
        <label className="block"><span className={ROT}>Endereço</span><input className={`${CAMPO} mt-1`} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Opcional" /></label>

        <div>
          <span className={ROT}>Localização (para “perto de mim”)</span>
          <div className="mt-1.5 flex items-center gap-2">
            <button onClick={usarLocalizacao} disabled={capturando} className="rounded-xl border border-line px-3 py-2 text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50">
              {capturando ? 'Obtendo…' : '📍 Usar minha localização atual'}
            </button>
            {coord.lat != null && <span className="text-[12px] text-accent">✓ marcada</span>}
          </div>
          {erroGeo && <p className="mt-1 text-[11px] text-danger">{erroGeo}</p>}
        </div>

        {(listas ?? []).length > 0 && (
          <div>
            <span className={ROT}>Lista de compras associada</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button onClick={() => setListaId('')} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${!listaId ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>Nenhuma</button>
              {(listas ?? []).map((l) => (
                <button key={l.id} onClick={() => setListaId(l.id)} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${listaId === l.id ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{l.icone} {l.nome}</button>
              ))}
            </div>
          </div>
        )}

        {(pets ?? []).length > 0 && (tipo === 'petshop' || tipo === 'parque' || tipo === 'clinica') && (
          <div>
            <span className={ROT}>Pet associado</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button onClick={() => setPetId('')} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${!petId ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>Nenhum</button>
              {(pets ?? []).map((p) => (
                <button key={p.id} onClick={() => setPetId(p.id)} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${petId === p.id ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{p.emoji ?? '🐾'} {p.nome}</button>
              ))}
            </div>
          </div>
        )}

        <button onClick={salvar} disabled={!nome.trim()} className="mt-1 min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">{editando ? 'Salvar' : 'Adicionar lugar'}</button>
        {editando && <button onClick={apagar} className="min-h-10 rounded-xl text-[13px] font-medium text-danger hover:bg-danger/10">Excluir</button>}
      </div>
    </FolhaInferior>
  )
}
