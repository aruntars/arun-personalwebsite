<script>
/* The lens diagram. One car is followed around the loop: the hub sends a pulse to the next stage, the car
   crosses to it, a ring around the stage fills while the car is being worked on, and the functions that
   support that stage light up. Stages and their supporting functions live in ST below; positions for the
   wide layout are in a 1040 x 690 box. */
(function(){
  var root=document.getElementById('ops');
  if(!root||!window.requestAnimationFrame||!document.createElementNS) return;
  var NS='http://www.w3.org/2000/svg';
  var IC={
    target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    car:'<rect x="1.5" y="6" width="21" height="12" rx="4.5"/><rect x="5.5" y="8.6" width="5" height="6.8" rx="1.6"/><rect x="13.5" y="8.6" width="5" height="6.8" rx="1.6"/>',
    depot:'<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M8 21v-7h8v7"/><path d="M8 17.5h8"/>',
    battery:'<rect x="6" y="5" width="12" height="17" rx="2"/><path d="M10 2.5V5M14 2.5V5"/><path d="M13 9l-3 4.5h4l-3 4.5"/>',
    search:'<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.7-4.7"/>',
    tool:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    landmark:'<path d="M3 9.5 12 4l9 5.5z"/><path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7"/><path d="M4.5 17.5h15M3.5 20.5h17"/>',
    building:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15"/>',
    rings:'<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    parking:'<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M9.5 17V7.5h3.2a3 3 0 0 1 0 6H9.5"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.8"/>',
    truck:'<path d="M1.5 5h13v11h-13z"/><path d="M14.5 9h4l3.5 3.5V16h-7.5z"/><circle cx="6" cy="18.3" r="2.2"/><circle cx="17.5" cy="18.3" r="2.2"/>',
    alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    radio:'<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>',
    headset:'<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>'
  };
  var SPARK='<path d="M12 1.5c.9 5.9 3.6 8.6 9.5 9.5-5.9.9-8.6 3.6-9.5 9.5-.9-5.9-3.6-8.6-9.5-9.5 5.9-.9 8.6-3.6 9.5-9.5z"/><path d="M19.8.6c.3 1.9 1.2 2.8 3.1 3.1-1.9.3-2.8 1.2-3.1 3.1-.3-1.9-1.2-2.8-3.1-3.1 1.9-.3 2.8-1.2 3.1-3.1z"/>';
  var ST=[
    {n:'Dispatch',l:['Dispatch'],ic:'target',sats:[
      {n:'Cities & states',ic:'landmark',x:338,y:72,s:'l'}]},
    {n:'On the road',l:['On the','road'],ic:'car',sats:[
      {n:'Rider support',ic:'headset',x:700,y:66,s:'r'},
      {n:'Remote ops',ic:'radio',x:905,y:128,s:'b'},
      {n:'Incidents & collisions',l:['Incidents &','collisions'],ic:'alert',x:948,y:268,s:'b'}]},
    {n:'Back to depot',l:['Back to','depot'],ic:'depot',sats:[
      {n:'Roadside & towing',l:['Roadside &','towing'],ic:'truck',x:948,y:432,s:'b'},
      {n:'Satellite sites',ic:'pin',x:896,y:570,s:'b'},
      {n:'Parking',ic:'parking',x:706,y:612,s:'b'}]},
    {n:'Charging',l:['Charging'],ic:'battery',sats:[
      {n:'Power grid',ic:'zap',x:345,y:612,s:'l'}]},
    {n:'Clean & inspect',l:['Clean &','inspect'],ic:'search',sats:[
      {n:'Crews',ic:'user',x:128,y:520,s:'b'}]},
    {n:'Maintenance',l:['Maintenance'],ic:'tool',sats:[
      {n:'Vendors & parts',l:['Vendors &','parts'],ic:'rings',x:100,y:318,s:'b'},
      {n:'Service centers',ic:'building',x:150,y:150,s:'b'}]}
  ];
  var LAY={
    wide:{w:1040,h:690,cx:520,cy:335,rx:250,ry:205,nr:66,hr:78,sr:28,ni:34,hi:38,nf:14,hf:16.5,sf:13.5,car:7,sats:true},
    narrow:{w:340,h:340,cx:170,cy:170,rx:118,ry:118,nr:44,hr:42,sr:0,ni:21,hi:20,nf:9.4,hf:9.6,sf:0,car:4.6,sats:false}
  };
  var SEG=2.8, TR=0.44;            /* seconds per stage, share of it spent travelling */
  var reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var stage=root.querySelector('.ops-stage'), head=root.querySelector('.ops-head'), status=root.querySelector('.ops-status');
  var btn=root.querySelector('.ops-toggle'), outK=root.querySelector('[data-ops="k"]'), outV=root.querySelector('[data-ops="v"]'), outC=root.querySelector('[data-ops="chips"]');
  var tau=TR*SEG, last=0, raf=0, running=!reduce, visible=true, hover=null, lock=null, mode=null, L=null, P=null, shown={act:-2,sel:-2};

  function el(tag,a,parent){var n=document.createElementNS(NS,tag);for(var k in a)n.setAttribute(k,a[k]);if(parent)parent.appendChild(n);return n;}
  function ang(f){return (-90+60*f)*Math.PI/180;}
  function pt(f){var a=ang(f);return [L.cx+L.rx*Math.cos(a),L.cy+L.ry*Math.sin(a)];}
  function ease(u){return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;}
  function r1(v){return Math.round(v*10)/10;}
  function icon(name,x,y,size,parent){var g=el('g',{transform:'translate('+r1(x-size/2)+','+r1(y-size/2)+') scale('+r1(size/24*100)/100+')'},parent);if(name==='spark'){g=el('g',{'class':'spark'},g);g.innerHTML=SPARK;}else{g.setAttribute('class','ico');g.innerHTML=IC[name];}return g;}
  function label(lines,x,y,size,gap,cls,anchor,parent){
    var t=el('text',{'class':cls,x:r1(x),y:r1(y),'font-size':size},parent);
    if(anchor)t.setAttribute('text-anchor',anchor);
    lines.forEach(function(s,i){var ts=el('tspan',{x:r1(x)},t);if(i)ts.setAttribute('dy',gap);ts.textContent=s.toUpperCase();});
    return t;
  }
  function edge(i,dir){            /* how far along the track (in stages) the car is still under stage i's circle */
    var c=pt(i),lo=0,hi=.5,want=L.nr-L.car*.5;
    for(var n=0;n<18;n++){var mid=(lo+hi)/2,p=pt(i+dir*mid),dx=p[0]-c[0],dy=p[1]-c[1];if(Math.sqrt(dx*dx+dy*dy)<want)lo=mid;else hi=mid;}
    return dir*lo;
  }
  function ringPath(x,y,r){return 'M'+r1(x)+' '+r1(y-r)+'A'+r+' '+r+' 0 1 1 '+r1(x)+' '+r1(y+r)+'A'+r+' '+r+' 0 1 1 '+r1(x)+' '+r1(y-r);}
  function seg(ax,ay,bx,by,ra,rb){var dx=bx-ax,dy=by-ay,d=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/d,uy=dy/d;return 'M'+r1(ax+ux*ra)+' '+r1(ay+uy*ra)+'L'+r1(bx-ux*rb)+' '+r1(by-uy*rb);}

  function build(m){
    mode=m;L=LAY[m];root.setAttribute('data-mode',m);
    var old=stage.querySelector('svg');if(old)stage.removeChild(old);
    var svg=el('svg',{viewBox:'0 0 '+L.w+' '+L.h,role:'group','aria-label':'Fleet operations cycle. Select a stage to see what supports it.'},stage);
    el('circle',{'class':'wave',cx:L.cx,cy:L.cy,r:L.hr},svg);
    el('circle',{'class':'wave b',cx:L.cx,cy:L.cy,r:L.hr},svg);
    el('ellipse',{'class':'trk',cx:L.cx,cy:L.cy,rx:L.rx,ry:L.ry},svg);
    for(var c=0;c<6;c++){
      var a=ang(c+.5),p=pt(c+.5),rot=Math.atan2(L.ry*Math.cos(a),-L.rx*Math.sin(a))*180/Math.PI,k=m==='wide'?7:4.5;
      el('path',{'class':'chev',d:'M'+(-k)+' '+(-k)+'L'+r1(k*.5)+' 0L'+(-k)+' '+k,transform:'translate('+r1(p[0])+','+r1(p[1])+') rotate('+r1(rot)+')'},svg);
    }
    var cars=el('g',{},svg),trail=[],ghosts=[];
    for(var t=0;t<5;t++)trail.push(el('circle',{'class':'trail',r:r1(L.car*(.78-t*.12))},cars));
    for(var g=0;g<2;g++)ghosts.push(el('circle',{'class':'ghost',r:r1(L.car*.62)},cars));
    var car=el('g',{},cars);
    el('circle',{'class':'glow',r:r1(L.car*2)},car);el('circle',{'class':'car',r:L.car},car);
    var hub=el('g',{},svg);
    el('circle',{'class':'hub',cx:L.cx,cy:L.cy,r:L.hr},hub);
    icon('spark',L.cx,L.cy-L.hr*.3,L.hi,hub);
    label(['AI agents','+ robotics'],L.cx,L.cy+L.hr*.27,L.hf,r1(L.hf*1.2),'hlab',null,hub);
    var sts=[],sats=[],progs=[],out=[],inn=[];
    ST.forEach(function(s,i){
      var p=pt(i),two=s.l.length>1;
      var g=el('g',{'class':'st',tabindex:'0',role:'button','aria-label':s.n+'. Supported by: '+s.sats.map(function(x){return x.n;}).join(', ')+'.'},svg);
      var d=seg(L.cx,L.cy,p[0],p[1],L.hr,L.nr);
      el('path',{'class':'spoke',d:d},g);
      el('path',{'class':'pulse',d:d,pathLength:'100'},g);
      progs.push(el('path',{'class':'prog',d:ringPath(p[0],p[1],L.nr+(m==='wide'?8:6)),pathLength:'100',opacity:'0'},g));
      out.push(edge(i,1));inn.push(edge(i,-1));
      el('circle',{'class':'node',cx:r1(p[0]),cy:r1(p[1]),r:L.nr},g);
      icon(s.ic,p[0],p[1]-L.nr*(two?.36:.26),L.ni,g);
      label(s.l,p[0],p[1]+L.nr*(two?.2:.4),L.nf,r1(L.nf*1.2),'lab',null,g);
      bind(g,i,true);sts.push(g);
      if(!L.sats)return;
      s.sats.forEach(function(x){
        var q=el('g',{'class':'sat'},svg);
        el('path',{'class':'link',d:seg(p[0],p[1],x.x,x.y,L.nr,L.sr)},q);
        el('circle',{'class':'ring',cx:x.x,cy:x.y,r:L.sr},q);
        icon(x.ic,x.x,x.y,26,q);
        var lines=x.l||[x.n];
        if(x.s==='b')label(lines,x.x,x.y+L.sr+21,L.sf,17,'slab','middle',q);
        else label(lines,x.x+(x.s==='l'?-1:1)*(L.sr+13),x.y+5,L.sf,17,'slab',x.s==='l'?'end':'start',q);
        bind(q,i,false);sats.push({g:q,i:i});
      });
    });
    svg.addEventListener('click',function(){if(lock!==null){lock=null;draw();}});
    P={svg:svg,car:car,trail:trail,ghosts:ghosts,sts:sts,sats:sats,progs:progs,out:out,inn:inn};
    shown={act:-2,sel:-2};draw();
  }
  function bind(g,i,keys){
    g.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'){hover=i;draw();}});
    g.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'){hover=null;draw();}});
    g.addEventListener('click',function(e){e.stopPropagation();lock=lock===i?null:i;draw();});
    if(!keys)return;
    g.addEventListener('focus',function(){hover=i;draw();});
    g.addEventListener('blur',function(){hover=null;draw();});
    g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();lock=lock===i?null:i;draw();}});
  }
  function where(t){                 /* track position f (in stages), current stage i, docked?, progress u of that phase */
    var s=t/SEG,k=Math.floor(s),u=s-k,i=((k%6)+6)%6;
    if(u<TR){var a=i-1+P.out[(i+5)%6],b=i+P.inn[i];return {f:a+(b-a)*ease(u/TR),i:i,docked:false,u:u/TR};}
    return {f:i+P.inn[i],i:i,docked:true,u:(u-TR)/(1-TR)};
  }
  function fade(w){return w.docked?0:Math.min(1,w.u*7,(1-w.u)*7);}
  function place(node,f){var p=pt(f);node.setAttribute('transform','translate('+r1(p[0])+','+r1(p[1])+')');}
  function draw(){
    if(!P)return;
    var s=where(tau),vis=fade(s);place(P.car,s.f);P.car.setAttribute('opacity',r1(vis));
    P.trail.forEach(function(c,j){var w=where(tau-(j+1)*.05);place(c,w.f);c.setAttribute('opacity',!w.docked&&w.i===s.i?r1(vis*(.5-j*.09)):0);});
    P.ghosts.forEach(function(c,j){var w=where(tau+((j+1)*2+.5)*SEG);place(c,w.f);c.setAttribute('opacity',r1(fade(w)*.45));});
    P.progs.forEach(function(c,i){                 /* the ring fills while the car is at the stage, then fades as it leaves */
      var on=s.docked&&s.i===i,left=!s.docked&&(s.i+5)%6===i;
      c.setAttribute('stroke-dashoffset',on?r1(100*(1-s.u)):0);
      c.setAttribute('opacity',on?1:left?r1(Math.max(0,1-s.u*2.2)):0);
    });
    var sel=lock!==null?lock:hover,act=sel!==null?sel:s.i;
    if(act!==shown.act){
      P.sts.forEach(function(g,i){g.classList.toggle('on',i===act);g.setAttribute('aria-pressed',lock===i?'true':'false');});
      P.sats.forEach(function(x){x.g.classList.toggle('on',x.i===act);});
      outV.textContent=ST[act].n;outC.textContent='';
      ST[act].sats.forEach(function(x){var c=document.createElement('span');c.textContent=x.n;outC.appendChild(c);});
      shown.act=act;
    }
    if(sel!==shown.sel){P.svg.classList.toggle('has-sel',sel!==null);outK.textContent=sel!==null?'Selected stage':'Following one car';
      P.sts.forEach(function(g,i){g.setAttribute('aria-pressed',lock===i?'true':'false');});shown.sel=sel;}
  }
  function frame(ts){
    if(last)tau+=Math.min(.1,(ts-last)/1000);
    last=ts;draw();raf=requestAnimationFrame(frame);
  }
  function loop(){
    var go=running&&visible&&!document.hidden;
    if(go&&!raf){last=0;raf=requestAnimationFrame(frame);}
    if(!go&&raf){cancelAnimationFrame(raf);raf=0;}
  }
  function sync(){
    btn.textContent=running?'Pause':'Play';
    btn.setAttribute('aria-label',running?'Pause the animation':'Play the animation');
    root.classList.toggle('is-paused',!running);loop();
  }
  function pick(){return root.clientWidth>=760?'wide':'narrow';}

  head.hidden=false;status.hidden=false;
  build(pick());
  btn.addEventListener('click',function(){running=!running;sync();});
  if(window.ResizeObserver)new ResizeObserver(function(){var m=pick();if(m!==mode)build(m);}).observe(root);
  else window.addEventListener('resize',function(){var m=pick();if(m!==mode)build(m);});
  if(window.IntersectionObserver)new IntersectionObserver(function(es){visible=es[es.length-1].isIntersecting;loop();},{rootMargin:'120px'}).observe(root);
  document.addEventListener('visibilitychange',loop);
  sync();
})();
</script>
