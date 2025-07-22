export async function getPoNumber() {
    return await getPoInput();
}
const div = document.createElement('div');
const input = document.createElement('input');
const label = document.createElement('label');

export function createModal() {
    div.style.position = 'fixed';
    div.style.transition = 'all 0.5s ease';
    div.style.transform = 'translateX(50vw) translateX(-100%) translateY(100vh)';
    div.style.height = '300px';
    div.style.width = '300px';
    div.style.backgroundColor = 'blue';
    div.style.zIndex = '100';

    input.id = 'po-input';

    label.innerText = 'Enter PO Number:';
    label.appendChild(input);
    div.appendChild(label);
    document.body.appendChild(div);
}

async function getPoInput() {
    toggleVisibility(true);
    return await new Promise(resolve => {
        input.addEventListener('keypress', function handler(e) {
            if (e.key === 'Enter') {
                input.removeEventListener('keypress', handler);
                resolve(this.value);
                toggleVisibility(false);
                this.value = '';
            }
        });
    });
}
function toggleVisibility(visibility) {
    if (visibility) {
        div.style.transform = 'translateX(50vw) translateX(-100%) translateY(-80vh)';
    } else {
        div.style.transform = 'translateX(50vw) translateX(-100%) translateY(100vh)';
    }
}