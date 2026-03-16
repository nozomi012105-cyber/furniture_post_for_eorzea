const GAS_URL = "https://script.google.com/macros/s/AKfycbxN4O6KUpVGqOI479BHPivqRv1RccVBhVNyHCC6yKqyiXfH-xX9FLR-3c8uPuYM4MEkSA/exec";

const CATEGORY_ORDER = ["調度品(一般)", "調度品(台座)", "調度品(卓上)", "調度品(壁掛)", "調度品(敷物)", "内装建材", "庭具"];
const SUB_CATEGORY_ORDER = [
    "机", "椅子/ソファ", "棚/チェスト", "壁/柱/仕切り", "ベッド",
    "照明", "料理", "時計", "植物",
    "ぬいぐるみ/マスコット", "置物",
    "風呂",
    "旗/額縁/ポスター", "窓",
    "足場", "水場", "店舗",
    "天井照明", "内壁", "床材",
    "機能家具",
    "その他"
];

let allData = [];
let currentFilter = { type: 'all', value: 'all', subValue: 'all' };

let displayList = [];
let currentIndex = 0;
const itemsPerPage = 24;
let isLoading = false;

// パッケージ名との対応表
const PACKAGE_NAMES = {
    "7": "黄金のレガシー",
    "6": "暁月のフィナーレ",
    "5": "漆黒のヴィランズ",
    "4": "紅蓮のリベレーター",
    "3": "蒼天のイシュガルド",
    "2": "新生エオルゼア"
};

window.onload = async function() {
    showHome();

    const CACHE_KEY = 'eorzea_furniture_data';
    const CACHE_TIME_KEY = 'eorzea_furniture_timestamp';
    const CACHE_EXPIRE = 1000 * 60 * 60 * 24;

    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = new Date().getTime();

    if (cachedData && cachedTime && (now - cachedTime < CACHE_EXPIRE)) {
        allData = JSON.parse(cachedData);
        buildMenu();
        buildHome();
        render();
        console.log("キャッシュから読み込みました！");
    } 

    if (!allData.length || (now - cachedTime >= CACHE_EXPIRE)) {
        try {
            const response = await fetch(GAS_URL);
            const data = await response.json();
            allData = data.slice(1).reverse(); 
            
            localStorage.setItem(CACHE_KEY, JSON.stringify(allData));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
            
            buildMenu();
            buildHome();
            console.log("最新データを取得しました！");
        } catch (e) {
            console.error("データの取得に失敗しました", e);
        }
    }
};

function formatPatch(p) {
    if (!p) return "";
    const strP = p.toString();
    return strP.includes("Patch") ? strP : `Patch ${strP}`;
}

function sortCategories(cats) {
    return cats.sort((a, b) => {
        let indexA = CATEGORY_ORDER.indexOf(a);
        let indexB = CATEGORY_ORDER.indexOf(b);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });
}

function sortSubCategories(subs) {
    return subs.sort((a, b) => {
        let indexA = SUB_CATEGORY_ORDER.indexOf(a);
        let indexB = SUB_CATEGORY_ORDER.indexOf(b);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        if (indexA === indexB) return a.localeCompare(b, 'ja');
        return indexA - indexB;
    });
}

