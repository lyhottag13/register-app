import Slider from "./Slider.js";

const elements = {
    // Top-level buttons and containers
    controls: {
        actualButton: document.getElementById('actual'),
        specialButton: document.getElementById('special'),
        closeOrderButton: document.getElementById('close-order'),
        continueButton: document.getElementById('continue'),
        submitButton: document.getElementById('submit'),
        qc2CancelButton: document.getElementById('back-3'),
        qc2SubmitButton: document.getElementById('submit-qc2'),
        qc3CancelButton: document.getElementById('back-4'),
        qc3SubmitButton: document.getElementById('submit-qc3'),
    },

    // First grid inputs
    grid1: {
        internalSerialInput: document.getElementById('internal-serial'),
        externalSerial1Input: document.getElementById('external-serial-1'),
        externalSerial2Input: document.getElementById('external-serial-2'),
        internalIdInput: document.getElementById('internal-id'),
    },

    // Second grid inputs
    grid2: {
        otherTestCheckBox: new Slider(document.getElementById('other-tests'), false),
        reworkCheckBox: new Slider(document.getElementById('rework'), false),
        notesInput: document.getElementById('notes'),
    },

    // Third grid inputs
    grid3: {
        initialWattageInput: document.getElementById("initial-wattage"),
        pumpWattageInput: document.getElementById("pump-wattage"),
        heatingInput: document.getElementById("heating"),
        heatingTimeInput: document.getElementById("heating-time"),
        barOpvInput: document.getElementById("bar-opv"),
        dualWallFilterInput: document.getElementById("dual-wall-filter"),
    },
    
    // Fourth grid's inputs.
    grid4: {
        twoCupInput: document.getElementById('qc3-2-cup'),
        timeInput: document.getElementById('qc3-time'),
        oneCupInput: document.getElementById('qc3-1-cup'),
    },

    // Static elements
    static: {
        poDiv: document.getElementById('po'),
        staticElementsTop: document.getElementById('static-elements-top'),
        datecode: document.getElementById('datecode'),
        poCountTotalDiv: document.getElementById('po-count'),
        poCountTodayDiv: document.getElementById('today-count'),
        staticElementsBottom: document.getElementById('static-elements-bottom'),
        dateTime: document.getElementById('date-time'),
        qc2TotalCount: document.getElementById('qc2-total-count'),
        qc2TodayCount: document.getElementById('qc2-today-count')
    }
};

export default elements;