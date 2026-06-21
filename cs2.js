const spinner = document.getElementById('spinner');
const container = document.getElementById('spinner-container');
const inventoryGrid = document.getElementById('inventory-grid');
const openBtn = document.getElementById('open-btn');
const caseSelector = document.getElementById('case-selector');
const caseTitle = document.getElementById('case-title');
const fastOpenToggle = document.getElementById('fast-open-toggle');

// Modal Elements
const modal = document.getElementById('unboxing-modal');
const modalItemDisplay = document.getElementById('modal-item-display');
const modalCloseBtn = document.getElementById('modal-close-btn');

let allCrates = [];
let currentCaseData = null;

const TARGET_CASES = [
    "Dreams & Nightmares Case",
    "Revolution Case",
    "Fracture Case"
];

const CARD_WIDTH = 200; // 180px min-width + 20px margin total
const WINNER_INDEX = 65; 
const TOTAL_CARDS = 80;
let isSpinning = false;

// Fetch cases from API
async function loadCasesFromAPI() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json');
        const data = await response.json();
        
        // Filter out our target cases
        allCrates = data.filter(c => TARGET_CASES.includes(c.name));
        
        // Populate dropdown
        caseSelector.innerHTML = '';
        allCrates.forEach(c => {
            let option = document.createElement('option');
            option.value = c.name;
            option.textContent = c.name;
            caseSelector.appendChild(option);
        });
        
        caseSelector.disabled = false;
        
        // Select first by default
        if (allCrates.length > 0) {
            selectCase(allCrates[0].name);
        }
        
    } catch (e) {
        console.error("Failed to fetch cases from CSGO-API", e);
        caseTitle.innerText = "Error Loading API";
    }
}

function selectCase(caseName) {
    const caseObj = allCrates.find(c => c.name === caseName);
    if (!caseObj) return;

    caseTitle.innerText = caseName;
    
    // Group skins by rarity based on API string
    currentCaseData = {
        blue: caseObj.contains.filter(i => i.rarity.name.includes('Mil-Spec') || i.rarity.name.includes('Consumer') || i.rarity.name.includes('Industrial') || i.rarity.name.includes('Restricted') === false && i.rarity.name.includes('Classified') === false && i.rarity.name.includes('Covert') === false && i.rarity.name.includes('Contraband') === false),
        purple: caseObj.contains.filter(i => i.rarity.name.includes('Restricted')),
        pink: caseObj.contains.filter(i => i.rarity.name.includes('Classified')),
        red: caseObj.contains.filter(i => i.rarity.name.includes('Covert')),
        gold: caseObj.contains_rare || []
    };
    
    // In case filtering fails for blue (since names can vary), let's ensure blue has something:
    if (currentCaseData.blue.length === 0) {
        currentCaseData.blue = caseObj.contains;
    }
}

caseSelector.addEventListener('change', (e) => {
    selectCase(e.target.value);
});

function rollRarity() {
    let rand = Math.random() * 100;
    if (rand < 0.26) return 'gold';
    if (rand < 0.26 + 0.64) return 'red'; // 0.90
    if (rand < 0.90 + 3.20) return 'pink'; // 4.10
    if (rand < 4.10 + 15.98) return 'purple'; // 20.08
    return 'blue';
}

function getRandomSkinObj(rarityKey) {
    let list = currentCaseData[rarityKey];
    if (!list || list.length === 0) {
        // Fallback if rarity doesn't exist in this case
        list = currentCaseData['blue']; 
    }
    return list[Math.floor(Math.random() * list.length)];
}

function createCardHTML(rarityKey, skinObj) {
    let imgHTML = '';
    if (skinObj && skinObj.image) {
        imgHTML = `<img src="${skinObj.image}" alt="${skinObj.name}" style="width:100%; height:auto; max-height: 100px; object-fit: contain; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));">`;
    } else {
        // Fallback icon
        if(rarityKey === 'gold') {
            imgHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        } else {
            imgHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
        }
    }

    let name = skinObj ? skinObj.name.replace('★ ', '') : 'Unknown Item';

    return `
        <div class="weapon-card rarity-${rarityKey}">
            <div class="weapon-image-placeholder">${imgHTML}</div>
            <div class="weapon-name">${name}</div>
        </div>
    `;
}

function openCase() {
    if (isSpinning || !currentCaseData) return;
    isSpinning = true;
    openBtn.disabled = true;
    caseSelector.disabled = true;
    openBtn.innerText = "Opening...";

    // Instantly reset the spinner
    spinner.style.transition = 'none';
    spinner.style.transform = 'translateX(0px)';
    
    // Determine winner
    let winnerRarity = rollRarity();
    let winnerSkin = getRandomSkinObj(winnerRarity);
    
    // Generate the tape contents
    let cardsHTML = '';
    for (let i = 0; i < TOTAL_CARDS; i++) {
        if (i === WINNER_INDEX) {
            cardsHTML += createCardHTML(winnerRarity, winnerSkin);
        } else {
            let r = rollRarity();
            cardsHTML += createCardHTML(r, getRandomSkinObj(r));
        }
    }
    spinner.innerHTML = cardsHTML;

    // Force browser reflow
    spinner.offsetHeight;

    // Calculate where to stop
    let containerWidth = container.clientWidth;
    let baseTargetX = (containerWidth / 2) - (WINNER_INDEX * CARD_WIDTH + (CARD_WIDTH / 2));
    let randomOffset = (Math.random() - 0.5) * (CARD_WIDTH - 20); 
    
    let targetX = baseTargetX + randomOffset;

    // Start spin
    spinner.style.transition = 'transform 6s cubic-bezier(0.15, 0.85, 0.15, 1)';
    spinner.style.transform = `translateX(${targetX}px)`;

    // Wait for spin to complete
    setTimeout(() => {
        isSpinning = false;
        openBtn.disabled = false;
        caseSelector.disabled = false;
        openBtn.innerText = "Unlock Case (1 Key)";

        if (fastOpenToggle.checked && winnerRarity !== 'red' && winnerRarity !== 'gold') {
            // Skip modal for lower tiers
            let inventoryItemHTML = createCardHTML(winnerRarity, winnerSkin);
            inventoryGrid.insertAdjacentHTML('afterbegin', inventoryItemHTML);
        } else {
            showModal(winnerRarity, winnerSkin);
        }
    }, 6200);
}

function showModal(rarity, skinObj) {
    modalItemDisplay.innerHTML = createCardHTML(rarity, skinObj);
    modal.classList.remove('hidden');

    // Remove from modal on close and add to inventory
    modalCloseBtn.onclick = () => {
        modal.classList.add('hidden');
        let inventoryItemHTML = createCardHTML(rarity, skinObj);
        inventoryGrid.insertAdjacentHTML('afterbegin', inventoryItemHTML);
    };
}

openBtn.addEventListener('click', openCase);

// Init
loadCasesFromAPI();
