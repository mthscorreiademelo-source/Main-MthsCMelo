import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconLocal, IconMais } from '../../core/components/Icons'
import { useListas } from '../compras/hooks'
import { EditorLugar } from './components/EditorLugar'
import { tipoInfo } from './db'
import { distanciaKm, distanciaLegivel, obterPosicao, temGeolocalizacao, type Coord } from './geolocalizacao'
import { useLugares } from './hooks'
import type { Lugar } from './types'

export function LugaresPage() {
  const lugares = useLugares()
  const listas = useListas()
  const [editar, setEditar] = useState<Lugar | null>(null)
  const [criar, setCriar] = useState(false)
  const [pos, setPos] = useState<Coord | null>(null)
  const [buscandoPos, setBuscandoPos] = useState(false)
  const [erroGeo, setErroGeo] = useState<string | null>(null)

  const nomeLista = (id?: string) => listas?.find((l) => l.id === id)?.nome

  async function pertoDeMim() {
    setBuscandoPos(true); setErroGeo(null)
    try {
      setPos(await obterPosicao())
    } catch {
      setErroGeo('Não foi possível obter sua localização. Verifique a permissão do navegador.')
    } finally {
      setBuscandoPos(false)
    }
  }

  const comDistancia = pos
    ? (lugares ?? [])
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => ({ lugar: l, km: distanciaKm(pos, { lat: l.lat!, lng: l.lng! }) }))
        .sort((a, b) => a.km - b.km)
    : []
  const maisProximo = comDistancia[0]

  const porTipo = new Map<string, Lugar[]>()
  for (const l of (lugares ?? []).slice().sort((a, b) => Number(b.favorito) - Number(a.favorito) || a.nome.localeCompare(b.nome))) {
    ;(porTipo.get(l.tipo) ?? porTipo.set(l.tipo, []).get(l.tipo)!).push(l)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconLocal width={22} height={22} className="text-accent" />
          <h1 className="text-[22px] font-bold">Lugares</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href="https://www.google.com/maps/saved"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium text-muted hover:text-ink"
            title="Abre a lista de lugares salvos no Google Maps"
          >
            🗺️ Google Maps
          </a>
          <button onClick={() => setCriar(true)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface"><IconMais width={16} height={16} /> Novo lugar</button>
        </div>
      </div>

      {/* Perto de mim */}
      {temGeolocalizacao() && (lugares ?? []).some((l) => l.lat != null) && (
        <div className="rounded-2xl border border-line bg-surface/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Perto de mim</span>
            <button onClick={pertoDeMim} disabled={buscandoPos} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-ink disabled:opacity-50">{buscandoPos ? 'Localizando…' : '📍 Ver o que está perto'}</button>
          </div>
          {erroGeo && <p className="mt-2 text-[12px] text-danger">{erroGeo}</p>}
          {pos && maisProximo && (
            <div className="mt-2">
              {maisProximo.km < 0.3 ? (
                <div className="rounded-xl bg-accent/10 p-3">
                  <p className="text-[13.5px] font-medium">Você parece estar em {maisProximo.lugar.nome}.</p>
                  {maisProximo.lugar.listaId && <Link to="/compras" className="mt-1 inline-block text-[13px] font-semibold text-accent">Abrir a lista {nomeLista(maisProximo.lugar.listaId)} →</Link>}
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {comDistancia.slice(0, 4).map(({ lugar, km }) => (
                    <li key={lugar.id} className="flex items-center gap-2 text-[13px]">
                      <span aria-hidden>{tipoInfo(lugar.tipo).icone}</span>
                      <span className="flex-1 truncate">{lugar.nome}</span>
                      {lugar.listaId && <Link to="/compras" className="text-[12px] text-accent">lista</Link>}
                      <span className="text-[12px] tabular-nums text-muted">{distanciaLegivel(km)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {pos && !maisProximo && <p className="mt-2 text-[12.5px] text-muted">Nenhum lugar com localização marcada por perto.</p>}
        </div>
      )}

      {lugares === undefined ? (
        <p className="py-10 text-center text-[14px] text-muted">Carregando…</p>
      ) : lugares.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
          <IconLocal width={40} height={40} className="text-muted/50" />
          <p className="text-[15px] font-medium">Nenhum lugar cadastrado</p>
          <p className="max-w-xs text-[13px] text-muted">Mercados, farmácias, pet shops, parques, clínicas… Marque a localização e o Lume sugere a lista certa quando você chegar perto.</p>
          <button onClick={() => setCriar(true)} className="mt-1 flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface"><IconMais width={16} height={16} /> Adicionar o primeiro</button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...porTipo.entries()].map(([tipo, lista]) => (
            <div key={tipo}>
              <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <span aria-hidden>{tipoInfo(tipo as Lugar['tipo']).icone}</span> {tipoInfo(tipo as Lugar['tipo']).nome}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {lista.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface/50 px-3 py-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-[16px]">{tipoInfo(l.tipo).icone}</span>
                    <button onClick={() => setEditar(l)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-medium">{l.nome}</span>
                        {l.favorito && <span className="text-[11px]">⭐</span>}
                        {l.lat != null && <IconLocal width={12} height={12} className="text-accent" />}
                      </div>
                      {(l.endereco || l.listaId) && <div className="truncate text-[11.5px] text-muted">{l.endereco}{l.endereco && l.listaId ? ' · ' : ''}{l.listaId ? `lista ${nomeLista(l.listaId)}` : ''}</div>}
                    </button>
                    {l.listaId && <Link to="/compras" className="rounded-full bg-hover px-2 py-1 text-[11.5px] font-medium text-muted hover:text-ink">Lista</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(criar || editar) && <EditorLugar lugar={editar ?? undefined} onFechar={() => { setCriar(false); setEditar(null) }} />}
    </div>
  )
}
