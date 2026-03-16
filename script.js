const GAS_URL = "https://script.google.com/macros/s/AKfycbxN4O6KUpVGqOI479BHPivqRv1RccVBhVNyHCC6yKqyiXfH-xX9FLR-3c8uPuYM4MEkSA/exec";

const CATEGORY_ORDER = ["調度品(一般)", "調度品(台座)", "調度品(卓上)", "調度品(壁掛)", "調度品(敷物)", "内装建材", "庭具"];
const PACKAGE_NAMES = { "7": "黄金のレガシー", "6": "暁月のフィナーレ", "5": "漆黒のヴィランズ", "4": "紅蓮のリベレーター", "3": "蒼天のイシュガルド", "2": "新生エオルゼア" };

let allData = [];
let currentFilter = { type: 'all', value: 'all', subValue: 'all' };
let displayList = [];
let currentIndex = 0;
const itemsPerPage = 24;
let isLoading = false;
let currentModalIdx = -1;

window.onload = async function() {
    const CACHE_KEY = 'eorzea_furniture_data_final_v2'; // キーを更新してキャッシュをクリア
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
        allData = JSON.parse(cachedData);
        buildMenu();
        buildHome();
    } else {
        try {
            const response = await fetch(GAS_URL);
            let data = await response.json();
            // スプレッドシートの全データを取得（逆順にして最新を上に）
            let rawData = data.slice(1).reverse();
            
            // 画像チェックはせず、IDがあるものだけを有効データとして採用
            allData = rawData.filter(item => {
                const id = item.ItemID || item['アイテムID'];
                return id && id.toString().trim() !== "";
            });

            localStorage.setItem(CACHE_KEY, JSON.stringify(allData));
            buildMenu();
            buildHome();
        } catch (e) { console.error("データ取得エラー:", e); }
    }
    showHome();
};

// --- カタログ描画ロジック ---
function formatPatch(p) {
    const s = p.toString().replace('Patch', '').trim();
    return `Patch ${s}`;
}

function loadMoreItems() {
    if (isLoading || currentIndex >= displayList.length) return;
    isLoading = true;
    const grid = document.getElementById('grid');
    const next = displayList.slice(currentIndex, currentIndex + itemsPerPage);
    let lastP = (currentIndex > 0) ? formatPatch(displayList[currentIndex-1].patch) : "";

    next.forEach(item => {
    // --- 項目名のズレを吸収する書き方 ---
    // 染色: 「染色」という項目がなければ「dyeable」を探す
    const dyeVal = item['染色'] || item.dyeable || item['染色可否'];
    
    // マケボ: 「マケボ」がなければ「market」や「マケボ取引」を探す
    const marketVal = item['マケボ'] || item.market || item['マケボ取引'];
    
    // 製作: 「製作」がなければ「recipe」を探す（これは現在出ているので今のままでOK）
    const craftVal = item['製作'] || item.recipe || item['製作可否'];
    
    const itemId = item.ItemID || item['アイテムID'];
    // ----------------------------------

    const card = document.createElement('div');
    card.className = 'cheki-card';
    
    card.innerHTML = `
        <div class="photo-area" onclick="openModalByIdx(${allData.indexOf(item)})">
            <img src="images/${itemId}_front.png" 
                 class="slide-img active" 
                 onerror="this.src='https://placehold.jp/200x200?text=NoImage'">
        </div>

        <p class="item-name">${item['アイテム名（日）'] || item.name}</p>
            
            <div class="card-flags">
                ${(dyeVal && dyeVal !== '不可') ? '<div class="flag-diamond flag-dye"><span>🎨</span></div>' : ''}
                ${(marketVal && marketVal !== '不可') ? '<div class="flag-diamond flag-market"><span>💰</span></div>' : ''}
                ${(craftVal && craftVal !== '-' && craftVal !== '不可' && craftVal !== '') ? '<div class="flag-diamond flag-craft"><span>🔨</span></div>' : ''}
            </div>
    `;
    grid.appendChild(card);
});
    currentIndex += itemsPerPage;
    isLoading = false;
}

// キーボード操作（左右キー対応）
window.addEventListener('keydown', (e) => {
    if (!document.getElementById('itemModal').classList.contains('visible')) return;
    if (e.key === 'ArrowLeft') changeModalItem(-1);
    else if (e.key === 'ArrowRight') changeModalItem(1);
    else if (e.key === 'Escape') closeModal();
});

