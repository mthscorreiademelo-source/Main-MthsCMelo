import type { Faixa } from './agora'
import type { Tamanho } from './CartaoHoje'

/**
 * A COMPOSIÇÃO do Hoje — o coração da reconstrução. Cada momento do dia não só
 * muda o selo: monta um CONJUNTO PRÓPRIO de cards, com hierarquia (um herói
 * grande + médios + pequenos). É isto que faz a manhã, a tarde e a noite serem
 * telas visivelmente diferentes, e não a mesma grade reordenada.
 *
 * Aqui fica só a DECISÃO (pura e testável): que modo é agora e quais cards, em
 * que largura, entram nele. Quem sabe DESENHAR cada card é o HojePage/registry;
 * quem sabe se um card TEM dado é a função `disponivel` de cada card (um card
 * sem dado simplesmente some, e os vizinhos preenchem o espaço).
 */

/** Os modos de composição — cada um é uma "tela" diferente do Hoje. */
export type ModoComposicao = 'planejar' | 'meiodia' | 'foco' | 'atencao' | 'noite' | 'madrugada'

/** Todos os cards que o Hoje sabe montar. */
export type CardId =
  // manhã · planejar
  | 'sessao-foco'
  | 'planejamento-semanal'
  | 'capturar-ideia'
  | 'reflexao'
  | 'frase-dia'
  | 'leitura'
  | 'lembretes-saude'
  | 'acesso-rapido'
  | 'amanha'
  // tarde · foco / trabalho
  | 'foco-do-dia'
  | 'proximo-evento'
  | 'resumo-dia'
  | 'linha-tempo'
  | 'tarefas-trabalho'
  | 'projetos-andamento'
  | 'financas'
  | 'lista-compras'
  | 'notas'
  | 'cuidados-pets'
  // atenção
  | 'proximas-tarefas'
  | 'estoque-critico'
  // meio-dia / madrugada (enxutos)
  | 'pausa-meiodia'
  | 'tarefas-hoje'
  | 'descanso'
  // noite · desacelerar
  | 'desacelerar'
  | 'resumo-noite'
  | 'humor'
  | 'atividade'
  | 'proposito-amanha'
  | 'preparar-dormir'
  | 'sugestao-relaxar'
  | 'amanha-espera'

export interface ItemComposicao {
  id: CardId
  /** Classes de largura na grade (mobile empilha; md = 6 col; xl = 12 col). */
  span: string
  /** Respiro interno do card (herói = maior). */
  tamanho?: Tamanho
}

/* Larguras reutilizáveis — a grade é de 12 colunas no xl e 6 no md. */
const TERCO = 'md:col-span-3 xl:col-span-4' //  1/3 no xl, 1/2 no md
const MEIO = 'md:col-span-3 xl:col-span-6' //   1/2
const DOIS_TERCOS = 'md:col-span-6 xl:col-span-8' // 2/3 no xl, inteiro no md
const INTEIRO = 'md:col-span-6 xl:col-span-12'
const QUARTO = 'md:col-span-3 xl:col-span-3' //  1/4 no xl, 1/2 no md

/** Estado do dia que, junto do horário, decide qual "tela" mostrar. */
export interface EstadoComposicao {
  temAlertaAlta: boolean
}

/**
 * Qual "tela" (modo de composição) mostrar agora. Um alerta urgente sempre vence
 * e vira a tela de Atenção; fora isso, o horário manda.
 */
export function modoComposicao(faixa: Faixa, estado: EstadoComposicao): ModoComposicao {
  if (estado.temAlertaAlta) return 'atencao'
  switch (faixa) {
    case 'madrugada':
      return 'madrugada'
    case 'manha':
      return 'planejar'
    case 'meiodia':
      return 'meiodia'
    case 'tarde':
      return 'foco'
    case 'noite':
    case 'fimdenoite':
      return 'noite'
  }
}

/**
 * Os cards de cada modo, em ordem e largura. Um card só aparece se tiver dado
 * (ver `disponivel` no registry), então listar aqui é "pode aparecer", não
 * "vai aparecer sempre".
 */
export const COMPOSICOES: Record<ModoComposicao, ItemComposicao[]> = {
  // 🌅 Começar o dia com intenção: foco, planejamento e captura de ideias.
  planejar: [
    { id: 'sessao-foco', span: TERCO, tamanho: 'hero' },
    { id: 'planejamento-semanal', span: TERCO },
    { id: 'capturar-ideia', span: TERCO },
    { id: 'reflexao', span: TERCO },
    { id: 'frase-dia', span: TERCO },
    { id: 'leitura', span: TERCO },
    { id: 'lembretes-saude', span: TERCO },
    { id: 'acesso-rapido', span: TERCO },
    { id: 'amanha', span: TERCO },
    { id: 'cuidados-pets', span: TERCO },
  ],

  // ☀️ Meio do dia enxuto: respirar, hidratar e olhar o que vem a seguir.
  meiodia: [
    { id: 'pausa-meiodia', span: DOIS_TERCOS, tamanho: 'hero' },
    { id: 'proximo-evento', span: TERCO },
    { id: 'tarefas-hoje', span: MEIO },
    { id: 'lembretes-saude', span: MEIO },
    { id: 'linha-tempo', span: INTEIRO },
  ],

  // 🎯 Tarde de produzir: foco no projeto, agenda e progresso do dia.
  foco: [
    { id: 'foco-do-dia', span: TERCO, tamanho: 'hero' },
    { id: 'proximo-evento', span: TERCO },
    { id: 'resumo-dia', span: TERCO },
    { id: 'linha-tempo', span: DOIS_TERCOS },
    { id: 'tarefas-trabalho', span: TERCO },
    { id: 'projetos-andamento', span: QUARTO },
    { id: 'financas', span: QUARTO },
    { id: 'lista-compras', span: QUARTO },
    { id: 'notas', span: QUARTO },
    { id: 'cuidados-pets', span: QUARTO },
  ],

  // 🚨 Resolver o urgente primeiro (o banner é herói acima da grade).
  atencao: [
    { id: 'linha-tempo', span: DOIS_TERCOS },
    { id: 'proximas-tarefas', span: TERCO },
    { id: 'estoque-critico', span: QUARTO },
    { id: 'financas', span: QUARTO },
    { id: 'lista-compras', span: QUARTO },
    { id: 'notas', span: QUARTO },
  ],

  // 🌙 Desacelerar: gratidão, humor, resumo do dia e preparar o amanhã.
  noite: [
    { id: 'desacelerar', span: DOIS_TERCOS, tamanho: 'hero' },
    { id: 'resumo-noite', span: TERCO },
    { id: 'humor', span: TERCO },
    { id: 'atividade', span: TERCO },
    { id: 'proposito-amanha', span: TERCO },
    { id: 'preparar-dormir', span: TERCO },
    { id: 'sugestao-relaxar', span: TERCO },
    { id: 'amanha-espera', span: TERCO },
  ],

  // 🌃 Madrugada: convite ao descanso e só o essencial do que vem.
  madrugada: [
    { id: 'descanso', span: DOIS_TERCOS, tamanho: 'hero' },
    { id: 'proximo-evento', span: TERCO },
  ],
}

/** Título curto do modo, para o rodapé/depuração. */
export const ROTULO_MODO: Record<ModoComposicao, string> = {
  planejar: 'Planejar',
  meiodia: 'Pausa',
  foco: 'Foco',
  atencao: 'Atenção',
  noite: 'Desacelerar',
  madrugada: 'Descanso',
}
