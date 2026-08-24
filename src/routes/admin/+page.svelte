<script lang="ts">
 import { onMount } from 'svelte';
 import { adminStore as store } from '$lib/admin/store.svelte';
 import ModuleHeading from '$lib/admin/ModuleHeading.svelte';
 import QuickAddModal from '$lib/admin/quick-add/QuickAddModal.svelte';
 import type { AdminRecordType, ClientFormData, EventFormData, ProjectFormData, TaskFormData } from '$lib/admin/forms/types';
 import type { ActionState, Client, ProjectStatus } from '$lib/admin/types';
 import type { PageData } from './$types';

 let { data }: { data: PageData } = $props();

 const nav=[['home','Action Center','⌂'],['clients','Clients','♙'],['projects','Projects','◇'],['inbox','Inbox','✉'],['tasks','Tasks','✓'],['documents','Documents','▱'],['calendar','Calendar','□'],['accounting','Accounting','$'],['vendors','Vendors','♢'],['reports','Reports','⌁'],['settings','Settings','⚙']];
 let view=$state('home'), selectedProject=$state('p1'), selectedClient=$state('c2'), selectedMail=$state(''), mailbox=$state('All'), searchOpen=$state(false), query=$state(''), moreOpen=$state(false), modal=$state(''), actionFilter=$state('All');
 let formTitle=$state(''), formName=$state(''), formEmail=$state(''), formPhone=$state(''), formDescription=$state('');
let formFromEmail=$state('branch@dogwoodlanddev.com');
let emailSending=$state(false);
let selectedMailContent=$state('');
let selectedMailLoading=$state(false);
let selectedMailError=$state('');
let replyText=$state('');
let replySending=$state(false);
let mailSearch=$state('');

const zohoMail = $derived(
	(data.zohoInboxes ?? []).flatMap((inbox) =>
		inbox.messages.map((message) => ({
			...message,
			key: `${inbox.emailAddress}:${message.messageId}`,
			emailAddress: inbox.emailAddress,
			mailbox:
				inbox.emailAddress === 'branch@dogwoodlanddev.com' ? 'Branch' :
				inbox.emailAddress === 'office@dogwoodlanddev.com' ? 'Office' :
				inbox.emailAddress === 'accounting@dogwoodlanddev.com' ? 'Accounting' :
				'Permitting'
		}))
	)
);

const visibleZohoMail = $derived(
	zohoMail
		.filter((message) => mailbox === 'All' || message.mailbox === mailbox)
		.filter((message) => {
			const search = mailSearch.trim().toLowerCase();

			if (!search) return true;

			return [
				message.sender,
				message.fromAddress,
				message.subject,
				message.summary,
				message.mailbox
			].some((value) => value?.toLowerCase().includes(search));
		})
		.sort((a, b) => Number(b.receivedTime ?? 0) - Number(a.receivedTime ?? 0))
);

const selectedZohoMail = $derived(
	zohoMail.find((message) => message.key === selectedMail)
);

