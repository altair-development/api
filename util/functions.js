module.exports = {
    getExtension: (fileName) => {
        if (!fileName) throw new Error('fileName is required');
        let fileTypes = fileName.split(".");
        let len = fileTypes.length;

        return fileTypes[len - 1];
    }
};