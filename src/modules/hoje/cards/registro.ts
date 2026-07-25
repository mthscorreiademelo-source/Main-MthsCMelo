import type { CardId } from '../composicao'
import { hhmmParaMin } from '../agora'
import type { DadosHoje } from '../dados'
import type { EntradaCard } from './tipos'
import * as C from './comuns'
import * as M from './manha'
import * as T from './tarde'
import * as N from './noite'

const sempre = () => true
const temEventoAgenda = (d: DadosHoje) => !!(d.atual || d.proximo)
const temTarefas = (d: DadosHoje) => d.tarefasHoje.length > 0
const temDespensa = (d: DadosHoje) => d.despensaAlertas.length > 0
const temAmanha = (d: DadosHoje) =>
  d.eventosAmanha.some((e) => !e.diaInteiro && hhmmParaMin(e.inicio) != null)

/**
 * Registry dos cards: liga cada id ao seu componente e à condição de ter dado
 * para aparecer. `disponivel` é a fonte da verdade — se for falso, o card nem
 * entra na grade (sem buracos); se for verdadeiro, o componente sempre desenha.
 */
export const REGISTRO: Record<CardId, EntradaCard> = {
  // manhã
  'sessao-foco': { Componente: M.CardSessaoFoco, disponivel: sempre },
  'planejamento-semanal': { Componente: M.CardPlanejamentoSemanal, disponivel: sempre },
  'capturar-ideia': { Componente: M.CardCapturarIdeia, disponivel: sempre },
  reflexao: { Componente: M.CardReflexao, disponivel: sempre },
  'frase-dia': { Componente: M.CardFraseDoDia, disponivel: sempre },
  leitura: { Componente: M.CardLeitura, disponivel: (d) => !!d.livroLendo },
  'acesso-rapido': { Componente: M.CardAcessoRapido, disponivel: sempre },
  amanha: { Componente: M.CardAmanha, disponivel: temAmanha },

  // tarde · foco
  'foco-do-dia': { Componente: T.CardFocoDoDia, disponivel: (d) => !!d.foco },
  'proximo-evento': { Componente: C.CardProximoEvento, disponivel: temEventoAgenda },
  'resumo-dia': { Componente: C.CardResumoDia, disponivel: (d) => d.indicadores.total > 0 },
  'linha-tempo': { Componente: C.CardLinhaTempo, disponivel: (d) => d.cronologicos.length > 0 },
  'tarefas-trabalho': { Componente: C.CardTarefasTrabalho, disponivel: temTarefas },
  'projetos-andamento': { Componente: T.CardProjetosAndamento, disponivel: (d) => d.projetosAndamento.length > 0 },
  financas: { Componente: C.CardFinancas, disponivel: (d) => !!d.orc },
  'lista-compras': { Componente: C.CardListaCompras, disponivel: temDespensa },
  notas: { Componente: C.CardNotas, disponivel: (d) => d.paginas.length > 0 },
  'cuidados-pets': { Componente: C.CardCuidadosPets, disponivel: (d) => d.petsPendentes.length > 0 },

  // atenção
  'proximas-tarefas': { Componente: C.CardProximasTarefas, disponivel: temTarefas },
  'estoque-critico': { Componente: C.CardEstoqueCritico, disponivel: temDespensa },

  // meio-dia / madrugada
  'pausa-meiodia': { Componente: C.CardPausaMeioDia, disponivel: sempre },
  'tarefas-hoje': { Componente: C.CardTarefasHoje, disponivel: temTarefas },
  descanso: { Componente: C.CardDescanso, disponivel: sempre },

  // noite
  desacelerar: { Componente: N.CardDesacelerar, disponivel: sempre },
  'resumo-noite': { Componente: N.CardResumoNoite, disponivel: sempre },
  humor: { Componente: N.CardHumor, disponivel: sempre },
  atividade: { Componente: N.CardAtividade, disponivel: (d) => d.atividadesHoje.length > 0 },
  'proposito-amanha': { Componente: N.CardPropositoAmanha, disponivel: sempre },
  'preparar-dormir': { Componente: N.CardPrepararDormir, disponivel: sempre },
  'sugestao-relaxar': { Componente: N.CardSugestaoRelaxar, disponivel: sempre },
  'amanha-espera': { Componente: N.CardAmanhaEspera, disponivel: sempre },

  // usado em vários modos
  'lembretes-saude': { Componente: C.CardLembretesSaude, disponivel: sempre },
}
