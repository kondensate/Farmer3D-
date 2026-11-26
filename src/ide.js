import { parseProgram, DSL_ACTIONS, DSL_BUILTINS } from './language.js';

const KEYWORDS = new Set(['if','elif','else','for','while','def','return','break','continue','and','or','not','True','False','None']);
const COMMAND_META = {
  move: ['move(steps=1)', 'Переместиться на 0–20 клеток по маршруту'],
  turn_left: ['turn_left()', 'Повернуть робота влево на 90°'],
  turn_right: ['turn_right()', 'Повернуть робота вправо на 90°'],
  plant: ['plant(crop="carrot")', 'Посадить семена на ближайшей свободной грядке'],
  water: ['water()', 'Полить ближайшую грядку'],
  harvest: ['harvest()', 'Собрать зрелую культуру'],
  wait: ['wait(seconds=1)', 'Подождать заданное число секунд'],
  scan: ['scan()', 'Просканировать ближайшую область'],
  refill_water: ['refill_water()', 'Пополнить воду на базе'],
  return_to_base: ['return_to_base()', 'Вернуться на базу и сдать груз'],
  sleep: ['sleep(seconds=1)', 'Приостановить программу на заданное время'],
  go_to_plot: ['go_to_plot(state="ready")', 'Найти ближайшую грядку ready, empty или thirsty'],
  print: ['print(value, ...)', 'Записать значения в журнал программы'],
  range: ['range(stop) или range(start, stop, step)', 'Создать целочисленную последовательность для for'],
  abs: ['abs(value)', 'Модуль числа'], min: ['min(a, b, ...)', 'Минимальное значение'],
  max: ['max(a, b, ...)', 'Максимальное значение'], floor: ['floor(value)', 'Округление вниз'],
  ceil: ['ceil(value)', 'Округление вверх'], round: ['round(value)', 'Округление до ближайшего целого']
};

const SENSOR_META = {
  can_harvest: 'Есть ли зрелая культура под роботом', can_plant: 'Можно ли посадить выбранную культуру',
  can_water: 'Нуждается ли грядка в воде', is_ready: 'Созрел ли урожай', get_water: 'Текущий запас воды',
  get_coins: 'Баланс монет фермы', get_harvest: 'Собранный урожай', tile_state: 'Состояние ближайшей грядки',
  count_ready: 'Количество зрелых грядок', count_empty: 'Количество пустых грядок',
  front_is_clear: 'Свободна ли клетка впереди', at_plot: 'Находится ли робот рядом с грядкой',
  distance_to_plot: 'Расстояние до ближайшей грядки', has_water: 'Есть ли вода в запасе',
  get_energy: 'Остаток энергии робота', get_position: 'Координаты робота', get_inventory: 'Инвентарь робота',
  get_plant_age: 'Возраст/прогресс ближайшего растения', scan: 'Количество занятых грядок в радиусе сканирования',
  has_ready_plot: 'Есть ли зрелые грядки на ферме', has_empty_plot: 'Есть ли пустые грядки',
  has_thirsty_plot: 'Есть ли растения, ожидающие полива'
};

function escapeHtml(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

function collectSymbols(ast, source) {
  const variables=new Set(), functions=new Set();
  const visit=node=>{
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach(visit);return;}
    if(node.type==='def'){functions.add(node.name);node.params?.forEach(p=>variables.add(p));}
    if(node.type==='assign')variables.add(node.name);
    if(node.type==='for')variables.add(node.name);
    for(const [key,value] of Object.entries(node)) if(key!=='line'&&key!=='name'&&key!=='params') visit(value);
  };
  visit(ast);
  for(const match of source.matchAll(/^\s*def\s+[A-Za-z_]\w*\s*\((.*?)\)\s*:/gm)) {
    for(const param of match[1].split(',').map(v=>v.trim()).filter(Boolean)) variables.add(param);
  }
  return {variables:[...variables],functions:[...functions]};
}

function isInsideLiteralOrComment(source, caret) {
  let quote=null, escaped=false, comment=false;
  for(let i=0;i<caret;i++) {
    const ch=source[i];
    if(comment) { if(ch==="\n") comment=false; continue; }
    if(quote) {
      if(escaped) { escaped=false; continue; }
      if(ch==="\\") { escaped=true; continue; }
      if(ch===quote) quote=null;
      continue;
    }
    if(ch==="#") comment=true;
    else if(ch==="'"||ch==='"') quote=ch;
  }
  return !!quote||comment;
}

