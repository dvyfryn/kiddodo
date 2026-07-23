// ==========================================================================
// 1. GŁÓWNA BAZA I BEZPIECZNY ZAPIS (LOCAL STORAGE WITH TRY-CATCH)
// ==========================================================================

const allKids = ["Paweł", "Madzia"];

let currentFilter = 'Paweł';
let currentPeriod = 'daily';
let isParentMode = false;
let isTileDeleteMode = false;
const PARENT_PIN = "1234";

let isHappyHourActive = false;

// Domyślne dane początkowe
const defaultScores = {
    Paweł: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    Madzia: { daily: 0, weekly: 0, monthly: 0, yearly: 0 }
};

const defaultShopBudget = { Paweł: 0, Madzia: 0 };

const defaultShopItems = [
    { id: 1, icon: "📱", name: "+1h Family Link / Konsola", cost: 20 },
    { id: 2, icon: "⚽", name: "+1h Dodatkowa na dworze", cost: 10 },
    { id: 3, icon: "🍦", name: "Dodatkowa przekąska / słodycz", cost: 15 }
];

const defaultGoalsData = {
    Paweł: [
        { id: 1, icon: "🍦", name: "Lody", target: 30 },
        { id: 2, icon: "🎮", name: "Gra na konsole", target: 100 }
    ],
    Madzia: [
        { id: 3, icon: "🍦", name: "Lody", target: 30 },
        { id: 4, icon: "🎨", name: "Zestaw artystyczny", target: 80 }
    ],
    Shared: [
        { id: 99, icon: "🚗", name: "Wycieczka Rodzinna", target: 500 }
    ]
};

const defaultQuestTiles = [
    { id: 1, title: "Ścielenie łóżka", points: 5 },
    { id: 2, title: "Zrobienie lekcji", points: 15 },
    { id: 3, title: "Wyniesienie śmieci", points: 5 },
    { id: 4, title: "Wyprowadzenie psa", points: 10 },
    { id: 5, title: "Podlewanie kwiatów", points: 5 }
];

// Zmienne operacyjne
let activeTasksList = [];
let scores = defaultScores;
let shopBudget = defaultShopBudget;
let shopItems = defaultShopItems;
let goalsData = defaultGoalsData;
let questTilesData = defaultQuestTiles;

// Bezpieczny zapis do pamięci przeglądarki
function saveToStorage() {
    try {
        localStorage.setItem('kiddodo_tasks_v2', JSON.stringify(activeTasksList));
        localStorage.setItem('kiddodo_scores_v2', JSON.stringify(scores));
        localStorage.setItem('kiddodo_budget_v2', JSON.stringify(shopBudget));
        localStorage.setItem('kiddodo_shop_v2', JSON.stringify(shopItems));
        localStorage.setItem('kiddodo_goals_v2', JSON.stringify(goalsData));
        localStorage.setItem('kiddodo_tiles_v2', JSON.stringify(questTilesData));
    } catch (e) {
        console.error("Błąd zapisu w pamięci przeglądarki:", e);
    }
}

// Bezpieczne wczytywanie z pamięci przeglądarki
function loadFromStorage() {
    try {
        const savedTasks = localStorage.getItem('kiddodo_tasks_v2');
        const savedScores = localStorage.getItem('kiddodo_scores_v2');
        const savedBudget = localStorage.getItem('kiddodo_budget_v2');
        const savedShop = localStorage.getItem('kiddodo_shop_v2');
        const savedGoals = localStorage.getItem('kiddodo_goals_v2');
        const savedTiles = localStorage.getItem('kiddodo_tiles_v2');

        if (savedTasks) activeTasksList = JSON.parse(savedTasks);
        if (savedScores) scores = JSON.parse(savedScores);
        if (savedBudget) shopBudget = JSON.parse(savedBudget);
        if (savedShop) shopItems = JSON.parse(savedShop);
        if (savedGoals) goalsData = JSON.parse(savedGoals);
        if (savedTiles) questTilesData = JSON.parse(savedTiles);
    } catch (e) {
        console.error("Błąd wczytywania pamięci:", e);
    }
}


// ==========================================================================
// 2. OKNO MODALNE (FIOLEKI I SKLEPIK)
// ==========================================================================

function openRankingModal() {
    document.getElementById('ranking-modal').classList.add('open');
    updateVials();
    updateShopUI();
}

function closeRankingModal() {
    document.getElementById('ranking-modal').classList.remove('open');
}

