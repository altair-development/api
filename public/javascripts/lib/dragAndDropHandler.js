function DragAndDropHandler(id, obj) {
    this.instance = id;
    this.callerObj = obj;
};

DragAndDropHandler.prototype.listen = function (selector, callback) {
    var obj = $('#' + this.instance + ' ' + selector);
    var self = this;

    obj.on('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        obj.find('.dd').show();
    });

    obj.on('dragenter', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });

    obj.on('dragleave', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });

    obj.on('drop', function (e) {
        e.preventDefault();
        var files = e.originalEvent.dataTransfer.files;
        callback(files[0], self.callerObj);
    });

    $(document).on('dragenter', function (e) {
        e.stopPropagation();
        e.preventDefault();
        obj.find('.dd').hide();
    });

    $(document).on('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });

    $(document).on('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });
};