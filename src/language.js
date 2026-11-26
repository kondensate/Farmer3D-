/*
 * FarmerBot Mini Language
 * Python-like, indentation-based DSL. No eval(), Function(), or code generation.
 */

class LanguageError extends Error {
  constructor(message, line = 1) {
    super(message);
    this.name = "LanguageError";
    this.line = line;
  }
}
class ReturnSignal { constructor(value) { this.value = value; } }
class BreakSignal { constructor(line) { this.line = line; } }
class ContinueSignal { constructor(line) { this.line = line; } }

class Environment {
  constructor(parent = null, name = "global") { this.parent = parent; this.name = name; this.values = new Map(); }
  hasLocal(name) { return this.values.has(name); }
  has(name) { return this.values.has(name) || !!this.parent?.has(name); }
  get(name, line) {
    if (this.values.has(name)) return this.values.get(name);
    if (this.parent) return this.parent.get(name, line);
    throw new LanguageError(`Переменная «${name}» не объявлена`, line);
  }
  set(name, value) {
    // Function scopes are local; loop blocks share their current scope.
    this.values.set(name, value);
    return value;
  }
}

function stripComment(line) {
  let quote = null, escaped = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\" && quote) { escaped = true; continue; }
    if ((c === '"' || c === "'")) {
      if (!quote) quote = c;
      else if (quote === c) quote = null;
      continue;
    }
    if (c === "#" && !quote) return line.slice(0, i);
  }
  return line;
}

function tokenizeExpression(source, line) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(source[i + 1] || ""))) {
      const start = i++;
      while (i < source.length && /[0-9.]/.test(source[i])) i++;
      const raw = source.slice(start, i);
      if ((raw.match(/\./g) || []).length > 1) throw new LanguageError(`Некорректное число: ${raw}`, line);
      tokens.push({ type: "number", value: Number(raw) });
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c; i++;
      let value = "", closed = false;
      while (i < source.length) {
        const ch = source[i++];
        if (ch === quote) { closed = true; break; }
        if (ch === "\\" && i < source.length) {
          const next = source[i++];
          value += next === "n" ? "\n" : next === "t" ? "\t" : next;
        } else value += ch;
      }
      if (!closed) throw new LanguageError("Незакрытая строка", line);
      tokens.push({ type: "string", value });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i++;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i++;
      tokens.push({ type: "identifier", value: source.slice(start, i) });
      continue;
    }
    const two = source.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "+=", "-=", "*=", "/="].includes(two)) {
      tokens.push({ type: "operator", value: two }); i += 2; continue;
    }
    if ("+-*/%<>(),".includes(c)) {
      tokens.push({ type: "operator", value: c }); i++; continue;
    }
    throw new LanguageError(`Неизвестный символ «${c}»`, line);
  }
  tokens.push({ type: "eof", value: null });
  return tokens;
}

