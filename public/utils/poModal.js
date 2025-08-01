const div = document.createElement('div');
const poInput = document.createElement('input');
const label = document.createElement('label');
const cancel = document.createElement('button');
const confirm = document.createElement('button');
const buttonHolder = document.createElement('div');

export function createModal() {
    div.id = 'po-modal';
    poInput.id = 'po-input';
    label.id = 'po-label';
    buttonHolder.id = 'po-buttons';
    label.innerText = 'Ingresa Numero de PO:\n(8 digitos)';

    cancel.innerText = 'Cancelar';
    confirm.innerText = 'Confirmar';

    poInput.maxLength = 8;

    poInput.className = 'number';

    label.appendChild(poInput);
    buttonHolder.appendChild(cancel);
    buttonHolder.appendChild(confirm);
    div.appendChild(label);
    div.appendChild(buttonHolder);
    document.body.appendChild(div);
}

export async function getPoNumber() {
    const activePo = await getActivePo();
    if (activePo) {
        if (window.confirm(`Usar PO activa? (${activePo})`)) {
            return activePo.slice(2); // Slices since the PO starts with po.
        }
    }
    const userInputPassword = window.prompt('Ingresa contraseña');
    if (!(await sendPassword(userInputPassword))) {
        window.alert('Contraseña incorrecta');
        return 'CANCEL';
    }
    // Happens if there is no active PO or the user doesn't want to use the active PO.
    toggleVisibility(true);
    // Waits for the user to press enter or click confirm before proceeding with the PO.
    return await new Promise(resolve => {
        poInput.focus();
        cancel.addEventListener('click', finishPromise);
        confirm.addEventListener('click', finishPromise);
        poInput.addEventListener('keypress', handleKeyPress);
        function handleKeyPress(e) {
            if (e.key === 'Enter') {
                finishPromise();
            }
        }
        function finishPromise(e) {
            cancel.removeEventListener('click', finishPromise);
            confirm.removeEventListener('click', finishPromise);
            poInput.removeEventListener('keypress', handleKeyPress);
            if (e?.target === cancel) {
                resolve('CANCEL');
            } else {
                resolve(poInput.value);
            }
            toggleVisibility(false);
            poInput.value = '';
        }
    });
}

async function sendPassword(password) {
    const { success } = await (await fetch('/api/password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password
        })
    })).json();
    return success;
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
    const { isValid, err } = await (await fetch('/api/setActivePo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            po
        })
    })).json();
    if (!isValid) {
        window.alert(err);
    }
    return isValid;
}