function selectKidInModal(kidName) {
    const targetChip = kidName === 'Paweł' ? document.getElementById('chip-pawel') : document.getElementById('chip-madzia');
    filterTasks(kidName, targetChip);
}

function triggerConfetti() {
    try {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    } catch (e) {}
}

function switchPeriod(period, tabBtn) {
    currentPeriod = period;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
    updateVials();
}


// ==========================================================================
// 3. LOGIKA FIOLEK PŁYNU
// ==========================================================================

function updateVials() {
    const pPts = scores.Paweł[currentPeriod];
    const mPts = scores.Madzia[currentPeriod];
    const sharedPts = scores.Paweł.yearly + scores.Madzia.yearly;

    document.getElementById('pts-vial-pawel').innerText = `${pPts} pkt`;
    document.getElementById('pts-vial-madzia').innerText = `${mPts} pkt`;
    document.getElementById('pts-vial-shared').innerText = `${sharedPts} pkt`;

    const tPawel = document.getElementById('vial-title-pawel');
    const tMadzia = document.getElementById('vial-title-madzia');

    tPawel.classList.remove('selected');
    tMadzia.classList.remove('selected');

    if (currentFilter === 'Paweł') tPawel.classList.add('selected');
    if (currentFilter === 'Madzia') tMadzia.classList.add('selected');

    renderVialLiquid('pawel', pPts, goalsData.Paweł);
    renderVialLiquid('madzia', mPts, goalsData.Madzia);
    renderVialLiquid('shared', sharedPts, goalsData.Shared);
}

function renderVialLiquid(vialKey, currentPts, goalsList) {
    const maxTarget = goalsList.length > 0 ? Math.max(...goalsList.map(g => g.target)) : 100;
    const heightPercent = Math.min(100, Math.round((currentPts / maxTarget) * 100));

    document.getElementById(`liquid-${vialKey}`).style.height = `${heightPercent}%`;

    const marksContainer = document.getElementById(`marks-${vialKey}`);
    marksContainer.innerHTML = '';

    goalsList.forEach(goal => {
        const markPos = Math.min(100, Math.round((goal.target / maxTarget) * 100));
        const mark = document.createElement('div');
        mark.className = 'mark-item';
        mark.style.bottom = `${markPos}%`;

        mark.innerHTML = `
            <span class="mark-icon" onclick="clickGoalIcon('${goal.name}', ${goal.target}, ${currentPts})">${goal.icon}</span>
        `;
        marksContainer.appendChild(mark);
    });
}

function clickGoalIcon(name, target, current) {
    if (current >= target) {
        triggerConfetti();
        alert(`🎉 Cel "${name}" został osiągnięty! Rodzic może wręczyć nagrodę!`);
    } else {
        alert(`Cel: "${name}". Wymagane ${target} pkt (Masz: ${current} pkt). Brakuje: ${target - current} pkt.`);
    }
}


// ==========================================================================
// 4. SKLEPIK DZIENNY
// ==========================================================================

