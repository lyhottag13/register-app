// I made a custom slider class for the second user input screen.

export default class Slider {
    constructor(parent, value) {
        this.parent = parent;
        this.value = value;
        this.background;
        this.circle;
        this.initialize();
    }
    initialize() {
        this.background = document.createElement('div');
        this.background.style.borderRadius = '60px';
        this.background.style.height = '60px';
        this.background.style.width = '150px'
        this.background.style.zIndex = '100';
        this.background.style.transition = 'all 0.2s ease';
        this.background.style.backgroundColor = this.value ? 'rgba(63, 255, 104, 1)' : 'rgba(255, 77, 77, 1)';
        this.circle = document.createElement('div');
        this.circle.style.position = 'relative';
        this.circle.style.top = '10px';
        this.circle.style.left = this.value ? '60px' : '10px';
        this.circle.style.height = '40px';
        this.circle.style.width = '40px';
        this.circle.style.borderRadius = '30px';
        this.circle.style.backgroundColor = 'white';
        this.circle.style.transition = this.background.style.transition;
        this.parent.addEventListener('click', this.handleClick.bind(this));
        this.background.appendChild(this.circle);
        this.parent.appendChild(this.background);
    }
    handleClick() {
        if (this.value) {
            this.setValue(false);
        } else {
            this.setValue(true);
        }
    }
    setValue(value) {
        this.value = value;
        if (value) {
            this.circle.style.left = '100px';
            this.background.style.backgroundColor = 'rgba(63, 255, 104, 1)';
        } else {
            this.circle.style.left = '10px';
            this.background.style.backgroundColor = 'rgba(255, 77, 77, 1)';
        }
    }
}