function getCallContext(source, caret) {
  const stack=[];
  let quote=null, escaped=false, comment=false;
  for(let i=0;i<caret;i++) {
    const ch=source[i];
    if(comment) { if(ch==="\n") comment=false; continue; }
    if(quote) {
      if(escaped) { escaped=false; continue; }
      if(ch==="\\") { escaped=true; continue; }
      if(ch===quote) quote=null;
      continue;
    }
    if(ch==="#") { comment=true; continue; }
    if(ch==="'"||ch==='"') { quote=ch; continue; }
    if(ch==="(") {
      const before=source.slice(0,i);
      const match=before.match(/([A-Za-z_]\w*)\s*$/);
      stack.push({name:match?.[1]||null,argumentIndex:0});
    } else if(ch===")") {
      if(stack.length) stack.pop();
    } else if(ch===","&&stack.length) {
      stack[stack.length-1].argumentIndex++;
    }
  }
  return stack.at(-1)||null;
}

function valueType(value) {
  if(value===null) return "None";
  if(Array.isArray(value)) return "list";
  if(typeof value==="number") return Number.isInteger(value)?"int":"float";
  if(typeof value==="string") return "str";
  if(typeof value==="boolean") return "bool";
  return typeof value;
}

function snapshotValues(snapshot) {
  const values=new Map();
  if(!snapshot?.scopes) return values;
  const groups=[snapshot.scopes.global,...(snapshot.scopes.locals||[])].filter(Boolean);
  for(const group of groups) for(const [name,value] of Object.entries(group.values||{})) {
    let serialized;
    try { serialized=JSON.stringify(value); } catch { serialized=String(value); }
    values.set(`${group.name}:${name}`,serialized);
  }
  return values;
}

function classifyIdentifier(name, symbols, actions, sensors) {
  if(KEYWORDS.has(name))return 'kw';
  if(actions.has(name))return 'cmd';
  if(sensors.has(name))return 'sensor';
  if(DSL_BUILTINS.includes(name))return 'builtin';
  if(symbols.functions.has(name))return 'fn';
  if(symbols.variables.has(name))return 'var';
  return 'ident';
}