class ExpressionParser {
  constructor(source, line) {
    this.tokens = tokenizeExpression(source, line);
    this.i = 0; this.line = line;
  }
  peek() { return this.tokens[this.i]; }
  take(value = null) {
    const t = this.peek();
    if (value !== null && t.value !== value) throw new LanguageError(`Ожидалось «${value}»`, this.line);
    this.i++; return t;
  }
  match(value) { if (this.peek().value === value) { this.i++; return true; } return false; }
  parse() {
    const expr = this.parseOr();
    if (this.peek().type !== "eof") throw new LanguageError(`Лишний фрагмент выражения: «${this.peek().value}»`, this.line);
    expr.line = this.line;
    return expr;
  }
  parseOr() { let n = this.parseAnd(); while (this.match("or")) n = {type:"binary",op:"or",left:n,right:this.parseAnd()}; return n; }
  parseAnd() { let n = this.parseEquality(); while (this.match("and")) n = {type:"binary",op:"and",left:n,right:this.parseEquality()}; return n; }
  parseEquality() {
    let n = this.parseCompare();
    while (["==","!="].includes(this.peek().value)) { const op=this.take().value; n={type:"binary",op,left:n,right:this.parseCompare()}; }
    return n;
  }
  parseCompare() {
    let n=this.parseTerm();
    while (["<",">","<=",">="].includes(this.peek().value)) { const op=this.take().value; n={type:"binary",op,left:n,right:this.parseTerm()}; }
    return n;
  }
  parseTerm() {
    let n=this.parseFactor();
    while (["+","-"].includes(this.peek().value)) { const op=this.take().value; n={type:"binary",op,left:n,right:this.parseFactor()}; }
    return n;
  }
  parseFactor() {
    let n=this.parseUnary();
    while (["*","/","%"].includes(this.peek().value)) { const op=this.take().value; n={type:"binary",op,left:n,right:this.parseUnary()}; }
    return n;
  }
  parseUnary() {
    if (this.match("not")) return {type:"unary",op:"not",value:this.parseUnary()};
    if (this.match("-")) return {type:"unary",op:"-",value:this.parseUnary()};
    if (this.match("+")) return {type:"unary",op:"+",value:this.parseUnary()};
    return this.parsePrimary();
  }
  parsePrimary() {
    const t=this.take();
    if (t.type==="number" || t.type==="string") return {type:"literal",value:t.value};
    if (t.type==="identifier") {
      if (t.value==="True") return {type:"literal",value:true};
      if (t.value==="False") return {type:"literal",value:false};
      if (t.value==="None") return {type:"literal",value:null};
      if (this.match("(")) {
        const args=[];
        if (!this.match(")")) {
          do { args.push(this.parseOr()); } while (this.match(","));
          this.take(")");
        }
        return {type:"call",name:t.value,args,line:this.line};
      }
      return {type:"variable",name:t.value,line:this.line};
    }
    if (t.value==="(") { const n=this.parseOr(); this.take(")"); return n; }
    throw new LanguageError("Ожидалось число, переменная или функция", this.line);
  }
}

