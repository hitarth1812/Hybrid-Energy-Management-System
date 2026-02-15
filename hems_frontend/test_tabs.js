// Simple test to verify tabs are working
// Open browser console (F12) and paste this code

console.log('=== HEMS Tab Test ===');

// Test 1: Check if React is loaded
console.log('1. React loaded:', typeof React !== 'undefined' ? '✅' : '❌');

// Test 2: Check if tabs component exists
const tabs = document.querySelector('[role="tablist"]');
console.log('2. Tabs found:', tabs ? '✅' : '❌');

// Test 3: Check active tab
const activeTab = document.querySelector('[role="tab"][data-state="active"]');
console.log('3. Active tab:', activeTab ? activeTab.textContent.trim() : 'None');

// Test 4: Test API connection
fetch('http://localhost:8000/api/devices/')
    .then(r => {
        console.log('4. API Status:', r.status === 200 ? '✅ Working' : `❌ Error ${r.status}`);
        return r.json();
    })
    .then(data => {
        console.log('5. API Data:', data);
    })
    .catch(err => {
        console.error('4. API Error:', err.message);
    });

// Test 5: Click Devices tab programmatically
setTimeout(() => {
    const devicesTab = Array.from(document.querySelectorAll('[role="tab"]'))
        .find(tab => tab.textContent.includes('Devices'));
    if (devicesTab) {
        console.log('6. Clicking Devices tab...');
        devicesTab.click();
        setTimeout(() => {
            const devicesContent = document.querySelector('[role="tabpanel"]');
            console.log('7. Devices content visible:', devicesContent ? '✅' : '❌');
            console.log('8. Content:', devicesContent ? devicesContent.textContent.substring(0, 100) : 'None');
        }, 500);
    }
}, 1000);
