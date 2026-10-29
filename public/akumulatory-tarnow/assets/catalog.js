const one = (s, root = document) => root.querySelector(s);
const many = (s, root = document) => [...root.querySelectorAll(s)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
const productCount = n => n+' '+(n===1?'produkt':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'produkty':'produktów');
const menu = one('#catalog-menu');
const menuButton = one('.catalog-menu-toggle');
menuButton?.addEventListener('click', () => { menu.showModal(); menuButton.setAttribute('aria-expanded','true'); });
menu?.addEventListener('close', () => { menuButton.setAttribute('aria-expanded','false'); menuButton.focus({preventScroll:true}); });
one('[data-close-menu]')?.addEventListener('click', () => menu.close());
menu?.addEventListener('click', event => { if (event.target === menu) { const r = menu.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) menu.close(); } });
const imageButton = one('[data-product-zoom]');
if (imageButton) {
  const popup = one('#product-image-dialog');
  imageButton.addEventListener('click', () => {
    const source = one('img',imageButton);
    const large = one('[data-large-image]',popup);
    large.src=source.currentSrc||source.src;large.alt=source.alt;
    popup.showModal();
  });
  one('[data-close-image]',popup).addEventListener('click',()=>popup.close());
  popup.addEventListener('click',event=>{if(event.target===popup)popup.close();});
}

