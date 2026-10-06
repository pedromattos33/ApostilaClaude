import { lessons, modules } from './content.js';

export const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 .-]/g, ' ').replace(/\s+/g, ' ').trim();
const stops = new Set('a o as os um uma uns umas de do da dos das em no na nos nas para por com como que qual quais quero queria gostaria me meu minha eu voce ele ela e ou onde esta estao esse essa isso aqui sobre aprender ensina ensinar pode poderia fazer faz usar uso claude apostila conteudo aula aulas preciso saber ter tem ao pelo pela'.split(' '));
const synonyms = { skills: 'skill', plugins: 'plugin', conectores: 'conector', imagens: 'imagem', fotos: 'imagem', foto: 'imagem', prints: 'imagem', printscreens: 'imagem', gerar: 'criar', criacao: 'criar', criar: 'criar', crie: 'criar', automacoes: 'automacao', automatizar: 'automacao', automatico: 'automacao', automaticas: 'automacao', instalacao: 'instalar', instale: 'instalar', instalando: 'instalar', instalar: 'instalar', agendamento: 'agendar', agendadas: 'agendar', agendada: 'agendar', iniciantes: 'iniciante', permissao: 'permissoes', testar: 'testes', teste: 'testes', configuracao: 'configurar', tarefas: 'tarefa', primeira: 'primeiro', analise: 'analisar' };
function tokens(query) { return normalize(query).split(' ').filter(t => t.length > 1 && !stops.has(t)).map(t => synonyms[t] || t); }
export function searchLessons(query, limit = 6) {
  const terms = [...new Set(tokens(query))];
  if (!terms.length) return [];
  return lessons.map(lesson => {
    const title = tokens(lesson.title);
    const tags = tokens(lesson.tags.join(' '));
    const module = modules.find(m => m.id === lesson.module);
    const body = tokens(lesson.intro + ' ' + lesson.blocks.flat().join(' '));
    let matched = 0;
    let score = 0;
    for (const term of terms) {
      let value = title.includes(term) ? 9 : tags.includes(term) ? 6 : tokens(module.short).includes(term) ? 3 : body.includes(term) ? 1 : 0;
      if (value) matched++;
      score += value;
    }
    score *= matched / terms.length;
    if (terms.includes('criar') && terms.includes('skill') && lesson.id === 'skills-criar') score += 8;
    if (normalize(lesson.title).includes(normalize(query))) score += 10;
    // Broad beginner requests start with the workflow; specific technical words still rank technical lessons.
    if (terms.includes('automacao') && !terms.some(t => ['cli','cron','hook','hooks','script','agendar','pipeline'].includes(t)) && lesson.id === 'automacao-fluxo') score += 8;
    return { lesson, score, matched };
  }).filter(r => r.score >= 2 && r.matched > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function buildSkill({ name, description, input, output }) {
  const slug = normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'minha-skill';
  const desc = description.trim() || 'Use esta skill para executar o procedimento descrito a partir das entradas fornecidas.';
  return `---\nname: ${slug}\ndescription: ${JSON.stringify(desc)}\n---\n\n# ${name.trim() || 'Minha skill'}\n\n## Entrada\n${input.trim() || 'Solicite os materiais necessários antes de começar.'}\n\n## Procedimento\n1. Confira as entradas e solicite informações indispensáveis que estiverem ausentes.\n2. Identifique os fatos relevantes e mantenha referências às fontes.\n3. Produza a saída no formato definido abaixo.\n4. Revise a fidelidade às entradas e sinalize lacunas e suposições.\n\n## Saída\n${output.trim() || 'Uma entrega estruturada com resumo e próximos passos.'}\n\n## Critérios de qualidade\n- Não invente informações ausentes.\n- Diferencie fatos, sugestões e dúvidas.\n- Use apenas ferramentas disponíveis e acessos autorizados.\n\n## Validação\nTeste com uma entrada completa, uma incompleta e uma ambígua.\n`;
}