// --- メニュー・フィルタリングロジック ---
function buildMenu() {
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));
    document.getElementById('side-cat-list').innerHTML = cats.map(c => {
        let subs = [...new Set(allData.filter(i => i.category === c).map(i => i['FF14サブカテゴリー']))].filter(Boolean);
        return `<div class="nav-item-container"><button class="nav-item-parent" onclick="toggleSubMenu(this, '${c}')"><span><i class="fa-solid fa-angle-right"></i> ${c}</span></button><div class="sub-menu"><button class="nav-item-sub" onclick="filterBy('category', '${c}', 'all')">すべて表示</button>${subs.map(s => `<button class="nav-item-sub" onclick="filterBy('category', '${c}', '${s}')">${s}</button>`).join('')}</div></div>`;
    }).join('');

    const patches = [...new Set(allData.map(i => i.patch))].sort((a,b) => parseFloat(b.toString().replace('Patch','')) - parseFloat(a.toString().replace('Patch','')));
    const groups = {};
    patches.forEach(p => {
        const major = p.toString().replace('Patch','').trim().split('.')[0];
        const gName = PACKAGE_NAMES[major] ? `${PACKAGE_NAMES[major]} (${major}.x)` : `${major}.x`;
        if(!groups[gName]) groups[gName] = [];
        groups[gName].push(p);
    });

    document.getElementById('side-patch-list').innerHTML = Object.keys(groups).map(g => {
        const major = Object.keys(PACKAGE_NAMES).find(k => g.includes(PACKAGE_NAMES[k]));
        return `<div class="nav-item-container"><button class="nav-item-parent" onclick="toggleSubMenu(this, 'patch-group:${major}')"><span><i class="fa-solid fa-tag"></i> ${g}</span></button><div class="sub-menu"><button class="nav-item-sub" onclick="filterBy('patch-group', '${major}', 'all')">すべて表示</button>${groups[g].map(p => `<button class="nav-item-sub" onclick="filterBy('patch', '${p}')">${formatPatch(p)}</button>`).join('')}</div></div>`;
    }).join('');
}

function toggleSubMenu(btn, val) {
    const sub = btn.nextElementSibling;
    const isOpen = sub.classList.contains('open');
    if(!isOpen) {
        sub.classList.add('open');
        if(val.startsWith('patch-group:')) filterBy('patch-group', val.split(':')[1]);
        else if(val !== 'all') filterBy('category', val);
    } else { sub.classList.remove('open'); }
}

function filterBy(type, val, sub = 'all') {
    currentFilter = { type, value: val, subValue: sub };
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('catalog-view').style.display = 'block';
    let title = val;
    if(type === 'patch-group') title = (PACKAGE_NAMES[val] || val) + ` (${val}.x)`;
    else if(type === 'patch') title = formatPatch(val);
    document.getElementById('view-title').innerText = title;
    updateTopTags();
    render();
    window.scrollTo(0,0);
}

function updateTopTags() {
    const area = document.getElementById('tag-area');
    let html = '';
    if(currentFilter.type === 'category') {
        const subs = [...new Set(allData.filter(i => i.category === currentFilter.value).map(i => i['FF14サブカテゴリー']))].filter(Boolean);
        html += `<div class="tag-chip ${currentFilter.subValue === 'all' ? 'active' : ''}" onclick="filterBy('category', '${currentFilter.value}', 'all')">すべて</div>`;
        subs.forEach(s => { html += `<div class="tag-chip ${currentFilter.subValue === s ? 'active' : ''}" onclick="filterBy('category', '${currentFilter.value}', '${s}')">${s}</div>`; });
    } else if(currentFilter.type === 'patch-group' || currentFilter.type === 'patch') {
        const major = currentFilter.type === 'patch-group' ? currentFilter.value : currentFilter.value.toString().replace('Patch','').split('.')[0].trim();
        const chips = [...new Set(allData.map(i => i.patch.toString().replace('Patch','').trim()))]
            .filter(p => p.startsWith(major + '.') && p.split('.')[1].length === 1)
            .sort((a,b) => parseFloat(a) - parseFloat(b));
        html += `<div class="tag-chip ${currentFilter.type === 'patch-group' ? 'active' : ''}" onclick="filterBy('patch-group', '${major}')">すべて</div>`;
        chips.forEach(p => {
            const active = currentFilter.type === 'patch' && currentFilter.value.toString().replace('Patch','').trim().startsWith(p);
            html += `<div class="tag-chip ${active ? 'active' : ''}" onclick="filterBy('patch', '${p}')">Patch ${p}</div>`;
        });
    }
    area.innerHTML = html;
}