const selectedMailDocument = $derived(`
	<meta
		http-equiv="Content-Security-Policy"
		content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:;"
	>
	${selectedMailContent}
`);
 let quickAddOpen=$state(false);
 let quickAddType=$state<AdminRecordType | null>(null);
 const project=$derived(store.projects.find(p=>p.id===selectedProject));
 const client=$derived(store.clients.find(c=>c.id===selectedClient));
 const filteredActions=$derived(store.actions.filter(a=>actionFilter==='All'||a.state===actionFilter));

 let currentDate=$state(new Date());

 const todayShort=$derived(
  new Intl.DateTimeFormat('en-US',{
   month:'short',
   day:'numeric'
  }).format(currentDate)
 );

 const todayFull=$derived(
  new Intl.DateTimeFormat('en-US',{
   month:'long',
   day:'numeric',
   year:'numeric'
  }).format(currentDate)
 );

 const todayHeading=$derived(
  new Intl.DateTimeFormat('en-US',{
   weekday:'long',
   month:'long',
   day:'numeric'
  }).format(currentDate).toUpperCase()
 );

 const todayEvents=$derived(
  store.events
   .filter(event=>event.date===todayShort)
   .toSorted((a,b)=>{
    function minutes(value:string){
     if(!value)return Number.MAX_SAFE_INTEGER;

     const match=value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
     if(!match)return Number.MAX_SAFE_INTEGER;

     let hour=Number(match[1]);
     const minute=Number(match[2]);
     const period=match[3].toUpperCase();

     if(period==='AM'&&hour===12)hour=0;
     if(period==='PM'&&hour!==12)hour+=12;

     return hour*60+minute;
    }

    return minutes(a.time)-minutes(b.time);
   })
 );

 const searchResults=$derived(
  query.trim().length<2
   ?[]
   :[
    ...store.clients
     .filter(x=>`${x.name} ${x.email} ${x.phone}`.toLowerCase().includes(query.toLowerCase()))
     .map(x=>({type:'Client',title:x.name,sub:x.email,id:x.id})),
    ...store.projects
     .filter(x=>`${x.name} ${x.address} ${x.summary}`.toLowerCase().includes(query.toLowerCase()))
     .map(x=>({type:'Project',title:x.name,sub:x.address,id:x.id})),
    ...store.documents
     .filter(x=>x.name.toLowerCase().includes(query.toLowerCase()))
     .map(x=>({type:'Document',title:x.name,sub:x.category,id:x.id})),
    ...zohoMail
     .filter(x=>`${x.sender} ${x.fromAddress} ${x.subject}`.toLowerCase().includes(query.toLowerCase()))
     .map(x=>({type:'Email',title:x.subject,sub:`${x.sender} · ${x.mailbox}`,id:x.key}))
   ]
 );
 const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
 function go(next:string){view=next;moreOpen=false;window.scrollTo({top:0,behavior:'smooth'});}
 function openProject(id:string){selectedProject=id;go('project');}
 function openClient(id:string){selectedClient=id;go('client');}
 function chooseResult(r:{type:string;id:string}){
  searchOpen=false;
  query='';

  if(r.type==='Project'){
   openProject(r.id);
  }else if(r.type==='Client'){
   openClient(r.id);
  }else if(r.type==='Email'){
   go('inbox');
   const message=zohoMail.find(item=>item.key===r.id);
   if(message)void openZohoMessage(message);
  }else{
   go('documents');
  }
 }

 function formatZohoReceived(value:string|null){
  if(!value)return '';

  const numeric=Number(value);
  const date=Number.isFinite(numeric)
   ?new Date(numeric)
   :new Date(value);

  if(Number.isNaN(date.getTime()))return '';

  const today=new Date();

  if(
   date.getFullYear()===today.getFullYear()&&
   date.getMonth()===today.getMonth()&&
   date.getDate()===today.getDate()
  ){
   return new Intl.DateTimeFormat('en-US',{
    hour:'numeric',
    minute:'2-digit'
   }).format(date);
  }

  return new Intl.DateTimeFormat('en-US',{
   month:'short',
   day:'numeric'
  }).format(date);
 }

 async function openZohoMessage(message:(typeof zohoMail)[number]){
  selectedMail=message.key;
  selectedMailContent='';
  selectedMailError='';
  selectedMailLoading=true;
  replyText='';

  const formData=new FormData();
  formData.set('mailbox',message.emailAddress);
  formData.set('folderId',message.folderId);
  formData.set('messageId',message.messageId);

  try{
   const response=await fetch('?/readEmail',{
    method:'POST',
    body:formData
   });

   const result=await response.json();

   if(!response.ok||result?.type==='failure'){
    selectedMailError=
     result?.data?.readEmailError ??
     'The email could not be opened.';
    return;
   }

   selectedMailContent=
    result?.data?.readEmailContent ??
    '';
  }catch{
   selectedMailError='The email could not be opened.';
  }finally{
   selectedMailLoading=false;
  }
 }

 async function sendZohoReply(){
  if(!selectedZohoMail||!replyText.trim())return;

  replySending=true;

  const formData=new FormData();
  formData.set('from',selectedZohoMail.emailAddress);
  formData.set('to',selectedZohoMail.fromAddress);
  formData.set(
   'subject',
   selectedZohoMail.subject.toLowerCase().startsWith('re:')
    ?selectedZohoMail.subject
    :`Re: ${selectedZohoMail.subject}`
  );
  formData.set('message',replyText.trim());

  try{
   const response=await fetch('?/sendEmail',{
    method:'POST',
    body:formData
   });

   const result=await response.json();

   if(!response.ok||result?.type==='failure'){
    store.notify(
     result?.data?.emailError ??
     'Reply could not be sent.'
    );
    return;
   }

   replyText='';
   store.notify(`Reply sent from ${selectedZohoMail.emailAddress}`);
  }catch{
   store.notify('Reply could not be sent.');
  }finally{
   replySending=false;
  }
 }
 async function saveModal(){
	if(modal==='email'){
		emailSending=true;

		const formData=new FormData();
		formData.set('from',formFromEmail);
		formData.set('to',formEmail);
		formData.set('subject',formTitle);
		formData.set('message',formDescription);

		try{
			const response=await fetch('?/sendEmail',{
				method:'POST',
				body:formData
			});

			const result=await response.json();

			if(!response.ok||result?.type==='failure'){
				store.notify(result?.data?.emailError??'Email could not be sent.');
				return;
			}

			store.notify(`Email sent from ${formFromEmail}`);
			modal='';
			formTitle='';
			formEmail='';
			formDescription='';
		}catch{
			store.notify('Email could not be sent.');
		}finally{
			emailSending=false;
		}

		return;
	}

	if(modal==='task'&&formTitle){
		store.addTask(formTitle,selectedProject);
	}else if(modal==='client'&&formName){
		store.addClient({
			name:formName,
			type:'Company',
			email:formEmail,
			phone:formPhone,
			address:'',
			notes:formDescription
		});
	}else{
		store.notify('Record saved in demo workspace');
	}

	modal='';
	formTitle='';
	formName='';
	formEmail='';
	formPhone='';
	formDescription='';
}
 function openQuickAdd(type:AdminRecordType|null=null){quickAddType=type;quickAddOpen=true;}
 function closeQuickAdd(){quickAddOpen=false;quickAddType=null;}
 function clientRecordFromApi(record:{
  id:string;
  name:string;
  address:string;
  city:string;
  state:string;
  zip:string;
  notes:string;
  primaryContactName:string;
  primaryContactPhone:string;
  primaryContactEmail:string;
  secondaryContactName:string;
  secondaryContactPhone:string;
  secondaryContactEmail:string;
  tertiaryContactName:string;
  tertiaryContactPhone:string;
  tertiaryContactEmail:string;
 }):Client{
  const contacts:Client['contacts']=[];

  if(record.primaryContactName||record.primaryContactPhone||record.primaryContactEmail){
   contacts.push({
    id:`${record.id}-primary`,
    name:record.primaryContactName,
    role:'Primary Contact',
    email:record.primaryContactEmail,
    phone:record.primaryContactPhone,
    preferred:'Email',
    primary:true
   });
  }

  if(record.secondaryContactName||record.secondaryContactPhone||record.secondaryContactEmail){
   contacts.push({
    id:`${record.id}-secondary`,
    name:record.secondaryContactName,
    role:'Secondary Contact',
    email:record.secondaryContactEmail,
    phone:record.secondaryContactPhone,
    preferred:'Email'
   });
  }

  if(record.tertiaryContactName||record.tertiaryContactPhone||record.tertiaryContactEmail){
   contacts.push({
    id:`${record.id}-tertiary`,
    name:record.tertiaryContactName,
    role:'Tertiary Contact',
    email:record.tertiaryContactEmail,
    phone:record.tertiaryContactPhone,
    preferred:'Email'
   });
  }

  return {
   id:record.id,
   name:record.name,
   type:'Company',
   email:record.primaryContactEmail,
   phone:record.primaryContactPhone,
   address:[record.address,record.city,record.state,record.zip].filter(Boolean).join(', '),
   notes:record.notes,
   contacts,
   projectIds:[]
  };
 }


 function formatDateShort(value:string){
  if(!value)return '';
  const date=new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(date);
 }

 function formatTime(value:string){
  if(!value)return '';
  const [hour,minute]=value.split(':').map(Number);
  const date=new Date();
  date.setHours(hour,minute,0,0);
  return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(date);
 }

 function projectStatus(value:string):ProjectStatus{
  if(value==='active')return 'Active';
  if(value==='completed')return 'Completed';
  if(value==='canceled')return 'Cancelled';
  return 'Pending';
 }

 function projectRecordFromApi(record:any){
  return {
   id:record.id,
   name:record.name,
   clientId:record.clientId||'',
   address:[record.address,record.city,record.state,record.zip].filter(Boolean).join(', '),
   status:projectStatus(record.status),
   phase:record.phase||'New',
   summary:record.description||record.notes||'',
   nextMilestone:record.targetCompletionDate?`Target ${formatDateShort(record.targetCompletionDate)}`:'Not set',
   lastActivity:'Just now',
   budget:Number(record.budget||0),
   invoiced:0,
   costs:0
  };
 }

 function taskRecordFromApi(record:any){
  return {
   id:record.id,
   title:record.title,
   projectId:record.projectId||undefined,
   clientId:record.clientId||undefined,
   due:formatDateShort(record.dueDate),
   priority:record.priority==='urgent'?'Urgent':record.priority==='high'?'High':record.priority==='low'?'Low':'Medium',
   status:record.status==='completed'?'Done':record.status==='pending'?'Waiting':'Open',
   assignee:record.assignedTo||'Unassigned'
  };
 }

 function eventRecordFromApi(record:any){
  return {
   id:record.id,
   title:record.title,
   date:formatDateShort(record.startDate),
   time:formatTime(record.startTime),
   type:record.eventType||'Event',
   projectId:record.projectId||undefined,
   clientId:record.clientId||undefined,
   shared:Boolean(record.clientVisible)
  };
 }

 async function saveQuickAdd(type:AdminRecordType,data:unknown){
  try{
   if(type==='client'){
    const response=await fetch('/admin/api/clients',{
     method:'POST',
     headers:{'content-type':'application/json'},
     body:JSON.stringify(data as ClientFormData)
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Unable to save client.');
    store.addPersistedClient(clientRecordFromApi(result.client));
    store.notify('Client saved');
    closeQuickAdd();
    return;
   }

   if(type==='project'){
    const response=await fetch('/admin/api/projects',{
     method:'POST',
     headers:{'content-type':'application/json'},
     body:JSON.stringify(data as ProjectFormData)
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Unable to save project.');
    store.addPersistedProject(projectRecordFromApi(result.project));
    store.notify('Project saved');
    closeQuickAdd();
    return;
   }

   if(type==='task'){
    const response=await fetch('/admin/api/tasks',{
     method:'POST',
     headers:{'content-type':'application/json'},
     body:JSON.stringify(data as TaskFormData)
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Unable to save task.');
    store.addPersistedTask(taskRecordFromApi(result.task));
    store.notify('Task saved');
    closeQuickAdd();
    return;
   }

   if(type==='event'){
    const response=await fetch('/admin/api/events',{
     method:'POST',
     headers:{'content-type':'application/json'},
     body:JSON.stringify(data as EventFormData)
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Unable to save calendar event.');
    store.addPersistedEvent(eventRecordFromApi(result.event));
    store.notify('Calendar event saved');
    closeQuickAdd();
    return;
   }

   store.notify(`${type.charAt(0).toUpperCase()+type.slice(1)} form is ready; Supabase save is the next step.`);
   closeQuickAdd();
  }catch(error){
   store.notify(error instanceof Error?error.message:'Unable to save record');
  }
 }
 onMount(()=>{
  store.loadPersistedClients(data.clients.map(clientRecordFromApi));
  store.loadPersistedProjects(data.projects.map(projectRecordFromApi));
  store.loadPersistedTasks(data.tasks.map(taskRecordFromApi));
  store.loadPersistedEvents(data.events.map(eventRecordFromApi));

  const dateTimer=window.setInterval(()=>{
   currentDate=new Date();
  },60000);

  if('serviceWorker' in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{});

  return ()=>{
   window.clearInterval(dateTimer);
  };
 });
</script>

<svelte:head><title>Action Center · Dogwood Admin</title><meta name="theme-color" content="#18263f"/><link rel="manifest" href="/manifest.webmanifest"/><meta name="apple-mobile-web-app-capable" content="yes"/></svelte:head>

<div class="app">
 <aside class="sidebar">
  <a class="brand" href="/admin"><img src="/images/dogwood-land-dev-logo-main.png" alt="Dogwood"/><span>ADMIN PORTAL</span></a>
  <nav>{#each nav as n}<button class:active={view===n[0]||(n[0]==='projects'&&view==='project')||(n[0]==='clients'&&view==='client')} onclick={()=>go(n[0])}><i>{n[2]}</i>{n[1]}{#if n[0]==='inbox'&&zohoMail.length}<b>{zohoMail.length}</b>{/if}</button>{/each}</nav>
  <div class="profile"><div class="avatar">BW</div><div><strong>Branch Williams</strong><span>Super User</span></div><button>•••</button></div>
 </aside>

 <main class="main">
  <header class="topbar"><div class="mobile-brand">Dogwood <span>Admin</span></div><button class="search" onclick={()=>searchOpen=true}>⌕ <span>Search clients, projects, email…</span><kbd>⌘ K</kbd></button><div class="top-actions"><button onclick={()=>store.notify('No new urgent notifications')}>♢<em>3</em></button><button class="quick" onclick={()=>openQuickAdd()}>＋ <span>Quick add</span></button></div></header>
  <div class="content">
   {#if view==='home'}
    <div class="page-heading"><div><p class="eyebrow">{todayHeading}</p><h1>Good morning, Branch.</h1><p>Here’s what needs your attention right now.</p></div><button class="primary" onclick={()=>openQuickAdd()}>＋ Add something</button></div>
    <section class="priority"><div><span class="pulse"></span><strong>Start here</strong><small>Highest priority</small></div><h2>County reviewer requested revised drainage notes</h2><p>Pine Haven Subdivision · Response received 18 minutes ago</p><div class="button-row"><button class="primary" onclick={()=>{selectedMail='m1';go('inbox')}}>Review email →</button><button onclick={()=>openProject('p1')}>Open project</button></div></section>
    <section class="today-calendar">
     <div class="today-calendar-head">
      <div>
       <p class="eyebrow">TODAY'S CALENDAR</p>
       <h2>{todayFull}</h2>
      </div>
      <button type="button" onclick={()=>go('calendar')}>View calendar →</button>
     </div>

     {#if todayEvents.length}
      <div class="today-event-list">
       {#each todayEvents as event}
        <button
         type="button"
         class="today-event"
         onclick={()=>{
          if(event.projectId)openProject(event.projectId);
          else go('calendar');
         }}
        >
         <div class="today-event-time">
          <strong>{event.time || 'All day'}</strong>
          <span>{event.type}</span>
         </div>

         <div class="today-event-copy">
          <h3>{event.title}</h3>
          <p>
           {store.projects.find(p=>p.id===event.projectId)?.name
            || store.clients.find(c=>c.id===event.clientId)?.name
            || 'Dogwood Land Development'}
          </p>
         </div>

         <span class="today-event-arrow">→</span>
        </button>
       {/each}
      </div>
     {:else}
      <div class="today-calendar-empty">
       <div class="calendar-empty-icon">□</div>
       <div>
        <strong>No calendar events today — {todayFull}.</strong>
        <p>New events added for today will appear here automatically.</p>
       </div>
       <button type="button" onclick={()=>openQuickAdd('event')}>＋ Add event</button>
      </div>
     {/if}
    </section>

    <div class="section-head"><div><h2>Action queue</h2><p>{store.actions.filter(a=>a.state!=='Done').length} open items · 1 overdue</p></div><div class="segmented">{#each ['All','New','Needs Action','Waiting'] as f}<button class:active={actionFilter===f} onclick={()=>actionFilter=f}>{f}</button>{/each}</div></div>
    <div class="action-list">{#each filteredActions as a}<article class:overdue={a.due.includes('Overdue')}><div class="action-icon">{a.source==='Accounting'?'$':a.source==='Calendar'?'□':a.source==='Website inquiry'?'＋':'✉'}</div><div class="action-copy"><div class="tags"><span class:urgent={a.priority==='High'}>{a.priority}</span><span>{a.state}</span></div><h3>{a.title}</h3><p>{a.detail}</p><div class="meta"><span>{a.due}</span>{#if a.projectId}<button onclick={()=>openProject(a.projectId!)}>{store.projects.find(p=>p.id===a.projectId)?.name}</button>{/if}<span>{a.age}</span></div></div><div class="action-controls"><button class="small-primary" onclick={()=>a.projectId?openProject(a.projectId):openClient(a.clientId!)}>Open</button><select value={a.state} onchange={(e)=>store.setAction(a.id,e.currentTarget.value as ActionState)}><option>New</option><option>Needs Action</option><option>Waiting</option><option>Done</option></select></div></article>{/each}</div>
   {:else if view==='clients'}
    <div class="page-heading"><div><p class="eyebrow">RELATIONSHIPS</p><h1>Clients</h1><p>Contacts, projects, communication, and financial history.</p></div><button class="primary" onclick={()=>openQuickAdd('client')}>＋ Add client</button></div>
    <div class="toolbar"><label>⌕ <input placeholder="Search clients…"/></label><button>All clients</button><button>Active projects</button></div>
    <div class="cards">{#each store.clients as c}<button class="client-card" onclick={()=>openClient(c.id)}><div class="card-top"><div class="monogram">{c.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><span>{c.type}</span></div><h3>{c.name}</h3><p>{c.contacts[0]?.name} · {c.contacts[0]?.role}</p><dl><div><dt>Projects</dt><dd>{c.projectIds.length}</dd></div><div><dt>Open actions</dt><dd>{store.actions.filter(a=>a.clientId===c.id&&a.state!=='Done').length}</dd></div></dl><footer><span>{c.email}</span><b>View →</b></footer></button>{/each}</div>
   {:else if view==='client' && client}
    <button class="back" onclick={()=>go('clients')}>← All clients</button><div class="record-hero"><div class="monogram large">{client.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><span class="status">{client.type}</span><h1>{client.name}</h1><p>{client.address}</p></div><div class="hero-actions"><button onclick={()=>modal='email'}>✉ Email</button><button class="primary" onclick={()=>modal='editclient'}>Edit client</button></div></div>
    <div class="record-grid"><section class="panel span2"><div class="panel-head"><h2>Projects</h2><button onclick={()=>openQuickAdd('project')}>＋ Create project</button></div>{#if client.projectIds.length}{#each store.projects.filter(p=>p.clientId===client.id) as p}<button class="project-row" onclick={()=>openProject(p.id)}><div><span class="status {p.status.toLowerCase()}">{p.status}</span><h3>{p.name}</h3><p>{p.phase} · {p.address}</p></div><div><strong>{p.nextMilestone}</strong><span>Next milestone</span></div><b>→</b></button>{/each}{:else}<div class="empty"><strong>New inquiry</strong><p>No project created yet. Preserve this information when converting.</p><button class="primary" onclick={()=>openQuickAdd('project')}>Convert to client & create project</button></div>{/if}</section><section class="panel"><div class="panel-head"><h2>Contacts</h2><button>＋ Add</button></div>{#each client.contacts as c}<div class="contact"><div class="avatar">{c.name.split(' ').map(x=>x[0]).join('')}</div><div><strong>{c.name}{#if c.primary}<span class="primary-tag">Primary</span>{/if}</strong><span>{c.role}</span><a href={`mailto:${c.email}`}>{c.email}</a><span>{c.phone} · Prefers {c.preferred}</span></div></div>{/each}</section><section class="panel"><h2>Client details</h2><div class="detail-list"><div><span>Email</span><strong>{client.email}</strong></div><div><span>Phone</span><strong>{client.phone}</strong></div><div><span>Notes</span><p>{client.notes}</p></div></div></section></div>
   {:else if view==='projects'}
    <div class="page-heading"><div><p class="eyebrow">WORK</p><h1>Projects</h1><p>Every active job, its next milestone, and what’s blocking progress.</p></div><button class="primary" onclick={()=>openQuickAdd('project')}>＋ Create project</button></div><div class="summary-strip"><div><strong>{store.projects.filter(p=>p.status==='Active').length}</strong><span>Active</span></div><div><strong>{store.projects.filter(p=>p.status==='Pending').length}</strong><span>Pending</span></div><div><strong>1</strong><span>Needs attention</span></div><div><strong>{money(store.projects.reduce((s,p)=>s+p.budget,0))}</strong><span>Total project value</span></div></div>
    <div class="project-list">{#each store.projects as p}<button onclick={()=>openProject(p.id)}><div><span class="status {p.status.toLowerCase()}">{p.status}</span><small>{p.phase}</small><h3>{p.name}</h3><p>{store.clients.find(c=>c.id===p.clientId)?.name} · {p.address}</p></div><div class="project-metrics"><span>Next milestone<strong>{p.nextMilestone}</strong></span><span>Last activity<strong>{p.lastActivity}</strong></span><span>Open actions<strong>{store.actions.filter(a=>a.projectId===p.id&&a.state!=='Done').length}</strong></span></div><b>→</b></button>{/each}</div>
   {:else if view==='project' && project}
    <button class="back" onclick={()=>go('projects')}>← All projects</button><div class="project-hero"><div><div class="tags"><span class="status {project.status.toLowerCase()}">{project.status}</span><span>{project.phase}</span></div><h1>{project.name}</h1><button class="link" onclick={()=>openClient(project.clientId)}>{store.clients.find(c=>c.id===project.clientId)?.name}</button><p>{project.address}</p></div><div class="hero-actions"><button onclick={()=>openQuickAdd('task')}>＋ Task</button><button class="primary" onclick={()=>modal='editproject'}>Edit project</button></div></div>
    <div class="project-status"><div><span>WAITING ON</span><strong>{project.waitingOn||'Nothing — work may proceed'}</strong></div><div><span>NEXT MILESTONE</span><strong>{project.nextMilestone}</strong></div><div><span>LAST ACTIVITY</span><strong>{project.lastActivity}</strong></div></div>
    <div class="tabs"><button class="active">Overview</button><button>Actions</button><button>Timeline</button><button>Parcels</button><button>Permits</button><button>Team</button><button>Documents</button><button>Financials</button></div>
    <div class="record-grid"><section class="panel span2"><div class="panel-head"><h2>Open actions</h2><button onclick={()=>openQuickAdd('task')}>＋ Add action</button></div>{#each store.actions.filter(a=>a.projectId===project.id&&a.state!=='Done') as a}<div class="mini-action"><span class:urgent={a.priority==='High'}></span><div><strong>{a.title}</strong><p>{a.due} · {a.state}</p></div><select value={a.state} onchange={(e)=>store.setAction(a.id,e.currentTarget.value as ActionState)}><option>New</option><option>Needs Action</option><option>Waiting</option><option>Done</option></select></div>{/each}</section><section class="panel"><h2>Project summary</h2><p>{project.summary}</p><div class="detail-list"><div><span>Project value</span><strong>{money(project.budget)}</strong></div><div><span>Invoiced</span><strong>{money(project.invoiced)}</strong></div><div><span>Costs to date</span><strong>{money(project.costs)}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Recent activity</h2><button>View all</button></div><div class="timeline"><div><i></i><strong>Email received</strong><span>County review comments · Today</span></div><div><i></i><strong>Document uploaded</strong><span>60% site plan · Aug 18</span></div><div><i></i><strong>Permit resubmitted</strong><span>County TRC · Aug 14</span></div></div></section></div>
   {:else if view==='inbox'}
    <div class="page-heading compact">
     <div>
      <p class="eyebrow">COMMUNICATIONS</p>
      <h1>Inbox</h1>
      <p>Live Zoho mail across all four Dogwood mailboxes.</p>
     </div>
     <button class="primary" onclick={()=>modal='email'}>✎ Compose</button>
    </div>

    <div class="mailboxes">
     {#each ['All','Branch','Office','Accounting','Permitting'] as box}
      <button
       class:active={mailbox===box}
       onclick={()=>{
        mailbox=box;
        selectedMail='';
        selectedMailContent='';
        selectedMailError='';
        replyText='';
       }}
      >
       <span>{box}</span>
       <b>
        {box==='All'
         ?zohoMail.length
         :zohoMail.filter(message=>message.mailbox===box).length}
       </b>
      </button>
     {/each}
    </div>

    <div class="inbox">
     <div class="threads">
      <label>
       ⌕
       <input
        bind:value={mailSearch}
        placeholder="Search this mailbox…"
       />
      </label>

      {#if visibleZohoMail.length}
       {#each visibleZohoMail as m}
        <button
         class:active={selectedMail===m.key}
         onclick={()=>openZohoMessage(m)}
        >
         <div>
          <strong>{m.sender}</strong>
          <time>{formatZohoReceived(m.receivedTime)}</time>
         </div>

         <h3>{m.subject}</h3>

         <p>{m.summary||m.fromAddress}</p>

         <span>{m.mailbox}</span>
        </button>
       {/each}
      {:else}
       <div class="mail-list-empty">
        <strong>No messages found</strong>
        <p>
         {mailSearch
          ?'Try a different search.'
          :'Zoho returned no messages for this mailbox.'}
        </p>
       </div>
      {/if}
     </div>

     {#if selectedZohoMail}
      <section class="message">
       <header>
        <div>
         <span class="status">{selectedZohoMail.mailbox}</span>
         <h2>{selectedZohoMail.subject}</h2>
         <p>
          From {selectedZohoMail.sender}
          &lt;{selectedZohoMail.fromAddress}&gt;
         </p>
         <p>
          {formatZohoReceived(selectedZohoMail.receivedTime)}
          {#if selectedZohoMail.hasAttachment}
           · Has attachment
          {/if}
         </p>
        </div>
       </header>

       {#if selectedMailLoading}
        <div class="mail-reader-state">
         <strong>Opening email…</strong>
        </div>
       {:else if selectedMailError}
        <div class="mail-reader-state error">
         <strong>{selectedMailError}</strong>
         <button onclick={()=>openZohoMessage(selectedZohoMail)}>
          Try again
         </button>
        </div>
       {:else}
        <div class="real-mail-body">
         <iframe
          title={`Email: ${selectedZohoMail.subject}`}
          sandbox=""
          srcdoc={selectedMailDocument}
         ></iframe>
        </div>

        <div class="reply">
         <textarea
          bind:value={replyText}
          placeholder={`Reply from ${selectedZohoMail.emailAddress}…`}
         ></textarea>

         <div>
          <span class="reply-from">
           Replying from {selectedZohoMail.mailbox}
          </span>

          <button
           class="primary"
           disabled={replySending||!replyText.trim()}
           onclick={sendZohoReply}
          >
           {replySending?'Sending…':'Send reply'}
          </button>
         </div>
        </div>
       {/if}
      </section>
     {:else}
      <section class="message mail-empty-reader">
       <div>
        <span class="mail-empty-icon">✉</span>
        <h2>Select an email</h2>
        <p>Choose a message from the left to read it here.</p>
       </div>
      </section>
     {/if}
    </div>
   {:else if view==='tasks'}
    <ModuleHeading eyebrow="WORK QUEUE" title="Tasks" description="Simple, linked work items across clients and projects." action="Create task" onclick={()=>openQuickAdd('task')}/><div class="data-list"><div class="data-head"><span>Task</span><span>Related to</span><span>Due</span><span>Priority</span><span>Status</span></div>{#each store.tasks as t}<div><strong>{t.title}</strong><button onclick={()=>t.projectId&&openProject(t.projectId)}>{store.projects.find(p=>p.id===t.projectId)?.name||'General'}</button><span>{t.due}</span><span class:danger={t.priority==='High'}>{t.priority}</span><select bind:value={t.status}><option>Open</option><option>In progress</option><option>Waiting</option><option>Done</option></select></div>{/each}</div>
   {:else if view==='documents'}
    <ModuleHeading eyebrow="FILES" title="Documents" description="Private by default. Share only what the client should see." action="Upload document" onclick={()=>openQuickAdd('document')}/><div class="toolbar"><label>⌕ <input placeholder="Search documents…"/></label><button>All categories</button><button>All projects</button></div><div class="document-grid">{#each store.documents as d}<article><div class="file-icon">PDF</div><div><h3>{d.name}</h3><p>{d.category} · {d.size} · {d.updated}</p><button onclick={()=>d.projectId&&openProject(d.projectId)}>{store.projects.find(p=>p.id===d.projectId)?.name}</button></div><label class="share"><input type="checkbox" checked={d.shared} onchange={()=>store.toggleDocument(d.id)}/><span></span>Share with client</label><button class="dots">•••</button></article>{/each}</div>
   {:else if view==='calendar'}
    <ModuleHeading eyebrow="SCHEDULE" title="Calendar" description="Deadlines, meetings, inspections, and follow-ups in one place." action="New event" onclick={()=>openQuickAdd('event')}/><div class="calendar-layout"><section class="month"><header><button>←</button><h2>August 2026</h2><button>→</button></header><div class="weekdays">{#each ['SUN','MON','TUE','WED','THU','FRI','SAT'] as d}<span>{d}</span>{/each}</div><div class="days">{#each Array(35) as _,i}<button class:today={i===26} class:has-event={[26,27,31,33].includes(i)}>{i<5?'':i-4}{#if [26,27,31,33].includes(i)}<i></i>{/if}</button>{/each}</div></section><section class="agenda"><h2>Upcoming</h2>{#each store.events as e}<article><div><strong>{e.date.split(' ')[1]}</strong><span>{e.date.split(' ')[0]}</span></div><section><span>{e.type} · {e.time}</span><h3>{e.title}</h3><p>{store.projects.find(p=>p.id===e.projectId)?.name||store.clients.find(c=>c.id===e.clientId)?.name}</p><label class="share"><input type="checkbox" checked={e.shared} onchange={()=>store.toggleEvent(e.id)}/><span></span>Shared</label></section></article>{/each}</section></div>
   {:else if view==='accounting'}
    <ModuleHeading eyebrow="FINANCE" title="Accounting" description="Billing, payments, expenses, and project profitability." action="Create invoice" onclick={()=>openQuickAdd('invoice')}/><div class="finance-cards"><div><span>Outstanding</span><strong>{money(store.invoices.reduce((s,i)=>s+i.amount-i.paid,0))}</strong><small>1 invoice due soon</small></div><div><span>Revenue this month</span><strong>$52,600</strong><small>↑ 8.2% from July</small></div><div><span>Project costs</span><strong>{money(store.expenses.reduce((s,x)=>s+x.amount,0))}</strong><small>Across 2 active projects</small></div><div><span>Net margin</span><strong>63.4%</strong><small>Year to date</small></div></div><div class="section-head"><div><h2>Invoices</h2><p>Current billing and balances</p></div><button onclick={()=>openQuickAdd('estimate')}>＋ New estimate</button></div><div class="data-list invoices"><div class="data-head"><span>Invoice</span><span>Client / project</span><span>Due</span><span>Amount</span><span>Status</span></div>{#each store.invoices as i}<div><strong>{i.id}</strong><span>{store.clients.find(c=>c.id===i.clientId)?.name}<small>{store.projects.find(p=>p.id===i.projectId)?.name}</small></span><span>{i.due}</span><strong>{money(i.amount)}</strong><span class="status {i.status.toLowerCase()}">{i.status}</span></div>{/each}</div><div class="accounting-bottom"><section class="panel"><div class="panel-head"><h2>Estimates</h2><button>View all</button></div>{#each store.estimates as e}<div class="estimate"><div><strong>{e.id}</strong><span>{e.title}</span></div><strong>{money(e.amount)}</strong><span class="status">{e.status}</span>{#if e.status==='Draft'}<button class="primary" onclick={()=>store.notify('Project created from estimate; original preserved')}>Create project</button>{/if}</div>{/each}</section><section class="panel"><div class="panel-head"><h2>Recent expenses</h2><button onclick={()=>openQuickAdd('expense')}>＋ Record</button></div>{#each store.expenses as x}<div class="expense"><div><strong>{x.description}</strong><span>{store.vendors.find(v=>v.id===x.vendorId)?.name} · {x.date}</span></div><strong>-{money(x.amount)}</strong></div>{/each}</section></div>
   {:else if view==='vendors'}
    <ModuleHeading eyebrow="PARTNERS" title="Vendors" description="Outside partners, project costs, and payment history." action="Add vendor" onclick={()=>modal='vendor'}/><div class="cards">{#each store.vendors as v}<article class="vendor-card"><div class="monogram">{v.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><span class="status">{v.category}</span><h3>{v.name}</h3><p>{v.contact} · {v.email}</p><dl><div><dt>Total spend</dt><dd>{money(v.spend)}</dd></div><div><dt>Projects</dt><dd>{v.projectIds.length}</dd></div></dl><button>View vendor →</button></article>{/each}</div>
   {:else if view==='reports'}
    <ModuleHeading eyebrow="INSIGHTS" title="Reports" description="Operational clarity and financial performance without the noise." action="Schedule report" onclick={()=>modal='schedule'}/><div class="report-grid"><section class="panel span2"><div class="panel-head"><div><h2>Project pipeline</h2><p>Current work by phase</p></div><button>Last 12 months</button></div><div class="bars">{#each [['Due diligence',1,28],['Engineering / Design',1,45],['Permitting',1,72],['Construction',0,8],['Closeout',1,100]] as b}<div><span>{b[0]}</span><i><em style={`width:${b[2]}%`}></em></i><strong>{b[1]}</strong></div>{/each}</div></section><section class="panel"><h2>Attention report</h2><div class="big-stat">6<span>open actions</span></div><div class="detail-list"><div><span>Overdue</span><strong class="danger">1</strong></div><div><span>Waiting</span><strong>1</strong></div><div><span>Aging inquiries</span><strong>1</strong></div></div></section><section class="panel"><h2>Profitability</h2><div class="big-stat">63.4%<span>net project margin</span></div><div class="detail-list"><div><span>Revenue</span><strong>$323,500</strong></div><div><span>Project costs</span><strong>$116,960</strong></div></div></section><section class="panel span2"><div class="panel-head"><h2>Report library</h2><button>Configure</button></div><div class="report-links">{#each ['Active projects','Waiting items','Project profitability','Outstanding balances','Vendor spending','Client activity'] as r}<button><span>⌁</span>{r}<b>→</b></button>{/each}</div></section></div>
   {:else if view==='settings'}
    <ModuleHeading eyebrow="ADMINISTRATION" title="Settings" description="People, permissions, notification preferences, and portal configuration." action="Invite user" onclick={()=>modal='user'}/><div class="settings-grid"><nav><button class="active">Users & permissions</button><button>Notifications</button><button>Project phases</button><button>Mailboxes</button><button>Organization</button><button>PWA & devices</button></nav><section class="panel"><div class="panel-head"><div><h2>Users & permissions</h2><p>Role defaults plus individual overrides.</p></div></div>{#each store.users as u}<div class="user-row"><div class="avatar">{u.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><strong>{u.name}</strong><span>{u.email}</span></div><select bind:value={u.role}><option>Super User</option><option>Admin</option><option>Accounting</option><option>User</option><option>Client</option></select><span class="status">{u.status}</span><button onclick={()=>store.notify(`Permission editor opened for ${u.name}`)}>Permissions</button></div>{/each}<div class="permission-note"><strong>Security model</strong><p>These controls demonstrate frontend behavior only. Production enforcement and Client Portal isolation will be added with the backend.</p></div></section></div>
   {/if}
  </div>
 </main>

 <nav class="bottom-nav">{#each [['home','⌂','Home'],['inbox','✉','Inbox'],['projects','◇','Projects'],['clients','♙','Clients']] as n}<button class:active={view===n[0]} onclick={()=>go(n[0])}><i>{n[1]}</i><span>{n[2]}</span>{#if n[0]==='inbox'}<b>{store.mail.filter(m=>m.unread).length}</b>{/if}</button>{/each}<button class:active={moreOpen} onclick={()=>moreOpen=!moreOpen}><i>•••</i><span>More</span></button></nav>
 <button class="fab" onclick={()=>openQuickAdd()}>＋</button>
 {#if moreOpen}<div class="more-menu">{#each nav.slice(4) as n}<button onclick={()=>go(n[0])}><i>{n[2]}</i>{n[1]}</button>{/each}</div>{/if}
</div>

{#if searchOpen}<div class="overlay" role="button" tabindex="0" aria-label="Close search" onclick={(e)=>{if(e.target===e.currentTarget)searchOpen=false}} onkeydown={(e)=>{if(e.key==='Escape')searchOpen=false}}><div class="search-modal"><label>⌕ <input bind:value={query} placeholder="Search everything…"/><kbd>ESC</kbd></label>{#if !query}<div class="search-empty"><strong>Search your business</strong><p>Clients, projects, parcels, email, documents, invoices, vendors, and notes.</p><span>Recent: Pine Haven · DLD-1048 · Claire Bennett</span></div>{:else}<div class="results">{#each searchResults as r}<button onclick={()=>chooseResult(r)}><span>{r.type}</span><div><strong>{r.title}</strong><small>{r.sub}</small></div><b>→</b></button>{/each}{#if !searchResults.length}<p>No accessible records found.</p>{/if}</div>{/if}</div></div>{/if}

<QuickAddModal
 open={quickAddOpen}
 initialType={quickAddType}
 clients={store.clients.map(c=>({id:c.id,name:c.name}))}
 projects={store.projects.map(p=>({id:p.id,name:p.name,clientId:p.clientId}))}
 users={store.users.map(u=>({id:u.id,name:u.name}))}
 vendors={store.vendors.map(v=>({id:v.id,name:v.name}))}
 onclose={closeQuickAdd}
 onsave={saveQuickAdd}
/>

{#if modal}<div class="overlay" onclick={()=>modal=''}><form class="modal" onsubmit={(e)=>{e.preventDefault();saveModal()}} onclick={(e)=>e.stopPropagation()}><button type="button" class="close" onclick={()=>modal=''}>×</button><p class="eyebrow">QUICK ACTION</p><h2>{modal==='quick'?'What would you like to add?':modal==='task'?'Create task':modal==='client'?'Add client':modal==='email'?'Compose email':modal==='upload'?'Upload document':modal==='event'?'New calendar event':modal==='editproject'?'Edit project':`Add ${modal}`}</h2>{#if modal==='quick'}<div class="quick-grid">{#each [['client','♙','Add Client'],['project','◇','Create Project'],['email','✉','Send Email'],['upload','▱','Upload Document'],['task','✓','Create Task'],['note','✎','Add Note']] as q}<button type="button" onclick={()=>modal=q[0]}><i>{q[1]}</i>{q[2]}</button>{/each}</div>{:else if modal==='editproject' && project}<label>Status<select value={project.status} onchange={(e)=>store.updateProject(project.id,e.currentTarget.value as ProjectStatus,project.phase)}><option>Active</option><option>Pending</option><option>Completed</option><option>Cancelled</option></select></label><label>Phase<select value={project.phase} onchange={(e)=>store.updateProject(project.id,project.status,e.currentTarget.value)}>{#each ['Due Diligence','Entitlement','Engineering / Design','Permitting','Construction','Closeout'] as p}<option>{p}</option>{/each}</select></label><div class="suggestion"><strong>Phase-aware suggestion</strong><p>Moving to Permitting can suggest a permit package task, agency contact, and follow-up date. You’ll confirm before anything is created.</p></div><button class="primary" type="submit">Save project</button>{:else}<label>{modal==='client'?'Client or company name':modal==='email'?'Subject':'Title'}{#if modal==='client'}<input required bind:value={formName} placeholder="Client or company name"/>{:else}<input required bind:value={formTitle} placeholder={modal==='email'?'Email subject':modal==='task'?'What needs to be done?':'Enter details'}/>{/if}</label>{#if modal==='email'}
<label>From
	<select bind:value={formFromEmail}>
		<option value="branch@dogwoodlanddev.com">Branch — branch@dogwoodlanddev.com</option>
		<option value="office@dogwoodlanddev.com">Office — office@dogwoodlanddev.com</option>
		<option value="accounting@dogwoodlanddev.com">Accounting — accounting@dogwoodlanddev.com</option>
		<option value="permitting@dogwoodlanddev.com">Permitting — permitting@dogwoodlanddev.com</option>
	</select>
</label>
<label>To
	<input type="email" required bind:value={formEmail} placeholder="name@example.com"/>
</label>
{:else if modal==='client'}
<label>Email
	<input type="email" bind:value={formEmail} placeholder="name@example.com"/>
</label>
{/if}{#if modal==='client'}<label>Phone<input bind:value={formPhone} placeholder="(910) 555-0000"/></label>{/if}<label>{modal==='email'?'Message':'Details'}<textarea bind:value={formDescription} rows="4" placeholder={modal==='email'?'Write your message…':'Add context or notes…'}></textarea></label>{#if modal==='upload'}<label class="upload-zone">⇧<strong>Choose a file</strong><span>PDF, documents, plans, photos, or spreadsheets</span><input type="file"/></label><label>Share setting<select><option>Private (recommended)</option><option>Share with client</option></select></label>{/if}<button class="primary" type="submit" disabled={modal==='email'&&emailSending}>
	{modal==='email'?(emailSending?'Sending…':'Send email'):'Save'}
</button>{/if}</form></div>{/if}
{#if store.toast}<div class="toast">✓ {store.toast}</div>{/if}

<style>
 :global(*){box-sizing:border-box} :global(body){margin:0;background:#f4f5f2;color:#243044;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} :global(button),:global(input),:global(select),:global(textarea){font:inherit} :global(button){color:inherit} .app{min-height:100vh}.sidebar{position:fixed;inset:0 auto 0 0;width:244px;background:#17253d;color:#dfe5ea;padding:22px 14px 16px;display:flex;flex-direction:column;z-index:20}.brand{height:66px;padding:0 10px;display:flex;flex-direction:column;text-decoration:none;color:#a9b6a2;font-size:9px;letter-spacing:.19em}.brand img{width:178px;height:40px;object-fit:contain;object-position:left;filter:brightness(0) invert(1);opacity:.94}.sidebar nav{display:flex;flex-direction:column;gap:3px;margin-top:17px}.sidebar nav button{height:45px;border:0;background:transparent;border-radius:8px;color:#aeb8c4;display:flex;align-items:center;gap:13px;padding:0 13px;text-align:left;cursor:pointer}.sidebar nav button i{width:22px;font-style:normal;font-size:20px;text-align:center}.sidebar nav button:hover,.sidebar nav button.active{background:#263852;color:white}.sidebar nav button.active:before{content:"";position:absolute;left:14px;width:3px;height:23px;background:#91a785;border-radius:4px}.sidebar nav button b{margin-left:auto;background:#91a785;color:#152238;padding:2px 7px;border-radius:12px;font-size:11px}.profile{margin-top:auto;border-top:1px solid #314158;padding:16px 7px 0;display:flex;align-items:center;gap:10px}.avatar{width:37px;height:37px;border-radius:50%;background:#dbe3d8;color:#405940;display:grid;place-items:center;font-weight:800;font-size:12px;flex:none}.profile div:nth-child(2){display:flex;flex-direction:column;font-size:12px}.profile span{color:#8e9bad;font-size:10px;margin-top:2px}.profile button{border:0;background:0;color:#9eabba;margin-left:auto}.main{margin-left:244px;min-height:100vh}.topbar{height:70px;background:white;border-bottom:1px solid #e2e5e1;display:flex;align-items:center;padding:0 35px;position:sticky;top:0;z-index:10}.mobile-brand{display:none}.search{width:min(460px,50%);height:40px;border:1px solid #dce1dc;border-radius:8px;background:#f8f9f7;color:#929aa2;display:flex;align-items:center;gap:10px;padding:0 13px;text-align:left}.search span{flex:1}.search kbd{border:1px solid #d8ddd8;background:white;padding:2px 7px;border-radius:5px;font-size:10px}.top-actions{margin-left:auto;display:flex;gap:12px}.top-actions>button{height:40px;border:1px solid #dce1dc;border-radius:8px;background:white;padding:0 14px;position:relative}.top-actions em{position:absolute;right:-4px;top:-6px;background:#b55b4f;color:white;border-radius:10px;font-size:9px;font-style:normal;padding:2px 5px}.primary,.small-primary{border:0!important;background:#203552!important;color:white!important;border-radius:7px;padding:11px 17px;cursor:pointer;font-weight:700}.content{max-width:1440px;margin:auto;padding:34px 40px 70px}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;gap:20px}.page-heading.compact{align-items:center}.eyebrow{font-size:10px;font-weight:800;color:#718667;letter-spacing:.15em;margin:0 0 8px}.page-heading h1,.record-hero h1,.project-hero h1{font-family:Georgia,serif;font-size:35px;line-height:1.1;color:#1b2a44;margin:0 0 7px;font-weight:600}.page-heading p,.record-hero p,.project-hero p{margin:0;color:#747e86;font-size:14px}.priority{background:linear-gradient(115deg,#fff,#f4f7f1);border:1px solid #cad6c6;border-left:4px solid #738d69;border-radius:11px;padding:22px 24px;margin-bottom:32px;box-shadow:0 6px 24px #1c382a0a}.priority>div:first-child{display:flex;align-items:center;gap:8px;font-size:12px;color:#53674d}.priority small{color:#89938c}.pulse{width:8px;height:8px;border-radius:50%;background:#758e6c}.priority h2{font-size:20px;margin:13px 0 7px;color:#1e2d45}.priority p{color:#69747c;font-size:13px}.button-row{display:flex;gap:9px;margin-top:18px}.button-row button:not(.primary),.hero-actions button,.panel-head button,.section-head>button,.toolbar>button,.back{border:1px solid #d7ddd8;background:white;border-radius:7px;padding:9px 13px;cursor:pointer}.today-calendar{background:white;border:1px solid #e0e4df;border-radius:11px;padding:20px 22px;margin-bottom:30px}.today-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:14px}.today-calendar-head h2{margin:0;font-size:18px;color:#1f2e45}.today-calendar-head button{border:1px solid #d7ddd8;background:white;border-radius:7px;padding:8px 12px;cursor:pointer;font-size:11px}.today-event-list{display:flex;flex-direction:column}.today-event{width:100%;display:grid;grid-template-columns:120px 1fr 24px;align-items:center;gap:15px;border:0;border-top:1px solid #edf0ed;background:white;padding:14px 4px;text-align:left;cursor:pointer}.today-event:hover{background:#f8faf7}.today-event-time{display:flex;flex-direction:column;gap:4px}.today-event-time strong{font-size:13px;color:#203552}.today-event-time span{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#718667}.today-event-copy h3{margin:0 0 4px;font-size:14px;color:#263449}.today-event-copy p{margin:0;font-size:11px;color:#7b858b}.today-event-arrow{justify-self:end;color:#617a59;font-weight:bold}.today-calendar-empty{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:14px;border-top:1px solid #edf0ed;padding:20px 4px 5px}.calendar-empty-icon{width:38px;height:38px;border-radius:8px;background:#eff3ed;color:#5b7553;display:grid;place-items:center;font-weight:bold}.today-calendar-empty strong{font-size:13px;color:#263449}.today-calendar-empty p{margin:4px 0 0;font-size:11px;color:#7d878d}.today-calendar-empty>button{border:1px solid #d7ddd8;background:white;border-radius:7px;padding:9px 12px;cursor:pointer;font-size:11px}.section-head{display:flex;justify-content:space-between;align-items:end;margin:25px 0 14px}.section-head h2,.panel h2,.agenda h2{margin:0 0 4px;font-size:18px;color:#1f2e45}.section-head p,.panel-head p{margin:0;color:#879098;font-size:12px}.segmented{background:#e9ece8;padding:3px;border-radius:8px;display:flex}.segmented button{border:0;background:transparent;padding:7px 12px;border-radius:6px;font-size:11px}.segmented button.active{background:white;box-shadow:0 1px 5px #253d2420}.action-list{display:flex;flex-direction:column;gap:8px}.action-list article{display:grid;grid-template-columns:42px 1fr auto;gap:14px;background:white;border:1px solid #e0e4df;border-radius:9px;padding:17px}.action-list article.overdue{border-left:3px solid #b75950}.action-icon{width:38px;height:38px;background:#eff3ed;color:#5b7553;border-radius:8px;display:grid;place-items:center;font-weight:bold}.tags{display:flex;gap:6px;align-items:center}.tags span,.status{font-size:9px;text-transform:uppercase;letter-spacing:.08em;background:#edf1ed;color:#536553;padding:4px 7px;border-radius:12px;font-weight:800}.tags .urgent{background:#f7eae7;color:#9d4942}.action-copy h3{margin:7px 0 5px;font-size:14px}.action-copy p{margin:0;color:#747e85;font-size:12px}.meta{display:flex;gap:14px;margin-top:9px;font-size:10px;color:#949ba0}.meta button,.link{border:0;background:0;color:#58724f;padding:0;cursor:pointer}.action-controls{display:flex;align-items:center;gap:7px}.action-controls select,.mini-action select{border:1px solid #dbe0dc;background:white;border-radius:6px;padding:8px;font-size:11px}.small-primary{padding:8px 13px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.client-card,.vendor-card{background:white;border:1px solid #e0e4df;border-radius:10px;padding:20px;text-align:left;cursor:pointer}.card-top{display:flex;justify-content:space-between}.card-top>span{font-size:10px;color:#77817a}.client-card h3,.vendor-card h3{font-size:16px;margin:16px 0 5px}.client-card p,.vendor-card p{font-size:11px;color:#7d858b;margin:0}.client-card dl,.vendor-card dl{display:flex;gap:35px;border-top:1px solid #edf0ed;border-bottom:1px solid #edf0ed;padding:13px 0;margin:17px 0}.client-card dl div,.vendor-card dl div{display:flex;flex-direction:column}.client-card dt,.vendor-card dt{font-size:9px;color:#92999d;text-transform:uppercase}.client-card dd,.vendor-card dd{margin:3px 0 0;font-weight:bold}.client-card footer{display:flex;justify-content:space-between;font-size:10px;color:#778188}.client-card footer b{color:#58734f}.toolbar{display:flex;gap:9px;margin-bottom:17px}.toolbar label,.threads>label{border:1px solid #dce1dc;background:white;border-radius:7px;padding:0 12px;display:flex;align-items:center;flex:1;max-width:430px}.toolbar input,.threads input{border:0;outline:0;padding:10px;width:100%;background:transparent}.record-hero,.project-hero{display:flex;align-items:center;gap:18px;background:white;border:1px solid #e0e4df;border-radius:11px;padding:24px;margin:10px 0 15px}.monogram.large{width:62px;height:62px;font-size:18px}.record-hero .status{display:inline-block;margin-bottom:7px}.hero-actions{margin-left:auto;display:flex;gap:8px}.record-grid{display:grid;grid-template-columns:2fr 1fr;gap:15px}.panel{background:white;border:1px solid #e0e4df;border-radius:10px;padding:20px;min-width:0}.span2{grid-column:span 1}.panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px}.project-row{width:100%;border:0;border-top:1px solid #edf0ed;background:white;padding:16px 3px;display:grid;grid-template-columns:1fr auto 25px;gap:15px;align-items:center;text-align:left;cursor:pointer}.project-row h3{margin:7px 0 4px;font-size:14px}.project-row p,.panel>p{font-size:12px;color:#768088}.project-row>div:nth-child(2){display:flex;flex-direction:column;text-align:right;font-size:11px}.project-row>div:nth-child(2) span{color:#949b9f;font-size:9px}.status.active,.status.paid{background:#e5f0e5;color:#437043}.status.pending,.status.due{background:#f7eedc;color:#8c6a2f}.status.completed{background:#e8eef5;color:#506986}.contact{display:flex;gap:10px;padding:12px 0;border-top:1px solid #eef0ee}.contact>div:last-child{display:flex;flex-direction:column;font-size:11px;gap:2px}.contact a{color:#55734e;text-decoration:none}.contact span{color:#858d92}.primary-tag{background:#edf2ea;color:#577252!important;padding:2px 5px;border-radius:8px;margin-left:5px;font-size:8px}.detail-list{margin-top:15px}.detail-list>div{display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-top:1px solid #edf0ed;font-size:11px}.detail-list span{color:#848d92}.detail-list p{margin:0;text-align:right}.empty{padding:25px;text-align:center;background:#f8faf7;border-radius:8px}.empty p{color:#7e888d;font-size:12px}.project-list{display:flex;flex-direction:column;gap:9px}.project-list>button{background:white;border:1px solid #e0e4df;border-radius:9px;padding:19px;display:grid;grid-template-columns:1.2fr 1fr 20px;text-align:left;align-items:center;cursor:pointer}.project-list h3{margin:9px 0 4px}.project-list p{font-size:11px;color:#7b858b}.project-list small{margin-left:7px;color:#758078}.project-metrics{display:grid;grid-template-columns:1fr 1fr 70px;gap:15px}.project-metrics span{font-size:9px;text-transform:uppercase;color:#939a9e}.project-metrics strong{display:block;text-transform:none;color:#273348;font-size:11px;margin-top:4px}.summary-strip,.project-status{display:grid;grid-template-columns:repeat(4,1fr);background:white;border:1px solid #e0e4df;border-radius:9px;margin-bottom:18px}.summary-strip div,.project-status div{padding:15px 20px;border-right:1px solid #edf0ed}.summary-strip strong{font-size:19px;display:block}.summary-strip span,.project-status span{font-size:9px;text-transform:uppercase;color:#8b9499}.project-status{grid-template-columns:repeat(3,1fr)}.project-status strong{font-size:11px;display:block;margin-top:5px}.tabs{display:flex;overflow:auto;border-bottom:1px solid #dce1dd;margin:20px 0 15px}.tabs button{border:0;background:0;padding:11px 13px;white-space:nowrap;font-size:11px;color:#758087}.tabs button.active{color:#365532;border-bottom:2px solid #688160;font-weight:bold}.mini-action{display:flex;align-items:center;gap:11px;border-top:1px solid #edf0ed;padding:12px 0}.mini-action>span{width:7px;height:7px;background:#c4a05d;border-radius:50%}.mini-action>span.urgent{background:#b9574e}.mini-action>div{flex:1}.mini-action strong{font-size:12px}.mini-action p{margin:3px 0;color:#8b9398;font-size:10px}.timeline>div{position:relative;padding:2px 0 16px 21px;display:flex;flex-direction:column;font-size:11px}.timeline i{position:absolute;left:2px;top:4px;width:7px;height:7px;border-radius:50%;background:#78916f}.timeline span{color:#858e94;margin-top:3px}.mailboxes{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.mailboxes button{border:1px solid #dce1dd;background:white;border-radius:8px;padding:11px 13px;display:flex;justify-content:space-between;font-size:11px}.mailboxes button.active{background:#263b57;color:white}.mailboxes b{background:#e9eee7;color:#4f684a;border-radius:10px;padding:1px 6px}.inbox{height:calc(100vh - 230px);min-height:570px;display:grid;grid-template-columns:330px 1fr;background:white;border:1px solid #dde2de;border-radius:10px;overflow:hidden}.threads{border-right:1px solid #e3e6e3;overflow:auto}.threads>label{margin:12px;max-width:none}.threads>button{display:block;width:100%;border:0;border-top:1px solid #edf0ed;background:white;text-align:left;padding:14px;cursor:pointer}.threads>button.active{background:#f1f5ef;border-left:3px solid #768e6d}.threads>button div{display:flex;justify-content:space-between}.threads time,.message time{font-size:9px;color:#92999d}.threads h3{font-size:12px;margin:7px 0}.threads p{font-size:10px;color:#788187;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.threads>button>span{font-size:8px;background:#edf1ed;padding:3px 6px;border-radius:10px}.message{display:flex;flex-direction:column;overflow:auto}.message>header{padding:22px;border-bottom:1px solid #e6e9e6;display:flex}.message>header h2{font-size:19px;margin:9px 0 5px}.message>header p{font-size:10px;color:#7e878c}.message>header button{margin-left:auto;border:0;background:0}.context{margin:15px 20px 0;border:1px solid #d6e0d2;background:#f3f7f1;border-radius:7px;padding:10px 13px;display:flex;align-items:center;gap:10px;text-align:left}.context span{font-size:9px;color:#77847b}.context b{margin-left:auto;color:#56714f;font-size:10px}.message>article{display:flex;gap:12px;padding:22px;border-bottom:1px solid #edf0ed}.message>article>div:last-child{flex:1}.message>article time{float:right}.message>article p{line-height:1.7;color:#4e5963;font-size:12px}.reply{margin:auto 20px 20px;border:1px solid #d9dfda;border-radius:8px;overflow:hidden}.reply textarea{width:100%;border:0;resize:none;padding:14px;min-height:90px;outline:0}.reply>div{border-top:1px solid #e7eae7;padding:9px;display:flex;gap:7px}.reply button:not(.primary){border:0;background:#f0f2ef;border-radius:6px;font-size:10px;padding:8px}.reply .primary{margin-left:auto;padding:8px 13px}.data-list{background:white;border:1px solid #dfe3df;border-radius:9px;overflow:hidden}.data-list>div{display:grid;grid-template-columns:2fr 1.2fr .7fr .6fr .7fr;align-items:center;padding:13px 17px;border-top:1px solid #edf0ed;font-size:11px;gap:12px}.data-list .data-head{background:#f7f8f6;border:0;text-transform:uppercase;color:#8d9599;font-size:8px;font-weight:bold}.data-list button{border:0;background:0;color:#57734f;text-align:left;padding:0}.data-list select{border:1px solid #dbe0dc;padding:6px;border-radius:5px;background:white}.data-list small{display:block;color:#90979b}.danger{color:#ae4e47!important}.document-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.document-grid article{display:grid;grid-template-columns:48px 1fr auto 25px;align-items:center;gap:12px;background:white;border:1px solid #e0e4df;border-radius:9px;padding:16px}.file-icon{width:42px;height:48px;background:#ebf0e8;color:#56704f;border-radius:5px;display:grid;place-items:center;font-size:9px;font-weight:bold}.document-grid h3{font-size:12px;margin:0 0 5px}.document-grid p{font-size:9px;color:#8c9498;margin:0}.document-grid article>div>button{border:0;background:0;padding:5px 0;color:#5a7552;font-size:9px}.share{display:flex;align-items:center;gap:6px;font-size:9px;color:#68746c}.share input{display:none}.share span{width:29px;height:16px;background:#d4d9d5;border-radius:10px;position:relative}.share span:after{content:"";position:absolute;width:12px;height:12px;background:white;left:2px;top:2px;border-radius:50%;transition:.2s}.share input:checked+span{background:#77906e}.share input:checked+span:after{left:15px}.dots{border:0;background:0}.calendar-layout{display:grid;grid-template-columns:2fr 1fr;gap:15px}.month,.agenda{background:white;border:1px solid #e0e4df;border-radius:10px;padding:20px}.month header{display:flex;justify-content:space-between;align-items:center}.month header h2{font-size:17px}.month header button{border:1px solid #dce1dd;background:white;border-radius:6px;padding:6px 10px}.weekdays,.days{display:grid;grid-template-columns:repeat(7,1fr)}.weekdays span{text-align:center;padding:24px 0 9px;font-size:8px;color:#8d969a}.days button{height:67px;border:1px solid #edf0ed;background:white;position:relative;color:#59636a}.days button.today{background:#233853;color:white;border-radius:50%;height:38px;width:38px;justify-self:center;margin-top:14px}.days button i{position:absolute;bottom:8px;left:50%;width:4px;height:4px;border-radius:50%;background:#77906e}.agenda>article{display:flex;gap:13px;border-top:1px solid #edf0ed;padding:14px 0}.agenda>article>div:first-child{width:36px;text-align:center;display:flex;flex-direction:column}.agenda>article>div strong{font-size:16px}.agenda>article>div span{font-size:8px;text-transform:uppercase}.agenda article section{flex:1}.agenda article section>span{font-size:8px;color:#70806e;text-transform:uppercase}.agenda h3{font-size:11px;margin:4px 0}.agenda p{font-size:9px;color:#848d92}.finance-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:25px}.finance-cards div{background:white;border:1px solid #e0e4df;border-radius:9px;padding:17px}.finance-cards span,.finance-cards small{display:block;color:#838c91;font-size:9px}.finance-cards strong{display:block;font-size:21px;margin:7px 0}.accounting-bottom{display:grid;grid-template-columns:1.3fr 1fr;gap:15px;margin-top:15px}.estimate,.expense{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #edf0ed;font-size:10px}.estimate>div,.expense>div{flex:1;display:flex;flex-direction:column}.estimate>div span,.expense>div span{color:#899196}.estimate .primary{padding:6px 9px;font-size:9px}.vendor-card>button{border:0;background:0;color:#57734f;padding:0}.report-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:15px}.bars>div{display:grid;grid-template-columns:120px 1fr 25px;align-items:center;gap:10px;font-size:10px;margin:18px 0}.bars i{height:8px;background:#edf0ed;border-radius:4px;overflow:hidden}.bars em{height:100%;display:block;background:#788f70;border-radius:4px}.big-stat{font-size:33px;font-weight:bold;color:#27364b;margin:20px 0}.big-stat span{font-size:10px;color:#818a90;display:block;font-weight:normal}.report-links{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.report-links button{border:1px solid #e0e4df;background:#fafbf9;border-radius:7px;padding:13px;display:flex;gap:10px;font-size:11px}.report-links b{margin-left:auto}.settings-grid{display:grid;grid-template-columns:210px 1fr;gap:15px}.settings-grid>nav{display:flex;flex-direction:column}.settings-grid>nav button{border:0;background:0;padding:12px;text-align:left;border-radius:6px;font-size:11px}.settings-grid>nav button.active{background:#e5ebe2;color:#486143;font-weight:bold}.user-row{display:grid;grid-template-columns:38px 1fr 130px 65px 90px;align-items:center;gap:10px;border-top:1px solid #edf0ed;padding:12px 0;font-size:10px}.user-row>div:nth-child(2){display:flex;flex-direction:column}.user-row>div:nth-child(2) span{color:#899196}.user-row select,.user-row button{border:1px solid #dce1dd;background:white;border-radius:6px;padding:7px}.permission-note,.suggestion{background:#f4f7f2;border:1px solid #dbe3d7;border-radius:7px;padding:12px;margin-top:15px;font-size:10px}.permission-note p,.suggestion p{margin:4px 0;color:#6f7b73}.bottom-nav,.fab,.more-menu{display:none}.overlay{position:fixed;inset:0;background:#142035b8;z-index:100;display:flex;justify-content:center;align-items:flex-start;padding:10vh 15px}.search-modal,.modal{background:white;border-radius:12px;width:min(620px,100%);box-shadow:0 30px 80px #0004;overflow:hidden}.search-modal>label{height:60px;display:flex;align-items:center;padding:0 18px;gap:10px;border-bottom:1px solid #e3e7e3}.search-modal input{border:0;outline:0;flex:1;font-size:16px}.search-modal kbd{font-size:9px;border:1px solid #ddd;padding:3px}.search-empty{padding:35px;text-align:center;color:#7d868c}.search-empty strong{color:#263449}.search-empty p,.search-empty span{font-size:11px}.results{padding:8px}.results button{width:100%;display:flex;align-items:center;gap:12px;border:0;background:white;border-radius:7px;padding:10px;text-align:left}.results button:hover{background:#f1f4ef}.results button>span{width:55px;font-size:8px;text-transform:uppercase;color:#71806f}.results div{display:flex;flex-direction:column;flex:1}.results small{color:#8a9297}.modal{padding:25px;position:relative;max-height:80vh;overflow:auto}.modal h2{font-family:Georgia,serif;margin:0 0 20px;color:#203049}.close{position:absolute;right:15px;top:12px;border:0;background:0;font-size:25px}.modal>label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:bold;margin:13px 0}.modal input,.modal select,.modal textarea{border:1px solid #d8ded9;border-radius:7px;padding:11px;resize:vertical}.modal>.primary{width:100%;margin-top:10px}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.quick-grid button{height:90px;border:1px solid #dde2de;background:#f8faf7;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:11px}.quick-grid i{font-size:22px;font-style:normal}.upload-zone{height:130px!important;border:1px dashed #9caf97!important;background:#f7faf5;border-radius:8px;display:flex!important;align-items:center!important;justify-content:center!important}.upload-zone input{display:none}.upload-zone>span{color:#828c84;font-weight:normal}.toast{position:fixed;right:25px;bottom:25px;background:#263b56;color:white;padding:12px 17px;border-radius:8px;z-index:200;font-size:12px;box-shadow:0 8px 30px #0003}
 @media(max-width:900px){.sidebar{display:none}.main{margin:0}.topbar{height:58px;padding:0 15px}.mobile-brand{display:block;font-family:Georgia,serif;font-weight:bold;color:#21324b}.mobile-brand span{color:#71896a;font-family:inherit}.search{width:40px;border:0;margin-left:auto;padding:0;justify-content:center;background:#f1f3f0}.search span,.search kbd,.quick span{display:none}.top-actions{margin-left:7px}.top-actions .quick{width:40px;padding:0}.content{padding:24px 16px 105px}.bottom-nav{position:fixed;display:flex;bottom:0;left:0;right:0;height:70px;padding-bottom:env(safe-area-inset-bottom);background:white;border-top:1px solid #dfe3df;z-index:50;justify-content:space-around}.bottom-nav button{border:0;background:white;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:9px;color:#7d878d;position:relative}.bottom-nav i{font-style:normal;font-size:19px;height:22px}.bottom-nav button.active{color:#3e5d38}.bottom-nav b{position:absolute;top:7px;right:24%;background:#ad554c;color:white;border-radius:10px;padding:1px 5px;font-size:8px}.fab{display:grid;place-items:center;position:fixed;right:17px;bottom:84px;width:49px;height:49px;border-radius:50%;border:0;background:#203854;color:white;font-size:25px;z-index:40;box-shadow:0 6px 20px #15294255}.more-menu{display:grid;position:fixed;right:10px;bottom:72px;width:210px;background:white;border:1px solid #dfe3df;border-radius:10px;padding:8px;z-index:55;box-shadow:0 12px 35px #17253d30;grid-template-columns:1fr 1fr}.more-menu button{border:0;background:white;padding:12px 8px;border-radius:6px;text-align:left;font-size:10px}.more-menu i{font-style:normal;margin-right:6px}.cards{grid-template-columns:1fr 1fr}.inbox{grid-template-columns:280px 1fr}.record-grid,.report-grid{grid-template-columns:1fr}.settings-grid{grid-template-columns:1fr}.settings-grid>nav{flex-direction:row;overflow:auto}.settings-grid>nav button{white-space:nowrap}.document-grid{grid-template-columns:1fr}.calendar-layout{grid-template-columns:1fr}.finance-cards{grid-template-columns:1fr 1fr}}
 @media(max-width:620px){.page-heading{align-items:flex-start}.page-heading h1,.record-hero h1,.project-hero h1{font-size:29px}.page-heading>button{font-size:0;width:42px;height:42px;padding:0}.page-heading>button:before{content:"＋";font-size:19px}.priority{padding:18px}.priority h2{font-size:17px}.today-calendar{padding:17px}.today-calendar-head{align-items:flex-start}.today-calendar-head>button{white-space:nowrap}.today-event{grid-template-columns:82px 1fr 18px}.today-calendar-empty{grid-template-columns:38px 1fr}.today-calendar-empty>button{grid-column:1/-1;width:100%}.segmented{overflow:auto;max-width:100%}.section-head{align-items:flex-start;flex-direction:column;gap:10px}.action-list article{grid-template-columns:36px 1fr}.action-controls{grid-column:2}.action-controls .small-primary{display:none}.meta{flex-wrap:wrap;gap:7px}.cards{grid-template-columns:1fr}.record-hero,.project-hero{align-items:flex-start;flex-wrap:wrap;padding:18px}.record-hero .hero-actions,.project-hero .hero-actions{width:100%;margin:4px 0 0}.record-grid{grid-template-columns:1fr}.project-row{grid-template-columns:1fr 20px}.project-row>div:nth-child(2){display:none}.summary-strip{grid-template-columns:1fr 1fr}.summary-strip div:nth-child(2){border-right:0}.project-list>button{grid-template-columns:1fr 20px}.project-metrics{grid-column:1/3;border-top:1px solid #edf0ed;padding-top:12px}.project-status{grid-template-columns:1fr}.project-status div{border-right:0;border-bottom:1px solid #edf0ed}.mailboxes{display:flex;overflow:auto}.mailboxes button{min-width:105px}.inbox{display:block;height:auto;min-height:0}.threads{border:0}.threads>button{padding:16px}.message{display:none}.data-list{overflow:auto}.data-list>div{min-width:720px}.document-grid article{grid-template-columns:44px 1fr 25px}.document-grid .share{grid-column:2}.calendar-layout{grid-template-columns:1fr}.month{padding:10px}.days button{height:45px}.days button.today{margin-top:4px}.agenda{padding:15px}.finance-cards{grid-template-columns:1fr 1fr}.finance-cards strong{font-size:17px}.accounting-bottom{grid-template-columns:1fr}.report-grid{grid-template-columns:1fr}.span2{grid-column:auto}.report-links{grid-template-columns:1fr}.settings-grid{grid-template-columns:1fr}.user-row{grid-template-columns:38px 1fr 80px}.user-row select{grid-column:2}.user-row>.status{display:none}.quick-grid{grid-template-columns:1fr 1fr}.toast{right:15px;bottom:85px;left:15px;text-align:center}}

 .mail-list-empty{padding:35px 20px;text-align:center;color:#7b858b}
 .mail-list-empty strong{display:block;color:#263449;font-size:12px;margin-bottom:5px}
 .mail-list-empty p{margin:0;font-size:10px}
 .mail-reader-state{display:grid;place-items:center;flex:1;padding:40px;color:#718078;font-size:12px;gap:12px}
 .mail-reader-state.error{color:#9d4942}
 .mail-reader-state button{border:1px solid #d7ddd8;background:white;border-radius:7px;padding:8px 12px;cursor:pointer}
 .real-mail-body{flex:1;min-height:0;background:white;padding:0}
 .real-mail-body iframe{display:block;width:100%;height:100%;min-height:400px;border:0;background:white}
 .mail-empty-reader{display:grid;place-items:center;text-align:center;color:#7d878d}
 .mail-empty-reader h2{margin:12px 0 5px;color:#263449}
 .mail-empty-reader p{margin:0;font-size:11px}
 .mail-empty-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:#edf2ea;color:#577252;font-size:22px;margin:auto}
 .reply-from{display:flex;align-items:center;color:#7b858b;font-size:10px;padding:0 5px}
 .reply .primary:disabled{opacity:.55;cursor:not-allowed}

</style>
