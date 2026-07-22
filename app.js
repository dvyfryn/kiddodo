let currentFilter = 'all';
let currentPeriod = 'daily';
let isParentMode = false;
let isTileDeleteMode = false;
const PARENT_PIN = "1234";

// Indywidualne konta punktowe Pawła i Madzi
let scores = {
    Paweł: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    Madzia: { daily: 0, weekly: 0, monthly: 0, yearly: 0 }
};

// Indywidualne cele dla każdego dziecka (z możliwością edycji)
let individualCheckpoints = [
    { id: 1, name: "🍦 Wyjście na lody", target: 30 },
    { id: 2, name: "🎬 Wieczór filmowy z przekąskami", target: 80 },
    { id: 3, name: "🎁 Wymarzona niespodzianka", target: 200 }
];

// Wspólny coroczny cel rodzinny
let sharedYearlyCheckpoint = { id: 99, name: "🚗 Wycieczka rodzinna (Wspólny cel)", target: 1000 };

let questTilesData = [
    { id: 1, title: "Ścielenie łóżka", points: 5 },
    { id: 2, title: "Zrobienie lekcji", points: 15 },
    { id: 3, title: "Wyniesienie śmieci", points: 5 },
    { id: 4, title: "Wyprowadzenie psa", points: 10 },
    { id: 5, title: "Podlewanie kwiatów", points: 5 },
    { id: 6, title: "Sprzątanie pokoju", points: 10 }
];

// Efektowne wielokolorowe konfetti + wybuch gwiazdek
function triggerConfetti() {
    // Pierwsza fala - tradycyjne konfetti
    confetti({ 
        particleCount: 100, 
        spread: 100, 
        origin: { y: 0.6 } 
    });
    
    // Druga fala po 200ms - złote i fioletowe gwiazdki
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#a855f7', '#f59e0b', '#38bdf8']
        });
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#a855f7', '#f59e0b', '#38bdf8']
        });
    }, 200);
}

function switchPeriod(period, tabBtn) {
    currentPeriod = period;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
    updateDashboard();
}

function updateDashboard() {
    const pPts = scores.Paweł[currentPeriod];
    const mPts = scores.Madzia[currentPeriod];

    document.getElementById('score-pawel').innerText = `${pPts} pkt`;
    document.getElementById('score-madzia').innerText = `${mPts} pkt`;

    const boxP = document.getElementById('box-pawel');
    const boxM = document.getElementById('box-madzia');
    boxP.classList.remove('leader');
    boxM.classList.remove('leader');

    if (pPts > mPts && pPts > 0) boxP.classList.add('leader');
    if (mPts > pPts && mPts > 0) boxM.classList.add('leader');

    const container = document.getElementById('checkpoints-container');
    container.innerHTML = '';

    let targetKid = currentFilter === 'all' ? 'Paweł' : currentFilter;
    document.getElementById('checkpoints-label').innerHTML = `<i class="fa-solid fa-trophy"></i> Cele dla: ${targetKid}`;

    individualCheckpoints.forEach(cp => {
        const kidScore = scores[targetKid][currentPeriod];
        const percent = Math.min(100, Math.round((kidScore / cp.target) * 100));
        const isReady = kidScore >= cp.target;

        const item = document.createElement('div');
        item.className = 'checkpoint-item';
        item.innerHTML = `
            <div class="checkpoint-header">
                <span>
                    ${cp.name} 
                    <button class="btn-edit-cp" onclick="editCheckpoint(${cp.id})" title="Edytuj cel"><i class="fa-solid fa-pen"></i></button>
                </span>
                <span>${kidScore} / ${cp.target} pkt</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <button class="btn-claim ${isReady ? 'ready' : ''}" onclick="claimReward('${cp.name}', '${targetKid}')">
                🎉 Zrealizuj nagrodę dla: ${targetKid}
            </button>
        `;
        container.appendChild(item);
    });

    // Cel rodzinny
    const totalYearly = scores.Paweł.yearly + scores.Madzia.yearly;
    const sharedPercent = Math.min(100, Math.round((totalYearly / sharedYearlyCheckpoint.target) * 100));
    const isSharedReady = totalYearly >= sharedYearlyCheckpoint.target;

    const sharedItem = document.createElement('div');
    sharedItem.className = 'checkpoint-item shared';
    sharedItem.innerHTML = `
        <div class="checkpoint-header">
            <span>
                ${sharedYearlyCheckpoint.name}
                <button class="btn-edit-cp" onclick="editSharedCheckpoint()" title="Edytuj cel rodzinny"><i class="fa-solid fa-pen"></i></button>
            </span>
            <span>${totalYearly} / ${sharedYearlyCheckpoint.target} pkt</span>
        </div>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${sharedPercent}%;"></div>
        </div>
        <button class="btn-claim ${isSharedReady ? 'ready' : ''}" onclick="claimReward('${sharedYearlyCheckpoint.name}', 'Cała Rodzina')">
            🚗 Zrealizuj Wycieczkę Rodzinną!
        </button>
    `;
    container.appendChild(sharedItem);
}