function buildMenu() {
    // カテゴリーメニュー生成
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = sortCategories(cats);
    
    const sideCatList = document.getElementById('side-cat-list');
    sideCatList.innerHTML = cats.map(c => {
        let subs = [...new Set(allData.filter(i => i.category === c).map(i => i['FF14サブカテゴリー']))].filter(Boolean);
        subs = sortSubCategories(subs);
        return `<div class="nav-item-container"><button class="nav-item-parent" onclick="toggleSubMenu(this, '${c}')"><span><i class="fa-solid fa-angle-right"></i> ${c}</span>${subs.length > 0 ? '<i class="fa-solid fa-chevron-down" style="font-size:0.7rem;"></i>' : ''}</button><div class="sub-menu"><button class="nav-item-sub" onclick="filterBy('category', '${c}', 'all')">すべて表示</button>${subs.map(s => `<button class="nav-item-sub" onclick="filterBy('category', '${c}', '${s}')">${s}</button>`).join('')}</div></div>`;
    }).join('');

    // パッチメニュー生成
    const patches = [...new Set(allData.map(i => i.patch))].sort((a, b) => {
        const valA = parseFloat(a.toString().replace('Patch', '').trim());
        const valB = parseFloat(b.toString().replace('Patch', '').trim());
        return valB - valA;
    });

    const groups = {};
    patches.forEach(p => {
        const cleanPatch = p.toString().replace('Patch', '').trim();
        const major = cleanPatch.split('.')[0]; 
        
        const groupName = PACKAGE_NAMES[major] 
            ? `${PACKAGE_NAMES[major]} (${major}.x)` 
            : `${major}.x Series`;

        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(p);
    });
    
    const sidePatchList = document.getElementById('side-patch-list');
    sidePatchList.innerHTML = Object.keys(groups).map(groupName => {
        // グループ名からメジャー番号を逆算
        const major = Object.keys(PACKAGE_NAMES).find(key => groupName.includes(PACKAGE_NAMES[key])) || groupName.split('.')[0];

        return `
            <div class="nav-item-container">
                <button class="nav-item-parent" onclick="toggleSubMenu(this, 'patch-group:${major}')">
                    <span><i class="fa-solid fa-tag"></i> ${groupName}</span>
                    <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;"></i>
                </button>
                <div class="sub-menu">
                    <button class="nav-item-sub" onclick="filterBy('patch-group', '${major}', 'all')">すべて表示</button>
                    ${groups[groupName].map(p => `
                        <button class="nav-item-sub" onclick="filterBy('patch', '${p}')">
                            ${formatPatch(p)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleSubMenu(btn, category) {
    const subMenu = btn.nextElementSibling;
    const isOpen = subMenu.classList.contains('open');
    
    // 【修正】他のメニューを勝手に閉じないように、一旦全部消す処理をコメントアウトするか削除します
    //　document.querySelectorAll('.sub-menu').forEach(m => m.classList.remove('open'));
    
    if (!isOpen) {
        subMenu.classList.add('open');
        // 親ボタンを押した時にそのグループでフィルタリング
        if(category.startsWith('patch-group:')) {
            const major = category.split(':')[1];
            filterBy('patch-group', major, 'all');
        } else if(category !== 'all') {
            filterBy('category', category, 'all');
        }
    } else {
        subMenu.classList.remove('open');
    }
}

function buildHome() {
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = sortCategories(cats);
    document.getElementById('home-cat-list').innerHTML = cats.map(c => `<div class="cat-card" onclick="filterBy('category', '${c}', 'all')"><i class="fa-solid fa-couch"></i><span>${c}</span></div>`).join('');
}

function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('catalog-view').style.display = 'none';
    document.querySelectorAll('.sub-menu').forEach(m => m.classList.remove('open'));
}

function filterBy(type, value, subValue = 'all') {
    currentFilter = { type, value, subValue };
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('catalog-view').style.display = 'block';
    
    // タイトル表示
    if (type === 'patch-group') {
        document.getElementById('view-title').innerText = PACKAGE_NAMES[value] ? `${PACKAGE_NAMES[value]} (${value}.x)` : `${value}.x Series`;
    } else {
        document.getElementById('view-title').innerText = type === 'patch' ? formatPatch(value) : value;
    }

    updateTopTags(); 
    render();
    window.scrollTo(0, 0);
}

function updateTopTags() {
    const tagArea = document.getElementById('tag-area');
    tagArea.innerHTML = '';
    let html = '';

    if (currentFilter.type === 'category') {
        let subCats = [...new Set(allData.filter(i => i.category === currentFilter.value).map(i => i['FF14サブカテゴリー']))].filter(Boolean);
        subCats = sortSubCategories(subCats);
        if (subCats.length === 0) return;

        html += `<div class="tag-chip ${currentFilter.subValue === 'all' ? 'active' : ''}" onclick="setSubFilter('all', this)">すべて</div>`;
        subCats.forEach(s => { 
            html += `<div class="tag-chip ${currentFilter.subValue === s ? 'active' : ''}" onclick="setSubFilter('${s}', this)">${s}</div>`; 
        });
        
    // updateTopTags 関数内のパッチ用処理を以下に差し替え
    } else if (currentFilter.type === 'patch-group' || currentFilter.type === 'patch') {
        const major = currentFilter.type === 'patch-group' ? currentFilter.value : currentFilter.value.toString().replace('Patch','').trim().split('.')[0];
        
        // 【修正】チップには小数点第1位まで（7.0, 7.1...）のものだけを出す
        let subPatches = [...new Set(allData.map(i => i.patch))]
            .filter(p => {
                const clean = p.toString().replace('Patch','').trim();
                // 7.1 や 7.2 のように、数字.数字 の形式（マイナーパッチを除外）のみ抽出
                return clean.startsWith(major + '.') && clean.split('.').length === 2;
            })
            .sort((a, b) => parseFloat(a.toString().replace('Patch','').trim()) - parseFloat(b.toString().replace('Patch','').trim()));

        html += `<div class="tag-chip ${currentFilter.type === 'patch-group' ? 'active' : ''}" onclick="filterBy('patch-group', '${major}', 'all')">すべて</div>`;
        subPatches.forEach(p => {
            html += `<div class="tag-chip ${currentFilter.type === 'patch' && currentFilter.value === p ? 'active' : ''}" onclick="filterBy('patch', '${p}')">${formatPatch(p)}</div>`;
        });
    }

    tagArea.innerHTML = html;
}

function setSubFilter(val, el) {
    currentFilter.subValue = val;
    document.querySelectorAll('.tag-chip').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    render();
}

function handleSearch(e) {
    if (e.key === 'Enter') {
        currentFilter = { type: 'search', value: e.target.value, subValue: 'all' };
        document.getElementById('home-view').style.display = 'none';
        document.getElementById('catalog-view').style.display = 'block';
        document.getElementById('view-title').innerText = `検索結果: ${e.target.value}`;
        document.getElementById('tag-area').innerHTML = '';
        render();
    }
}

function render() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    currentIndex = 0;

    // render 関数内の item.patch === currentFilter.value の部分を修正
    displayList = allData.filter(item => {
        let matchMain = false;
        const itemPatch = item.patch.toString().replace('Patch','').trim();

        if (currentFilter.type === 'category') {
            matchMain = item.category === currentFilter.value;
        } else if (currentFilter.type === 'patch') {
            // 【修正】7.1 を選んだら、7.1 で始まるもの（7.1, 7.15...）をすべて出す
            matchMain = itemPatch === currentFilter.value.toString().replace('Patch','').trim() || 
                        itemPatch.startsWith(currentFilter.value.toString().replace('Patch','').trim() + ".");
        } else if (currentFilter.type === 'patch-group') {
            matchMain = itemPatch.startsWith(currentFilter.value + '.');
        } else if (currentFilter.type === 'search') {
            matchMain = (item['アイテム名（日）'] || item.name || "").includes(currentFilter.value);
        } else {
            matchMain = true;
        }

        const matchSub = (currentFilter.subValue === 'all' || item['FF14サブカテゴリー'] === currentFilter.subValue);
        return matchMain && matchSub;
    });

    loadMoreItems();
}

function loadMoreItems() {
    if (isLoading || currentIndex >= displayList.length) return;
    isLoading = true;

    const grid = document.getElementById('grid');
    const nextBatch = displayList.slice(currentIndex, currentIndex + itemsPerPage);
    let lastPatch = (currentIndex > 0) ? displayList[currentIndex - 1].patch : "";

    // loadMoreItems 関数内の if (currentFilter.type === 'patch-group' ...) の部分を修正
    nextBatch.forEach((item) => {
        const itemPatch = formatPatch(item.patch);
        
        // パッチが切り替わったら仕切りを入れる（patch-group または patch 選択時）
        if ((currentFilter.type === 'patch-group' || currentFilter.type === 'patch') && itemPatch !== lastPatch) {
            const div = document.createElement('div');
            div.className = 'patch-divider';
            div.innerText = itemPatch;
            grid.appendChild(div);
            lastPatch = itemPatch;
        }
        // ... (card 生成の処理はそのまま)

        const itemId = item['ItemID'] || item['アイテムID'];
        const card = document.createElement('div');
        card.className = 'cheki-card';
        card.innerHTML = `
            <div class="photo-area" onclick="openModalByIdx(${allData.indexOf(item)})">
                <img src="images/${itemId}_front.png" class="slide-img active" onerror="this.src='https://placehold.jp/200x200.png?text=No%20Image'">
            </div>
            <p class="item-name">${item['アイテム名（日）'] || item.name}</p>
        `;
        grid.appendChild(card);
    });

    currentIndex += itemsPerPage;
    isLoading = false;
}

// --- モーダル・その他関数は変更なし ---
let currentModalIdx = -1;

async function openModalByIdx(originalIdx) {
    currentModalIdx = originalIdx;
    const item = allData[originalIdx];
    const itemId = item['ItemID'] || item['アイテムID'];
    
    document.getElementById('modalTitle').innerText = item['アイテム名（日）'] || item.name;

    const mainBadge = document.getElementById('modalMainCategory');
    const subBadge = document.getElementById('modalSubCategory');

    mainBadge.innerText = item.category || "";
    mainBadge.style.backgroundColor = "#6670b0"; 

    subBadge.innerText = item['FF14サブカテゴリー'] || "";
    subBadge.style.backgroundColor = "#7f3030"; 
    subBadge.style.display = subBadge.innerText ? "inline-flex" : "none";
    
    const titleEl = document.getElementById('modalTitle');
    const itemName = item['アイテム名（日）'] || item.name;
    titleEl.innerText = itemName;

    if (itemName.length > 15) {
        titleEl.style.fontSize = "1.2rem"; 
    } else if (itemName.length > 10) {
        titleEl.style.fontSize = "1.4rem"; 
    } else {
        titleEl.style.fontSize = "1.8rem"; 
    }

    document.getElementById('modalDye').innerText = item['dyeable'] || "不可";
    document.getElementById('modalMarket').innerText = item['market'] || "不可";
    document.getElementById('modalCraft').innerText = item['recipe'] || "-";
    document.getElementById('modalHowToGet').innerText = item['入手方法'] || "確認中";
    document.getElementById('modalComment').innerText = item['note'] || "特になし";

    const photoArea = document.getElementById('modalPhoto');
    const bookRight = document.querySelector('.book-right');

    bookRight.classList.remove('has-multiple-thumbs');
    photoArea.innerHTML = `<img src="images/${itemId}_front.png" id="mainModalImg" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">`;

    let thumbNav = document.querySelector('.thumb-nav');
    if (!thumbNav) {
        thumbNav = document.createElement('div');
        thumbNav.className = 'thumb-nav';
        bookRight.appendChild(thumbNav);
    }
    thumbNav.innerHTML = '';

    const suffixList = ['front', 'side', 'back', 'bottom', 'top', 'dye', 'night'];
    let foundCount = 0;

    const checkAndAddThumbnail = (suffix) => {
        return new Promise((resolve) => {
            const imgUrl = `images/${itemId}_${suffix}.png`;
            const tempImg = new Image();
            tempImg.onload = () => {
                foundCount++;
                const tImg = document.createElement('img');
                tImg.src = imgUrl;
                tImg.alt = suffix;
                if (suffix === 'front') tImg.className = 'active';
                tImg.onclick = () => {
                    document.getElementById('mainModalImg').src = imgUrl;
                    document.querySelectorAll('.thumb-nav img').forEach(el => el.classList.remove('active'));
                    tImg.classList.add('active');
                };
                thumbNav.appendChild(tImg);
                resolve();
            };
            tempImg.onerror = () => resolve();
            tempImg.src = imgUrl;
        });
    };

    for (const suffix of suffixList) {
        await checkAndAddThumbnail(suffix);
    }

    if (foundCount > 1) {
        bookRight.classList.add('has-multiple-thumbs');
        thumbNav.style.display = 'flex'; 
    } else {
        thumbNav.style.display = 'none';
    }
    
    document.getElementById('itemModal').classList.add('visible');
}

function closeModal() { document.getElementById('itemModal').classList.remove('visible'); }

function changeModalItem(direction) {
    const currentItem = allData[currentModalIdx];
    let currentIndexInDisplay = displayList.indexOf(currentItem);
    let nextIndexInDisplay = currentIndexInDisplay + direction;
    
    if (nextIndexInDisplay >= 0 && nextIndexInDisplay < displayList.length) {
        const nextItem = displayList[nextIndexInDisplay];
        const nextOriginalIdx = allData.indexOf(nextItem);
        openModalByIdx(nextOriginalIdx);
    }
}

window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
        loadMoreItems();
    }
});

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('itemModal');
    if (!modal.classList.contains('visible')) return;
    if (e.key === 'ArrowLeft') changeModalItem(-1);
    if (e.key === 'ArrowRight') changeModalItem(1);
    if (e.key === 'Escape') closeModal();
});
