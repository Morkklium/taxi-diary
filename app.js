const $=s=>document.querySelector(s),
months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
cats=['Топливо','Мойка','Ремонт','Питание','Штрафы','Парковка','Комиссия','Прочее'];

let state=load(), year=new Date().getFullYear(), month=-1, day=0, tab='home';

function load(){
  try {
    const d=JSON.parse(localStorage.getItem('taxiDiary')||'{"records":{},"expenses":[],"goals":{}}');
    return {records:d.records||{},expenses:d.expenses||[],goals:d.goals||{}};
  } catch { return {records:{},expenses:[],goals:{}}; }
}
function save(){localStorage.setItem('taxiDiary',JSON.stringify(state));}
function key(y=year,m=month,d=day){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function num(v){return Number(String(v||'').replace(',','.'))||0;}
function money(v){return (Math.round(v*100)/100).toLocaleString('ru-RU');}
function rec(k){return state.records[k]||{cash:'',mileage:'',spent:'',completed:false};}
function expenses(k){return state.expenses.filter(e=>e.dateKey===k);}
function totalExp(k){return expenses(k).reduce((a,e)=>a+num(e.amount),0);}
function net(k){let r=rec(k);return num(r.cash)-num(r.spent)-totalExp(k);}
function monthKeys(y,m){let p=`${y}-${String(m+1).padStart(2,'0')}-`;return Object.keys(state.records).filter(k=>k.startsWith(p));}
function monthNet(y,m){return monthKeys(y,m).reduce((a,k)=>a+net(k),0);}
function grossTotal(){return Object.values(state.records).reduce((a,r)=>a+num(r.cash),0);}
function activeDays(){return Object.entries(state.records).filter(([k,r])=>num(r.cash)>0).map(([k])=>k).sort();}
function currentStreak(){
  const days=activeDays(); if(!days.length)return 0;
  const set=new Set(days); let cursor=new Date(); cursor.setHours(0,0,0,0);
  const today=toKey(cursor);
  if(!set.has(today))cursor.setDate(cursor.getDate()-1);
  let count=0;
  while(set.has(toKey(cursor))){count++;cursor.setDate(cursor.getDate()-1);}
  return count;
}
function toKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const levels=[
  {name:'Новичок',icon:'🌱',min:0,max:50000,color:'#9ca3af'},
  {name:'Бронза',icon:'🥉',min:50000,max:100000,color:'#cd7f32'},
  {name:'Серебро',icon:'🥈',min:100000,max:175000,color:'#b7c0ca'},
  {name:'Золото',icon:'🥇',min:175000,max:250000,color:'#d6a928'},
  {name:'Платина',icon:'💠',min:250000,max:500000,color:'#63b9c8'},
  {name:'Алмаз',icon:'💎',min:500000,max:750000,color:'#65a9e8'},
  {name:'Мастер',icon:'🏆',min:750000,max:1000000,color:'#a78bfa'},
  {name:'Легенда',icon:'👑',min:1000000,max:Infinity,color:'#e5a84b'}
];
function levelInfo(total=grossTotal()){
  let index=levels.findIndex((l,i)=>total>=l.min&&(i===levels.length-1||total<l.max));
  if(index<0)index=0;
  const l=levels[index],next=levels[index+1];
  return {level:l,index,next,progress:next?Math.min(100,Math.max(0,(total-l.min)/(next.min-l.min)*100)):100,remaining:next?Math.max(0,next.min-total):0};
}
function achievements(){
  const gross=grossTotal(),days=activeDays().length,streak=currentStreak();
  const list=[
    {icon:'🚕',name:'Первый заработок',desc:'Запиши первую кассу больше нуля',ok:gross>0},
    {icon:'💵',name:'Первые 10 000 ₽',desc:'Общая касса достигла 10 000 ₽',ok:gross>=10000},
    {icon:'🥉',name:'50 000 ₽ в кассе',desc:'Достигнут уровень «Бронза»',ok:gross>=50000},
    {icon:'🥈',name:'100 000 ₽ в кассе',desc:'Достигнут уровень «Серебро»',ok:gross>=100000},
    {icon:'🥇',name:'175 000 ₽ в кассе',desc:'Достигнут уровень «Золото»',ok:gross>=175000},
    {icon:'💠',name:'250 000 ₽ в кассе',desc:'Достигнут уровень «Платина»',ok:gross>=250000},
    {icon:'💎',name:'Полмиллиона',desc:'Общая касса достигла 500 000 ₽',ok:gross>=500000},
    {icon:'👑',name:'Миллионер',desc:'Общая касса достигла 1 000 000 ₽',ok:gross>=1000000},
    {icon:'📅',name:'10 рабочих дней',desc:'Есть 10 дней с записанной кассой',ok:days>=10},
    {icon:'🗓️',name:'50 рабочих дней',desc:'Есть 50 дней с записанной кассой',ok:days>=50},
    {icon:'🔥',name:'Неделя в деле',desc:'7 дней подряд с кассой больше нуля',ok:streak>=7},
    {icon:'⚡',name:'30 дней подряд',desc:'30 дней подряд с кассой больше нуля',ok:streak>=30}
  ];
  return list;
}
function toast(t){let el=$('#toast');el.textContent=t;el.style.display='block';setTimeout(()=>el.style.display='none',2200);}
function header(){
  $('#yearBadge').textContent=year;
  document.querySelectorAll('.dash-nav').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab || (b.dataset.tab==='map' && tab==='progress' && location.hash==='#map')));
}
function render(){
  if(tab!=='progress' && location.hash)history.replaceState(null,'',location.pathname+location.search);
  header();
  if(tab==='analytics')return analytics();
  if(tab==='backup')return backup();
  if(tab==='progress')return progress();
  if(month<0)return home();
  if(day===0)return calendar();
  daily();
}
function home(){
  const totalYear=Array.from({length:12},(_,m)=>monthNet(year,m)).reduce((a,b)=>a+b,0);
  const km=Object.entries(state.records).filter(([k])=>k.startsWith(year+'-')).reduce((a,[k,r])=>a+num(r.mileage),0);
  const info=levelInfo(),all=achievements(),done=all.filter(a=>a.ok).length;
  const todayKey=toKey(new Date()),today=rec(todayKey);
  const todayDate=new Date().toLocaleDateString('ru-RU',{day:'2-digit',month:'short',year:'numeric'});
  const recent=Object.entries(state.records).filter(([k,r])=>num(r.cash)>0||num(r.mileage)>0)
    .sort(([a],[b])=>b.localeCompare(a)).slice(0,3);
  const heatWeeks=(()=>{
    const end=new Date(),start=new Date(end);start.setDate(end.getDate()-90);
    const days=[];for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const k=toKey(d);days.push({k,v:num(rec(k).cash)});}
    return days;
  })();
  const heatCells=heatWeeks.map(d=>`<button class="dash-heat-cell" style="background:${heatColor(d.v)}" title="${d.k}: ${money(d.v)} ₽" onclick="month=${Number(d.k.slice(5,7))-1};day=${Number(d.k.slice(8,10))};tab='home';render()"></button>`).join('');
  $('#view').innerHTML=`
    <div class="dash-summary">
      <div class="dash-tile"><span class="dash-icon">▦</span><span class="muted">Сегодня</span><b>${todayDate}</b><strong>${money(num(today.cash))} ₽</strong></div>
      <div class="dash-tile"><span class="dash-icon">◢</span><span class="muted">Пробег за год</span><b>${money(km)} км</b><strong>${money(num(today.mileage))} км сегодня</strong></div>
      <div class="dash-tile dash-level-tile"><span class="dash-icon">★</span><span class="muted">Уровень водителя</span><b>${info.level.name}</b><strong>${money(grossTotal())} ₽ касса</strong></div>
    </div>
    <div class="dash-progress">
      <div class="row between"><b>Прогресс до следующего уровня</b><b>${Math.round(info.progress)}%</b></div>
      <div class="progress"><div style="width:${info.progress}%"></div></div>
      <span class="muted">${info.next?`До уровня «${info.next.name}» осталось ${money(info.remaining)} ₽`:'Максимальный уровень достигнут!'}</span>
    </div>
    <div class="dash-two">
      <div class="card dash-panel dash-achievements">
        <div class="row between"><b>Достижения</b><span class="muted">${done} из ${all.length}</span></div>
        <div class="dash-badges">${all.slice(0,5).map((a,i)=>`<span class="dash-badge ${a.ok?'earned':''}" title="${a.name}">${a.icon}</span>`).join('')}</div>
        <button class="dash-text-btn" onclick="tab='progress';render()">Все достижения →</button>
      </div>
      <div class="card dash-panel">
        <div class="row between"><b>Карта активности</b><button class="dash-mini-btn" onclick="tab='progress';render()">Все →</button></div>
        <div class="dash-heat">${heatCells}</div>
        <span class="muted">Последние 90 дней</span>
      </div>
    </div>
    <div class="card dash-recent">
      <div class="row between"><b>Последние поездки</b><button class="dash-mini-btn" onclick="month=-1;day=0;tab='home';render()">Календарь →</button></div>
      ${recent.length?recent.map(([k,r])=>`<div class="dash-trip" onclick="year=Number('${k.slice(0,4)}');month=${Number(k.slice(5,7))-1};day=${Number(k.slice(8,10))};render()"><span>▣ &nbsp;${new Date(k+'T12:00:00').toLocaleDateString('ru-RU')}</span><b>${money(num(r.mileage))} км</b><strong>${money(num(r.cash))} ₽</strong></div>`).join(''):'<p class="muted">Пока нет записанных поездок. Открой календарь и добавь первую запись.</p>'}
    </div>
    <div class="row between dash-month-heading"><h2>Твои месяцы</h2><div class="actions" style="flex:0 0 auto"><button class="secondary" onclick="year--;render()">‹</button><b style="padding:12px">${year}</b><button class="secondary" onclick="year++;render()">›</button></div></div>
    <div class="grid">${months.map((m,i)=>{let ks=monthKeys(year,i),doneDays=ks.filter(k=>rec(k).completed).length;return `<div class="card month" onclick="month=${i};day=0;render()"><strong>${m}</strong><div class="money">${money(monthNet(year,i))} ₽</div><div class="muted">${doneDays} дней отмечено</div><div class="muted" style="margin-top:9px">Открыть месяц →</div></div>`}).join('')}</div>
    <p class="muted" style="text-align:center">Записи сохраняются автоматически на этом устройстве</p>`;
}
function calendar(){
  let first=new Date(year,month,1),count=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7;
  let cells=Array(offset).fill(0).concat(Array.from({length:count},(_,i)=>i+1));
  $('#view').innerHTML=`
    <button class="secondary" onclick="month=-1;render()">← Все месяцы</button><h2>${months[month]}</h2><div class="muted">${year} год</div>
    <div class="grid">
      <div class="card"><div class="muted">Касса</div><div class="money">${money(monthKeys(year,month).reduce((a,k)=>a+num(rec(k).cash),0))} ₽</div></div>
      <div class="card"><div class="muted">Чистыми</div><div class="money">${money(monthNet(year,month))} ₽</div></div>
    </div>
    <div class="card"><div class="week">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>`<span>${x}</span>`).join('')}</div><div class="days">${cells.map(d=>d?`<button class="day ${rec(key(year,month,d)).completed?'marked':''}" onclick="day=${d};render()">${d}${rec(key(year,month,d)).completed?' ✓':''}</button>`:'<span></span>').join('')}</div></div>
    <div class="card"><h3>Цель на месяц</h3><div class="money">${money(state.goals[`${year}-${String(month+1).padStart(2,'0')}`]||0)} ₽</div><button class="secondary full" onclick="goalEdit()">Изменить цель</button></div>`;
}
function daily(){
  let k=key(),r=rec(k),ex=expenses(k);
  $('#view').innerHTML=`
    <button class="secondary" onclick="day=0;render()">← Календарь</button><h2>${String(day).padStart(2,'0')} ${months[month]} ${year}</h2>
    <div class="card"><h3>Рабочий день</h3>
      <div class="field"><label>Касса, ₽</label><input id="cash" inputmode="decimal" value="${r.cash}"></div>
      <div class="field"><label>Пробег, км</label><input id="mileage" inputmode="decimal" value="${r.mileage}"></div>
      <div class="field"><label>Прочие расходы, ₽</label><input id="spent" inputmode="decimal" value="${r.spent}"></div>
      <label class="row"><input id="completed" type="checkbox" style="width:auto" ${r.completed?'checked':''}> День завершён</label>
      <button class="full" onclick="saveDay()">Сохранить запись</button>
    </div>
    <div class="card"><div class="row between"><h3>Расходы по категориям</h3><b class="money">${money(totalExp(k))} ₽</b></div>
      <div id="expenseList">${ex.map(e=>`<div class="item row between"><span>${e.category}<div class="muted">${e.note||''}</div></span><b>${money(e.amount)} ₽</b><button class="danger" onclick="delExpense(${e.id})">×</button></div>`).join('')||'<div class="empty">Пока расходов нет</div>'}</div>
      <div class="field"><label>Категория</label><select id="cat">${cats.map(c=>`<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Сумма, ₽</label><input id="amount" inputmode="decimal" placeholder="0"></div>
      <div class="field"><label>Примечание</label><input id="note" placeholder="Необязательно"></div>
      <button class="full" onclick="addExpense()">Добавить расход</button>
    </div>
    <div class="card"><div class="muted">Итого чистыми за день</div><div class="money">${money(net(k))} ₽</div></div>`;
}
function saveDay(){
  let k=key();state.records[k]={cash:$('#cash').value,mileage:$('#mileage').value,spent:$('#spent').value,completed:$('#completed').checked};
  save();toast('Запись сохранена');render();
}
function addExpense(){
  let amount=num($('#amount').value);if(amount<=0)return toast('Укажи сумму больше нуля');
  state.expenses.push({id:Date.now(),dateKey:key(),category:$('#cat').value,amount,note:$('#note').value});
  save();render();toast('Расход добавлен');
}
function delExpense(id){state.expenses=state.expenses.filter(e=>e.id!==id);save();render();}
function goalEdit(){
  let k=`${year}-${String(month+1).padStart(2,'0')}`,v=prompt('Цель чистого дохода за месяц, ₽',state.goals[k]||'');
  if(v!==null){state.goals[k]=num(v);save();render();}
}
function analytics(){
  let rows=months.map((m,i)=>({m,n:monthNet(year,i),km:monthKeys(year,i).reduce((a,k)=>a+num(rec(k).mileage),0)}));
  let total=rows.reduce((a,r)=>a+r.n,0);
  $('#view').innerHTML=`<div class="row between"><h2>Аналитика</h2><div class="actions" style="flex:0 0 auto"><button class="secondary" onclick="year--;render()">‹</button><b style="padding:12px">${year}</b><button class="secondary" onclick="year++;render()">›</button></div></div>
    <div class="card"><div class="muted">Чистыми за год</div><div class="stat money">${money(total)} ₽</div></div>
    ${rows.map(r=>`<div class="card"><div class="row between"><b>${r.m}</b><b class="money">${money(r.n)} ₽</b></div><div class="muted">${money(r.km)} км пробега</div></div>`).join('')}`;
}
function heatColor(value){
  if(value<=0)return '#26342c';
  if(value<3000)return '#315b3d';
  if(value<7000)return '#438b51';
  if(value<12000)return '#5eaa63';
  return '#80cf79';
}
function heatmap(){
  const start=new Date(year,0,1),end=new Date(year,11,31);
  const mondayOffset=(start.getDay()+6)%7;
  const gridStart=new Date(start);gridStart.setDate(start.getDate()-mondayOffset);
  const weeks=[];
  let cursor=new Date(gridStart);
  while(cursor<=end||cursor.getDay()!==1){
    const week=[];
    for(let i=0;i<7;i++){
      const d=new Date(cursor),k=toKey(d),inYear=d.getFullYear()===year;
      week.push({key:k,day:d.getDate(),month:d.getMonth(),value:inYear?num(rec(k).cash):0,inYear});
      cursor.setDate(cursor.getDate()+1);
    }
    weeks.push(week);
    if(cursor>end)break;
  }
  const monthLabels=weeks.map((w,i)=>w.some(d=>d.inYear&&d.day<=7)?`<span style="grid-column:${i+1}">${months[w.find(d=>d.inYear&&d.day<=7)?.month||0].slice(0,3)}</span>`:'').join('');
  const cells=weeks.map(w=>`<div class="heat-week">${w.map(d=>`<button class="heat-cell" style="background:${d.inYear?heatColor(d.value):'transparent'}" ${d.inYear?`title="${d.key}: ${money(d.value)} ₽" onclick="month=${d.month};day=${d.day};tab='home';render()"`:'disabled'} aria-label="${d.key}"></button>`).join('')}</div>`).join('');
  return `<div class="heat-months" style="grid-template-columns:repeat(${weeks.length},minmax(0,1fr))">${monthLabels}</div>
    <div class="heat-scroll"><div class="heat-grid">${cells}</div></div>
    <div class="row between heat-legend"><span class="muted">Нет кассы</span><div class="row" style="gap:4px">${['#26342c','#315b3d','#438b51','#5eaa63','#80cf79'].map(c=>`<span class="heat-cell legend-cell" style="background:${c}"></span>`).join('')}</div><span class="muted">Больше</span></div>`;
}
function progress(){
  const total=grossTotal(),info=levelInfo(total),done=achievements().filter(a=>a.ok).length,all=achievements();
  $('#view').innerHTML=`
    <h2>Твой прогресс</h2>
    <div class="card level-card">
      <div class="muted">ТЕКУЩИЙ УРОВЕНЬ</div>
      <div class="level-emblem">${info.level.icon}</div>
      <div class="level-name" style="color:${info.level.color}">${info.level.name}</div>
      <div class="stat money">${money(total)} ₽</div>
      <div class="muted">Общая касса за всё время · до вычета расходов</div>
      ${info.next?`<div class="progress"><div style="width:${info.progress}%;background:${info.level.color}"></div></div><div class="row between"><span class="muted">До «${info.next.name}»</span><b>${money(info.remaining)} ₽</b></div>`:'<p class="muted">Ты достиг максимального уровня!</p>'}
    </div>
    <div class="card"><div class="row between"><h3>Все уровни</h3><span class="muted">${info.index+1} / ${levels.length}</span></div>
      ${levels.map((l,i)=>`<div class="level-row ${i===info.index?'current':''}"><span class="level-icon">${l.icon}</span><div class="level-details"><b>${l.name}</b><span class="muted">${money(l.min)}${l.max===Infinity?' ₽ и выше':` – ${money(l.max-1)} ₽`}</span></div><span class="level-status">${total>=l.min?'✓':i===info.index?'●':'🔒'}</span></div>`).join('')}
    </div>
    <div class="row between"><h2>Достижения</h2><span class="pill">${done} / ${all.length}</span></div>
    <div class="grid achievements">${all.map(a=>`<div class="card achievement ${a.ok?'unlocked':'locked'}"><div class="achievement-icon">${a.icon}</div><b>${a.name}</b><p class="muted">${a.desc}</p><span class="achievement-status">${a.ok?'Получено ✓':'Пока закрыто'}</span></div>`).join('')}</div>
    <div class="row between"><h2>Карта активности</h2><div class="actions" style="flex:0 0 auto"><button class="secondary" onclick="year--;render()">‹</button><b style="padding:12px">${year}</b><button class="secondary" onclick="year++;render()">›</button></div></div>
    <div class="card"><p class="muted">Каждый квадратик — день. Чем больше касса за день, тем ярче цвет. Нажми на день, чтобы открыть запись.</p>${heatmap()}</div>`;
}
function backup(){
  $('#view').innerHTML=`<h2>Резервная копия</h2>
    <div class="card"><h3>Сохранить данные</h3><p class="muted">Скачает файл со всеми записями, расходами и целями.</p><button class="full" onclick="exportJson()">Скачать резервную копию JSON</button><button class="secondary full" onclick="exportCsv()">Экспорт CSV для Excel</button></div>
    <div class="card"><h3>Восстановить данные</h3><p class="muted">Импорт заменит текущие данные на данные из выбранной копии.</p><button class="full" onclick="$('#importFile').click()">Выбрать файл копии</button></div>
    <div class="card"><p class="muted">Важно: данные хранятся в браузере этого устройства. Сохраняй резервную копию и переноси её вручную на другое устройство.</p></div>`;
}
function exportJson(){
  download('taxi-diary-backup.json',JSON.stringify({format:'TaxiDiaryBackup',version:1,records:Object.entries(state.records).map(([dateKey,r])=>({dateKey,...r})),expenses:state.expenses,goals:Object.entries(state.goals).map(([monthKey,targetAmount])=>({monthKey,targetAmount}))},null,2),'application/json');
}
function exportCsv(){
  let lines=[['Тип','Дата','Касса','Пробег','Прочие расходы','Выполнен','Категория','Сумма','Примечание','Цель']];
  Object.entries(state.records).forEach(([k,r])=>lines.push(['Дневник',k,r.cash,r.mileage,r.spent,r.completed,'','','','']));
  state.expenses.forEach(e=>lines.push(['Расход',e.dateKey,'','','','',''+e.category,e.amount,e.note,'']));
  Object.entries(state.goals).forEach(([k,v])=>lines.push(['Цель',k,'','','','','','','',v]));
  let csv='\ufeff'+lines.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
  download('taxi-diary.csv',csv,'text/csv;charset=utf-8');
}
function download(name,data,type){
  let a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));
  a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
$('#importFile').addEventListener('change',async e=>{
  let f=e.target.files[0];if(!f)return;
  try{
    let d=JSON.parse(await f.text());
    if(d.format!=='TaxiDiaryBackup'||d.version!==1)throw Error('Неподдерживаемый формат');
    if(!confirm('Заменить все текущие данные данными из копии?'))return;
    state={records:{},expenses:d.expenses||[],goals:{}};
    (d.records||[]).forEach(r=>{let {dateKey,...v}=r;state.records[dateKey]=v;});
    (d.goals||[]).forEach(g=>state.goals[g.monthKey]=g.targetAmount);
    save();toast('Копия восстановлена');render();
  }catch(err){toast('Не удалось прочитать копию: '+err.message);}
  e.target.value='';
});
document.querySelectorAll('.dash-nav').forEach(b=>b.addEventListener('click',()=>{
  const target=b.dataset.tab;
  month=-1;day=0;
  if(target==='map'){
    tab='progress';
    history.replaceState(null,'','#map');
    render();
    setTimeout(()=>document.querySelector('.heat-scroll')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  }else{
    history.replaceState(null,'',location.pathname+location.search);
    tab=target;
    render();
  }
}));
render();