// Edycja Celu Indywidualnego
function editCheckpoint(id) {
    if (!isParentMode) return alert("Musisz odblokować Tryb Rodzica, aby edytować cele!");
    
    const cp = individualCheckpoints.find(c => c.id === id);
    if (!cp) return;

    const newName = prompt("Podaj nową nazwę celu/nagrody:", cp.name);
    if (newName === null) return;

    const newTarget = prompt("Podaj nową próg punktowy:", cp.target);
    if (newTarget === null) return;

    cp.name = newName.trim() || cp.name;
    cp.target = parseInt(newTarget) || cp.target;

    updateDashboard();
}

// Edycja Celu Rodzinnego
function editSharedCheckpoint() {
    if (!isParentMode) return alert("Musisz odblokować Tryb Rodzica, aby edytować cel rodzinny!");

    const newName = prompt("Podaj nową nazwę celu rodzinnego:", sharedYearlyCheckpoint.name);
    if (newName === null) return;

    const newTarget = prompt("Podaj nowy próg punktowy:", sharedYearlyCheckpoint.target);
    if (newTarget === null) return;

    sharedYearlyCheckpoint.name = newName.trim() || sharedYearlyCheckpoint.name;
    sharedYearlyCheckpoint.target = parseInt(newTarget) || sharedYearlyCheckpoint.target;

    updateDashboard();
}

function claimReward(rewardName, winner) {
    triggerConfetti();
    alert(`GRATULACJE! ${winner} odbiera nagrodę:\n"${rewardName}"! 🎁`);
}

function toggleTask(btn) {
    const card = btn.closest('.task-card');
    const assignee = card.getAttribute('data-assignee');
    const points = parseInt(card.getAttribute('data-points')) || 0;

    card.classList.toggle('completed');
    
    if (card.classList.contains('completed')) {
        btn.classList.add('done');
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i>';
        
        scores[assignee].daily += points;
        scores[assignee].weekly += points;
        scores[assignee].monthly += points;
        scores[assignee].yearly += points;
        
        triggerConfetti();
    } else {
        btn.classList.remove('done');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        
        scores[assignee].daily = Math.max(0, scores[assignee].daily - points);
        scores[assignee].weekly = Math.max(0, scores[assignee].weekly - points);
        scores[assignee].monthly = Math.max(0, scores[assignee].monthly - points);
        scores[assignee].yearly = Math.max(0, scores[assignee].yearly - points);
    }

    updateDashboard();
}

function filterTasks(assignee, chipBtn) {
    currentFilter = assignee;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipBtn.classList.add('active');

    const cards = document.querySelectorAll('.task-card');
    cards.forEach(card => {
        const cardAssignee = card.getAttribute('data-assignee');
        if (assignee === 'all' || cardAssignee === assignee) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });

    updateDashboard();
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
    renderTiles();

    titleInput.value = '';
    document.getElementById('tile-search').value = '';
    filterTilesBySearch();
}

function addQuestFromTile(title, points) {
    let assignee = currentFilter;
    if (assignee === 'all') {
        const choice = confirm("Czy dodajesz ten Quest dla Pawła? (Kliknij 'Anuluj' jeśli dla Madzi)");
        assignee = choice ? 'Paweł' : 'Madzia';
    }
    createQuestCard(title, points, assignee);
}

function createQuestCard(title, points, assignee) {
    const list = document.getElementById('tasks-list');
    const newTask = document.createElement('div');
    newTask.className = 'task-card';
    newTask.setAttribute('data-assignee', assignee);
    newTask.setAttribute('data-points', points);
    
    newTask.innerHTML = `
        <div class="task-info">
            <div class="task-title">${title} <span class="points-badge">+${points} pkt</span></div>
            <div class="assignee-badge"><i class="fa-solid fa-user"></i> ${assignee}</div>
        </div>
        <div class="task-actions">
            <button class="btn-delete" onclick="deleteTask(this)"><i class="fa-solid fa-trash"></i></button>
            <button class="btn-check" onclick="toggleTask(this)"><i class="fa-solid fa-check"></i></button>
        </div>
    `;

    list.appendChild(newTask);

    if (currentFilter !== 'all' && currentFilter !== assignee) {
        newTask.style.display = 'none';
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
    }
    updateDashboard();
}

function deleteTask(btn) {
    const card = btn.closest('.task-card');
    card.remove();
}

renderTiles();
updateDashboard();
