const GAS_URL = "https://script.google.com/macros/s/AKfycbxN4O6KUpVGqOI479BHPivqRv1RccVBhVNyHCC6yKqyiXfH-xX9FLR-3c8uPuYM4MEkSA/exec";
const CATEGORY_ORDER = ["調度品(一般)", "調度品(台座)", "調度品(卓上)", "調度品(壁掛)", "調度品(敷物)", "内装建材", "庭具", "絵画", "花"];
const SUB_CATEGORY_ORDER = [
        "机", "椅子/ソファ", "棚/チェスト", "壁/柱/仕切り", "ベッド",
        "照明", "料理", "時計", "植物",
        "ぬいぐるみ/マスコット", "置物",
        "風呂",
        "旗/額縁/ポスター", "窓",
        "足場", "水場", "店舗",
        "天井照明", "内壁", "床材",
        "機能家具",
        "ラノシア", "黒衣森", "ザナラーン", 
        "クルザス/モードゥナ", "ドラヴァニア", "アバラシア", 
        "ギラバニア", "オサード",
        "第一世界", "北洋地域", "イルサバード",
        "古代世界", "星外宙域",
        "ヨカ・トラル", "サカ・トラル", "アンロスト・ワールド",
        "その他"
        // リストにないものはこの後ろに自動で並びます
    ];    
const PACKAGE_NAMES = { "7": "黄金のレガシー", "6": "暁月のフィナーレ", "5": "漆黒のヴィランズ", "4": "紅蓮のリベレーター", "3": "蒼天のイシュガルド", "2": "新生エオルゼア" };

let allData = [];
let currentFilter = { type: 'all', value: 'all', subValue: 'all' };
let displayList = [];
let currentIndex = 0;
const itemsPerPage = 24;
let isLoading = false;
let currentModalIdx = -1;

// 検索用の正規化（ひらがな化、中点・スペース除去）
function normalizeText(str) {
    if (!str) return "";
    return str
        .replace(/[ァ-ヶ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60)) // カタカナをひらがなに
        .replace(/[・\s　]/g, "") // 中点とスペースを完全に消去
        .toLowerCase(); // 英字を小文字に
}