function updateShopUI() {
    let targetKid = currentFilter === 'all' ? 'Paweł' : currentFilter;
    const budget = shopBudget[targetKid];

    document.getElementById('shop-budget-display').innerText = `Budżet (${targetKid}): ${budget} pkt`;

    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    shopItems.forEach(item => {
        const canAfford = budget >= item.cost;
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div>
                <div class="shop-item-info">${item.icon} ${item.name}</div>
                <div class="shop-item-cost">Koszt: ${item.cost} pkt dziennych</div>
            </div>
            <button class="btn-buy-coupon" ${canAfford ? '' : 'disabled'} onclick="buyCoupon('${item.name}', ${item.cost}, '${targetKid}')">
                Kup kupon
            </button>
        `;
        container.appendChild(div);
    });
}

function buyCoupon(itemName, cost, kidName) {
    if (shopBudget[kidName] < cost) return alert("Brak wystarczającej ilości dziennych punktów!");

    shopBudget[kidName] -= cost;
    saveToStorage();
    triggerConfetti();
    alert(`🎟️ GRATULACJE! ${kidName} kupuje kupon: "${itemName}"!\nPokaż ten komunikat rodzicowi!`);
    
    updateShopUI();
}


// ==========================================================================
// 5. OBSŁUGA QUESTÓW I KAFELKÓW
// ==========================================================================

function activateHappyHour() {
    if (!isParentMode) return;

    isHappyHourActive = true;
    document.getElementById('boost-banner').classList.add('active');
    triggerConfetti();
    alert("✨ Aktywowano Magiczne Happy Hour! PIERWSZY zrobiony Quest da x3 punktów!");
}

function toggleTask(id) {
    const taskIndex = activeTasksList.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const task = activeTasksList[taskIndex];
    const assignee = task.assignee;
    let points = task.points;

    if (isHappyHourActive && !task.completed) {
        points = points * 3;
        task.points = points;
        isHappyHourActive = false;
        document.getElementById('boost-banner').classList.remove('active');
        alert("🎉 Zrobiono Quest w trakcie Happy Hour! Punkty pomnożone x3!");
    }

    task.completed = !task.completed;

    if (task.completed) {
        scores[assignee].daily += points;
        scores[assignee].weekly += points;
        scores[assignee].monthly += points;
        scores[assignee].yearly += points;

        shopBudget[assignee] += points;
        triggerConfetti();
    } else {
        scores[assignee].daily = Math.max(0, scores[assignee].daily - points);
        scores[assignee].weekly = Math.max(0, scores[assignee].weekly - points);
        scores[assignee].monthly = Math.max(0, scores[assignee].monthly - points);
        scores[assignee].yearly = Math.max(0, scores[assignee].yearly - points);

        shopBudget[assignee] = Math.max(0, shopBudget[assignee] - points);
    }

    saveToStorage();
    renderTasksList();
    updateVials();
    updateShopUI();
}

function filterTasks(assignee, chipBtn) {
    currentFilter = assignee;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (chipBtn) chipBtn.classList.add('active');

    renderTasksList();
    updateVials();
    updateShopUI();
}

function renderTasksList() {
    const container = document.getElementById('tasks-list');
    container.innerHTML = '';

    activeTasksList.forEach(task => {
        if (currentFilter === 'all' || task.assignee === currentFilter) {
            const card = document.createElement('div');
            card.className = `task-card ${task.completed ? 'completed' : ''}`;
            
            card.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${task.title} <span class="points-badge">+${task.points} pkt</span></div>
                    <div class="assignee-badge"><i class="fa-solid fa-user"></i> ${task.assignee}</div>
                </div>
                <div class="task-actions">
                    <button class="btn-delete" onclick="deleteTask(${task.id})"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn-check ${task.completed ? 'done' : ''}" onclick="toggleTask(${task.id})">
                        <i class="fa-solid ${task.completed ? 'fa-check-double' : 'fa-check'}"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        }
    });
}

function renderTiles() {
    const container = document.getElementById('tiles-container');
    container.innerHTML = '';

    questTilesData.sort((a, b) => a.title.localeCompare(b.title, 'pl'));

    questTilesData.forEach(tile => {
        const wrapper = document.createElement('div');
        wrapper.className = 'quest-tile-wrapper';
        wrapper.setAttribute('data-title', tile.title.toLowerCase());

        const safeTitle = tile.title.replace(/'/g, "\\'");

        wrapper.innerHTML = `
            <button class="quest-tile" onclick="addQuestFromTile('${safeTitle}', ${tile.points})">
                🎯 ${tile.title} (+${tile.points})
            </button>
            <button class="btn-delete-tile" onclick="confirmRemoveTile(${tile.id}, '${safeTitle}')" title="Usuń kafelek">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(wrapper);
    });
}

function toggleTileDeleteMode() {
    isTileDeleteMode = !isTileDeleteMode;
    const btn = document.getElementById('btn-tile-delete-toggle');
    if (isTileDeleteMode) {
        document.body.classList.add('tile-delete-mode');
        btn.classList.add('delete-mode-active');
    } else {
        document.body.classList.remove('tile-delete-mode');
        btn.classList.remove('delete-mode-active');
    }
}

function confirmRemoveTile(id, title) {
    const pin = prompt(`Aby usunąć kafelek:\n"${title}"\npodaj PIN rodzica:`);
    if (pin === PARENT_PIN) {
        questTilesData = questTilesData.filter(t => t.id !== id);
        saveToStorage();
        renderTiles();
    } else if (pin !== null) {
        alert("Błędny PIN!");
    }
}

function filterTilesBySearch() {
    const query = document.getElementById('tile-search').value.toLowerCase();
    const wrappers = document.querySelectorAll('.quest-tile-wrapper');

    wrappers.forEach(w => {
        const title = w.getAttribute('data-title');
        if (title.includes(query)) {
            w.style.display = 'flex';
        } else {
            w.style.display = 'none';
        }
    });
}

