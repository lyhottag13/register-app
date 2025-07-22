const div = document.createElement('div');
const input = document.createElement('input');
const label = document.createElement('label');

export function createModal() {
    div.id = 'po-modal';
    input.id = 'po-input';

    label.innerText = 'Enter PO Number:';
    label.appendChild(input);
    div.appendChild(label);
    document.body.appendChild(div);
}

export async function getPoNumber() {
    const activePo = await getActivePo();
    if (activePo) {
        if (window.confirm('Use active Po?')) {
            return activePo.slice(2); // Slices since the PO starts with po.
        }
    }
    // Happens if there is no active PO or the user doesn't want to use the active PO.
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
        div.style.top = '50%';
        div.style.transform = 'translate(-50%, -50%)';
    } else {
        div.style.top = '100%'
        div.style.transform = 'translate(-50%, 0)';
    }
}

async function getActivePo() {
    const data = await (await fetch('/api/getActivePo')).json();
    return data.activePo;
}
export async function setActivePo(po) {
    await fetch('/api/setActivePo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            po
        })
    });
}