export function highlightSource(source, {currentLine=null,errorLine=null,caret=0,actions=DSL_ACTIONS,sensors=[]}={}) {
  const actionSet=new Set(actions),sensorSet=new Set(sensors),symbols={variables:new Set(),functions:new Set()};
  try { const ast=parseProgram(source); const found=collectSymbols(ast,source); symbols.variables=new Set(found.variables);symbols.functions=new Set(found.functions); }
  catch { for(const m of source.matchAll(/^\s*([A-Za-z_]\w*)\s*(?:\+=|-=|\*=|\/=|=)/gm))symbols.variables.add(m[1]); for(const m of source.matchAll(/^\s*def\s+([A-Za-z_]\w*)/gm))symbols.functions.add(m[1]); }
  const caretLine=source.slice(0,caret).split('\n').length;
  const lines=source.split('\n');
  const indentOf=line=>(line.match(/^\s*/)||[''])[0].replace(/\t/g,'    ').length;
  const isHeader=line=>/^(if|elif|else|for|while|def)\b.*:\s*$/.test(line.trim());
  let blockStart=0,blockEnd=0;
  const targetLine=lines[caretLine-1]||'',targetIndent=indentOf(targetLine);
  if(isHeader(targetLine)){blockStart=caretLine;let i=caretLine;while(i<lines.length&&(!lines[i].trim()||indentOf(lines[i])>targetIndent))i++;blockEnd=i;}
  else if(targetIndent>0){
    for(let i=caretLine-2;i>=0;i--){if(!lines[i].trim())continue;const indent=indentOf(lines[i]);if(indent<targetIndent&&isHeader(lines[i])){blockStart=i+1;let j=i+1;while(j<lines.length&&(!lines[j].trim()||indentOf(lines[j])>indent))j++;blockEnd=j;break;}if(indent<targetIndent)break;}
  }
  const rendered=lines.map((line,index)=>{
    const n=index+1;let out='',i=0;const stack=[];let bracketMatches=new Set();
    for(let j=0;j<line.length;j++){
      if(line[j]==='"'||line[j]==="'"){
        const quote=line[j];let k=j+1;while(k<line.length){if(line[k]==='\\'){k+=2;continue;}if(line[k]===quote){k++;break;}k++;}stack.push({start:j,end:k,cls:'str'});j=k-1;
      }else if(line[j]==='#'){stack.push({start:j,end:line.length,cls:'comment'});break;}
    }
    const protectedAt=pos=>stack.find(t=>pos>=t.start&&pos<t.end);
    const pairs=[];for(let j=0;j<line.length;j++){if(protectedAt(j))continue;const c=line[j];if('([{'.includes(c))pairs.push({c,j});else if(')]}'.includes(c)){const open={')':'(',']':'[','}':'{'}[c];for(let k=pairs.length-1;k>=0;k--)if(pairs[k].c===open){const item=pairs.splice(k,1)[0];bracketMatches.add(item.j);bracketMatches.add(j);break;}}}
    while(i<line.length){
      const token=protectedAt(i);
      if(token){const cls=token.cls;out+=`<span class="tok-${cls}">${escapeHtml(line.slice(i,token.end))}</span>`;i=token.end;continue;}
      const start=i,c=line[i];let cls='punct';
      if(/[A-Za-z_]/.test(c)){i++;while(i<line.length&&/[A-Za-z0-9_]/.test(line[i]))i++;const word=line.slice(start,i);cls=classifyIdentifier(word,symbols,actionSet,sensorSet);}
      else if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(line[i+1]||''))){i++;while(i<line.length&&/[0-9.]/.test(line[i]))i++;cls='number';}
      else if('+-*/%=<>!'.includes(c)){i++;if(i<line.length&&line[i]==='=')i++;cls='op';}
      else {i++;if('()[]{}'.includes(c))cls=bracketMatches.has(start)&&n===caretLine?'bracket-match':'punct';}
      out+=`<span class="tok-${cls}">${escapeHtml(line.slice(start,i))}</span>`;
    }
    const lineClass=[n===currentLine?'is-current':'',n===errorLine?'has-error':'',blockStart&&n>=blockStart&&n<=blockEnd?'is-block':''].filter(Boolean).join(' ');
    return `<span class="code-line ${lineClass}" data-line="${n}">${out||' '}</span>`;
  }).join('\n');
  return rendered;
}

export function validateSource(source, sensors=[]) {
  try {
    const ast=parseProgram(source), defined=new Set(ast.filter(n=>n.type==='def').map(n=>n.name));
    const known=new Set([...DSL_ACTIONS,...DSL_BUILTINS,...sensors,...defined]);
    let problem=null;
    const visit=node=>{
      if(problem||!node||typeof node!=='object')return;
      if(Array.isArray(node)){node.forEach(visit);return;}
      if(node.type==='call'&&!known.has(node.name))problem={line:node.line||1,message:`Неизвестная команда или функция «${node.name}»`};
      Object.values(node).forEach(visit);
    };
    visit(ast);return problem;
  } catch(error) { return {line:error.line||1,message:error.message||String(error)}; }
}