function parseProgram(source) {
  const raw = String(source ?? "").replace(/\r/g, "").split("\n");
  const lines = [];
  for (let i=0;i<raw.length;i++) {
    const uncommented=stripComment(raw[i]).replace(/\s+$/,"");
    if (!uncommented.trim()) continue;
    const expanded=uncommented.replace(/\t/g,"    ");
    const indent=(expanded.match(/^ */)||[""])[0].length;
    lines.push({text:expanded.slice(indent).trim(),indent,line:i+1});
  }
  let index=0;
  const expression=(text,line)=>new ExpressionParser(text,line).parse();
  function parseBlock(indent) {
    const body=[];
    while(index<lines.length) {
      const item=lines[index];
      if(item.indent<indent) break;
      if(item.indent>indent) throw new LanguageError("Неожиданный отступ. Проверь блок выше",item.line);
      if (/^(elif|else)\b/.test(item.text)) break;
      index++;
      body.push(parseStatement(item));
    }
    return body;
  }
  function nestedBlock(parentIndent, line) {
    if(index>=lines.length || lines[index].indent<=parentIndent)
      throw new LanguageError("После двоеточия нужен блок с отступом",line);
    return parseBlock(lines[index].indent);
  }
  function parseStatement(item) {
    const {text,line,indent}=item;
    let m;
    if ((m=text.match(/^if\s+(.+):$/))) {
      const branches=[{condition:expression(m[1],line),body:nestedBlock(indent,line),line}];
      while(index<lines.length && lines[index].indent===indent && /^elif\s+/.test(lines[index].text)) {
        const e=lines[index++], em=e.text.match(/^elif\s+(.+):$/);
        if(!em) throw new LanguageError("Некорректный elif",e.line);
        branches.push({condition:expression(em[1],e.line),body:nestedBlock(indent,e.line),line:e.line});
      }
      if(index<lines.length && lines[index].indent===indent && lines[index].text==="else:") {
        const e=lines[index++]; branches.push({condition:null,body:nestedBlock(indent,e.line),line:e.line});
      }
      return {type:"if",branches,line};
    }
    if ((m=text.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/))) {
      return {type:"for",name:m[1],iterable:expression(m[2],line),body:nestedBlock(indent,line),line};
    }
    if ((m=text.match(/^while\s+(.+):$/))) {
      return {type:"while",condition:expression(m[1],line),body:nestedBlock(indent,line),line};
    }
    if ((m=text.match(/^def\s+([A-Za-z_]\w*)\s*\((.*?)\):$/))) {
      const params=m[2].trim()?m[2].split(",").map(v=>v.trim()):[];
      if(params.some(v=>! /^[A-Za-z_]\w*$/.test(v))) throw new LanguageError("Некорректный параметр функции",line);
      if(new Set(params).size!==params.length) throw new LanguageError("Повторяющийся параметр функции",line);
      return {type:"def",name:m[1],params,body:nestedBlock(indent,line),line};
    }
    if ((m=text.match(/^return(?:\s+(.+))?$/))) return {type:"return",value:m[1]?expression(m[1],line):{type:"literal",value:null},line};
    if (text==="break") return {type:"break",line};
    if (text==="continue") return {type:"continue",line};

    if ((m=text.match(/^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=|=)\s*(.+)$/))) {
      return {type:"assign",name:m[1],operator:m[2],value:expression(m[3],line),line};
    }

    // Backward compatibility with the original uppercase command list.
    if ((m=text.match(/^MOVE(?:\s+(\d+))?$/i))) return {type:"call",name:"move",args:[{type:"literal",value:Number(m[1]||1)}],line};
    if ((m=text.match(/^TURN\s+(LEFT|RIGHT)$/i))) return {type:"call",name:m[1].toLowerCase()==="left"?"turn_left":"turn_right",args:[],line};
    if (/^PLANT$/i.test(text)) return {type:"call",name:"plant",args:[],line};
    if (/^WATER$/i.test(text)) return {type:"call",name:"water",args:[],line};
    if (/^HARVEST$/i.test(text)) return {type:"call",name:"harvest",args:[],line};
    if ((m=text.match(/^WAIT(?:\s+(\d+(?:\.\d+)?))?$/i))) return {type:"call",name:"wait",args:[{type:"literal",value:Number(m[1]||1)}],line};

    const expr=expression(text,line);
    if(expr.type!=="call") throw new LanguageError("Здесь нужна команда или вызов функции",line);
    return {...expr,type:"call",line};
  }
  if(lines.length && lines[0].indent!==0) throw new LanguageError("Программа должна начинаться без отступа",lines[0].line);
  const ast=parseBlock(0);
  if(index<lines.length) throw new LanguageError("Нарушена структура отступов",lines[index].line);
  return ast;
}

