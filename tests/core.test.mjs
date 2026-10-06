import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, modules, sources } from '../src/content.js';
import { searchLessons, buildSkill } from '../src/search.js';
import { createServer } from '../server.mjs';

test('Every module has a complete learning path with referenced sources and a valid quiz', () => {
  assert.equal(new Set(lessons.map(l=>l.id)).size, lessons.length);
  assert.equal(modules.length, 8);
  assert.equal(lessons.length, 24);
  for(const module of modules) assert.equal(lessons.filter(l=>l.module===module.id).length,3);
  for(const lesson of lessons) {
    assert.ok(modules.some(m=>m.id===lesson.module));
    assert.ok(lesson.blocks.length >= 3 && lesson.steps.length >= 3);
    assert.ok(lesson.prompt && lesson.exercise && lesson.checks.length);
    assert.ok(lesson.quiz.answer >= 0 && lesson.quiz.answer < lesson.quiz.options.length);
    for(const key of lesson.sources) assert.ok(sources[key]?.url.startsWith('https://'));
  }
});

for(const [query,expected] of [
  ['Como criar minha primeira skill?', 'skills-criar'],
  ['criação d skills', 'skills-criar'],
  ['quero automatizar uma tarefa', 'automacao-fluxo'],
  ['Como instalar Claude Code?', 'code-instalacao'],
  ['Como conectar o Notion?', 'conectores-intro'],
  ['Criar plugin', 'plugins-criar'],
  ['Qual a diferença entre Cowork e Code?', 'qual-claude'],
  ['Onde aprendo hooks?', 'automacao-hooks'],
  ['quero gerar imagens', 'imagens-criar'],
  ['o que é MCP?', 'mcp-code'],
]) test(`Guide routes a realistic question: ${query}`,()=>assert.equal(searchLessons(query)[0]?.lesson.id,expected));

test('Unknown or empty requests do not produce invented answers',()=>{
  for(const query of ['', '   ', 'onde está?', 'dinossauro submarino', 'meteorologia submarina']) assert.deepEqual(searchLessons(query),[]);
});
test('Skill builder escapes multiline metadata and produces a portable slug',()=>{
  const result=buildSkill({name:'Revisão de reuniões!',description:'Descrição: "especial"\nname: malicioso',input:'Atas',output:'Tabela'});
  assert.match(result,/^---\nname: revisao-de-reunioes\ndescription: /);
  assert.equal(JSON.parse(result.split('\n')[2].replace('description: ','')),'Descrição: "especial"\nname: malicioso');
  assert.match(result,/## Entrada\nAtas/);
  assert.match(result,/## Saída\nTabela/);
});
test('HTTP server serves the app, supports HEAD and protects non-public files',async()=>{
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  try {
    const home=await fetch(url);
    assert.equal(home.status,200);
    assert.match(await home.text(),/lang="pt-BR"/);
    assert.match(home.headers.get('content-security-policy'),/default-src 'self'/);
    const js=await fetch(url+'/src/app.js'); assert.match(js.headers.get('content-type'),/javascript/);
    for(const path of ['/.git/config','/.env','/package.json','/server.mjs','/tests/core.test.mjs','/%2e%2e/etc/passwd','/%E0%A4%A']) assert.equal((await fetch(url+path)).status,404,path);
    const head=await fetch(url,{method:'HEAD'}); assert.equal(head.status,200); assert.equal(await head.text(),'');
    assert.equal((await fetch(url,{method:'POST',body:'data'})).status,405);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
