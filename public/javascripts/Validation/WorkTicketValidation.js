function WorkTicketValidation() {
    Validation.call(this);
};

WorkTicketValidation.prototype = Object.create(Validation.prototype);
WorkTicketValidation.prototype.constructor = WorkTicketValidation;

WorkTicketValidation.prototype.validate = function (param) {
    var errors = [];
    for (var key in param) {
        switch (key) {
            case 'title':
                if (!this.lengthBetween(param[key], 1, 255)) {
                    errors.push('タイトルは1文字以上255文字以下で入力してください。');
                }
                if (!this.checkNotCntrChar(param[key])) {
                    errors.push('タイトルは制御文字以外で入力してください。');
                }

                break;
        }
    }

    return errors;
};