window.onload = async function() {
    const CACHE_KEY = 'eorzea_furniture_data_final_v2';
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
        allData = JSON.parse(cachedData);
        buildMenu();
        buildHome();
    } else {
        try {
            const response = await fetch(GAS_URL);
            let data = await response.json();
            let rawData = data.slice(1).reverse();
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

function formatPatch(p) {
    const s = p.toString().replace('Patch', '').trim();
    return `Patch ${s}`;
}

function loadMoreItems() {
    if (isLoading || currentIndex >= displayList.length) return;
    isLoading = true;
    const grid = document.getElementById('grid');
    const next = displayList.slice(currentIndex, currentIndex + itemsPerPage);

    next.forEach(item => {
        const dyeVal = item['染色'] || item.dyeable || item['染色可否'];
        const marketVal = item['マケボ'] || item.market || item['マケボ取引'];
        const craftVal = item['製作'] || item.recipe || item['製作可否'];
        const itemId = item.ItemID || item['アイテムID'];

        const card = document.createElement('div');
        card.className = 'cheki-card';
        card.innerHTML = `
            <div class="photo-area" onclick="openModalByIdx(${allData.indexOf(item)})">
                <img src="images/${itemId}_front.webp" class="slide-img active" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">
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

async function openModalByIdx(originalIdx) {
    currentModalIdx = originalIdx;
    const item = allData[originalIdx];
    const itemId = item.ItemID || item['アイテムID'];

    document.getElementById('modalTitle').innerText = item['アイテム名（日）'] || item.name;
    document.getElementById('modalMainCategory').innerText = item.category || "";
    document.getElementById('modalSubCategory').innerText = item['FF14サブカテゴリー'] || "";
    document.getElementById('modalDye').innerText = item['dyeable'] || item['染色'] || "不可";
    document.getElementById('modalMarket').innerText = item['market'] || item['マケボ'] || "不可";
    document.getElementById('modalCraft').innerText = item['recipe'] || item['製作'] || "-";
    document.getElementById('modalHowToGet').innerText = item['入手方法'] || "確認中";
    document.getElementById('modalComment').innerText = item['note'] || "備考はありません";

    const photoArea = document.getElementById('modalPhoto');
    photoArea.innerHTML = `<img src="images/${itemId}_front.webp" id="mainModalImg" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">`;

    // --- 左右切り替えボタンの表示制御 ---
    const idxInList = displayList.indexOf(item);
    // 最初のアイテムならPrevを隠す、最後ならNextを隠す
    document.querySelector('.nav-prev').style.display = (idxInList > 0) ? 'flex' : 'none';
    document.querySelector('.nav-next').style.display = (idxInList < displayList.length - 1) ? 'flex' : 'none';
    
    const bookRight = document.querySelector('.book-right');
    bookRight.classList.remove('has-multiple-thumbs');
    let thumbNav = document.querySelector('.thumb-nav') || document.createElement('div');
    thumbNav.className = 'thumb-nav';
    if (!thumbNav.parentElement) bookRight.appendChild(thumbNav);
    thumbNav.innerHTML = '';
    thumbNav.style.display = 'none';

    const suffixList = ['front', 'side', 'back', 'bottom', 'top', 'dye', 'night'];
    let foundCount = 0;

    for (const suffix of suffixList) {
        const imgUrl = `images/${itemId}_${suffix}.webp`;
        const exists = await new Promise(res => {
            const img = new Image();
            img.onload = () => res(true);
            img.onerror = () => res(false);
            img.src = imgUrl;
        });
        if (exists) {
            foundCount++;
            const tImg = document.createElement('img');
            tImg.src = imgUrl;
            if (suffix === 'front') tImg.className = 'active';
            tImg.onclick = () => {
                document.getElementById('mainModalImg').src = imgUrl;
                document.querySelectorAll('.thumb-nav img').forEach(el => el.classList.remove('active'));
                tImg.classList.add('active');
            };
            thumbNav.appendChild(tImg);
        }
    }

    if (foundCount > 1) {
        bookRight.classList.add('has-multiple-thumbs');
        thumbNav.style.display = 'flex';
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

function showHome() { 
    document.getElementById('home-view').style.display='block'; 
    document.getElementById('catalog-view').style.display='none'; 
}

function buildMenu() {
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));
    document.getElementById('side-cat-list').innerHTML = cats.map(c => {
        
        let subs = [...new Set(allData.filter(i => i.category === c).map(i => i['FF14サブカテゴリー']))].filter(Boolean);
        
        subs.sort((a, b) => {
            let indexA = SUB_CATEGORY_ORDER.indexOf(a);
            let indexB = SUB_CATEGORY_ORDER.indexOf(b);
            
            // リストにないものは一番後ろ（大きな数値）にする
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            
            return indexA - indexB;
        });
        
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
        
        subs.sort((a, b) => {
            let indexA = SUB_CATEGORY_ORDER.indexOf(a);
            let indexB = SUB_CATEGORY_ORDER.indexOf(b);
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            return indexA - indexB;
        });
        
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

    // 表示すべき全データのリストを作成
    displayList = allData.filter(item => {
        // 【修正ポイント】検索モードの場合のロジック
        if (currentFilter.type === 'search') {
            const sKey = normalizeText(currentFilter.value); // 入力文字を整える
            const itemName = normalizeText(item['アイテム名（日）'] || item.name || ""); // 家具名を整える
            return itemName.includes(sKey); // 部分一致で判定
        }
        
        // 通常のカテゴリ・パッチフィルター（既存のまま）
        const matchMain = (currentFilter.type === 'category' ? item.category === currentFilter.value : 
                          currentFilter.type === 'patch' ? item.patch.toString() === currentFilter.value.toString() : true);
        const matchSub = (currentFilter.subValue === 'all' || item['FF14サブカテゴリー'] === currentFilter.subValue);
        return matchMain && matchSub;
    });

    loadMoreItems(); // 最初の24件を表示
}

function setSubFilter(val, el) {
        currentFilter.subValue = val;
        document.querySelectorAll('.tag-chip').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        render();
    }

function handleSearch(e) {
    // Enterキーが押された時だけ実行
    if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if (!val) return; // 空欄なら何もしない

        // 1. フィルター状態を「検索モード」にする
        currentFilter = { type: 'search', value: val, subValue: 'all' };

        // 2. 画面の表示切り替え（ここが重要！）
        document.getElementById('home-view').style.display = 'none';
        document.getElementById('catalog-view').style.display = 'block';
        
        // 3. タイトルを「検索結果: 〇〇」に変更
        document.getElementById('view-title').innerText = `検索結果: ${val}`;
        
        // 4. カテゴリ用タグエリアを一旦空にする（検索結果画面の見た目用）
        document.getElementById('tag-area').innerHTML = '';

        // 5. 描画を実行
        render();
        
        // 6. 画面の一番上へスクロール
        window.scrollTo(0, 0);
    }
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// スクロールイベントを一つに集約
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
        loadMoreItems();
    }
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (scrollTop > 300) { backToTop.classList.add('visible'); } 
        else { backToTop.classList.remove('visible'); }
    }
});

window.addEventListener('keydown', (e) => {
    if (!document.getElementById('itemModal').classList.contains('visible')) return;
    if (e.key === 'ArrowLeft') changeModalItem(-1);
    else if (e.key === 'ArrowRight') changeModalItem(1);
    else if (e.key === 'Escape') closeModal();
});
