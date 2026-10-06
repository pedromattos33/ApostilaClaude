import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from '../server.mjs';
import { lessons } from '../src/content.js';

const server = createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({executablePath, headless:true, args:process.env.CI ? ['--no-sandbox'] : []});
let passed=0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function a11y(page,name) {
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],name);
}
try {
  await mkdir('test-results',{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const goto=async(path='/')=>{await page.goto(base+'/#'+path);await page.locator('main h1').waitFor();};
  await check('Dashboard, module filters and desktop accessibility',async()=>{
    await goto();
    assert.equal(await page.locator('.module-card').count(),8);
    await page.getByRole('button',{name:'Sou dev',exact:true}).click();
    assert.equal(await page.locator('.module-card').count(),5);
    await page.getByRole('button',{name:'Todos os módulos',exact:true}).click();
    await a11y(page,'dashboard');
    await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  });
  await check('Search and level filters show real matching lessons',async()=>{
    await goto('/trilhas');
    assert.equal(await page.locator('.lesson-row').count(),24);
    await page.locator('#level-filter').selectOption('Avançado');
    assert.equal(await page.locator('.lesson-row').count(),4);
    await page.locator('#level-filter').selectOption('todos');
    await page.locator('#lesson-search').fill('criar minha primeira skill');
    assert.ok(await page.locator('a[href="#/aula/skills-criar"] .lesson-row-copy').count());
    await page.locator('#lesson-search').fill('dinossauro submarino');
    assert.ok(await page.getByText('Nenhuma aula por aqui… ainda.').isVisible());
  });
  await check('Quizzes gate completion, and notes/bookmarks/progress persist after reload',async()=>{
    await goto('/aula/qual-claude');
    await a11y(page,'lesson');
    assert.equal(await page.locator('[data-action="complete"]').isDisabled(),true);
    await page.locator('[data-quiz="1"]').click();
    assert.match(await page.locator('.quiz-feedback').textContent(),/Quase/);
    await page.locator('[data-quiz="0"]').click();
    for(const box of await page.locator('[data-exercise]').all()) await box.check();
    assert.equal(await page.locator('[data-action="complete"]').isEnabled(),true);
    await page.locator('#lesson-notes').fill('Minha nota: <script> não deve executar.');
    await page.locator('[data-action="bookmark"]').click();
    await page.locator('[data-action="complete"]').click();
    await page.reload();
    assert.equal(await page.locator('#lesson-notes').inputValue(),'Minha nota: <script> não deve executar.');
    assert.equal(await page.locator('[data-action="bookmark"]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('[data-action="complete"]').textContent(),/concluída/);
    assert.match(await page.locator('.sidebar-progress small').textContent(),/1 de 24/);
    await page.screenshot({path:'test-results/lesson.png',fullPage:true});
    await goto('/salvos');
    assert.equal(await page.locator('.lesson-row').count(),1);
  });
  await check('Laboratory generates usable prompt and downloads skill metadata safely',async()=>{
    await goto('/laboratorio');
    await page.locator('#prompt-goal').fill('Consolidar atas da equipe');
    await page.locator('#prompt-context').fill('Três atas fictícias');
    assert.match(await page.locator('#prompt-preview').textContent(),/Consolidar atas da equipe/);
    await page.locator('#skill-tab').click();
    await page.locator('#skill-name').fill('Revisão de reuniões');
    await page.locator('#skill-description').fill('Revise atas: use em reuniões.');
    await page.locator('#skill-input').fill('Atas em Markdown');
    await page.locator('#skill-output').fill('Uma tabela de decisões');
    await a11y(page,'skill laboratory');
    const downloaded=page.waitForEvent('download');
    await page.locator('[data-action="download-skill"]').click();
    const download=await downloaded;
    assert.equal(download.suggestedFilename(),'SKILL.md');
    const text=await readFile(await download.path(),'utf8');
    assert.match(text,/name: revisao-de-reunioes/);
    assert.match(text,/Uma tabela de decisões/);
    await page.screenshot({path:'test-results/laboratory.png',fullPage:true});
  });
  await check('Guide returns relevant content, handles unknown input and navigates to a lesson',async()=>{
    await page.locator('.guide-fab').click();
    await page.locator('#guide-input').fill('Onde aprendo a criar minha primeira skill?');
    await page.locator('#guide-form').evaluate(f=>f.requestSubmit());
    assert.equal(await page.locator('.guide-result').first().getAttribute('href'),'#/aula/skills-criar');
    await a11y(page,'guide dialog');
    await page.screenshot({path:'test-results/guide.png'});
    await page.locator('.guide-result').first().click();
    await page.waitForFunction(()=>document.querySelector('h1')?.textContent.includes('SKILL.md'));
    assert.match(await page.locator('h1').textContent(),/SKILL.md/);
    assert.equal(await page.locator('#guide-dialog').evaluate(d=>d.open),false);
    await page.locator('.guide-fab').click();
    await page.locator('#guide-input').fill('dinossauro submarino');
    await page.locator('#guide-form').evaluate(f=>f.requestSubmit());
    assert.match(await page.locator('.guide-answer').last().textContent(),/Não encontrei/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#guide-dialog').evaluate(d=>d.open),false);
  });
  await check('All 24 lesson routes render content and sources without runtime errors',async()=>{
    for(const lesson of lessons) {
      await goto('/aula/'+lesson.id);
      assert.equal(await page.locator('h1').textContent(),lesson.title);
      assert.ok(await page.locator('.lesson-sources a').count());
      assert.ok((await page.locator('.code-block code').textContent()).length>30);
    }
    assert.deepEqual(errors,[]);
  });
  await check('Export contains actual learner records',async()=>{
    await goto('/progresso');
    const downloaded=page.waitForEvent('download');
    await page.locator('[data-action="export-progress"]').click();
    const download=await downloaded;
    const record=JSON.parse(await readFile(await download.path(),'utf8'));
    assert.ok(record.completed.includes('qual-claude'));
    assert.match(record.notes['qual-claude'],/Minha nota/);
  });
  await check('Mobile layout, menu and keyboard navigation work without horizontal overflow',async()=>{
    await page.setViewportSize({width:390,height:844});
    await goto();
    const sidebar=await page.locator('.sidebar').boundingBox();
    assert.ok(sidebar.x+sidebar.width <= 1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'test-results/mobile.png',fullPage:true});
    await page.locator('.mobile-menu').click();
    assert.equal(await page.locator('.mobile-menu').getAttribute('aria-expanded'),'true');
    await page.locator('.primary-nav a[href="#/laboratorio"]').click();
    await page.locator('#prompt-tab').waitFor();
    assert.equal(await page.locator('.mobile-menu').getAttribute('aria-expanded'),'false');
    await page.locator('#prompt-tab').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#skill-tab').getAttribute('aria-selected'),'true');
    for (const path of ['/aula/skills-criar','/laboratorio','/progresso']) {
      await goto(path);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path);
    }
  });
  await check('Unavailable microphone has a visible text fallback',async()=>{
    const fallback=await browser.newContext();
    await fallback.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
    const p=await fallback.newPage();await p.goto(base);
    await p.locator('.guide-fab').click();
    assert.equal(await p.locator('#mic-button').isDisabled(),true);
    assert.match(await p.locator('#voice-status').textContent(),/Voz indisponível/);
    await p.locator('#guide-input').fill('Como conectar o Notion?');
    await p.locator('#guide-form').evaluate(f=>f.requestSubmit());
    assert.equal(await p.locator('.guide-result').first().getAttribute('href'),'#/aula/conectores-intro');
    await fallback.close();
  });
  await check('Simulated speech recognition routes transcript and handles permission denial',async()=>{
    const voice=await browser.newContext();
    await voice.addInitScript(()=>{
      window.mockSpeechError=false;
      window.SpeechRecognition=class {
        start(){this.onstart?.();setTimeout(()=>{
          if(window.mockSpeechError)this.onerror?.({error:'not-allowed'});
          else {const result=[{transcript:'Quero gerar imagens'}];result.isFinal=true;this.onresult?.({results:[result]});}
          this.onend?.();
        },30);}
        stop(){this.onend?.();}
        abort(){}
      };
    });
    const p=await voice.newPage();await p.goto(base);
    await p.locator('.guide-fab').click();await p.locator('#mic-button').click();
    await p.locator('.guide-result').first().waitFor();
    assert.equal(await p.locator('.guide-result').first().getAttribute('href'),'#/aula/imagens-criar');
    await p.evaluate(()=>window.mockSpeechError=true);
    await p.locator('#mic-button').click();
    await p.waitForFunction(()=>document.querySelector('#voice-status').textContent.includes('não foi autorizado'));
    assert.equal(await p.locator('#guide-input').isEnabled(),true);
    await voice.close();
  });
  await check('Malformed saved state and untrusted text do not break rendering',async()=>{
    const broken=await browser.newContext();
    await broken.addInitScript(()=>localStorage.setItem('claude-na-pratica-v1','{"completed":["unknown"],"notes":{"qual-claude":"</textarea><img src=x onerror=alert(1)>"}}'));
    const p=await broken.newPage();await p.goto(base+'/#/aula/qual-claude');
    assert.match(await p.locator('#lesson-notes').inputValue(),/<img/);
    assert.equal(await p.locator('img[src=x]').count(),0);
    assert.match(await p.locator('.sidebar-progress small').textContent(),/0 de 24/);
    await broken.close();
  });
  console.log(`\n${passed} browser scenarios passed. Real microphone hardware and external speech services were not tested.`);
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