const back = one('[data-back-to-list]');
if (back) {
  const previous = new URLSearchParams(location.search).get('powrot');
  if (previous) {
    const parsed = new URL(previous, location.origin);
    if (parsed.origin === location.origin && /^\/akumulatory-tarnow\/(oferta|marki)\//.test(parsed.pathname)) back.href = parsed.pathname + parsed.search;
  }
}

const contextNode = one('#listing-context');
if (contextNode) initializeCatalog().catch(() => {
  // Server-rendered product and category links remain usable if a data request fails.
  one('[data-open-filters]')?.setAttribute('hidden','');
});

async function initializeCatalog() {
  const context = JSON.parse(contextNode.textContent);
  const response = await fetch('/akumulatory-tarnow/assets/catalog-data.json');
  if (!response.ok) throw new Error('Catalogue data unavailable');
  const data = await response.json();
  const byId = new Map(data.products.map(p => [Number(p.id),p]));
  const base = context.ids.map(id => byId.get(Number(id))).filter(Boolean);
  const form = one('#catalog-filter-form');
  const sidebar = one('.catalog-sidebar');
  const dialog = one('#filter-dialog');
  const sort = one('#catalog-sort');
  const grid = one('#product-grid');
  const count = one('[data-result-count]');
  const pagination = one('[data-pagination]');
  const chips = one('[data-active-filters]');
  const pageSize = 24;
  const keys = ['ah','prad','napiecie','biegun'];
  let state;
  function readURL() {
    const q = new URLSearchParams(location.search);
    return {marka:(q.get('marka')||'').split(',').filter(Boolean),kat:(q.get('kat')||'').split(',').filter(Boolean),
      ...Object.fromEntries(keys.map(k => [k,q.get(k)||''])),sort:q.get('sort')||'source',page:Math.max(1,parseInt(q.get('strona'),10)||1)};
  }
  function reflectForm() {
    many('input[type=checkbox]',form).forEach(input => { input.checked = state[input.name].includes(input.value); });
    keys.forEach(k => { const select = form.elements.namedItem(k); if (select) select.value = state[k]; });
    sort.value = state.sort;
  }
  function readForm() {
    state.marka = many('input[name=marka]:checked',form).map(e => e.value);
    state.kat = many('input[name=kat]:checked',form).map(e => e.value);
    keys.forEach(k => { state[k] = form.elements.namedItem(k)?.value || ''; });
    state.sort = sort.value;
    state.page = 1;
  }
  function query(page = state.page) {
    const q = new URLSearchParams();
    for (const name of ['marka','kat']) if (state[name].length) q.set(name,state[name].join(','));
    keys.forEach(k => { if (state[k]) q.set(k,state[k]); });
    if (state.sort !== 'source') q.set('sort',state.sort);
    if (page > 1) q.set('strona',String(page));
    return q.toString();
  }
  function url(page = state.page) { const q = query(page); return location.pathname + (q ? '?' + q : ''); }
  function matches(p, ignoreBrand = false) {
    return (ignoreBrand || !state.marka.length || state.marka.includes(String(p.brandId)))
      && (!state.kat.length || p.categories.some(id => state.kat.includes(String(id))))
      && keys.every(k => !state[k] || p.filters[k] === state[k]);
  }
  function card(p) {
    const specs = [['ah',' Ah'],['prad',' A'],['napiecie',' V']].filter(([key]) => p.filters[key]).map(([key,unit]) => p.filters[key]+unit).join(' · ');
    const href = p.url + '?powrot=' + encodeURIComponent(url());
    return '<a class="product-card" href="'+escapeHTML(href)+'" data-product-id="'+p.id+'"><div class="product-card-image"><img src="'+escapeHTML(p.image)+'" alt="'+escapeHTML(p.title)+'" width="315" height="420" loading="lazy" decoding="async"></div><div class="product-card-copy"><span class="product-brand">'+escapeHTML(p.brand)+'</span><h2>'+escapeHTML(p.title)+'</h2><p class="card-parameters">'+escapeHTML(specs)+'</p></div><span class="card-arrow" aria-hidden="true">↗</span></a>';
  }
  function render(writeHistory = true, push = false) {
    let results = base.filter(p => matches(p));
    if (state.sort === 'az') results.sort((a,b) => a.title.localeCompare(b.title,'pl',{numeric:true}));
    if (state.sort === 'za') results.sort((a,b) => b.title.localeCompare(a.title,'pl',{numeric:true}));
    const pages = Math.max(1,Math.ceil(results.length/pageSize));
    state.page = Math.min(state.page,pages);
    if (writeHistory) history[push ? 'pushState' : 'replaceState'](null,'',url());
    count.textContent = productCount(results.length);
    grid.innerHTML = results.slice((state.page-1)*pageSize,state.page*pageSize).map(card).join('');
    one('[data-empty-results]').hidden = results.length !== 0;
    const numbers = new Set([1,pages,state.page-2,state.page-1,state.page,state.page+1,state.page+2].filter(n => n >= 1 && n <= pages));
    let previous = 0;
    pagination.innerHTML = pages < 2 ? '' : [...numbers].sort((a,b) => a-b).map(n => {
      const gap = previous && n-previous>1 ? '<span aria-hidden="true">…</span>' : '';
      previous = n;
      return gap+'<a href="'+escapeHTML(url(n))+'" data-page="'+n+'"'+(n===state.page ? ' aria-current="page"' : '')+' aria-label="Strona '+n+'">'+n+'</a>';
    }).join('');
    const facet = base.filter(p => matches(p,true));
    many('input[name=marka]',form).forEach(input => {
      const amount = facet.filter(p => String(p.brandId)===input.value).length;
      input.closest('label').querySelector('small').textContent = amount;
      input.disabled = amount === 0 && !input.checked;
    });
    const selections = many('input:checked',form).map(input => ({key:input.name,value:input.value,label:input.closest('label').querySelector('span').textContent}));
    keys.forEach(k => { if (state[k]) selections.push({key:k,value:state[k],label:form.elements.namedItem(k).closest('label').querySelector('span').textContent+': '+state[k]}); });
    chips.innerHTML = selections.map(s => '<button type="button" data-remove-filter="'+escapeHTML(s.key)+'" data-value="'+escapeHTML(s.value)+'" aria-label="Usuń filtr '+escapeHTML(s.label)+'">'+escapeHTML(s.label)+'<span aria-hidden="true">×</span></button>').join('');
    one('[data-filter-count]').textContent = selections.length ? '('+selections.length+')' : '';
    const apply = one('.filter-apply');
    if (apply) apply.textContent = 'Pokaż produkty ('+results.length+')';
  }
  state = readURL();
  reflectForm();
  render(false);
  form.addEventListener('change', () => { readForm();render(); });
  sort.addEventListener('change', () => { readForm();render(); });
  one('[data-reset-filters]',form).addEventListener('click', () => {
    form.reset();sort.value='source';readForm();render();
  });
  chips.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-filter]');
    if (!button) return;
    const key = button.dataset.removeFilter;
    if (Array.isArray(state[key])) state[key] = state[key].filter(v => v !== button.dataset.value);
    else state[key] = '';
    state.page = 1;reflectForm();render();
  });
  pagination.addEventListener('click', event => {
    const link = event.target.closest('[data-page]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();state.page=Number(link.dataset.page);render(true,true);
    one('.results-toolbar').scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});
  });
  addEventListener('popstate', () => { state=readURL();reflectForm();render(false); });
  one('[data-open-filters]').addEventListener('click', () => {
    one('[data-filter-slot]',dialog).append(form);
    dialog.showModal();
  });
  many('[data-close-filters]',dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => { sidebar.append(form);one('[data-open-filters]').focus({preventScroll:true}); });
  matchMedia('(min-width:768px)').addEventListener('change', event => { if (event.matches && dialog.open) dialog.close(); });
}

const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    reveal.unobserve(entry.target);
    if (reduced.matches) continue;
    entry.target.animate([{opacity:0,transform:'translateY(30px)'},{opacity:1,transform:'none'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
  }
},{threshold:.06});
many('.service-card,.article-card,.brand-card,.about-gallery figure').forEach(node => reveal.observe(node));
