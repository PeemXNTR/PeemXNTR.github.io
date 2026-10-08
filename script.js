const menu=document.getElementById('menuToggle');const navigation=document.getElementById('navigation');
function closeMenu(){navigation.classList.remove('active');menu.setAttribute('aria-expanded','false');}
menu.addEventListener('click',()=>{const open=navigation.classList.toggle('active');menu.setAttribute('aria-expanded',String(open));});
navigation.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
let previousFocus;
function closeModal(){document.querySelectorAll('.modal').forEach(m=>m.style.display='none');document.body.style.overflow='';previousFocus?.focus();}
function showProjectDetails(id){const modal=document.getElementById(id+'-modal');if(!modal)return;previousFocus=document.activeElement;modal.style.display='block';document.body.style.overflow='hidden';modal.querySelector('.close').focus();}
document.querySelectorAll('.modal').forEach(modal=>{modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');const title=modal.querySelector('h2');title.id=modal.id+'-title';modal.setAttribute('aria-labelledby',title.id);const old=modal.querySelector('.close');const button=document.createElement('button');button.className='close';button.textContent='×';button.setAttribute('aria-label','ปิดรายละเอียด');old.replaceWith(button);button.onclick=closeModal;modal.onclick=e=>{if(e.target===modal)closeModal();};modal.addEventListener('keydown',e=>{if(e.key==='Tab'){const items=[...modal.querySelectorAll('button,a[href],[tabindex="0"]')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closeModal();}});
