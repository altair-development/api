function GameTitleValidation(exId) {
    Validation.call(this);

    this.exId = exId;
};

GameTitleValidation.prototype = Object.create(Validation.prototype);
GameTitleValidation.prototype.constructor = GameTitleValidation;

GameTitleValidation.prototype.validate = function (param, exClass) {
    var errors = [];
    for (var key in param) {
        switch (key) {
            case 'name':
                if (!this.lengthBetween(param[key], 1, 255)) {
                    errors.push('255文字以内で入力してください。');
                }
                if (!this.issetResultArea(param[key], exClass)) {
                    errors.push('登録済みのタイトルです。');
                }
                break;
        }
    }

    return errors;
};

GameTitleValidation.prototype.issetResultArea = function (name, exClass) {
    var errorFlg = false;

    $('#' + this.exId + ' .' + exClass + ' .searchAreaResult ul li').each(function (i, e) {
        if ($(e).find('span').text() === name) {
            errorFlg = true;
            return false;
        }
    });

    if (errorFlg) {
        return false;
    }

    return true;
};