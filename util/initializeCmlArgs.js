const commandLineArgs = require('command-line-args');

module.exports = () => {
    const optionDefinitions = [
        { name: 'checkHeap', type: Boolean, defaultValue: false},
        { name: 'delayGc', type: Number, defaultValue: 1000 * 30 },
        { name: 'delayMemorySizeLog', type: Number, defaultValue: 1000 * 30 },
        { name: 'dirHeapDump',  defaultValue: global.appRoot + '/heapDump' },
        { name: 'noGc', type: Boolean, defaultValue: false},
        { name: 'noMemorySizeLog', type: Boolean, defaultValue: false},
        { name: 'noHeapdump', type: Boolean, defaultValue: false},
    ];
    return commandLineArgs(optionDefinitions);
};