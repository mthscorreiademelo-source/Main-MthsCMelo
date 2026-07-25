import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconCalendario, IconCheck, IconLua, IconSol } from '../../core/components/Icons'
import { dataPorExtenso, saudacao } from '../../core/dates'
import { SeloModo } from './SeloModo'
import { BannerAlerta } from './BannerAlerta'
import { useDadosHoje } from './dados'
import { COMPOSICOES, ROTULO_MODO, modoComposicao } from './composicao'
import type { ModoComposicao } from './composicao'
import { modoDoMomento } from './modo'
import { temAlertaAlta } from './alertas'
import { REGISTRO } from './cards/registro'

/**
 * Dashboard "Hoje" — o cérebro do LUME. Não é uma grade fixa reordenada: a cada
 * MODO do dia (planejar / pausa / foco / atenção / desacelerar / descanso) ele
 * monta um CONJUNTO PRÓPRIO de cards, com hierarquia. Manhã, tarde e noite são
 * telas visivelmente diferentes — foi o que o Matheus pediu.
 *
 * Fluxo: `useDadosHoje` carrega tudo → a composição do modo diz quais cards e em
 * que largura → cada card só aparece se tiver dado. O horário pode ser forçado
 * com `?agora=HH:MM` (ver agora.ts) para testar cada tela.
 */
export function HojePage() {
  const dados = useDadosHoje()
  // Alertas dispensados (X): somem da tela e devolvem o modo ao do horário.
  const [alertasDispensados, setAlertasDispensados] = useState('')

  const assinaturaAlertas = dados.alertas.map((a) => a.id).join('|')
  const alertasVisiveis =
    assinaturaAlertas && assinaturaAlertas !== alertasDispensados ? dados.alertas : []
  const altosVisiveis = temAlertaAlta(alertasVisiveis)

  // Selo e modo consideram só os alertas ainda visíveis (dispensar volta ao normal).
  const modo = modoDoMomento(dados.agora, {
    temAlertaAlta: altosVisiveis,
    temTrabalho: dados.temTrabalho,
  })
  const modoComp = modoComposicao(dados.faixa, { temAlertaAlta: altosVisiveis })

  const itens = COMPOSICOES[modoComp].filter((item) => REGISTRO[item.id].disponivel(dados))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="lume-entrada pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{saudacao(dados.agora)}</h1>
          <SeloModo modo={modo} />
        </div>
        <p className="mt-1 text-sm text-muted">{dataPorExtenso(dados.agora)}</p>
      </header>

      {!dados.carregando && alertasVisiveis.length > 0 && (
        <BannerAlerta
          alertas={alertasVisiveis}
          onDispensar={() => setAlertasDispensados(assinaturaAlertas)}
        />
      )}

      {dados.carregando ? (
        <p className="py-16 text-center text-sm text-muted">Organizando o seu dia…</p>
      ) : itens.length === 0 ? (
        <VazioHoje />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
          {itens.map((item) => {
            const { Componente } = REGISTRO[item.id]
            return (
              <div key={item.id} className={item.span}>
                <Componente dados={dados} tamanho={item.tamanho} />
              </div>
            )
          })}
        </div>
      )}

      <RodapeModo modo={modoComp} diurno={modo.diurno} />
    </div>
  )
}

/** Frase de rodapé que acompanha o momento do dia. */
const FRASE_RODAPE: Record<ModoComposicao, string> = {
  planejar: 'Comece o dia com intenção — pequenos passos levam a grandes lugares.',
  meiodia: 'Metade do dia. Respire, hidrate-se e siga no seu ritmo.',
  foco: 'Foco e constância constroem liberdade. Continue avançando!',
  atencao: 'Tem algo pedindo atenção agora. Resolva o urgente e siga com calma.',
  noite: 'Boa noite. Você fez o seu melhor hoje — descanse para um bom amanhã.',
  madrugada: 'Ainda é madrugada. Se puder, durma: o dia começa melhor com sono.',
}

/** Estado calmo quando o momento não tem nada a mostrar (ex.: tarde sem dados). */
function VazioHoje() {
  return (
    <div className="lume-entrada flex flex-col items-center justify-center rounded-2xl border border-line bg-surface/50 px-6 py-14 text-center">
      <p className="text-[15px] font-medium">Nada urgente por agora. 🌿</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">
        Um bom espaço para focar no que importa — ou simplesmente respirar.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          to="/tarefas"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <IconCheck width={14} height={14} /> Nova tarefa
        </Link>
        <Link
          to="/agenda"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[13px] font-medium transition-colors hover:bg-hover"
        >
          <IconCalendario width={14} height={14} /> Ver agenda
        </Link>
      </div>
    </div>
  )
}

function RodapeModo({ modo, diurno }: { modo: ModoComposicao; diurno: boolean }) {
  const Icone = diurno ? IconSol : IconLua
  return (
    <p className="lume-entrada flex items-center gap-2 px-1 pb-2 pt-1 text-[13px] leading-relaxed text-muted/90">
      <Icone width={15} height={15} className="shrink-0 opacity-70" />
      <span>{FRASE_RODAPE[modo]}</span>
      <span className="sr-only">Modo {ROTULO_MODO[modo]}</span>
    </p>
  )
}