export function createIde({getAgent,getAgents,getSensors,onEdit=()=>{},onSelectRobot=()=>{}}) {
  const editor=document.querySelector('#code'), gutter=document.querySelector('#codeGutter');
  const highlight=document.querySelector('#codeHighlight'), popup=document.querySelector('#ideAutocomplete');
  const hint=document.querySelector('#ideHint'), errorBox=document.querySelector('#codeErrors');
  const variables=document.querySelector('#ideVariables'), functions=document.querySelector('#ideFunctions');
  const robots=document.querySelector('#ideRobots'), stack=document.querySelector('#ideCallStack'), state=document.querySelector('#ideState');
  const actions=new Set(DSL_ACTIONS);let suggestions=[],suggestionIndex=0,debugByRobot=new Map(),runtimeErrors=new Map(),statusByRobot=new Map(),changedByRobot=new Map(),suppressCompletionOnce=false;
  const agentBreakpoints=agent=>{
    if(!(agent.breakpoints instanceof Set)){
      let saved=[];try{saved=JSON.parse(localStorage.getItem(`farmerbot3d_breakpoints_${agent.id}`)||'[]');}catch{}
      agent.breakpoints=new Set(saved.filter(n=>Number.isInteger(n)&&n>0));
    }
    return agent.breakpoints;
  };
  const setText=(el,value)=>{if(el)el.textContent=value;};
  const active=()=>getAgent();
  function renderGutter(errorLine=null){
    if(!gutter)return;const count=editor.value.split('\n').length;gutter.replaceChildren();
    const bps=agentBreakpoints(active());
    for(let line=1;line<=count;line++){
      const button=document.createElement('button');button.type='button';button.className='gutter-line'+(bps.has(line)?' has-breakpoint':'')+(Number(errorLine)===line?' has-error':'');button.dataset.line=String(line);button.textContent=String(line);button.title=bps.has(line)?`Убрать точку останова ${line}`:`Поставить точку останова ${line}`;button.setAttribute('aria-label',button.title);
      button.addEventListener('click',()=>toggleBreakpoint(line));gutter.append(button);
    }
    gutter.scrollTop=editor.scrollTop;
  }
  function toggleBreakpoint(line){const agent=active(),bps=agentBreakpoints(agent);if(bps.has(line))bps.delete(line);else bps.add(line);try{localStorage.setItem(`farmerbot3d_breakpoints_${agent.id}`,JSON.stringify([...bps].sort((a,b)=>a-b)));}catch{}render();}
  function render(){
    if(!editor||!highlight)return;const agent=active(),debug=debugByRobot.get(agent.id)||{},status=statusByRobot.get(agent.id)||(agent.running?'выполняется':'готов');
    const issue=validateSource(editor.value,getSensors()),runtimeError=runtimeErrors.get(agent.id),shownError=issue||runtimeError;
    highlight.innerHTML=highlightSource(editor.value,{currentLine:debug.line,errorLine:shownError?.line||null,caret:editor.selectionStart,actions:DSL_ACTIONS,sensors:getSensors()});
    renderGutter(shownError?.line||null);
    if(errorBox){errorBox.hidden=!shownError;errorBox.textContent=shownError?`Строка ${shownError.line}: ${shownError.message}`:'Ошибок нет';errorBox.classList.toggle('valid',!shownError);}
    setText(document.querySelector('#currentLine'),debug.line?`строка ${debug.line}`:'строка —');
    setText(document.querySelector('#ideNextLine'),debug.nextLine?`следующая: ${debug.nextLine}`:'следующая: —');
    setText(document.querySelector('#codeStatus'),status);setText(state,status);
    renderValues(debug,changedByRobot.get(agent.id));renderFunctions(debug.functions||[]);renderStack(debug.callStack||[]);
    renderHint();renderRobots();
  }
  function renderHint(){
    if(!hint)return;
    const context=getCallContext(editor.value,editor.selectionStart);
    if(!context?.name||isInsideLiteralOrComment(editor.value,editor.selectionStart)){hint.textContent='Подсказка параметров появится внутри вызова команды.';return;}
    const name=context.name,meta=COMMAND_META[name];let userFn=null;
    try{userFn=parseProgram(editor.value).find(node=>node.type==='def'&&node.name===name);}catch{}
    const signature=meta?.[0]||(userFn?`${name}(${userFn.params.join(', ')})`:SENSOR_META[name]?`${name}()`:null);
    if(!signature){hint.textContent='';return;}
    const description=meta?.[1]||SENSOR_META[name]||(userFn?'Функция пользователя':'');
    const params=(signature.match(/\((.*)\)/)||[])[1]?.split(',').map(value=>value.trim()).filter(Boolean)||[];
    const active=params[context.argumentIndex];
    const position=params.length?`аргумент ${Math.min(context.argumentIndex+1,params.length)} из ${params.length}`:'без параметров';
    hint.textContent=active?`${signature} · ${position}: ${active} · ${description}`:`${signature} · ${description}`;
  }
  function renderRobots(){if(!robots)return;robots.replaceChildren();for(const agent of getAgents()){
    const button=document.createElement('button');button.type='button';button.className='ide-robot'+(agent.id===active().id?' selected':'');
    const title=document.createElement('strong');title.textContent=agent.name;const meta=document.createElement('small');meta.textContent=`${Math.round(agent.energy)}⚡ · ${agent.running?'выполняется':'ожидает'}`;button.append(title,meta);button.addEventListener('click',()=>onSelectRobot(agent.id));robots.append(button);
  }}
  function renderValues(snapshot,changed=new Set()){
    if(!variables)return;variables.replaceChildren();if(!snapshot){variables.textContent='Переменные появятся после старта программы.';return;}
    const groups=[snapshot.scopes?.global,...(snapshot.scopes?.locals||[])].filter(Boolean);
    for(const group of groups){const section=document.createElement('section');section.className='ide-scope';const title=document.createElement('b');title.textContent=group.name==='global'?'Глобальные':`Локальные · ${group.name.replace('local:','')}`;section.append(title);
      const entries=Object.entries(group.values||{});if(!entries.length){const empty=document.createElement('small');empty.textContent='нет переменных';section.append(empty);}
      for(const [name,value] of entries){const row=document.createElement('div');row.className='ide-value'+(changed.has(`${group.name}:${name}`)?' changed':'');const key=document.createElement('code');key.textContent=name;const val=document.createElement('span');val.textContent=typeof value==='string'?JSON.stringify(value):Array.isArray(value)?JSON.stringify(value):String(value);const kind=document.createElement('small');kind.textContent=valueType(value);row.append(key,val,kind);section.append(row);}variables.append(section);
    }
  }
  function renderFunctions(names=[]){if(!functions)return;functions.replaceChildren();let definitions=[];try{definitions=parseProgram(editor.value).filter(node=>node.type==='def');}catch{}for(const name of names){const fn=definitions.find(node=>node.name===name),item=document.createElement('code');item.textContent=fn?`${name}(${fn.params.join(', ')})`:`${name}()`;functions.append(item);}if(!names.length)functions.textContent='Функции пользователя не объявлены.';}
  function renderStack(frames=[]){if(!stack)return;stack.replaceChildren();if(!frames.length){stack.textContent='Глобальный уровень';return;}for(const frame of [...frames].reverse()){const item=document.createElement('div');item.textContent=`${frame.name}() · вызов из строки ${frame.line}`;stack.append(item);}}
  function setDebugState(agentId,snapshot,status='выполняется'){
    const previous=debugByRobot.get(agentId),before=snapshotValues(previous),after=snapshotValues(snapshot);
    const changed=new Set(changedByRobot.get(agentId)||[]);for(const [key,value] of after)if(before.has(key)&&before.get(key)!==value)changed.add(key);
    debugByRobot.set(agentId,snapshot||{});changedByRobot.set(agentId,changed);statusByRobot.set(agentId,status);
    if(active().id===agentId)render();
  }
  function hidePopup(){if(popup){popup.hidden=true;popup.replaceChildren();}suggestions=[];suggestionIndex=0;}
  function getSuggestions(){
    const before=editor.value.slice(0,editor.selectionStart);
    if(isInsideLiteralOrComment(editor.value,editor.selectionStart))return [];
    const match=before.match(/([A-Za-z_]\w*)$/);if(!match||match[1].length<1)return [];
    const prefix=match[1].toLowerCase(),source=editor.value;let ast=null;try{ast=parseProgram(source);}catch{}
    const symbols=ast?collectSymbols(ast,source):{variables:[...source.matchAll(/^\s*([A-Za-z_]\w*)\s*(?:\+=|-=|\*=|\/=|=)/gm)].map(m=>m[1]),functions:[...source.matchAll(/^\s*def\s+([A-Za-z_]\w*)/gm)].map(m=>m[1])};
    const options=[];
    for(const name of [...DSL_ACTIONS,...getSensors(),...DSL_BUILTINS,...KEYWORDS,...symbols.variables,...symbols.functions]){
      if(name.toLowerCase().startsWith(prefix)&&!options.some(item=>item.name===name)){
        const meta=COMMAND_META[name],fn=ast?.find(node=>node.type==='def'&&node.name===name);options.push({name,signature:meta?.[0]|| (fn?`${name}(${fn.params.join(', ')})`:`${name}()`),description:meta?.[1]||SENSOR_META[name]|| (fn?'Функция пользователя':symbols.variables.includes(name)?'Переменная программы':'Ключевое слово')});
      }
    }
    return options.slice(0,9);
  }
  function renderPopup(){
    if(!popup)return;popup.replaceChildren();if(!suggestions.length){hidePopup();return;}popup.hidden=false;
    suggestions.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.className='completion-item'+(index===suggestionIndex?' active':'');const name=document.createElement('strong');name.textContent=item.name;const signature=document.createElement('code');signature.textContent=item.signature;const desc=document.createElement('small');desc.textContent=item.description;button.append(name,signature,desc);button.addEventListener('pointerdown',event=>event.preventDefault());button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>acceptSuggestion(index));popup.append(button);});
  }
  function refreshSuggestions(){suggestions=getSuggestions();suggestionIndex=0;renderPopup();renderHint();}
  function acceptSuggestion(index=suggestionIndex){
    const item=suggestions[index];if(!item)return false;
    const before=editor.value.slice(0,editor.selectionStart),match=before.match(/([A-Za-z_]\w*)$/);if(!match)return false;
    const start=editor.selectionStart-match[1].length,caret=editor.selectionStart;
    const callable=actions.has(item.name)||getSensors().includes(item.name)||DSL_BUILTINS.includes(item.name)||collectSymbolsSafe(editor.value).functions.includes(item.name);
    const after=editor.value.slice(caret);let insertion=item.name,selection=item.name.length;
    if(callable){
      if(after.startsWith('(')){selection=item.name.length+1;}
      else{insertion+='()';selection=item.name.length+1;}
    }
    editor.setRangeText(insertion,start,caret,'end');
    editor.setSelectionRange(start+selection,start+selection);
    hidePopup();suppressCompletionOnce=true;editor.dispatchEvent(new Event('input',{bubbles:true}));return true;
  }
  function collectSymbolsSafe(source){try{return collectSymbols(parseProgram(source),source);}catch{return{variables:[],functions:[...source.matchAll(/^\s*def\s+([A-Za-z_]\w*)/gm)].map(match=>match[1])};}}
  function handleKeydown(event){
    if(!popup?.hidden&&suggestions.length){
      if(event.key==='ArrowDown'){event.preventDefault();suggestionIndex=(suggestionIndex+1)%suggestions.length;renderPopup();return true;}
      if(event.key==='ArrowUp'){event.preventDefault();suggestionIndex=(suggestionIndex-1+suggestions.length)%suggestions.length;renderPopup();return true;}
      if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();acceptSuggestion();return true;}
      if(event.key==='Escape'){event.preventDefault();hidePopup();return true;}
    }
    return false;
  }
  editor?.addEventListener('input',()=>{runtimeErrors.delete(active().id);render();if(suppressCompletionOnce){suppressCompletionOnce=false;hidePopup();}else refreshSuggestions();onEdit(editor.value);});
  editor?.addEventListener('click',render);editor?.addEventListener('keyup',render);
  editor?.addEventListener('scroll',()=>{if(highlight)highlight.scrollTop=editor.scrollTop;if(gutter)gutter.scrollTop=editor.scrollTop;});
  editor?.addEventListener('blur',()=>setTimeout(hidePopup,120));
  function refresh(){render();}
  render();refresh();
  return {
    refresh,handleKeydown,setDebugState,
    setRunStatus(agentId,status,{clearLine=false,resetChanges=false}={}){
      statusByRobot.set(agentId,status);
      if(resetChanges)changedByRobot.set(agentId,new Set());
      if(clearLine){const previous=debugByRobot.get(agentId)||{};debugByRobot.set(agentId,{...previous,line:null,nextLine:null,statement:null});changedByRobot.set(agentId,new Set());}
      if(active().id===agentId)render();
    },
    clearDebug(agentId){debugByRobot.delete(agentId);changedByRobot.delete(agentId);runtimeErrors.delete(agentId);statusByRobot.set(agentId,'сброшено');if(active().id===agentId)render();},
    setDebugCallStack(agentId,frames=[]){const previous=debugByRobot.get(agentId)||{};const snapshot={...previous,callStack:[...frames]};debugByRobot.set(agentId,snapshot);if(active().id===agentId)renderStack(snapshot.callStack);},
    setDebugFunctions(agentId,names=[]){const previous=debugByRobot.get(agentId)||{};const snapshot={...previous,functions:[...names]};debugByRobot.set(agentId,snapshot);if(active().id===agentId){renderFunctions(snapshot.functions);render();}},
    setRuntimeError(agentId,line,message){runtimeErrors.set(agentId,{line:Number(line)||1,message:String(message||'Ошибка выполнения').replace(/^Строка\s+\d+[:：]\s*/i,'')});if(active().id===agentId)render();},
    clearRuntimeError(agentId){runtimeErrors.delete(agentId);if(active().id===agentId)render();},
    currentLine(){return debugByRobot.get(active().id)?.line||null;},
    toggleBreakpoint
  };
}
