const GAS_URL = "https://script.google.com/macros/s/AKfycbxN4O6KUpVGqOI479BHPivqRv1RccVBhVNyHCC6yKqyiXfH-xX9FLR-3c8uPuYM4MEkSA/exec";

const CATEGORY_ORDER = ["調度品(一般)", "調度品(台座)", "調度品(卓上)", "調度品(壁掛)", "調度品(敷物)", "内装建材", "庭具"];
const PACKAGE_NAMES = { "7": "黄金のレガシー", "6": "暁月のフィナーレ", "5": "漆黒のヴィランズ", "4": "紅蓮のリベレーター", "3": "蒼天のイシュガルド", "2": "新生エオルゼア" };

let allData = [];
let currentFilter = { type: 'all', value: 'all', subValue: 'all' };
let displayList = [];
let currentIndex = 0;
const itemsPerPage = 24;
let isLoading = false;

window.onload = async function() {
    const CACHE_KEY = 'eorzea_furniture_data';
    const CACHE_TIME_KEY = 'eorzea_furniture_timestamp';
    const now = new Date().getTime();
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
        allData = JSON.parse(cachedData);
        buildMenu();
        buildHome();
    } else {
        try {
            const response = await fetch(GAS_URL);
            const data = await response.json();
            allData = data.slice(1).reverse();
            localStorage.setItem(CACHE_KEY, JSON.stringify(allData));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
            buildMenu();
            buildHome();
        } catch (e) { console.error(e); }
    }
    showHome();
};

function formatPatch(p) {
    const s = p.toString().replace('Patch', '').trim();
    return `Patch ${s}`;
}

function buildMenu() {
    // カテゴリー側
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));
    document.getElementById('side-cat-list').innerHTML = cats.map(c => {
        let subs = [...new Set(allData.filter(i => i.category === c).map(i => i['FF14サブカテゴリー']))].filter(Boolean);
        return `<div class="nav-item-container"><button class="nav-item-parent" onclick="toggleSubMenu(this, '${c}')"><span><i class="fa-solid fa-angle-right"></i> ${c}</span></button><div class="sub-menu"><button class="nav-item-sub" onclick="filterBy('category', '${c}', 'all')">すべて表示</button>${subs.map(s => `<button class="nav-item-sub" onclick="filterBy('category', '${c}', '${s}')">${s}</button>`).join('')}</div></div>`;
    }).join('');

    // パッチ側
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
        else filterBy('category', val);
    } else { sub.classList.remove('open'); }
}

function filterBy(type, val, sub = 'all') {
    currentFilter = { type, value: val, subValue: sub };
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('catalog-view').style.display = 'block';
    
    // タイトル
    let title = val;
    if(type === 'patch-group') title = PACKAGE_NAMES[val] + ` (${val}.x)`;
    else if(type === 'patch') title = formatPatch(val);
    document.getElementById('view-title').innerText = title;

    updateTopTags();
    render();
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
        // 7.0, 7.1 など「小数点第1位」までをチップにする
        const chips = [...new Set(allData.map(i => i.patch))].filter(p => {
            const c = p.toString().replace('Patch','').trim();
            return c.startsWith(major + '.') && c.split('.').length === 2;
        }).sort((a,b) => parseFloat(a.toString().replace('Patch','')) - parseFloat(b.toString().replace('Patch','')));
        
        html += `<div class="tag-chip ${currentFilter.type === 'patch-group' ? 'active' : ''}" onclick="filterBy('patch-group', '${major}')">すべて</div>`;
        chips.forEach(p => {
            const active = currentFilter.type === 'patch' && currentFilter.value.toString().startsWith(p.toString());
            html += `<div class="tag-chip ${active ? 'active' : ''}" onclick="filterBy('patch', '${p}')">${formatPatch(p)}</div>`;
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

function loadMoreItems() {
    const grid = document.getElementById('grid');
    const next = displayList.slice(currentIndex, currentIndex + itemsPerPage);
    let lastP = (currentIndex > 0) ? formatPatch(displayList[currentIndex-1].patch) : "";

    next.forEach(item => {
        const currentP = formatPatch(item.patch);
        // パッチが変わったら仕切りを入れる
        if((currentFilter.type === 'patch-group' || currentFilter.type === 'patch') && currentP !== lastP) {
            const div = document.createElement('div');
            div.className = 'patch-divider';
            div.innerText = currentP;
            grid.appendChild(div);
            lastP = currentP;
        }
        const card = document.createElement('div');
        card.className = 'cheki-card';
        card.innerHTML = `<div class="photo-area" onclick="openModalByIdx(${allData.indexOf(item)})"><img src="images/${item.ItemID || item['アイテムID']}_front.png" class="slide-img active" onerror="this.src='https://placehold.jp/200x200.png?text=NoImage'"></div><p class="item-name">${item['アイテム名（日）'] || item.name}</p>`;
        grid.appendChild(card);
    });
    currentIndex += itemsPerPage;
}

function buildHome() {
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));
    document.getElementById('home-cat-list').innerHTML = cats.map(c => `<div class="cat-card" onclick="filterBy('category', '${c}')"><i class="fa-solid fa-couch"></i><span>${c}</span></div>`).join('');
}
function showHome() { document.getElementById('home-view').style.display='block'; document.getElementById('catalog-view').style.display='none'; }
// モーダル等は前回のコードをそのまま維持してください

// --- モーダル制御（中身は変更なし） ---
let currentModalIdx = -1;
async function openModalByIdx(originalIdx) {
    currentModalIdx = originalIdx;
    const item = allData[originalIdx];
    const itemId = item['ItemID'] || item['アイテムID'];
    document.getElementById('modalTitle').innerText = item['アイテム名（日）'] || item.name;
    const subBadge = document.getElementById('modalSubCategory');
    subBadge.innerText = item['FF14サブカテゴリー'] || "";
    subBadge.style.display = subBadge.innerText ? "inline-flex" : "none";
    document.getElementById('modalDye').innerText = item['dyeable'] || "不可";
    document.getElementById('modalMarket').innerText = item['market'] || "不可";
    document.getElementById('modalCraft').innerText = item['recipe'] || "-";
    document.getElementById('modalHowToGet').innerText = item['入手方法'] || "確認中";
    document.getElementById('modalComment').innerText = item['note'] || "特になし";
    const photoArea = document.getElementById('modalPhoto');
    photoArea.innerHTML = `<img src="images/${itemId}_front.png" id="mainModalImg" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">`;
    document.getElementById('itemModal').classList.add('visible');
}

function closeModal() { document.getElementById('itemModal').classList.remove('visible'); }

function changeModalItem(direction) {
    const currentItem = allData[currentModalIdx];
    let currentIndexInDisplay = displayList.indexOf(currentItem);
    let nextIndexInDisplay = currentIndexInDisplay + direction;
    if (nextIndexInDisplay >= 0 && nextIndexInDisplay < displayList.length) {
        openModalByIdx(allData.indexOf(displayList[nextIndexInDisplay]));
    }
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadMoreItems();
    }
});