function createNewTile() {
    const titleInput = document.getElementById('new-tile-title');
    const pointsInput = document.getElementById('new-tile-points');

    const title = titleInput.value.trim();
    const points = parseInt(pointsInput.value) || 10;

    if (!title) return alert("Wpisz nazwę Questu!");

    questTilesData.push({ id: Date.now(), title: title, points: points });
    saveToStorage();
    renderTiles();

    titleInput.value = '';
    document.getElementById('tile-search').value = '';
    filterTilesBySearch();
}

// KLUCZOWE: Kliknięcie kafelka na zakładce "Wszyscy" w Trybie Rodzica tworzy Quest DLA KAŻDEGO DZIECKA
function addQuestFromTile(title, points) {
    if (currentFilter === 'all') {
        allKids.forEach(kid => {
            activeTasksList.push({
                id: Date.now() + Math.random(),
                title: title,
                points: points,
                assignee: kid,
                completed: false
            });
        });
    } else {
        activeTasksList.push({
            id: Date.now(),
            title: title,
            points: points,
            assignee: currentFilter,
            completed: false
        });
    }

    saveToStorage();
    renderTasksList();
}

function deleteTask(id) {
    activeTasksList = activeTasksList.filter(t => t.id !== id);
    saveToStorage();
    renderTasksList();
}


// ==========================================================================
// 6. CONTROL PARENT MODE AND #chip-all
// ==========================================================================

function updateParentUI() {
    const chipAll = document.getElementById('chip-all');
    if (chipAll) {
        if (isParentMode) {
            chipAll.hidden = false;
        } else {
            chipAll.hidden = true;
        }
    }
}

function toggleParentMode() {
    const lockBtn = document.getElementById('parent-lock');
    const lockIcon = document.getElementById('lock-icon');

    if (!isParentMode) {
        const pin = prompt("Podaj PIN rodzica:");
        if (pin === PARENT_PIN) {
            isParentMode = true;
            document.body.classList.add('parent-mode');
            lockBtn.classList.add('unlocked');
            lockIcon.className = "fa-solid fa-lock-open";
        } else if (pin !== null) {
            alert("Błędny PIN!");
        }
    } else {
        isParentMode = false;
        isTileDeleteMode = false;
        document.body.classList.remove('parent-mode');
        document.body.classList.remove('tile-delete-mode');
        lockBtn.classList.remove('unlocked');
        document.getElementById('btn-tile-delete-toggle').classList.remove('delete-mode-active');
        lockIcon.className = "fa-solid fa-lock";

        if (currentFilter === 'all') {
            const chipPawel = document.getElementById('chip-pawel');
            filterTasks('Paweł', chipPawel);
        }
    }

    updateParentUI();
    updateVials();
    updateShopUI();
}

function addNewGoalPrompt() {
    if (!isParentMode) return;

    const owner = prompt("Dla kogo ta nagroda? Wpisz: Paweł, Madzia lub Rodzina").trim();
    if (!['Paweł', 'Madzia', 'Rodzina'].includes(owner)) return alert("Błędny wybór osoby!");

    const icon = prompt("Wpisz emoji dla celu (np. 🍦, 🎮, 🚴‍♂️, 🏖️):", "🎁");
    const name = prompt("Podaj nazwę celu/nagrody:");
    const target = parseInt(prompt("Podaj wymagany próg punktowy:"));

    if (!name || !target) return alert("Wypełnij wszystkie dane!");

    const key = owner === 'Rodzina' ? 'Shared' : owner;
    goalsData[key].push({ id: Date.now(), icon: icon || "🎁", name: name, target: target });

    saveToStorage();
    updateVials();
    alert("Dodano nowy cel do fiolki!");
}

function addNewShopItemPrompt() {
    if (!isParentMode) return;

    const icon = prompt("Wpisz emoji dla kuponu (np. 📱, ⚽, 🍦):", "🎟️");
    const name = prompt("Podaj nazwę dziennego kuponu:");
    const cost = parseInt(prompt("Podaj koszt w punktach dziennych:"));

    if (!name || !cost) return alert("Wypełnij wszystkie dane!");

    shopItems.push({ id: Date.now(), icon: icon || "🎟️", name: name, cost: cost });
    saveToStorage();
    updateShopUI();
    alert("Dodano nowy kupon do Sklepiku!");
}


// ==========================================================================
// 7. INITIALIZACJA
// ==========================================================================

loadFromStorage();
updateParentUI();

const chipPawel = document.getElementById('chip-pawel');
filterTasks('Paweł', chipPawel);
renderTiles();