function render() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    currentIndex = 0;
    displayList = allData.filter(item => {
        const itemP = item.patch.toString().replace('Patch','').trim();
        const filV = currentFilter.value.toString().replace('Patch','').trim();
        if(currentFilter.type === 'category') return item.category === currentFilter.value && (currentFilter.subValue === 'all' || item['FF14サブカテゴリー'] === currentFilter.subValue);
        if(currentFilter.type === 'patch-group') return itemP.startsWith(filV + '.');
        if(currentFilter.type === 'patch') return itemP === filV || itemP.startsWith(filV + '.');
        return true;
    });
    loadMoreItems();
}

async function openModalByIdx(originalIdx) {
    currentModalIdx = originalIdx;
    const item = allData[originalIdx];
    const itemId = item.ItemID || item['アイテムID'];
    const mainBadge = document.getElementById('modalMainCategory');
    const subBadge = document.getElementById('modalSubCategory');
    const mainCat = item.category || item['カテゴリー'] || "";
    const subCat = item['FF14サブカテゴリー'] || item['サブカテゴリー'] || "";
    mainBadge.innerText = mainCat;
    mainBadge.className = 'tag-badge';
    mainBadge.style.display = mainCat ? "inline-flex" : "none";
    subBadge.innerText = subCat;
    subBadge.className = 'tag-badge';
    subBadge.style.display = subCat ? "inline-flex" : "none";
    const titleEl = document.getElementById('modalTitle');
    const itemName = item['アイテム名（日）'] || item.name;
    titleEl.innerText = itemName;
    titleEl.style.fontSize = itemName.length > 15 ? "1.2rem" : (itemName.length > 10 ? "1.4rem" : "1.8rem");
    document.getElementById('modalDye').innerText = item['dyeable'] || "不可";
    document.getElementById('modalMarket').innerText = item['market'] || "不可";
    document.getElementById('modalCraft').innerText = item['recipe'] || "-";
    document.getElementById('modalHowToGet').innerText = item['入手方法'] || "確認中";
    document.getElementById('modalComment').innerText = item['note'] || "特になし";
    document.getElementById('modalPhoto').innerHTML = `<img src="images/${itemId}_front.png" id="mainModalImg" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">`;
    const currentIdxInDisplay = displayList.indexOf(item);
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    if (prevBtn && nextBtn) {
        prevBtn.style.display = (currentIdxInDisplay > 0) ? "flex" : "none";
        nextBtn.style.display = (currentIdxInDisplay < displayList.length - 1) ? "flex" : "none";
    }
    document.getElementById('itemModal').classList.add('visible');
}

function changeModalItem(dir) {
    const currentItem = allData[currentModalIdx];
    const idx = displayList.indexOf(currentItem);
    const nextIdx = idx + dir;
    if(nextIdx >= 0 && nextIdx < displayList.length) {
        openModalByIdx(allData.indexOf(displayList[nextIdx]));
    }
}

function closeModal() { document.getElementById('itemModal').classList.remove('visible'); }

function buildHome() {
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));
    document.getElementById('home-cat-list').innerHTML = cats.map(c => `<div class="cat-card" onclick="filterBy('category', '${c}')"><i class="fa-solid fa-couch"></i><span>${c}</span></div>`).join('');
}

function showHome() { document.getElementById('home-view').style.display='block'; document.getElementById('catalog-view').style.display='none'; }

window.onscroll = () => {
    // 無限ロード
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        loadMoreItems();
    }

    // TOPボタンの表示切り替え
    const topBtn = document.getElementById('backToTop');
    if (topBtn) {
        if (window.scrollY > 300) {
            topBtn.classList.add('visible');
        } else {
            topBtn.classList.remove('visible');
        }
    }
};

// ボタンをクリックした時の動作（念のため）
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
