function BaseAjax() {
    this.dmlLock = false;
    this.exId = null;
    this.queueNum = 0;
    this.queueClass = [];
};

BaseAjax.prototype.emit = function (exClass, action, param, successFunc, failFunc, isLoading, queueNum, exId) {
    console.log(action + ' ' + new Date);
    var self = this;
    this.nsp.emit(action, param, function (err, result) {
        console.log(err, result);
        if (err) {
            console.log('データ処理失敗');
            if (typeof failFunc === 'function') {
                failFunc(err, self);
            }
        } else {
            console.log('データ処理成功');
            if (typeof successFunc === 'function') {
                successFunc(result, self);
            }
        }
        self.dmlLock = false;
        if (isLoading) {
            if (self.queueNum === queueNum) {
                self.loadEnd(self, exClass, exId);
                self.showResult(err, exClass, exId);
                self.queueNum = 0;
            } else if (exClass && self.queueClass[1] !== exClass) {
                self.loadEnd(self, exClass, exId);
                self.showResult(err, exClass, exId);
            }
        } else if (self.queueNum === queueNum) {
            self.queueNum = 0;
        }
    }
    );
};

BaseAjax.prototype.loadingEmit = function (exClass, action, param, successFunc, failFunc, dmlLock, exId) {
    var queueNum = this.loadStart(exClass, dmlLock, exId);
    if (exId) {
        this.exId = exId;
    }
    this.emit(exClass, action, param, successFunc, failFunc, true, queueNum);
};

BaseAjax.prototype.loadStart = function (exClass, lock, exId) {
    exId = exId ? exId : this.exId;
    var exObj = exClass ? $('#' + exId + ' .' + exClass) : $('#' + exId);

    this.dmlLock = lock === false ? lock : true;
    exObj.find('.success, .fail, .error').hide();
    exObj.find('.loader').show();
    exObj.find('.error ul').empty();
    this.queueClass.push(exClass);
    this.queueNum++;
    return this.queueNum;
};

BaseAjax.prototype.loadEnd = function (obj, exClass, exId) {
    var self = null;
    if (obj) {
        self = obj;
    } else {
        self = this;
    }
    exId = exId ? exId : self.exId;

    this.queueClass.shift();
    if (exClass) {
        $('#' + exId + ' .' + exClass + ' .loader').hide();
    } else {
        $('#' + exId + ' .loader').hide();
    }
};

BaseAjax.prototype.showResult = function (err, exClass, exId) {
    exId = exId ? exId : this.exId;
    var exObj = exClass ? $('#' + exId + ' .' + exClass) : $('#' + exId);
    var targetObj = null;

    if (!err) {
        targetObj = exObj.find('.success');
    } else {
        targetObj = exObj.find('.fail');
    }
    targetObj.show();
    setTimeout(function () {
        targetObj.fadeOut(500);
    }, 3000);
};

BaseAjax.prototype.showError = function (errors, exClass, queueNum, exId) {
    exId = exId ? exId : this.exId;
    var exObj = exClass ? $('#' + exId + ' .' + exClass) : $('#' + exId);
    var elemError = exObj.find('.error');
    var errorUl = elemError.find('ul');

    if (this.queueNum === queueNum) {
        this.dmlLock = false;
        this.queueNum = 0;
    }
    errorUl.empty();
    $.each(errors, function (idx, message) {
        var li = $('<li></li>', {
            text: message
        });
        errorUl.append(li);
    });

    this.loadEnd(null, exClass, exId);
    elemError.show();
};