const truthy = v => !!v;
function evaluate(node, env, api) {
  switch(node.type) {
    case "literal": return node.value;
    case "variable": return env.get(node.name,node.line);
    case "unary": {
      const v=evaluate(node.value,env,api);
      if(node.op==="not") return !truthy(v);
      if(node.op==="-") return -Number(v);
      return Number(v);
    }
    case "binary": {
      if(node.op==="and") { const l=evaluate(node.left,env,api); return truthy(l)?evaluate(node.right,env,api):l; }
      if(node.op==="or") { const l=evaluate(node.left,env,api); return truthy(l)?l:evaluate(node.right,env,api); }
      const a=evaluate(node.left,env,api), b=evaluate(node.right,env,api);
      switch(node.op) {
        case "+": return typeof a==="string"||typeof b==="string" ? String(a)+String(b) : Number(a)+Number(b);
        case "-": return Number(a)-Number(b);
        case "*": return Number(a)*Number(b);
        case "/": if(Number(b)===0) throw new LanguageError("Деление на ноль",node.line||1); return Number(a)/Number(b);
        case "%": if(Number(b)===0) throw new LanguageError("Деление на ноль",node.line||1); return Number(a)%Number(b);
        case "==": return a===b;
        case "!=": return a!==b;
        case "<": return a<b;
        case ">": return a>b;
        case "<=": return a<=b;
        case ">=": return a>=b;
      }
    }
    case "call": {
      const args=node.args.map(a=>evaluate(a,env,api));
      if(node.name==="range") {
        const [a,b,c]=args.length===1?[0,Number(args[0]),1]:[Number(args[0]??0),Number(args[1]??0),Number(args[2]??1)];
        if(!Number.isInteger(a)||!Number.isInteger(b)||!Number.isInteger(c)||c===0) throw new LanguageError("range() принимает целые числа, шаг не должен быть 0",node.line);
        const len=Math.max(0,Math.ceil((b-a)/c));
        if(len>1000) throw new LanguageError("range() ограничен 1000 шагами",node.line);
        return Array.from({length:len},(_,i)=>a+i*c);
      }
      const math={abs:Math.abs,min:Math.min,max:Math.max,floor:Math.floor,ceil:Math.ceil,round:Math.round};
      if(Object.hasOwn(math,node.name)) return math[node.name](...args);
      if(node.name==="print") { api.log(args.map(String).join(" ")); return null; }
      if(api.sense && api.hasSensor?.(node.name)) return api.sense(node.name,args);
      throw new LanguageError(`Неизвестная функция «${node.name}»`,node.line);
    }
  }
  throw new Error("Unknown expression node: "+node.type);
}

const DSL_ACTIONS = Object.freeze([
  "move", "turn_left", "turn_right", "plant", "water", "harvest", "wait",
  "scan", "refill_water", "return_to_base", "sleep", "go_to_plot"
]);
const DSL_BUILTINS = Object.freeze(["print", "range", "abs", "min", "max", "floor", "ceil", "round"]);

function snapshotScopes(scope) {
  const chain=[];
  for(let current=scope;current;current=current.parent) {
    const values={};
    for(const [name,value] of current.values) values[name]=value;
    chain.push({name:current.name,values});
  }
  chain.reverse();
  return {global:chain[0]||{name:"global",values:{}},locals:chain.slice(1)};
}

