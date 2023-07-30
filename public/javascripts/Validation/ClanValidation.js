function ClanValidation() {
    Validation.call(this);
};

ClanValidation.prototype = Object.create(Validation.prototype);
ClanValidation.prototype.constructor = ClanValidation;

ClanValidation.prototype.validate = function (param) {
    var errors = [];
    for (var key in param) {
        switch (key) {
            case 'description':
                if (!this.lengthBetween(param[key], 0, 9999)) {
                    errors.push('文字数上限をオーバーしました。入力可能な文字数はHTMLタグを含め9999文字です。');
                }
                break;

            case 'prof_ext':
                var validList = ['png', 'gif', 'jpg'];
                if (validList.indexOf(param[key]) == -1) {
                    errors.push('画像の拡張子はpng,gif,jpgのみ利用可能です。');
                }
                break;
        }
    }

    return errors;
};