async function runProgram(source, api = {}) {
  const ast=parseProgram(source);
  const env=new Environment(null,"global");
  const functions=new Map();
  const callStack=[];
  const MAX_STEPS=5000, MAX_LOOP=1000, MAX_CALL_DEPTH=24;
  let steps=0, callDepth=0;
  const getDebugSnapshot=(scope,line=null,nextLine=null,statement=null)=>({
    line,nextLine,statement:statement?.type||null,steps,
    scopes:snapshotScopes(scope),functions:[...functions.keys()],callStack:callStack.map(frame=>({...frame}))
  });
  async function evaluateExpression(node,scope) {
    switch(node.type) {
      case "literal": return node.value;
      case "variable": return scope.get(node.name,node.line);
      case "unary": {
        const value=await evaluateExpression(node.value,scope);
        if(node.op==="not") return !truthy(value);
        if(node.op==="-") return -Number(value);
        return Number(value);
      }
      case "binary": {
        if(node.op==="and") { const left=await evaluateExpression(node.left,scope); return truthy(left)?evaluateExpression(node.right,scope):left; }
        if(node.op==="or") { const left=await evaluateExpression(node.left,scope); return truthy(left)?left:evaluateExpression(node.right,scope); }
        const a=await evaluateExpression(node.left,scope),b=await evaluateExpression(node.right,scope);
        switch(node.op) {
          case "+": return typeof a==="string"||typeof b==="string"?String(a)+String(b):Number(a)+Number(b);
          case "-": return Number(a)-Number(b);
          case "*": return Number(a)*Number(b);
          case "/": if(Number(b)===0) throw new LanguageError("Деление на ноль",node.line||1); return Number(a)/Number(b);
          case "%": if(Number(b)===0) throw new LanguageError("Деление на ноль",node.line||1); return Number(a)%Number(b);
          case "==": return a===b;
          case "!=": return a!==b;
          case "<": return a<b;
          case ">": return a>b;
          case "<=": return a<=b;
          case ">=": return a>=b;
        }
        return null;
      }
      case "call": {
        const args=[];
        for(const arg of node.args) args.push(await evaluateExpression(arg,scope));
        if(functions.has(node.name)) return invokeFunction(node.name,args,node.line);
        if(node.name==="range") {
          const [a,b,c]=args.length===1?[0,Number(args[0]),1]:[Number(args[0]??0),Number(args[1]??0),Number(args[2]??1)];
          if(!Number.isInteger(a)||!Number.isInteger(b)||!Number.isInteger(c)||c===0) throw new LanguageError("range() принимает целые числа, шаг не должен быть 0",node.line);
          const len=Math.max(0,Math.ceil((b-a)/c));
          if(len>1000) throw new LanguageError("range() ограничен 1000 шагами",node.line);
          return Array.from({length:len},(_,i)=>a+i*c);
        }
        const math={abs:Math.abs,min:Math.min,max:Math.max,floor:Math.floor,ceil:Math.ceil,round:Math.round};
        if(Object.hasOwn(math,node.name)) return math[node.name](...args);
        if(node.name==="print") { api.log?.(args.map(String).join(" ")); return null; }
        if(api.sense&&api.hasSensor?.(node.name)) return api.sense(node.name,args);
        throw new LanguageError(`Неизвестная функция «${node.name}»`,node.line);
      }
    }
    throw new LanguageError("Неизвестное выражение",node.line||1);
  }

  const checkStop=()=>{if(api.shouldStop?.()) throw new LanguageError("Выполнение остановлено");};
  function tick(line) {
    checkStop();
    steps++;
    if(steps>MAX_STEPS) throw new LanguageError(`Превышен лимит команд (${MAX_STEPS}). Возможно, цикл бесконечный`,line);
  }
  async function executeBlock(body, scope, insideFunction=false) {
    for(let index=0;index<body.length;index++) {
      const stmt=body[index], nextLine=body[index+1]?.line??null;
      tick(stmt.line);
      try {
        const debug=getDebugSnapshot(scope,stmt.line,nextLine,stmt);
        api.onDebugState?.(debug);
        await api.beforeStep?.(stmt.line,stmt,debug);
        checkStop();
        await api.onStep?.(stmt.line,stmt,nextLine);
        await executeStatement(stmt,scope,insideFunction);
        api.onVariables?.(getDebugSnapshot(scope,stmt.line,nextLine,stmt));
      }
      catch(signal) {
        if(signal instanceof BreakSignal || signal instanceof ContinueSignal || signal instanceof ReturnSignal) throw signal;
        if(signal instanceof LanguageError) throw signal;
        throw new LanguageError(signal?.message||String(signal),stmt.line);
      }
    }
  }
  async function invokeFunction(name,args,line) {
    const fn=functions.get(name);
    if(!fn) throw new LanguageError(`Функция «${name}» не объявлена`,line);
    if(callDepth>=MAX_CALL_DEPTH) throw new LanguageError("Слишком глубокий вызов функций",line);
    if(args.length!==fn.params.length) throw new LanguageError(`Функция ${name} ждёт ${fn.params.length} арг.`,line);
    const local=new Environment(env,`local:${name}`);
    fn.params.forEach((p,i)=>local.set(p,args[i]));
    callDepth++;
    callStack.push({name,line,depth:callDepth});
    api.onCallStack?.(callStack.map(frame=>({...frame})));
    api.onVariables?.(getDebugSnapshot(local,line,fn.body[0]?.line??null,fn));
    try { await executeBlock(fn.body,local,true); }
    catch(s) { if(s instanceof ReturnSignal) return s.value; throw s; }
    finally {
      callStack.pop();callDepth--;
      api.onCallStack?.(callStack.map(frame=>({...frame})));
      api.onVariables?.(getDebugSnapshot(env,null,null,null));
    }
    return null;
  }
  async function executeStatement(stmt,scope,insideFunction) {
    switch(stmt.type) {
      case "def": functions.set(stmt.name,stmt); return;
      case "assign": {
        const value=await evaluateExpression(stmt.value,scope);
        if(stmt.operator==="=") scope.set(stmt.name,value);
        else {
          const old=scope.get(stmt.name,stmt.line), op=stmt.operator[0];
          const v=op==="+"?(typeof old==="string"?String(old)+String(value):Number(old)+Number(value)):
            op==="-"?Number(old)-Number(value):op==="*"?Number(old)*Number(value):Number(old)/Number(value);
          scope.set(stmt.name,v);
        }
        return;
      }
      case "if":
        for(const branch of stmt.branches) if(branch.condition===null||truthy(await evaluateExpression(branch.condition,scope))) {
          await executeBlock(branch.body,scope,insideFunction); break;
        }
        return;
      case "for": {
        const values=await evaluateExpression(stmt.iterable,scope);
        if(!Array.isArray(values)&&typeof values!=="string") throw new LanguageError("for требует range() или строку",stmt.line);
        let count=0;
        for(const value of values) {
          checkStop(); if(++count>MAX_LOOP) throw new LanguageError("Слишком много повторений цикла",stmt.line);
          scope.set(stmt.name,value);
          try { await executeBlock(stmt.body,scope,insideFunction); }
          catch(s) { if(s instanceof BreakSignal) break; if(s instanceof ContinueSignal) continue; throw s; }
        }
        return;
      }
      case "while": {
        let count=0;
        while(truthy(await evaluateExpression(stmt.condition,scope))) {
          checkStop(); if(++count>MAX_LOOP) throw new LanguageError("Цикл while превысил лимит 1000 повторений",stmt.line);
          try { await executeBlock(stmt.body,scope,insideFunction); }
          catch(s) { if(s instanceof BreakSignal) break; if(s instanceof ContinueSignal) continue; throw s; }
        }
        return;
      }
      case "call": {
        const args=[];
        for(const arg of stmt.args) args.push(await evaluateExpression(arg,scope));
        if(functions.has(stmt.name)) { await invokeFunction(stmt.name,args,stmt.line); return; }
        if(stmt.name==="print") { api.log?.(args.map(String).join(" ")); return; }
        if(!DSL_ACTIONS.includes(stmt.name)) throw new LanguageError(`Неизвестная команда «${stmt.name}»`,stmt.line);
        await api.action?.(stmt.name,args);
        return;
      }
      case "return":
        if(!insideFunction) throw new LanguageError("return можно использовать только внутри def",stmt.line);
        throw new ReturnSignal(await evaluateExpression(stmt.value,scope));
      case "break": throw new BreakSignal(stmt.line);
      case "continue": throw new ContinueSignal(stmt.line);
    }
  }

  // Register all top-level functions before running, so calls may appear before their definitions.
  for(const stmt of ast) if(stmt.type==="def") functions.set(stmt.name,stmt);
  api.onFunctions?.([...functions.keys()]);
  api.onVariables?.(getDebugSnapshot(env));
  api.log?.("▶ Программа запущена");
  try {
    await executeBlock(ast,env,false);
    api.log?.(`✓ Готово · ${steps} шагов интерпретатора`);
    return {ok:true,steps};
  } catch(error) {
    let message;
    if(error instanceof LanguageError) message=`Строка ${error.line}: ${error.message}`;
    else if(error instanceof BreakSignal) message=`Строка ${error.line}: break можно использовать только внутри цикла`;
    else if(error instanceof ContinueSignal) message=`Строка ${error.line}: continue можно использовать только внутри цикла`;
    else message=error?.message||String(error);
    api.log?.("✕ "+message);
    return {ok:false,error:message,steps};
  }
}

export { parseProgram, runProgram, LanguageError, DSL_ACTIONS, DSL_BUILTINS };
